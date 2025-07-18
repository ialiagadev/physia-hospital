import jsPDF from "jspdf"
import { supabase } from "@/lib/supabase/client"

// Define types for invoice data and invoice lines
export interface InvoiceData {
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
  discount_amount?: number
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
  payment_method?: "tarjeta" | "efectivo" | "transferencia" | "paypal" | "bizum" | "otro"
  payment_method_other?: string | null
}

export interface InvoiceLine {
  id: string | number
  description: string
  quantity: number
  unit_price: number
  discount_percentage?: number
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

    let clientData = undefined
    if (originalInvoice.clients) {
      const clientsData = originalInvoice.clients as any
      if (Array.isArray(clientsData) && clientsData.length > 0) {
        clientData = {
          name: clientsData[0]?.name || "Cliente no encontrado",
          tax_id: clientsData[0]?.tax_id || "",
        }
      } else if (typeof clientsData === "object") {
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
 * Carga una imagen desde una URL y la convierte a base64
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: "cors" })
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Error al cargar imagen:", error)
    return null
  }
}

/**
 * Valida y sanitiza los datos de la factura
 */
function validateInvoiceData(invoice: InvoiceData): InvoiceData {
  return {
    ...invoice,
    base_amount: Number(invoice.base_amount) || 0,
    vat_amount: Number(invoice.vat_amount) || 0,
    irpf_amount: Number(invoice.irpf_amount) || 0,
    retention_amount: Number(invoice.retention_amount) || 0,
    total_amount: Number(invoice.total_amount) || 0,
    discount_amount: Number(invoice.discount_amount) || 0,
    invoice_number: invoice.invoice_number || "Sin número",
    issue_date: invoice.issue_date || new Date().toISOString(),
  }
}

/**
 * Valida y sanitiza las líneas de factura
 */
function validateInvoiceLines(lines: InvoiceLine[]): InvoiceLine[] {
  return lines.map((line) => ({
    ...line,
    description: line.description || "Sin descripción",
    quantity: Number(line.quantity) || 0,
    unit_price: Number(line.unit_price) || 0,
    discount_percentage: Number(line.discount_percentage) || 0,
    vat_rate: Number(line.vat_rate) || 0,
    irpf_rate: Number(line.irpf_rate) || 0,
    retention_rate: Number(line.retention_rate) || 0,
    line_amount: Number(line.line_amount) || 0,
  }))
}

/**
 * Genera el PDF de la factura con diseño compacto mejorado
 */
