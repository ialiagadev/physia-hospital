import jsPDF from "jspdf"
import { supabase } from "@/lib/supabase/client"

// Interfaces actualizadas para coincidir con tu código
interface InvoiceData {
  id: number
  invoice_number: string
  issue_date: string
  invoice_type?: "normal" | "rectificativa" | "simplificada"
  status?: string
  base_amount: number
  vat_amount: number
  irpf_amount: number
  retention_amount: number
  total_amount: number
  notes?: string
  signature?: string | null
  original_invoice_number?: string
  rectification_reason?: string
  rectification_type?: "cancellation" | "amount_correction"
  organization_id?: number
  organization?: {
    id?: number
    name: string
    tax_id: string
    address: string
    postal_code: string
    city: string
    province: string
    country: string
    email: string
    phone: string
    logo_url?: string | null
    logo_path?: string | null
  }
  client_data?: {
    name: string
    tax_id: string
    address: string
    postal_code: string
    city: string
    province: string
    country: string
    email?: string
    phone?: string
    client_type: string
  }
}

interface InvoiceLine {
  id: string | number
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  irpf_rate: number
  retention_rate: number
  line_amount: number
  professional_id?: string | number | null
}

interface OriginalInvoiceData {
  invoice_number: string
  issue_date: string
  base_amount: number
  vat_amount: number
  irpf_amount: number
  retention_amount: number
  total_amount: number
  client_data?: {
    name: string
    tax_id: string
  }
}

/**
 * Obtiene los datos de la factura original para comparación
 */
async function getOriginalInvoiceData(
  originalInvoiceNumber: string,
  organizationId: number,
): Promise<OriginalInvoiceData | null> {
  try {
    const { data: originalInvoice, error } = await supabase
      .from("invoices")
      .select(`
        invoice_number,
        issue_date,
        base_amount,
        vat_amount,
        irpf_amount,
        retention_amount,
        total_amount,
        clients (
          name,
          tax_id
        )
      `)
      .eq("invoice_number", originalInvoiceNumber)
      .eq("organization_id", organizationId)
      .single()

    if (error || !originalInvoice) {
      console.error("Error al obtener factura original:", error)
      return null
    }

    // Manejar el caso donde clients puede ser un array o un objeto
    let clientData = undefined
    if (originalInvoice.clients) {
      // Usar casting para evitar errores de TypeScript
      const clientsData = originalInvoice.clients as any

      if (Array.isArray(clientsData) && clientsData.length > 0) {
        clientData = {
          name: clientsData[0]?.name || "Cliente no encontrado",
          tax_id: clientsData[0]?.tax_id || "",
        }
      } else if (typeof clientsData === "object") {
        // Si es un objeto, acceder directamente
        clientData = {
          name: clientsData.name || "Cliente no encontrado",
          tax_id: clientsData.tax_id || "",
        }
      }
    }

    return {
      invoice_number: originalInvoice.invoice_number,
      issue_date: originalInvoice.issue_date,
      base_amount: originalInvoice.base_amount || 0,
      vat_amount: originalInvoice.vat_amount || 0,
      irpf_amount: originalInvoice.irpf_amount || 0,
      retention_amount: originalInvoice.retention_amount || 0,
      total_amount: originalInvoice.total_amount || 0,
      client_data: clientData,
    }
  } catch (error) {
    console.error("Error al consultar factura original:", error)
    return null
  }
}

/**
 * Genera el PDF de la factura con soporte mejorado para rectificativas
 */
