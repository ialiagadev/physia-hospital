import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { STRIPE_PLANS } from "@/lib/stripe-config"
import { Resend } from "resend"
import { generatePdf } from "@/lib/pdf-generator"
import { generateUniqueInvoiceNumber } from "@/lib/invoice-utils-server"
import { addMonths, addYears } from "date-fns"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const resend = new Resend(process.env.RESEND_API_KEY)

const ISSUER_ORG_ID = 61 // 👈 Siempre factura la organización emisora

export async function POST(req: Request) {
  try {
    const { organizationId } = await req.json()
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId requerido" }, { status: 400 })
    }

    // 1️⃣ Organización emisora
    const { data: issuerOrg, error: issuerOrgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", ISSUER_ORG_ID)
      .single()

    if (issuerOrgError || !issuerOrg) {
      throw new Error("No se pudo obtener la organización emisora (61)")
    }

    // 2️⃣ Organización cliente (la que se suscribe)
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: "Organización cliente no encontrada" }, { status: 404 })
    }

    // 3️⃣ Plan
    const tier = (org.subscription_tier || "INICIAL").toUpperCase() as keyof typeof STRIPE_PLANS
    const plan = STRIPE_PLANS[tier]
    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 })
    }

    const period = (org.subscription_billing_period || "monthly") as "monthly" | "yearly"
    const priceInfo = plan.prices[period]

    // 4️⃣ Cliente dentro de la emisora (61)
    let clientId: number | null = null
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", ISSUER_ORG_ID)
      .eq("phone", org.phone)
      .maybeSingle()

    if (existingClient) {
      clientId = existingClient.id
    } else {
      const { data: newClient, error: newClientError } = await supabase
        .from("clients")
        .insert({
          organization_id: ISSUER_ORG_ID,
          name: org.name,
          tax_id: org.tax_id,
          email: org.email,
          phone: org.phone,
          address: org.address,
          city: org.city,
          postal_code: org.postal_code,
          province: org.province,
          country: org.country,
        })
        .select("id")
        .single()

      if (newClientError) throw newClientError
      clientId = newClient.id
    }

    // 5️⃣ Generar número de factura único
    const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(
      ISSUER_ORG_ID,
      "normal"
    )

    // 6️⃣ Crear factura en emisora (61)
    const baseAmount = priceInfo.amount / 100
    const vatAmount = baseAmount * 0.21
    const totalAmount = baseAmount + vatAmount

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        organization_id: ISSUER_ORG_ID,
        client_id: clientId,
        invoice_number: invoiceNumberFormatted,
        status: "issued",
        issue_date: new Date().toISOString().split("T")[0],
        base_amount: baseAmount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        notes: `${plan.name} (${baseAmount}€) - ${period === "monthly" ? "Mensual" : "Anual"}`,
        payment_method: "tarjeta",
      })
      .select()
      .single()

    if (invoiceError || !invoice) throw invoiceError

    // Actualizar contador en organización emisora
    await supabase
      .from("organizations")
      .update({ last_invoice_number: newInvoiceNumber })
      .eq("id", ISSUER_ORG_ID)

    // 7️⃣ Insertar línea de factura
    await supabase.from("invoice_lines").insert({
      invoice_id: invoice.id,
      description: `${plan.name} - ${period === "monthly" ? "Mensual" : "Anual"}`,
      quantity: 1,
      unit_price: baseAmount,
      discount_percentage: 0,
      vat_rate: 21,
      line_amount: baseAmount,
    })

    // 8️⃣ Actualizar fecha de expiración en el cliente
    let newExpiration: Date
    if (period === "monthly") {
      newExpiration = addMonths(new Date(), 1)
    } else {
      newExpiration = addYears(new Date(), 1)
    }

    await supabase
      .from("organizations")
      .update({ subscription_expires: newExpiration.toISOString() })
      .eq("id", org.id)

    // 9️⃣ Generar PDF con el generador unificado
    const { data: invoiceWithRelations } = await supabase
      .from("invoices")
      .select(`
        *,
        clients (*),
        organizations (*)
      `)
      .eq("id", invoice.id)
      .single()

    if (invoiceWithRelations) {
      invoiceWithRelations.organization = issuerOrg
    }

    const { data: invoiceLines } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoice.id)

    const pdfBlob = await generatePdf(invoiceWithRelations, invoiceLines || [], `factura-${invoice.id}.pdf`, false)

    if (!pdfBlob) {
      throw new Error("❌ No se pudo generar el PDF de la factura")
    }
    
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
    const pdfBase64 = pdfBuffer.toString("base64")
    
    // 🔟 Enviar email al cliente
    if (org.email) {
      await resend.emails.send({
        from: "facturas@app.healthmate.tech",
        to: org.email,
        subject: `Factura de suscripción - ${plan.name}`,
        html: `<p>Hola <b>${org.name}</b>,<br/>Adjuntamos la factura de tu suscripción (${totalAmount.toFixed(
          2
        )} €).</p>`,
        attachments: [
          {
            filename: `Factura-${invoice.id}.pdf`,
            content: pdfBase64,
          },
        ],
      })
    }

    return NextResponse.json({ success: true, invoice })
  } catch (err: any) {
    console.error("❌ Error en API facturas suscripción:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
