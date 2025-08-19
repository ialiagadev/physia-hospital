import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { STRIPE_PLANS } from "@/lib/stripe-config"
import { Resend } from "resend"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

// ⚡ Cliente Supabase con service_role
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { organizationId } = await req.json()
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId requerido" }, { status: 400 })
    }

    // 1. Cargar la organización cliente
    const { data: org, error: orgError } = await supabaseServer
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    // 2. Localizar plan
    const tier = (org.subscription_tier || "INICIAL").toUpperCase() as keyof typeof STRIPE_PLANS
    const plan = STRIPE_PLANS[tier]
    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 })
    }

    const period: "monthly" | "yearly" = "monthly"
    const priceInfo = plan.prices[period]

    // 3. Buscar/crear cliente
    const { data: existingClient } = await supabaseServer
      .from("clients")
      .select("id")
      .eq("organization_id", org.id)
      .single()

    let clientId = existingClient?.id
    if (!clientId) {
      const { data: newClient, error: newClientError } = await supabaseServer
        .from("clients")
        .insert({
          organization_id: org.id,
          name: org.name,
          tax_id: org.tax_id,
          email: org.email,
          phone: org.phone,
        })
        .select("id")
        .single()
      if (newClientError) {
        return NextResponse.json({ error: newClientError.message }, { status: 500 })
      }
      clientId = newClient.id
    }

    // 4. Insertar factura
    const baseAmount = priceInfo.amount / 100
    const vatAmount = baseAmount * 0.21
    const totalAmount = baseAmount + vatAmount

    const { data: invoice, error: invoiceError } = await supabaseServer
      .from("invoices")
      .insert({
        organization_id: 61, // tu empresa (proveedor del servicio)
        client_id: clientId,
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        base_amount: baseAmount,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        notes: `${plan.name} (${baseAmount}€) - ${period === "monthly" ? "Mensual" : "Anual"}`,
      })
      .select()
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: invoiceError?.message }, { status: 500 })
    }

    // 5. Insertar línea de factura
    await supabaseServer.from("invoice_lines").insert({
      invoice_id: invoice.id,
      description: `${plan.name} - ${period === "monthly" ? "Mensual" : "Anual"}`,
      quantity: 1,
      unit_price: baseAmount,
      discount_percentage: 0,
      vat_rate: 21,
      irpf_rate: 0,
      retention_rate: 0,
      line_amount: baseAmount,
    })

    // 6. Generar PDF con pdf-lib
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([600, 400])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    page.drawText("Factura en borrador", { x: 50, y: 350, size: 20, font, color: rgb(0, 0, 0) })
    page.drawText(`Cliente: ${org.name}`, { x: 50, y: 310, size: 12, font })
    page.drawText(`Concepto: ${plan.name} - ${period === "monthly" ? "Mensual" : "Anual"}`, { x: 50, y: 290, size: 12, font })
    page.drawText(`Base: ${baseAmount.toFixed(2)} €`, { x: 50, y: 270, size: 12, font })
    page.drawText(`IVA 21%: ${vatAmount.toFixed(2)} €`, { x: 50, y: 250, size: 12, font })
    page.drawText(`Total: ${totalAmount.toFixed(2)} €`, { x: 50, y: 230, size: 12, font })

    const pdfBytes = await pdfDoc.save()
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64")

    // 7. Enviar email con PDF adjunto
    if (org.email) {
      try {
        const result = await resend.emails.send({
          from: "onboarding@resend.dev", // 👈 usa este en pruebas
          to: org.email,
          subject: `Nueva factura en borrador - ${plan.name}`,
          html: `
            <h2>Hola ${org.name},</h2>
            <p>Se ha generado una nueva factura en estado <b>Borrador</b>.</p>
            <p>Total: <b>${totalAmount.toFixed(2)} €</b> (IVA incluido)</p>
            <br/>
            <p>Adjuntamos el PDF de la factura.</p>
          `,
          attachments: [
            {
              filename: `Factura-${invoice.id}.pdf`,
              content: pdfBase64,
            },
          ],
        })

        console.log("✅ Email enviado con Resend:", result)
      } catch (mailErr: any) {
        console.error("❌ Error enviando email con Resend:", mailErr)
      }
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (err: any) {
    console.error("❌ Error en API facturas:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