export async function generatePdf(
  invoice: InvoiceData,
  invoiceLines: InvoiceLine[],
  fileName: string,
  autoDownload = true,
): Promise<Blob | null> {
  try {
    const doc = new jsPDF()
    let yPosition = 20

    // Configurar fuentes y colores según el tipo de factura
    const isRectificative = invoice.invoice_type === "rectificativa"
    const isSimplified = invoice.invoice_type === "simplificada"

    const headerColor = isRectificative ? [220, 53, 69] : isSimplified ? [13, 110, 253] : [40, 167, 69]
    const headerTextColor = [255, 255, 255]

    // === HEADER PRINCIPAL ===
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2])
    doc.rect(0, 0, 210, 25, "F")

    doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2])
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")

    let headerTitle = "FACTURA"
    if (isRectificative) headerTitle = "FACTURA RECTIFICATIVA"
    if (isSimplified) headerTitle = "FACTURA SIMPLIFICADA"

    doc.text(headerTitle, 105, 15, { align: "center" })

    // Reset color
    doc.setTextColor(0, 0, 0)
    yPosition = 35

    // === INFORMACIÓN DE LA ORGANIZACIÓN ===
    if (invoice.organization) {
      // Intentar añadir logo si existe
      if (invoice.organization.logo_url || invoice.organization.logo_path) {
        try {
          const logoUrl = invoice.organization.logo_url || invoice.organization.logo_path
          if (logoUrl) {
            // Cargar y añadir logo (esto requiere que la imagen sea accesible)
            doc.addImage(logoUrl, "PNG", 150, yPosition - 10, 40, 20)
          }
        } catch (error) {
          console.log("No se pudo cargar el logo:", error)
        }
      }

      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(invoice.organization.name, 20, yPosition)
      yPosition += 8

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`CIF: ${invoice.organization.tax_id}`, 20, yPosition)
      yPosition += 5
      doc.text(invoice.organization.address, 20, yPosition)
      yPosition += 5
      doc.text(
        `${invoice.organization.postal_code} ${invoice.organization.city}, ${invoice.organization.province}`,
        20,
        yPosition,
      )
      yPosition += 5
      if (invoice.organization.email) {
        doc.text(`Email: ${invoice.organization.email}`, 20, yPosition)
        yPosition += 5
      }
      if (invoice.organization.phone) {
        doc.text(`Teléfono: ${invoice.organization.phone}`, 20, yPosition)
        yPosition += 5
      }
    }

    // === INFORMACIÓN DE LA FACTURA ===
    const invoiceInfoX = 130
    let invoiceInfoY = 35

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("DATOS DE LA FACTURA", invoiceInfoX, invoiceInfoY)
    invoiceInfoY += 10

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Número: ${invoice.invoice_number}`, invoiceInfoX, invoiceInfoY)
    invoiceInfoY += 5
    doc.text(`Fecha: ${new Date(invoice.issue_date).toLocaleDateString("es-ES")}`, invoiceInfoX, invoiceInfoY)
    invoiceInfoY += 5
    if (invoice.status) {
      doc.text(`Estado: ${getStatusText(invoice.status)}`, invoiceInfoX, invoiceInfoY)
      invoiceInfoY += 5
    }

    // === INFORMACIÓN ESPECÍFICA PARA RECTIFICATIVAS ===
    if (isRectificative) {
      yPosition = Math.max(yPosition, invoiceInfoY) + 10

      // Sección destacada para rectificativas - SIEMPRE mostrar para rectificativas
      doc.setFillColor(255, 243, 205) // Fondo amarillo claro
      doc.rect(15, yPosition - 5, 180, 35, "F")
      doc.setDrawColor(220, 53, 69)
      doc.rect(15, yPosition - 5, 180, 35, "S")

      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(220, 53, 69)
      doc.text("INFORMACIÓN DE RECTIFICACIÓN", 20, yPosition + 3)

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)

      // Mostrar factura original (siempre, aunque esté vacía)
      const originalNumber = invoice.original_invoice_number || "No especificada"
      doc.text(`Factura original: ${originalNumber}`, 20, yPosition + 12)

      // Mostrar tipo de rectificación
      const rectificationType =
        invoice.rectification_type === "cancellation"
          ? "Por sustitución (anula la original)"
          : "Por diferencias (ajusta importes)"
      doc.text(`Tipo: ${rectificationType}`, 20, yPosition + 20)

      // Mostrar motivo (siempre, aunque esté vacío)
      const reason = invoice.rectification_reason || "No especificado"
      doc.text(`Motivo: ${reason}`, 20, yPosition + 28)

      yPosition += 40

      // Si hay factura original Y es por diferencias, obtener datos para comparación
      if (invoice.original_invoice_number && invoice.rectification_type === "amount_correction") {
        const orgId = invoice.organization?.id || invoice.organization_id || (invoice as any).id
        const originalInvoice = orgId ? await getOriginalInvoiceData(invoice.original_invoice_number, orgId) : null

        if (originalInvoice) {
          yPosition += 5
          doc.setFont("helvetica", "bold")
          doc.text("COMPARACIÓN DE IMPORTES", 20, yPosition)
          yPosition += 8

          // Tabla de comparación
          const comparisonData = [
            ["Concepto", "Factura Original", "Factura Rectificativa", "Diferencia"],
            [
              "Base Imponible",
              `${originalInvoice.base_amount.toFixed(2)} €`,
              `${invoice.base_amount.toFixed(2)} €`,
              `${(invoice.base_amount - originalInvoice.base_amount).toFixed(2)} €`,
            ],
            [
              "IVA",
              `${originalInvoice.vat_amount.toFixed(2)} €`,
              `${invoice.vat_amount.toFixed(2)} €`,
              `${(invoice.vat_amount - originalInvoice.vat_amount).toFixed(2)} €`,
            ],
            [
              "IRPF",
              `${originalInvoice.irpf_amount.toFixed(2)} €`,
              `${invoice.irpf_amount.toFixed(2)} €`,
              `${(invoice.irpf_amount - originalInvoice.irpf_amount).toFixed(2)} €`,
            ],
            [
              "Total",
              `${originalInvoice.total_amount.toFixed(2)} €`,
              `${invoice.total_amount.toFixed(2)} €`,
              `${(invoice.total_amount - originalInvoice.total_amount).toFixed(2)} €`,
            ],
          ]

          yPosition = drawTable(doc, comparisonData, 20, yPosition, 170)
          yPosition += 10
        }
      }
    }

    // Continuar con el resto del código...
    // === INFORMACIÓN DEL CLIENTE ===
    yPosition = Math.max(yPosition, 90)

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("FACTURAR A:", 20, yPosition)
    yPosition += 8

    if (invoice.client_data) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(invoice.client_data.name, 20, yPosition)
      yPosition += 5
      doc.text(`CIF/NIF: ${invoice.client_data.tax_id}`, 20, yPosition)
      yPosition += 5
      doc.text(invoice.client_data.address, 20, yPosition)
      yPosition += 5
      doc.text(
        `${invoice.client_data.postal_code} ${invoice.client_data.city}, ${invoice.client_data.province}`,
        20,
        yPosition,
      )
      yPosition += 5
      if (invoice.client_data.email) {
        doc.text(`Email: ${invoice.client_data.email}`, 20, yPosition)
        yPosition += 5
      }
      if (invoice.client_data.phone) {
        doc.text(`Teléfono: ${invoice.client_data.phone}`, 20, yPosition)
        yPosition += 5
      }
    }

    yPosition += 10

    // === LÍNEAS DE FACTURA ===
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("DETALLE DE SERVICIOS", 20, yPosition)
    yPosition += 8

    // Preparar datos de la tabla
    const tableData = [["Descripción", "Cant.", "Precio", "IVA%", "IRPF%", "Ret%", "Importe"]]

    invoiceLines.forEach((line) => {
      tableData.push([
        line.description,
        line.quantity.toString(),
        `${line.unit_price.toFixed(2)} €`,
        `${line.vat_rate}%`,
        `${line.irpf_rate}%`,
        `${line.retention_rate}%`,
        `${line.line_amount.toFixed(2)} €`,
      ])
    })

    yPosition = drawTable(doc, tableData, 20, yPosition, 170)

    // === TOTALES ===
    yPosition += 10
    const totalsX = 130

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Base Imponible: ${invoice.base_amount.toFixed(2)} €`, totalsX, yPosition)
    yPosition += 5
    doc.text(`IVA: ${invoice.vat_amount.toFixed(2)} €`, totalsX, yPosition)
    yPosition += 5

    if (invoice.irpf_amount > 0) {
      doc.text(`IRPF: -${invoice.irpf_amount.toFixed(2)} €`, totalsX, yPosition)
      yPosition += 5
    }

    if (invoice.retention_amount > 0) {
      doc.text(`Retención: -${invoice.retention_amount.toFixed(2)} €`, totalsX, yPosition)
      yPosition += 5
    }

    // Total destacado
    doc.setDrawColor(0, 0, 0)
    doc.line(totalsX, yPosition, totalsX + 60, yPosition)
    yPosition += 3
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(`TOTAL: ${invoice.total_amount.toFixed(2)} €`, totalsX, yPosition)

    // === FIRMA ===
    if (invoice.signature) {
      yPosition += 20
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("FIRMA:", 20, yPosition)
      yPosition += 5

      try {
        doc.addImage(invoice.signature, "PNG", 20, yPosition, 60, 30)
      } catch (error) {
        console.error("Error al añadir firma:", error)
        doc.setFont("helvetica", "normal")
        doc.text("(Firma digital incluida)", 20, yPosition + 15)
      }
    }

    // === NOTAS LEGALES ===
    yPosition += 40
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 100, 100)

    let legalText = ""
    if (isRectificative) {
      legalText = "Esta factura rectificativa modifica la factura original indicada. "
      if (invoice.rectification_type === "cancellation") {
        legalText += "La factura original queda anulada y sustituida por esta rectificativa."
      } else {
        legalText += "Esta rectificativa ajusta únicamente las diferencias indicadas."
      }
    } else if (isSimplified) {
      legalText =
        "Factura simplificada emitida conforme al artículo 7.2 del RD 1619/2012. Válida únicamente para importes inferiores a 400€."
    } else {
      legalText = "Factura emitida conforme a la normativa fiscal vigente."
    }

    const legalLines = doc.splitTextToSize(legalText, 170)
    doc.text(legalLines, 20, yPosition)

    // Generar el blob
    const pdfBlob = doc.output("blob")

    if (autoDownload) {
      doc.save(fileName)
    }

    return pdfBlob
  } catch (error) {
    console.error("Error al generar PDF:", error)
    return null
  }
}

