import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { STRIPE_PLANS } from "@/lib/stripe-config"
import { Resend } from "resend"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { addMonths, addYears } from "date-fns"

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

    // 1. Organización
    const { data: org, error: orgError } = await supabaseServer
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    // 2. Plan
    const tier = (org.subscription_tier || "INICIAL").toUpperCase() as keyof typeof STRIPE_PLANS
    const plan = STRIPE_PLANS[tier]
    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 })
    }

    // ⚡ Usamos el periodo de facturación de la organización
    const period = (org.subscription_billing_period || "monthly") as "monthly" | "yearly"
    const priceInfo = plan.prices[period]

    // 3. Cliente
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

    // 4. Factura
    const baseAmount = priceInfo.amount / 100
    const vatAmount = baseAmount * 0.21
    const totalAmount = baseAmount + vatAmount

    const { data: invoice, error: invoiceError } = await supabaseServer
      .from("invoices")
      .insert({
        organization_id: org.id,
        client_id: clientId,
        status: "issued",
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

    // 5. Actualizar fecha de expiración
    let newExpiration: Date
    if (period === "monthly") {
      newExpiration = addMonths(new Date(), 1)
    } else {
      newExpiration = addYears(new Date(), 1)
    }

    await supabaseServer
      .from("organizations")
      .update({ subscription_expires: newExpiration.toISOString() })
      .eq("id", org.id)

    // 6. PDF con estilo
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([600, 500])
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    page.drawRectangle({
      x: 0,
      y: 450,
      width: 600,
      height: 50,
      color: rgb(0.85, 0.80, 0.95),
    })
    page.drawText("Factura de Suscripción", { x: 180, y: 465, size: 18, font: fontBold, color: rgb(0.3, 0.2, 0.5) })

    page.drawText(`Cliente: ${org.name}`, { x: 50, y: 420, size: 12, font })
    page.drawText("Concepto:", { x: 50, y: 380, size: 12 })
    page.drawText(`${plan.name} - ${period === "monthly" ? "Mensual" : "Anual"}`, { x: 150, y: 380, size: 12, font })
    page.drawText("Base imponible:", { x: 50, y: 350, size: 12, font })
    page.drawText(`${baseAmount.toFixed(2)} €`, { x: 200, y: 350, size: 12, font })
    page.drawText("IVA (21%):", { x: 50, y: 330, size: 12, font })
    page.drawText(`${vatAmount.toFixed(2)} €`, { x: 200, y: 330, size: 12, font })
    page.drawText("TOTAL:", { x: 50, y: 310, size: 14 })
    page.drawText(`${totalAmount.toFixed(2)} €`, { x: 200, y: 310, size: 14, color: rgb(0.6, 0.1, 0.6) })
    page.drawText("¡Gracias por confiar en Healthmate y suscribirte a nuestro servicio!", {
      x: 50,
      y: 270,
      size: 12,
      font,
      color: rgb(0.3, 0.2, 0.5),
    })

    const pdfBytes = await pdfDoc.save()
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64")

    // 7. Email amigable
    if (org.email) {
      const html = `
        <div style="font-family: Arial, sans-serif; background:#f5f0ff; padding:40px;">
          <div style="background:#fff; max-width:600px; margin:auto; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
            <div style="background:#7d5ab5; color:#fff; padding:20px; text-align:center;">
              <h1 style="margin:0;">HEALTHMATE</h1>
              <p style="margin:0; font-size:14px;">Factura de suscripción</p>
            </div>
            <div style="padding:30px; color:#333;">
              <p>Hola <b>${org.name}</b>,</p>
              <p>¡Gracias por suscribirte a <b>Healthmate</b>! 🎉</p>
              <p>Adjuntamos tu factura correspondiente a tu suscripción:</p>
              <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                <tr style="background:#f9f6ff;">
                  <td style="border: 1px solid #ddd; padding: 10px;">Concepto</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align:right;">${plan.name} (${period === "monthly" ? "Mensual" : "Anual"})</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">Base imponible</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align:right;">${baseAmount.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td style="border: 1px solid #ddd; padding: 10px;">IVA (21%)</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align:right;">${vatAmount.toFixed(2)} €</td>
                </tr>
                <tr style="background:#f5f0ff;">
                  <td style="border: 1px solid #ddd; padding: 10px; font-weight:bold;">TOTAL</td>
                  <td style="border: 1px solid #ddd; padding: 10px; text-align:right; font-weight:bold; color:#7d5ab5;">${totalAmount.toFixed(2)} €</td>
                </tr>
              </table>
              <p style="margin-top:20px;">Gracias por ser parte de Physia 💜</p>
            </div>
            <div style="background:#f5f0ff; padding:15px; text-align:center; font-size:12px; color:#555;">
              © ${new Date().getFullYear()} Physia. Todos los derechos reservados.
            </div>
          </div>
        </div>
      `

      try {
        await resend.emails.send({
          from: "facturas@app.healthmate.tech",
          to: org.email,
          subject: `Tu factura de suscripción - ${plan.name}`,
          html,
          attachments: [
            {
              filename: `Factura-${invoice.id}.pdf`,
              content: pdfBase64,
            },
          ],
        })
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
