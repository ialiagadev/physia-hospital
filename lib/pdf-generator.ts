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
  // ✅ Campos de Verifactu según documentación oficial
  verifactu_qr_code?: string | null
  verifactu_status?: string
  verifactu_response?: {
    data?: {
      items?: Array<{
        url_qr?: string
        qr_image?: string
      }>
    }
  }
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
    // ❌ ELIMINADO: phone: string
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
    // ❌ ELIMINADO: phone?: string
    // ❌ ELIMINADO: phone_prefix?: string
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
 * ✅ FUNCIÓN CORREGIDA: Añade marca de agua de BORRADOR
 */
function addDraftWatermark(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    // Guardar estado actual
    const currentFont = doc.getFont()
    const currentFontSize = doc.getFontSize()

    // Configurar marca de agua
    doc.setFontSize(60)
    doc.setTextColor(220, 220, 220) // Gris muy claro
    doc.setFont("helvetica", "bold")

    // Calcular posición centrada
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const centerX = pageWidth / 2
    const centerY = pageHeight / 2

    // Añadir texto rotado
    doc.text("BORRADOR", centerX, centerY, {
      angle: -45,
      align: "center",
      baseline: "middle",
    })

    // Restaurar estado
    doc.setFontSize(currentFontSize)
    doc.setTextColor(0, 0, 0) // Negro
    doc.setFont(currentFont.fontName, currentFont.fontStyle)
  }
}

/**
 * Añade el QR de Verifactu según especificaciones oficiales de la AEAT
 * Debe ir al principio de la factura, antes del contenido
 * ✅ SOLO PARA FACTURAS OFICIALES (NO BORRADORES)
 */
function addVerifactuQR(doc: jsPDF, invoice: InvoiceData, yPosition: number, isDraft: boolean): number {
  // ✅ NO MOSTRAR QR EN BORRADORES
  if (isDraft || !invoice.verifactu_qr_code || invoice.verifactu_status !== "sent") {
    return yPosition
  }

  try {
    // ✅ Especificaciones oficiales AEAT:
    // - Tamaño: 30x30mm a 40x40mm (usamos 40mm)
    // - Margen blanco: mínimo 2mm, recomendado 6mm
    // - Alto contraste
    // - Posición: al principio, antes del contenido
    const qrSize = 40 // 40mm según especificaciones
    const margin = 6 // 6mm de margen recomendado
    const qrX = 20 // Posición X (superior izquierdo según documentación)

    // ✅ TEXTO SUPERIOR: "QR tributario:" (centrado encima del QR)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    const upperText = "QR tributario:"
    const textWidth = doc.getTextWidth(upperText)
    const centeredTextX = qrX + (qrSize - textWidth) / 2
    doc.text(upperText, centeredTextX, yPosition)
    yPosition += 8

    // ✅ AÑADIR EL QR CON MARGEN BLANCO
    let qrBase64 = invoice.verifactu_qr_code
    if (!qrBase64.startsWith("data:image/")) {
      qrBase64 = `data:image/png;base64,${qrBase64}`
    }

    // Crear un fondo blanco para el margen (especificación AEAT)
    doc.setFillColor(255, 255, 255) // Blanco
    doc.rect(qrX - margin, yPosition - margin, qrSize + margin * 2, qrSize + margin * 2, "F")

    // Añadir el QR centrado en el área con margen
    doc.addImage(qrBase64, "PNG", qrX, yPosition, qrSize, qrSize)
    yPosition += qrSize + 4

    // ✅ TEXTO INFERIOR: "Factura verificable en la sede electrónica de la AEAT"
    // o "VERI*FACTU" (centrado debajo del QR)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    const lowerTexts = ["Factura verificable en la sede", "electrónica de la AEAT"]
    lowerTexts.forEach((text, index) => {
      const lowerTextWidth = doc.getTextWidth(text)
      const centeredLowerTextX = qrX + (qrSize - lowerTextWidth) / 2
      doc.text(text, centeredLowerTextX, yPosition + index * 4)
    })
    yPosition += 12 // Espacio después del texto inferior

    // ✅ INFORMACIÓN ADICIONAL (opcional): URL de verificación
    if (invoice.verifactu_response?.data?.items?.[0]?.url_qr) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(6)
      doc.setTextColor(100, 100, 100) // Gris claro
      const urlText = "URL: " + invoice.verifactu_response.data.items[0].url_qr
      const urlLines = doc.splitTextToSize(urlText, qrSize + 40)
      urlLines.forEach((line: string, index: number) => {
        doc.text(line, qrX, yPosition + index * 3)
      })
      yPosition += urlLines.length * 3 + 5
      doc.setTextColor(0, 0, 0) // Volver al negro
    }

    // ✅ LÍNEA SEPARADORA para distinguir del resto del contenido
    doc.setDrawColor(200, 200, 200) // Gris claro
    doc.setLineWidth(0.5)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 10

    console.log("✅ QR de Verifactu añadido según especificaciones oficiales AEAT")
  } catch (error) {
    console.error("❌ Error al añadir QR de Verifactu:", error)
    // Fallback: mostrar texto indicativo
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text("QR tributario: (Error al cargar)", 20, yPosition)
    yPosition += 10
  }

  return yPosition
}

/**
 * ✅ GENERA EL PDF DE LA FACTURA CON SOPORTE PARA BORRADORES
 * @param invoice - Datos de la factura
 * @param invoiceLines - Líneas de la factura
 * @param fileName - Nombre del archivo
 * @param isDraft - Si es borrador (marca de agua + sin QR)
 */