/**
 * Función auxiliar para dibujar tablas
 */
function drawTable(doc: jsPDF, data: string[][], x: number, y: number, width: number): number {
  const rowHeight = 6
  const colWidths = calculateColumnWidths(data, width)
  let currentY = y

  data.forEach((row, rowIndex) => {
    let currentX = x

    // Header con fondo
    if (rowIndex === 0) {
      doc.setFillColor(240, 240, 240)
      doc.rect(x, currentY - 4, width, rowHeight, "F")
      doc.setFont("helvetica", "bold")
    } else {
      doc.setFont("helvetica", "normal")
    }

    row.forEach((cell, colIndex) => {
      doc.text(cell, currentX + 2, currentY, { maxWidth: colWidths[colIndex] - 4 })
      currentX += colWidths[colIndex]
    })

    // Líneas de la tabla
    doc.setDrawColor(200, 200, 200)
    doc.line(x, currentY + 2, x + width, currentY + 2)

    currentY += rowHeight
  })

  // Borde de la tabla
  doc.setDrawColor(0, 0, 0)
  doc.rect(x, y - 4, width, data.length * rowHeight)

  return currentY
}

/**
 * Calcula el ancho de las columnas
 */
function calculateColumnWidths(data: string[][], totalWidth: number): number[] {
  const numCols = data[0].length
  const baseWidth = totalWidth / numCols

  // Para la tabla de servicios, ajustar anchos específicos
  if (numCols === 7) {
    return [60, 20, 25, 20, 20, 20, 25] // Descripción más ancha
  }

  // Para otras tablas, distribución uniforme
  return Array(numCols).fill(baseWidth)
}

/**
 * Traduce el estado de la factura
 */
function getStatusText(status: string): string {
  switch (status) {
    case "draft":
      return "Borrador"
    case "issued":
      return "Emitida"
    case "paid":
      return "Pagada"
    case "rejected":
      return "Rechazada"
    default:
      return status
  }
}
