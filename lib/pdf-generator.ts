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
 * Genera el PDF de la factura con diseño mejorado
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

    // === HEADER PRINCIPAL MEJORADO ===
    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2])
    doc.rect(0, 0, 210, 30, "F")

    doc.setTextColor(headerTextColor[0], headerTextColor[1], headerTextColor[2])
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")

    let headerTitle = "FACTURA"
    if (isRectificative) headerTitle = "FACTURA RECTIFICATIVA"
    if (isSimplified) headerTitle = "FACTURA SIMPLIFICADA"

    doc.text(headerTitle, 105, 20, { align: "center" })

    // Reset color
    doc.setTextColor(0, 0, 0)
    yPosition = 40

    // === SECCIÓN DE ORGANIZACIÓN Y LOGO MEJORADA ===
    const orgSectionHeight = 50
    let logoLoaded = false

    // Intentar cargar el logo primero con mejor manejo de proporciones
    if (invoice.organization?.logo_url || invoice.organization?.logo_path) {
      try {
        const logoUrl = invoice.organization.logo_url || invoice.organization.logo_path
        if (logoUrl) {
          const logoBase64 = await loadImageAsBase64(logoUrl)
          if (logoBase64) {
            // Crear una imagen temporal para obtener dimensiones reales
            const tempImg = new Image()
            tempImg.src = logoBase64

            // Esperar a que la imagen cargue
            await new Promise((resolve) => {
              tempImg.onload = resolve
              tempImg.onerror = resolve
            })

            // Calcular dimensiones manteniendo proporción
            const maxWidth = 50
            const maxHeight = 30

            let logoWidth = tempImg.width
            let logoHeight = tempImg.height

            // Ajustar proporcionalmente si excede límites
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

            // Posicionar logo en la esquina superior derecha
            const logoX = 210 - logoWidth - 15
            const logoY = yPosition

            doc.addImage(logoBase64, "PNG", logoX, logoY, logoWidth, logoHeight)
            logoLoaded = true
          }
        }
      } catch (error) {
        console.log("No se pudo cargar el logo:", error)
      }
    }

    // Información de la organización con espacio reservado para el logo
    const orgTextWidth = logoLoaded ? 130 : 170

    if (invoice.organization) {
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text(invoice.organization.name, 20, yPosition + 5)

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`CIF: ${invoice.organization.tax_id}`, 20, yPosition + 15)
      doc.text(invoice.organization.address, 20, yPosition + 22)
      doc.text(
        `${invoice.organization.postal_code} ${invoice.organization.city}, ${invoice.organization.province}`,
        20,
        yPosition + 29,
      )

      let contactY = yPosition + 36
      if (invoice.organization.email) {
        doc.text(`Email: ${invoice.organization.email}`, 20, contactY)
        contactY += 7
      }
      if (invoice.organization.phone) {
        doc.text(`Teléfono: ${invoice.organization.phone}`, 20, contactY)
      }
    }

    yPosition += orgSectionHeight + 10

    // === INFORMACIÓN DE LA FACTURA EN CAJA DESTACADA ===
    const infoBoxX = 120
    const infoBoxY = yPosition - 10
    const infoBoxWidth = 70
    const infoBoxHeight = 25 // Reducido al eliminar el estado

    // Caja con borde
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(200, 200, 200)
    doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, "FD")

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("DATOS FACTURA", infoBoxX + 5, infoBoxY + 8)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Nº: ${invoice.invoice_number}`, infoBoxX + 5, infoBoxY + 16)
    doc.text(`Fecha: ${new Date(invoice.issue_date).toLocaleDateString("es-ES")}`, infoBoxX + 5, infoBoxY + 23)

    // Eliminado el estado de la factura como solicitado

    yPosition += 20

    // === INFORMACIÓN ESPECÍFICA PARA RECTIFICATIVAS MEJORADA ===
    if (isRectificative) {
      yPosition += 10

      // Caja destacada para rectificativas con mejor diseño
      const rectBoxHeight = 45
      doc.setFillColor(255, 248, 220) // Fondo amarillo más suave
      doc.setDrawColor(220, 53, 69)
      doc.setLineWidth(1.5)
      doc.rect(15, yPosition, 180, rectBoxHeight, "FD")

      // Icono de advertencia (triángulo)
      doc.setFillColor(220, 53, 69)
      doc.triangle(25, yPosition + 8, 30, yPosition + 15, 20, yPosition + 15)

      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(220, 53, 69)
      doc.text("INFORMACIÓN DE RECTIFICACIÓN", 35, yPosition + 12)

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)

      const originalNumber = invoice.original_invoice_number || "No especificada"
      doc.text(`Factura original: ${originalNumber}`, 20, yPosition + 22)

      const rectificationType =
        invoice.rectification_type === "cancellation"
          ? "Por sustitución (anula la original)"
          : "Por diferencias (ajusta importes)"
      doc.text(`Tipo: ${rectificationType}`, 20, yPosition + 29)

      const reason = invoice.rectification_reason || "No especificado"
      const reasonLines = doc.splitTextToSize(`Motivo: ${reason}`, 170)
      doc.text(reasonLines, 20, yPosition + 36)

      yPosition += rectBoxHeight + 15

      // Tabla de comparación mejorada para rectificativas por diferencias
      if (invoice.original_invoice_number && invoice.rectification_type === "amount_correction") {
        const orgId = invoice.organization?.id || invoice.organization_id || (invoice as any).id
        const originalInvoice = orgId ? await getOriginalInvoiceData(invoice.original_invoice_number, orgId) : null

        if (originalInvoice) {
          doc.setFont("helvetica", "bold")
          doc.setFontSize(11)
          doc.text("COMPARACIÓN DE IMPORTES", 20, yPosition)
          yPosition += 10

          const comparisonData = [
            ["Concepto", "Original", "Rectificativa", "Diferencia"],
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

          yPosition = drawImprovedTable(doc, comparisonData, 20, yPosition, 170)
          yPosition += 15
        }
      }
    }

    // === INFORMACIÓN DEL CLIENTE MEJORADA ===
    // Caja para el cliente
    // const clientBoxY = yPosition
    // const clientBoxHeight = 40

    // doc.setFillColor(248, 249, 250)
    // doc.setDrawColor(200, 200, 200)
    // doc.rect(15, clientBoxY, 180, clientBoxHeight, "FD")

    // doc.setFontSize(12)
    // doc.setFont("helvetica", "bold")
    // doc.setTextColor(40, 167, 69)
    // doc.text("FACTURAR A:", 20, clientBoxY + 10)
    // doc.setTextColor(0, 0, 0)

    // if (invoice.client_data) {
    //   doc.setFontSize(10)
    //   doc.setFont("helvetica", "bold")
    //   doc.text(invoice.client_data.name, 20, clientBoxY + 18)

    //   doc.setFont("helvetica", "normal")
    //   doc.text(`CIF/NIF: ${invoice.client_data.tax_id}`, 20, clientBoxY + 25)
    //   doc.text(invoice.client_data.address, 20, clientBoxY + 32)

    //   const locationText = `${invoice.client_data.postal_code} ${invoice.client_data.city}, ${invoice.client_data.province}`
    //   doc.text(locationText, 100, clientBoxY + 18)

    //   if (invoice.client_data.email) {
    //     doc.text(`Email: ${invoice.client_data.email}`, 100, clientBoxY + 25)
    //   }
    //   if (invoice.client_data.phone) {
    //     doc.text(`Tel: ${invoice.client_data.phone}`, 100, clientBoxY + 32)
    //   }
    // }

    // yPosition = clientBoxY + clientBoxHeight + 15

    // === INFORMACIÓN DEL CLIENTE OPTIMIZADA ===
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(40, 167, 69)
    doc.text("FACTURAR A:", 20, yPosition)
    doc.setTextColor(0, 0, 0)
    yPosition += 6

    if (invoice.client_data) {
      // Línea 1: Nombre y CIF en la misma línea
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text(invoice.client_data.name, 20, yPosition)
      doc.setFont("helvetica", "normal")
      doc.text(`CIF/NIF: ${invoice.client_data.tax_id}`, 120, yPosition)
      yPosition += 6

      // Línea 2: Dirección completa en una línea
      const fullAddress = `${invoice.client_data.address}, ${invoice.client_data.postal_code} ${invoice.client_data.city}, ${invoice.client_data.province}`
      doc.text(fullAddress, 20, yPosition)
      yPosition += 6

      // Línea 3: Email y teléfono en la misma línea (solo si existen)
      if (invoice.client_data.email || invoice.client_data.phone) {
        let contactLine = ""
        if (invoice.client_data.email) contactLine += `Email: ${invoice.client_data.email}`
        if (invoice.client_data.phone) {
          if (contactLine) contactLine += " | "
          contactLine += `Tel: ${invoice.client_data.phone}`
        }
        doc.text(contactLine, 20, yPosition)
        yPosition += 6
      }
    }

    // Línea separadora sutil
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.5)
    doc.line(20, yPosition + 2, 190, yPosition + 2)
    yPosition += 8

    // === LÍNEAS DE FACTURA CON TABLA MEJORADA ===
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("DETALLE DE SERVICIOS", 20, yPosition)
    yPosition += 10

    // Preparar datos de la tabla con mejor formato
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

    // Verificar si la tabla necesita una nueva página
    const estimatedTableHeight = tableData.length * 10 + 10 // altura estimada
    if (yPosition + estimatedTableHeight > 270) {
      doc.addPage()
      yPosition = 20

      // Repetir el encabezado en la nueva página
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text("DETALLE DE SERVICIOS (continuación)", 20, yPosition)
      yPosition += 10
    }

    // Dibujar tabla con mejor manejo de espacio
    yPosition = drawImprovedTable(doc, tableData, 15, yPosition, 180)

    // === TOTALES MEJORADOS ===
    yPosition += 15

    // Verificar si los totales necesitan una nueva página
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }

    const totalsBoxX = 120
    const totalsBoxWidth = 75
    const totalsBoxHeight = 35 + (invoice.irpf_amount > 0 ? 7 : 0) + (invoice.retention_amount > 0 ? 7 : 0)

    // Caja para totales
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(200, 200, 200)
    doc.rect(totalsBoxX, yPosition, totalsBoxWidth, totalsBoxHeight, "FD")

    let totalsY = yPosition + 8
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Base Imponible:`, totalsBoxX + 5, totalsY)
    doc.text(`${invoice.base_amount.toFixed(2)} €`, totalsBoxX + 45, totalsY)
    totalsY += 7

    doc.text(`IVA:`, totalsBoxX + 5, totalsY)
    doc.text(`${invoice.vat_amount.toFixed(2)} €`, totalsBoxX + 45, totalsY)
    totalsY += 7

    if (invoice.irpf_amount > 0) {
      doc.text(`IRPF:`, totalsBoxX + 5, totalsY)
      doc.text(`-${invoice.irpf_amount.toFixed(2)} €`, totalsBoxX + 45, totalsY)
      totalsY += 7
    }

    if (invoice.retention_amount > 0) {
      doc.text(`Retención:`, totalsBoxX + 5, totalsY)
      doc.text(`-${invoice.retention_amount.toFixed(2)} €`, totalsBoxX + 45, totalsY)
      totalsY += 7
    }

    // Línea separadora
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(1)
    doc.line(totalsBoxX + 5, totalsY, totalsBoxX + 70, totalsY)
    totalsY += 5

    // Total destacado
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(`TOTAL:`, totalsBoxX + 5, totalsY)
    doc.text(`${invoice.total_amount.toFixed(2)} €`, totalsBoxX + 45, totalsY)

    yPosition += totalsBoxHeight + 20

    // === FIRMA MEJORADA ===
    if (invoice.signature) {
      // Verificar si necesitamos nueva página
      if (yPosition > 220) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("FIRMA DIGITAL:", 20, yPosition)
      yPosition += 5

      // Caja para la firma
      doc.setDrawColor(200, 200, 200)
      doc.rect(20, yPosition, 80, 40, "S")

      try {
        doc.addImage(invoice.signature, "PNG", 25, yPosition + 5, 70, 30)
      } catch (error) {
        console.error("Error al añadir firma:", error)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.text("(Firma digital incluida)", 25, yPosition + 20)
      }

      yPosition += 45
    }

    // === NOTAS ADICIONALES ===
    if (invoice.notes && invoice.notes.trim()) {
      if (yPosition > 240) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("NOTAS:", 20, yPosition)
      yPosition += 8

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      const notesLines = doc.splitTextToSize(invoice.notes, 170)
      doc.text(notesLines, 20, yPosition)
      yPosition += notesLines.length * 4 + 10
    }

    // === NOTAS LEGALES MEJORADAS ===
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
 * Función mejorada para dibujar tablas con mejor diseño y manejo de espacio
 */