export async function generatePdf(
  invoice: InvoiceData,
  invoiceLines: InvoiceLine[],
  fileName: string,
  isDraft = false, // ✅ NUEVO PARÁMETRO
): Promise<Blob | null> {
  try {
    const validatedInvoice = validateInvoiceData(invoice)
    const validatedLines = validateInvoiceLines(invoiceLines)

    console.log("📄 Generando PDF:", {
      invoice: validatedInvoice,
      lines: validatedLines,
      fileName,
      isDraft, // ✅ LOG DEL NUEVO PARÁMETRO
      hasVerifactuQR: !!validatedInvoice.verifactu_qr_code,
      verifactuStatus: validatedInvoice.verifactu_status,
    })

    const doc = new jsPDF()
    let yPosition = 20

    // Solo usar negro
    doc.setTextColor(0, 0, 0)

    const isRectificative = validatedInvoice.invoice_type === "rectificativa"
    const isSimplified = validatedInvoice.invoice_type === "simplificada"

    // === ✅ QR DE VERIFACTU AL PRINCIPIO (SOLO PARA FACTURAS OFICIALES) ===
    yPosition = addVerifactuQR(doc, validatedInvoice, yPosition, isDraft)

    // === HEADER COMPACTO ===
    doc.setFontSize(16)
    doc.setFont("helvetica", "normal")
    let headerTitle = "Factura"
    if (isDraft) headerTitle = "BORRADOR - Factura" // ✅ TÍTULO DIFERENTE PARA BORRADORES
    if (isRectificative) headerTitle = isDraft ? "BORRADOR - Factura Rectificativa" : "Factura Rectificativa"
    if (isSimplified) headerTitle = isDraft ? "BORRADOR - Factura Simplificada" : "Factura Simplificada"

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
    // ✅ MOSTRAR "SIN NÚMERO" PARA BORRADORES
    const invoiceNumberText = isDraft ? "SIN NÚMERO (Borrador)" : validatedInvoice.invoice_number
    doc.text(invoiceNumberText, 80, yPosition)
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
      // ❌ ELIMINADO: Teléfono de la organización
      doc.text(validatedInvoice.organization.email, leftColumnX, yPosition)
    }

    // Cliente (derecha) - INCLUYENDO CIF/NIF (SIN TELÉFONO)
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

      if (validatedInvoice.client_data.tax_id) {
        doc.setFont("helvetica", "bold")
        doc.text(`CIF/NIF: ${validatedInvoice.client_data.tax_id}`, rightColumnX, clientY)
        doc.setFont("helvetica", "normal")
        clientY += 4
      }

      if (validatedInvoice.client_data.address) {
        doc.text(validatedInvoice.client_data.address, rightColumnX, clientY)
        clientY += 4
      }

      if (validatedInvoice.client_data.postal_code && validatedInvoice.client_data.city) {
        doc.text(
          `${validatedInvoice.client_data.postal_code} ${validatedInvoice.client_data.city}`,
          rightColumnX,
          clientY,
        )
        clientY += 4
      }

      if (validatedInvoice.client_data.country) {
        doc.text(validatedInvoice.client_data.country, rightColumnX, clientY)
        clientY += 4
      }

      // ❌ ELIMINADO: Teléfono del cliente

      if (validatedInvoice.client_data.email) {
        doc.text(validatedInvoice.client_data.email, rightColumnX, clientY)
        clientY += 4
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

    // Filas de datos
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

    // === TOTALES MEJORADOS ===
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

    // IVA
    if (validatedInvoice.vat_amount > 0) {
      const vatRate = validatedLines.length > 0 ? validatedLines[0].vat_rate : 21
      // Línea principal del IVA
      doc.text(`IVA - España (${vatRate}%)`, totalsX, yPosition)
      doc.text(`${validatedInvoice.vat_amount.toFixed(2)} €`, amountX, yPosition, { align: "right" })
      yPosition += 4
      // Línea secundaria con base imponible
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
    if (isDraft) {
      // ✅ TEXTO ESPECÍFICO PARA BORRADORES
      legalText =
        "ESTE ES UN BORRADOR DE FACTURA. No tiene validez fiscal hasta su emisión oficial con número de factura asignado."
    } else if (isRectificative) {
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

    // ✅ Información sobre Verifactu según documentación oficial (SOLO PARA FACTURAS OFICIALES)
    if (!isDraft && validatedInvoice.verifactu_status === "sent") {
      legalText +=
        " Esta factura ha sido registrada en el sistema Veri*Factu de la AEAT y cumple con las especificaciones del Real Decreto 1007/2023."
    }

    const legalLines = doc.splitTextToSize(legalText, 170)
    doc.text(legalLines, 20, yPosition)

    // ✅ AÑADIR MARCA DE AGUA PARA BORRADORES
    if (isDraft) {
      addDraftWatermark(doc)
    }

    // === PIE DE PÁGINA ===
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      // ✅ PIE DE PÁGINA DIFERENTE PARA BORRADORES
      const footerText = isDraft ? `BORRADOR - Página ${i} de ${pageCount}` : `Página ${i} de ${pageCount}`
      doc.text(footerText, 185, 285, { align: "right" })
    }

    // Generar el blob
    const pdfBlob = doc.output("blob")
    console.log(`✅ PDF ${isDraft ? "BORRADOR" : "OFICIAL"} generado exitosamente`)
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
