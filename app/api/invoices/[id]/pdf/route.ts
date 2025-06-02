import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin" // Importa supabaseAdmin

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    // const supabase = createServerSupabaseClient() // Eliminar esto
    const supabase = supabaseAdmin // Usar supabaseAdmin

    // Verificar autenticación
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Obtener factura con información del cliente y organización
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        *,
        clients (*),
        organizations (*)
      `)
      .eq("id", params.id)
      .single()

    if (error || !invoice) {
      console.error("Error al obtener la factura:", error)
      return new NextResponse("Factura no encontrada", { status: 404 })
    }

    // Verificar que tenemos todos los datos de la organización
    if (!invoice.organizations || !invoice.organizations.name || !invoice.organizations.tax_id) {
      console.error("Datos de organización incompletos:", invoice.organizations)
      return new NextResponse("Datos de organización incompletos", { status: 500 })
    }

    // Obtener líneas de factura
    const { data: invoiceLines, error: linesError } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", params.id)
      .order("id", { ascending: true })

    if (linesError) {
      console.error("Error al obtener líneas de factura:", linesError)
      return new NextResponse("Error al obtener líneas de factura", { status: 500 })
    }

    // Aquí iría la lógica para generar el PDF
    // Por ahora, devolvemos un PDF de ejemplo

    // Simulación de PDF (texto plano para este ejemplo)
    const pdfContent = `
      FACTURA ${invoice.invoice_number}
      
      EMISOR:
      ${invoice.organizations.name}
      ${invoice.organizations.tax_id}
      ${invoice.organizations.address || ""}
      ${invoice.organizations.postal_code || ""} ${invoice.organizations.city || ""}, ${invoice.organizations.province || ""}
      ${invoice.organizations.country || "España"}
      ${invoice.organizations.email ? `Email: ${invoice.organizations.email}` : ""}
      ${invoice.organizations.phone ? `Teléfono: ${invoice.organizations.phone}` : ""}
      
      CLIENTE:
      ${invoice.clients.name}
      ${invoice.clients.tax_id}
      ${invoice.clients.address}
      ${invoice.clients.postal_code} ${invoice.clients.city}, ${invoice.clients.province}
      ${invoice.clients.email ? `Email: ${invoice.clients.email}` : ""}
      ${invoice.clients.phone ? `Teléfono: ${invoice.clients.phone}` : ""}
      
      FECHA: ${new Date(invoice.issue_date).toLocaleDateString()}
      
      LÍNEAS:
      ${invoiceLines
        ?.map(
          (line) =>
            `${line.description} - ${line.quantity} x ${line.unit_price.toFixed(2)} € = ${line.line_amount.toFixed(2)} €`,
        )
        .join("\n")}
      
      BASE IMPONIBLE: ${invoice.base_amount.toFixed(2)} €
      IVA: ${invoice.vat_amount.toFixed(2)} €
      IRPF: -${invoice.irpf_amount.toFixed(2)} €
      TOTAL: ${invoice.total_amount.toFixed(2)} €
    `

    return new NextResponse(pdfContent, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="factura-${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error al generar PDF:", error)
    return new NextResponse("Error al generar el PDF", { status: 500 })
  }
}