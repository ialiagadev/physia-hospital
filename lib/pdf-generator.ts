import { jsPDF } from "jspdf"
import "jspdf-autotable"
import autoTable from "jspdf-autotable"

interface Organization {
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

interface ClientData {
  name: string
  tax_id: string
  address: string
  postal_code: string
  city: string
  province: string
  country: string
  email: string
  phone: string
  client_type: string
}

interface Invoice {
  id: number
  invoice_number: string
  issue_date: string
  base_amount: number
  vat_amount: number
  irpf_amount: number
  retention_amount: number
  total_amount: number
  notes: string
  signature?: string | null
  organization: Organization
  client_data: ClientData
  invoice_type?: string | null
  original_invoice_number?: string | null
  rectification_reason?: string | null
}

interface InvoiceLine {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  irpf_rate: number
  retention_rate: number
  line_amount: number
}

/**
 * Carga una imagen desde una URL con mejor manejo de errores
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      console.log("Imagen cargada correctamente:", url)
      resolve(img)
    }

    img.onerror = (error) => {
      console.error("Error al cargar imagen:", url, error)
      reject(new Error(`No se pudo cargar la imagen: ${url}`))
    }

    // Timeout para evitar esperas infinitas
    setTimeout(() => {
      reject(new Error(`Timeout al cargar imagen: ${url}`))
    }, 10000)

    img.src = url
  })
}

/**
 * Genera un PDF para una factura con logo, firma y diseño profesional
 */
export async function generatePdf(
  invoice: Invoice,
  invoiceLines: InvoiceLine[],
  fileName: string,
  downloadFile = true,
): Promise<Blob | undefined> {
  try {
    console.log("Iniciando generación de PDF para:", invoice.invoice_number)
    console.log("Logo URL:", invoice.organization.logo_url)

    const doc = new jsPDF()

    // Configuración de colores
    const primaryColor = [0, 0, 0] // Negro
    const secondaryColor = [100, 100, 100] // Gris oscuro
    const accentColor = [0, 102, 204] // Azul

    // Funciones de formato
    const formatCurrency = (amount: number) => {
      return amount.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }

    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    }

    // Variables de layout
    let logoHeight = 0
    const leftColumnX = 14
    const rightColumnX = 110

    // === LOGO DE LA ORGANIZACIÓN ===
    if (invoice.organization.logo_url || invoice.organization.logo_path) {
      const logoUrl =
        invoice.organization.logo_url ||
        (invoice.organization.logo_path
          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/${invoice.organization.logo_path}`
          : null)

      if (logoUrl) {
        try {
          console.log("Cargando logo desde:", logoUrl)
          const logoImg = await loadImage(logoUrl)

          // Calcular dimensiones manteniendo proporción
          const maxLogoWidth = 50
          const maxLogoHeight = 30
          const logoRatio = logoImg.width / logoImg.height

          let logoWidth = maxLogoWidth
          logoHeight = maxLogoWidth / logoRatio

          if (logoHeight > maxLogoHeight) {
            logoHeight = maxLogoHeight
            logoWidth = maxLogoHeight * logoRatio
          }

          // Añadir logo en esquina superior izquierda
          doc.addImage(logoImg, "JPEG", leftColumnX, 15, logoWidth, logoHeight)
          console.log("Logo añadido correctamente al PDF")
        } catch (error) {
          console.error("Error al cargar el logo:", error)
          logoHeight = 0
        }
      }
    }

    // === TÍTULO DE LA FACTURA ===
    doc.setFontSize(20)
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])

    // Título según tipo de factura
    let invoiceTitle = "FACTURA"
    if (invoice.invoice_type === "rectificativa") {
      invoiceTitle = "FACTURA RECTIFICATIVA"
    } else if (invoice.invoice_type === "simplificada") {
      invoiceTitle = "FACTURA SIMPLIFICADA"
    }

    doc.text(invoiceTitle, 200, 25, { align: "right" })

    doc.setFontSize(14)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(`Nº: ${invoice.invoice_number}`, 200, 32, { align: "right" })

    doc.setFontSize(10)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text(`Fecha: ${formatDate(invoice.issue_date)}`, 200, 38, { align: "right" })

    // Información adicional para facturas rectificativas
    if (invoice.invoice_type === "rectificativa" && invoice.original_invoice_number) {
      doc.text(`Rectifica: ${invoice.original_invoice_number}`, 200, 44, { align: "right" })
      if (invoice.rectification_reason) {
        const reasonLines = doc.splitTextToSize(`Motivo: ${invoice.rectification_reason}`, 80)
        doc.text(reasonLines, 200, 50, { align: "right" })
      }
    }

    // === DATOS DE LA EMPRESA ===
    const sectionStartY = Math.max(logoHeight + 25, 50)

    doc.setFontSize(12)
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    doc.text("DATOS DE LA EMPRESA", leftColumnX, sectionStartY)

    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
    doc.line(leftColumnX, sectionStartY + 2, leftColumnX + 80, sectionStartY + 2)

    doc.setFontSize(11)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(invoice.organization.name || "", leftColumnX, sectionStartY + 10)

    doc.setFontSize(9)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])

    let orgY = sectionStartY + 16
    doc.text(`CIF/NIF: ${invoice.organization.tax_id || ""}`, leftColumnX, orgY)

    orgY += 6
    if (invoice.organization.address) {
      doc.text(invoice.organization.address, leftColumnX, orgY)
      orgY += 6
    }

    if (invoice.organization.postal_code || invoice.organization.city) {
      const addressLine =
        `${invoice.organization.postal_code || ""} ${invoice.organization.city || ""}, ${invoice.organization.province || ""}`.trim()
      doc.text(addressLine, leftColumnX, orgY)
      orgY += 6
    }

    if (invoice.organization.country) {
      doc.text(invoice.organization.country, leftColumnX, orgY)
      orgY += 6
    }

    if (invoice.organization.email) {
      doc.text(`Email: ${invoice.organization.email}`, leftColumnX, orgY)
      orgY += 6
    }

    if (invoice.organization.phone) {
      doc.text(`Teléfono: ${invoice.organization.phone}`, leftColumnX, orgY)
      orgY += 6
    }

    // === DATOS DEL CLIENTE ===
    doc.setFontSize(12)
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
    doc.text("FACTURAR A", rightColumnX, sectionStartY)

    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
    doc.line(rightColumnX, sectionStartY + 2, rightColumnX + 80, sectionStartY + 2)

    doc.setFontSize(11)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text(invoice.client_data.name || "", rightColumnX, sectionStartY + 10)

    doc.setFontSize(9)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])

    let clientY = sectionStartY + 16
    doc.text(`CIF/NIF: ${invoice.client_data.tax_id || ""}`, rightColumnX, clientY)

    clientY += 6
    if (invoice.client_data.address) {
      doc.text(invoice.client_data.address, rightColumnX, clientY)
      clientY += 6
    }

    if (invoice.client_data.postal_code || invoice.client_data.city) {
      const addressLine =
        `${invoice.client_data.postal_code || ""} ${invoice.client_data.city || ""}, ${invoice.client_data.province || ""}`.trim()
      doc.text(addressLine, rightColumnX, clientY)
      clientY += 6
    }

    if (invoice.client_data.country) {
      doc.text(invoice.client_data.country, rightColumnX, clientY)
      clientY += 6
    }

    if (invoice.client_data.email) {
      doc.text(`Email: ${invoice.client_data.email}`, rightColumnX, clientY)
      clientY += 6
    }

    if (invoice.client_data.phone) {
      doc.text(`Teléfono: ${invoice.client_data.phone}`, rightColumnX, clientY)
      clientY += 6
    }

    // === TABLA DE LÍNEAS ===
    const tableStartY = Math.max(orgY, clientY) + 15

    const tableColumn = ["Descripción", "Cant.", "Precio unit.", "IVA", "IRPF", "Ret.", "Importe"]
    const tableRows = invoiceLines.map((line) => [
      line.description,
      line.quantity.toString(),
      `${formatCurrency(line.unit_price)} €`,
      `${line.vat_rate}%`,
      `${line.irpf_rate}%`,
      `${line.retention_rate}%`,
      `${formatCurrency(line.line_amount)} €`,
    ])

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: tableStartY,
      theme: "grid",
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 70, halign: "left" },
        1: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 25, halign: "right" },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 15, halign: "center" },
        6: { cellWidth: 25, halign: "right" },
      },
      margin: { left: 14, right: 14 },
    })

    // === TOTALES ===
    const finalY = (doc as any).lastAutoTable.finalY + 15

    const totalsBoxX = 120
    const totalsBoxY = finalY
    const totalsBoxWidth = 75
    let totalsBoxHeight = 25

    if (invoice.irpf_amount > 0) totalsBoxHeight += 5
    if (invoice.retention_amount > 0) totalsBoxHeight += 5

    // Recuadro de totales
    doc.setDrawColor(200, 200, 200)
    doc.setFillColor(250, 250, 250)
    doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, totalsBoxHeight, "FD")

    doc.setFontSize(9)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])

    let totalsY = totalsBoxY + 8
    doc.text("Base imponible:", totalsBoxX + 5, totalsY)
    doc.text(`${formatCurrency(invoice.base_amount)} €`, totalsBoxX + totalsBoxWidth - 5, totalsY, { align: "right" })

    totalsY += 5
    doc.text("IVA:", totalsBoxX + 5, totalsY)
    doc.text(`${formatCurrency(invoice.vat_amount)} €`, totalsBoxX + totalsBoxWidth - 5, totalsY, { align: "right" })

    if (invoice.irpf_amount > 0) {
      totalsY += 5
      doc.text("IRPF:", totalsBoxX + 5, totalsY)
      doc.text(`-${formatCurrency(invoice.irpf_amount)} €`, totalsBoxX + totalsBoxWidth - 5, totalsY, {
        align: "right",
      })
    }

    if (invoice.retention_amount > 0) {
      totalsY += 5
      doc.text("Retención:", totalsBoxX + 5, totalsY)
      doc.text(`-${formatCurrency(invoice.retention_amount)} €`, totalsBoxX + totalsBoxWidth - 5, totalsY, {
        align: "right",
      })
    }

    // Total final
    totalsY += 3
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
    doc.line(totalsBoxX + 5, totalsY, totalsBoxX + totalsBoxWidth - 5, totalsY)

    totalsY += 5
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.text("TOTAL:", totalsBoxX + 5, totalsY)
    doc.text(`${formatCurrency(invoice.total_amount)} €`, totalsBoxX + totalsBoxWidth - 5, totalsY, { align: "right" })
    doc.setFont("helvetica", "normal")

    // === NOTAS ===
    if (invoice.notes && invoice.notes.trim() !== "") {
      const notesY = totalsBoxY + totalsBoxHeight + 15
      doc.setFontSize(10)
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
      doc.text("OBSERVACIONES", leftColumnX, notesY)

      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
      doc.line(leftColumnX, notesY + 2, leftColumnX + 60, notesY + 2)

      doc.setFontSize(9)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
      const splitNotes = doc.splitTextToSize(invoice.notes, 180)
      doc.text(splitNotes, leftColumnX, notesY + 8)
    }

    // === FIRMA ===
    if (invoice.signature) {
      try {
        let signatureY = totalsBoxY + totalsBoxHeight + 25
        if (invoice.notes && invoice.notes.trim() !== "") {
          const splitNotes = doc.splitTextToSize(invoice.notes, 180)
          signatureY += splitNotes.length * 5 + 10
        }

        doc.setFontSize(10)
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
        doc.text("FIRMA", leftColumnX, signatureY)

        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
        doc.line(leftColumnX, signatureY + 2, leftColumnX + 40, signatureY + 2)

        // Añadir imagen de la firma
        doc.addImage(invoice.signature, "PNG", leftColumnX, signatureY + 5, 50, 20)
      } catch (error) {
        console.error("Error al añadir la firma al PDF:", error)
      }
    }

    // === PIE DE PÁGINA ===
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)

      doc.setDrawColor(200, 200, 200)
      doc.line(14, doc.internal.pageSize.getHeight() - 20, 200, doc.internal.pageSize.getHeight() - 20)

      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" },
      )
    }

    console.log("PDF generado correctamente")

    const blob = doc.output("blob")

    if (downloadFile) {
      doc.save(fileName)
      return undefined
    }

    return blob
  } catch (error) {
    console.error("Error al generar el PDF:", error)
    throw error
  }
}