export async function generatePdf(
  invoice: InvoiceData,
  invoiceLines: InvoiceLine[],
  fileName: string,
  autoDownload = true,
): Promise<Blob | null> {
  try {
    const validatedInvoice = validateInvoiceData(invoice)
    const validatedLines = validateInvoiceLines(invoiceLines)

    console.log("📄 Generando PDF compacto mejorado:", {
      invoice: validatedInvoice,
      lines: validatedLines,
      fileName,
    })

    const doc = new jsPDF()
    let yPosition = 20

    // Solo usar negro
    doc.setTextColor(0, 0, 0)

    const isRectificative = validatedInvoice.invoice_type === "rectificativa"
    const isSimplified = validatedInvoice.invoice_type === "simplificada"

    // === HEADER COMPACTO ===
    doc.setFontSize(16)
    doc.setFont("helvetica", "normal")
    let headerTitle = "Factura"
    if (isRectificative) headerTitle = "Factura Rectificativa"
    if (isSimplified) headerTitle = "Factura Simplificada"
    doc.text(headerTitle, 20, yPosition)

    // Nombre de la organización a la derecha
    if (validatedInvoice.organization) {
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(validatedInvoice.organization.name.toUpperCase(), 190, yPosition, { align: "right" })

      // === LOGO (si existe) ===
      if (validatedInvoice.organization.logo_url || validatedInvoice.organization.logo_path) {
        try {
          const logoUrl = validatedInvoice.organization.logo_url || validatedInvoice.organization.logo_path
          if (logoUrl) {
            const logoBase64 = await loadImageAsBase64(logoUrl)
            if (logoBase64) {
              const tempImg = new Image()
              tempImg.src = logoBase64

              await new Promise((resolve) => {
                tempImg.onload = resolve
                tempImg.onerror = resolve
              })

              const maxWidth = 30
              const maxHeight = 20
              let logoWidth = tempImg.width
              let logoHeight = tempImg.height

              if (logoWidth > maxWidth) {
                const ratio = maxWidth / logoWidth
                logoWidth = maxWidth
                logoHeight = logoHeight * ratio
              }
              if (logoHeight > maxHeight) {
                const ratio = maxHeight / logoHeight
                logoHeight = maxHeight
                logoWidth = logoWidth * ratio
              }

              const logoX = 190 - logoWidth
              const logoY = yPosition + 5
              doc.addImage(logoBase64, "PNG", logoX, logoY, logoWidth, logoHeight)
            }
          }
        } catch (error) {
          console.log("No se pudo cargar el logo:", error)
        }
      }
    }

    yPosition += 15

    // === INFORMACIÓN DE FACTURA COMPACTA ===
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Número de factura", 20, yPosition)
    doc.text(validatedInvoice.invoice_number, 80, yPosition)
    yPosition += 5

    doc.text("Fecha de emisión", 20, yPosition)
    doc.text(
      new Date(validatedInvoice.issue_date).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      80,
      yPosition,
    )
    yPosition += 15

    // === INFORMACIÓN DE EMPRESA Y CLIENTE EN DOS COLUMNAS ===
    const leftColumnX = 20
    const rightColumnX = 110
    const startY = yPosition

    // Empresa (izquierda) - INCLUYENDO CIF/NIF
    if (validatedInvoice.organization) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text(validatedInvoice.organization.name.toUpperCase(), leftColumnX, yPosition)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      yPosition += 5

      // ✅ AÑADIR CIF/NIF DE LA EMPRESA
      if (validatedInvoice.organization.tax_id) {
        doc.setFont("helvetica", "bold")
        doc.text(`CIF/NIF: ${validatedInvoice.organization.tax_id}`, leftColumnX, yPosition)
        doc.setFont("helvetica", "normal")
        yPosition += 4
      }

      doc.text(validatedInvoice.organization.address, leftColumnX, yPosition)
      yPosition += 4
      doc.text(
        `${validatedInvoice.organization.postal_code} ${validatedInvoice.organization.city} ${validatedInvoice.organization.province}`,
        leftColumnX,
        yPosition,
      )
      yPosition += 4
      doc.text(validatedInvoice.organization.country, leftColumnX, yPosition)
      yPosition += 4
      doc.text(validatedInvoice.organization.phone, leftColumnX, yPosition)
      yPosition += 4
      doc.text(validatedInvoice.organization.email, leftColumnX, yPosition)
    }

    // Cliente (derecha) - INCLUYENDO CIF/NIF
    let clientY = startY
    if (validatedInvoice.client_data) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.text("Facturar a", rightColumnX, clientY)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      clientY += 5
      doc.text(validatedInvoice.client_data.name, rightColumnX, clientY)
      clientY += 4

      // ✅ AÑADIR CIF/NIF DEL CLIENTE
      if (validatedInvoice.client_data.tax_id) {
        doc.setFont("helvetica", "bold")
        doc.text(`CIF/NIF: ${validatedInvoice.client_data.tax_id}`, rightColumnX, clientY)
        doc.setFont("helvetica", "normal")
        clientY += 4
      }

      doc.text(validatedInvoice.client_data.address, rightColumnX, clientY)
      clientY += 4
      doc.text(
        `${validatedInvoice.client_data.postal_code} ${validatedInvoice.client_data.city}`,
        rightColumnX,
        clientY,
      )
      clientY += 4
      doc.text(validatedInvoice.client_data.country, rightColumnX, clientY)
      if (validatedInvoice.client_data.phone) {
        clientY += 4
        doc.text(validatedInvoice.client_data.phone, rightColumnX, clientY)
      }
      if (validatedInvoice.client_data.email) {
        clientY += 4
        doc.text(validatedInvoice.client_data.email, rightColumnX, clientY)
      }
    }

    yPosition = Math.max(yPosition, clientY) + 15

    // === INFORMACIÓN ESPECÍFICA PARA RECTIFICATIVAS ===
    if (isRectificative) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text(
        `Factura anulada el ${new Date(validatedInvoice.issue_date).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`,
        20,
        yPosition,
      )
      yPosition += 10

      if (validatedInvoice.original_invoice_number) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.text(`Rectifica la factura: ${validatedInvoice.original_invoice_number}`, 20, yPosition)
        yPosition += 6

        if (validatedInvoice.rectification_reason) {
          const reasonLines = doc.splitTextToSize(`Motivo: ${validatedInvoice.rectification_reason}`, 170)
          doc.text(reasonLines, 20, yPosition)
          yPosition += reasonLines.length * 4 + 5
        }
      }

      yPosition += 10

      // Tabla de comparación para rectificativas por diferencias
      if (validatedInvoice.original_invoice_number && validatedInvoice.rectification_type === "amount_correction") {
        const orgId = validatedInvoice.organization?.id || validatedInvoice.organization_id || validatedInvoice.id
        const originalInvoice = orgId
          ? await getOriginalInvoiceData(validatedInvoice.original_invoice_number, orgId)
          : null

        if (originalInvoice) {
          doc.setFont("helvetica", "bold")
          doc.setFontSize(10)
          doc.text("COMPARACIÓN DE IMPORTES", 20, yPosition)
          yPosition += 8

          const comparisonData = [
            ["Concepto", "Original", "Rectificativa", "Diferencia"],
            [
              "Base Imponible",
              `${originalInvoice.base_amount.toFixed(2)} €`,
              `${validatedInvoice.base_amount.toFixed(2)} €`,
              `${(validatedInvoice.base_amount - originalInvoice.base_amount).toFixed(2)} €`,
            ],
            [
              "IVA",
              `${originalInvoice.vat_amount.toFixed(2)} €`,
              `${validatedInvoice.vat_amount.toFixed(2)} €`,
              `${(validatedInvoice.vat_amount - originalInvoice.vat_amount).toFixed(2)} €`,
            ],
            [
              "IRPF",
              `${originalInvoice.irpf_amount.toFixed(2)} €`,
              `${validatedInvoice.irpf_amount.toFixed(2)} €`,
              `${(validatedInvoice.irpf_amount - originalInvoice.irpf_amount).toFixed(2)} €`,
            ],
            [
              "Total",
              `${originalInvoice.total_amount.toFixed(2)} €`,
              `${validatedInvoice.total_amount.toFixed(2)} €`,
              `${(validatedInvoice.total_amount - originalInvoice.total_amount).toFixed(2)} €`,
            ],
          ]

          yPosition = drawCompactTable(doc, comparisonData, 20, yPosition, 170)
          yPosition += 10
        }
      }
    }

    // === TABLA DE SERVICIOS MEJORADA ===
    yPosition += 5

    // Headers de la tabla
    const tableHeaders = ["Descripción", "Cant.", "Precio unitario", "Impuesto", "Importe"]
    const colPositions = [20, 100, 115, 140, 165]

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    tableHeaders.forEach((header, index) => {
      doc.text(header, colPositions[index], yPosition)
    })
    yPosition += 6

    // Línea separadora
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 8

    // ✅ FILAS DE DATOS MEJORADAS - SIN ESTADO DE CITA
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    validatedLines.forEach((line) => {
      // Verificar si necesitamos nueva página
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 30

        // Repetir headers en nueva página
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        tableHeaders.forEach((header, index) => {
          doc.text(header, colPositions[index], yPosition)
        })
        yPosition += 6
        doc.line(20, yPosition, 190, yPosition)
        yPosition += 8
        doc.setFont("helvetica", "normal")
      }

      // ✅ DESCRIPCIÓN LIMPIA - SIN ESTADO
      let description = line.description
      if (line.discount_percentage && line.discount_percentage > 0) {
        description += ` (Desc. ${line.discount_percentage}%)`
      }

      const descLines = doc.splitTextToSize(description, 75)
      const lineHeight = Math.max(6, descLines.length * 4)

      // Descripción
      doc.text(descLines, colPositions[0], yPosition)

      // Cantidad (centrada verticalmente)
      const centerY = yPosition + (lineHeight - 4) / 2
      doc.text(line.quantity.toString(), colPositions[1], centerY)

      // Precio unitario
      doc.text(`${line.unit_price.toFixed(2)} €`, colPositions[2], centerY)

      // Impuesto
      let taxText = ""
      if (line.vat_rate > 0) taxText += `${line.vat_rate}%`
      if (line.irpf_rate > 0) {
        if (taxText) taxText += ", "
        taxText += `${line.irpf_rate}% IRPF`
      }
      doc.text(taxText || "0%", colPositions[3], centerY)

      // Importe
      doc.text(`${line.line_amount.toFixed(2)} €`, colPositions[4], centerY)

      yPosition += lineHeight + 2
    })

    yPosition += 10

    // === TOTALES MEJORADOS SIN SOLAPAMIENTOS ===
    const totalsX = 120
    const amountX = 185

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)

    // Subtotal
    doc.text("Subtotal", totalsX, yPosition)
    doc.text(`${validatedInvoice.base_amount.toFixed(2)} €`, amountX, yPosition, { align: "right" })
    yPosition += 5

    // Total sin impuestos
    doc.text("Total sin impuestos", totalsX, yPosition)
    doc.text(`${validatedInvoice.base_amount.toFixed(2)} €`, amountX, yPosition, { align: "right" })
    yPosition += 5

    // ✅ IVA MEJORADO SIN SOLAPAMIENTOS
    if (validatedInvoice.vat_amount > 0) {
      const vatRate = validatedLines.length > 0 ? validatedLines[0].vat_rate : 21

      // Línea principal del IVA
      doc.text(`IVA - España (${vatRate}%)`, totalsX, yPosition)
      doc.text(`${validatedInvoice.vat_amount.toFixed(2)} €`, amountX, yPosition, { align: "right" })
      yPosition += 4

      // Línea secundaria con base imponible (más pequeña y en gris)
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Base: ${validatedInvoice.base_amount.toFixed(2)} €`, totalsX + 5, yPosition)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      yPosition += 6
    }

    // IRPF
    if (validatedInvoice.irpf_amount > 0) {
      doc.text(`IRPF`, totalsX, yPosition)
      doc.text(`-${validatedInvoice.irpf_amount.toFixed(2)} €`, amountX, yPosition, { align: "right" })
      yPosition += 5
    }

    // Retención
    if (validatedInvoice.retention_amount > 0) {
      doc.text(`Retención`, totalsX, yPosition)
      doc.text(`-${validatedInvoice.retention_amount.toFixed(2)} €`, amountX, yPosition, { align: "right" })
      yPosition += 5
    }

    // Línea separadora antes del total
    yPosition += 2
    doc.setLineWidth(0.5)
    doc.line(totalsX, yPosition, amountX, yPosition)
    yPosition += 6

    // Total
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("Total", totalsX, yPosition)
    doc.text(`${validatedInvoice.total_amount.toFixed(2)} €`, amountX, yPosition, { align: "right" })
    yPosition += 8

    // Importe adeudado
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Importe adeudado", totalsX, yPosition)
    doc.text(`${validatedInvoice.total_amount.toFixed(2)} €`, amountX, yPosition, { align: "right" })
    yPosition += 20

    // === MÉTODO DE PAGO ===
    if (validatedInvoice.payment_method) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 30
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Método de Pago:", 20, yPosition)
      yPosition += 6

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      let paymentMethodText = ""
      switch (validatedInvoice.payment_method) {
        case "tarjeta":
          paymentMethodText = "Tarjeta"
          break
        case "efectivo":
          paymentMethodText = "Efectivo"
          break
        case "transferencia":
          paymentMethodText = "Transferencia"
          break
        case "paypal":
          paymentMethodText = "PayPal"
          break
        case "bizum":
          paymentMethodText = "Bizum"
          break
        case "otro":
          paymentMethodText = `Otro: ${validatedInvoice.payment_method_other || "No especificado"}`
          break
        default:
          paymentMethodText = "No especificado"
      }
      doc.text(paymentMethodText, 20, yPosition)
      yPosition += 10
    }

    // === NOTAS COMPACTAS ===
    if (validatedInvoice.notes && validatedInvoice.notes.trim()) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 30
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Notas:", 20, yPosition)
      yPosition += 6

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      const notesLines = doc.splitTextToSize(validatedInvoice.notes, 170)
      doc.text(notesLines, 20, yPosition)
      yPosition += notesLines.length * 4 + 10
    }

    // === FIRMA COMPACTA ===
    if (validatedInvoice.signature) {
      if (yPosition > 230) {
        doc.addPage()
        yPosition = 30
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.text("Firma:", 20, yPosition)
      yPosition += 8

      try {
        doc.addImage(validatedInvoice.signature, "PNG", 20, yPosition, 50, 20)
        yPosition += 25
      } catch (error) {
        console.error("Error al añadir firma:", error)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.text("(Firma digital incluida)", 20, yPosition)
        yPosition += 10
      }
    }

    // === NOTAS LEGALES COMPACTAS ===
    if (yPosition > 260) {
      doc.addPage()
      yPosition = 30
    }

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)

    let legalText = ""
    if (isRectificative) {
      legalText = "Esta factura rectificativa modifica la factura original indicada. "
      if (validatedInvoice.rectification_type === "cancellation") {
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

    // === PIE DE PÁGINA ===
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(`Página ${i} de ${pageCount}`, 185, 285, { align: "right" })
    }

    // Generar el blob
    const pdfBlob = doc.output("blob")
    console.log("✅ PDF compacto mejorado generado exitosamente")

    if (autoDownload) {
      doc.save(fileName)
    }

    return pdfBlob
  } catch (error) {
    console.error("❌ Error al generar PDF:", error)
    return null
  }
}

/**
 * Función para dibujar tablas compactas
 */
function drawCompactTable(doc: jsPDF, data: string[][], x: number, y: number, width: number): number {
  const rowHeight = 6
  const colWidths = calculateColumnWidths(data, width)
  let currentY = y

  data.forEach((row, rowIndex) => {
    let currentX = x

    if (rowIndex === 0) {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
    } else {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
    }

    row.forEach((cell, colIndex) => {
      doc.text(cell, currentX + 2, currentY + 4)
      currentX += colWidths[colIndex]
    })

    if (rowIndex === 0) {
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.3)
      doc.line(x, currentY + rowHeight, x + width, currentY + rowHeight)
    }

    currentY += rowHeight
  })

  return currentY + 5
}

/**
 * Calcula el ancho de las columnas
 */
function calculateColumnWidths(data: string[][], totalWidth: number): number[] {
  const numCols = data[0].length

  if (numCols === 5) {
    return [80, 15, 25, 25, 25]
  }

  if (numCols === 4) {
    return [45, 35, 35, 35]
  }

  const baseWidth = totalWidth / numCols
  return Array(numCols).fill(baseWidth)
}

/**
 * Traduce el estado de la factura
 */
function getStatusText(status: string): string {
  switch (status) {
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