function drawImprovedTable(doc: jsPDF, data: string[][], x: number, y: number, width: number): number {
  const rowHeight = 10 // Aumentado para dar más espacio
  const colWidths = calculateColumnWidths(data, width)
  let currentY = y

  // Verificar si la tabla necesita continuar en una nueva página
  const checkAndAddPage = (requiredHeight: number) => {
    if (currentY + requiredHeight > 280) {
      doc.addPage()
      currentY = 20
      return true
    }
    return false
  }

  data.forEach((row, rowIndex) => {
    // Verificar si esta fila necesita una nueva página
    const isNewPage = checkAndAddPage(rowHeight + 2)

    // Si es una nueva página y no es la primera fila, repetir el encabezado
    if (isNewPage && rowIndex > 0) {
      // Dibujar encabezado en la nueva página
      let headerX = x
      doc.setFillColor(40, 167, 69)
      doc.rect(x, currentY - 2, width, rowHeight, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)

      data[0].forEach((headerCell, colIndex) => {
        doc.text(headerCell, headerX + 2, currentY + 3)
        headerX += colWidths[colIndex]
      })

      currentY += rowHeight
    }

    let currentX = x

    // Header con mejor diseño
    if (rowIndex === 0) {
      doc.setFillColor(40, 167, 69)
      doc.rect(x, currentY - 2, width, rowHeight, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
    } else {
      // Filas alternas con color de fondo
      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 249, 250)
        doc.rect(x, currentY - 2, width, rowHeight, "F")
      }
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
    }

    row.forEach((cell, colIndex) => {
      // Manejar texto largo con saltos de línea
      const cellText = doc.splitTextToSize(cell, colWidths[colIndex] - 4)

      // Ajustar altura de fila si el texto es muy largo
      const cellHeight = Math.max(rowHeight, cellText.length * 4)

      doc.text(cellText, currentX + 2, currentY + 3)

      // Líneas verticales
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.line(currentX, currentY - 2, currentX, currentY + rowHeight - 2)

      currentX += colWidths[colIndex]
    })

    // Línea vertical final
    doc.line(currentX, currentY - 2, currentX, currentY + rowHeight - 2)

    // Líneas horizontales
    doc.line(x, currentY + rowHeight - 2, x + width, currentY + rowHeight - 2)

    currentY += rowHeight
  })

  // Borde exterior de la tabla
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(1)
  doc.rect(x, y - 2, width, currentY - y + 2)

  return currentY
}

/**
 * Calcula el ancho de las columnas de forma más inteligente
 */
function calculateColumnWidths(data: string[][], totalWidth: number): number[] {
  const numCols = data[0].length

  // Para la tabla de servicios (7 columnas)
  if (numCols === 7) {
    return [65, 15, 25, 15, 15, 15, 30] // Descripción más ancha, números más compactos
  }

  // Para la tabla de comparación (4 columnas)
  if (numCols === 4) {
    return [50, 40, 40, 40]
  }

  // Para otras tablas, distribución uniforme
  const baseWidth = totalWidth / numCols
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
