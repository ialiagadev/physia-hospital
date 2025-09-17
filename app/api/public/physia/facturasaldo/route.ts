import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { generatePdf } from "@/lib/pdf-generator"
import { generateUniqueInvoiceNumber } from "@/lib/invoice-utils-server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

const resend = new Resend(process.env.RESEND_API_KEY)

const ISSUER_ORG_ID = 61

export async function POST(req: Request) {
  try {
    const { organizationId, baseAmount, vat, totalAmount } = await req.json()

    if (!organizationId || !baseAmount || totalAmount == null) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 })
    }

    const { data: issuerOrg, error: issuerOrgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", ISSUER_ORG_ID)
      .single()

    if (issuerOrgError || !issuerOrg) {
      console.error("Error al obtener organización emisora:", issuerOrgError)
      throw new Error("No se pudo obtener los datos de la organización emisora")
    }

    // 1️⃣ Organización cliente (la que recarga saldo)
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single()
    if (orgError || !org) throw orgError
    if (!org.phone) {
      return NextResponse.json({ error: "La organización no tiene teléfono definido" }, { status: 400 })
    }

    // 2️⃣ Cliente en emisora (61), buscar por teléfono
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
          phone: org.phone,
          email: org.email,
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

    const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(ISSUER_ORG_ID, "normal")

    // 3️⃣ Crear factura en emisora (61)
    const vatAmount = baseAmount * (vat / 100)
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
        notes: `Recarga de saldo para ${org.name}`,
        payment_method: "tarjeta",
      })
      .select()
      .single()
    if (invoiceError || !invoice) throw invoiceError

    await supabase.from("organizations").update({ last_invoice_number: newInvoiceNumber }).eq("id", ISSUER_ORG_ID)

    await supabase.from("invoice_lines").insert({
      invoice_id: invoice.id,
      description: `Recarga de saldo (${org.name})`,
      quantity: 1,
      unit_price: baseAmount,
      vat_rate: vat,
      line_amount: baseAmount,
    })

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
      
        if (invoiceWithRelations.clients) {
          invoiceWithRelations.client_data = {
            name: invoiceWithRelations.clients.name,
            tax_id: invoiceWithRelations.clients.tax_id,
            address: invoiceWithRelations.clients.address,
            postal_code: invoiceWithRelations.clients.postal_code,
            city: invoiceWithRelations.clients.city,
            province: invoiceWithRelations.clients.province,
            country: invoiceWithRelations.clients.country,
            email: invoiceWithRelations.clients.email,
            client_type: invoiceWithRelations.clients.client_type || "private",
          }
        }
      }
      

    const { data: invoiceLines } = await supabase.from("invoice_lines").select("*").eq("invoice_id", invoice.id)

    const pdfBlob = await generatePdf(invoiceWithRelations, invoiceLines || [], `factura-${invoice.id}.pdf`, false)

    if (!pdfBlob) {
      throw new Error("No se pudo generar el PDF de la factura")
    }

    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
    const pdfBase64 = pdfBuffer.toString("base64")

    // 5️⃣ Enviar email al cliente
    let sentTo: string | null = null
    if (org.email) {
      sentTo = org.email
      await resend.emails.send({
        from: "facturas@app.healthmate.tech",
        to: org.email,
        subject: `Factura de recarga - ${org.name}`,
        html: `<p>Hola <b>${org.name}</b>,<br/>Adjuntamos la factura de tu recarga de saldo (${totalAmount.toFixed(
          2,
        )} €).</p>`,
        attachments: [
          {
            filename: `Factura-${invoice.id}.pdf`,
            content: pdfBase64,
          },
        ],
      })
    }

    return NextResponse.json({ success: true, invoice, sentTo })
  } catch (err: any) {
    console.error("❌ Error en API facturasaldo:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
