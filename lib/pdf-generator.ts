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
 * Genera un PDF para una factura
 * @param invoice Datos de la factura
 * @param invoiceLines Líneas de la factura
 * @param fileName Nombre del archivo PDF
 * @param downloadFile Si es true, descarga el archivo. Si es false, solo devuelve el Blob
 * @returns Blob del PDF generado o undefined si downloadFile es true
 */
export function generatePdf(
  invoice: Invoice,
  invoiceLines: InvoiceLine[],
  fileName: string,
  downloadFile = true,
): Blob | undefined {
  // Crear un nuevo documento PDF
  const doc = new jsPDF()

  // Configuración de fuentes y colores
  const primaryColor = [0, 0, 0] // Negro
  const secondaryColor = [100, 100, 100] // Gris oscuro
  const accentColor = [0, 102, 204] // Azul

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Añadir cabecera con datos de la organización
  doc.setFontSize(18)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(invoice.organization.name || "", 14, 20)

  doc.setFontSize(10)
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.text(`CIF/NIF: ${invoice.organization.tax_id || ""}`, 14, 25)
  doc.text(`${invoice.organization.address || ""}`, 14, 30)
  doc.text(
    `${invoice.organization.postal_code || ""} ${invoice.organization.city || ""}, ${invoice.organization.province || ""}`,
    14,
    35,
  )
  doc.text(`${invoice.organization.country || ""}`, 14, 40)

  if (invoice.organization.email) {
    doc.text(`Email: ${invoice.organization.email}`, 14, 45)
  }

  if (invoice.organization.phone) {
    doc.text(`Teléfono: ${invoice.organization.phone}`, 14, 50)
  }

  // Añadir información de la factura
  doc.setFontSize(14)
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
  doc.text(`FACTURA Nº: ${invoice.invoice_number}`, 140, 20)

  doc.setFontSize(10)
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.text(`Fecha de emisión: ${formatDate(invoice.issue_date)}`, 140, 25)

  // Añadir datos del cliente
  doc.setFontSize(12)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text("CLIENTE", 14, 65)

  doc.setFontSize(10)
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.text(invoice.client_data.name || "", 14, 70)
  doc.text(`CIF/NIF: ${invoice.client_data.tax_id || ""}`, 14, 75)
  doc.text(`${invoice.client_data.address || ""}`, 14, 80)
  doc.text(
    `${invoice.client_data.postal_code || ""} ${invoice.client_data.city || ""}, ${invoice.client_data.province || ""}`,
    14,
    85,
  )
  doc.text(`${invoice.client_data.country || ""}`, 14, 90)

  if (invoice.client_data.email) {
    doc.text(`Email: ${invoice.client_data.email}`, 14, 95)
  }

  if (invoice.client_data.phone) {
    doc.text(`Teléfono: ${invoice.client_data.phone}`, 14, 100)
  }

  // Añadir tabla de líneas de factura
  const tableColumn = ["Descripción", "Cantidad", "Precio unitario", "IVA", "IRPF", "Retención", "Importe"]
  const tableRows = invoiceLines.map((line) => [
    line.description,
    line.quantity,
    `${formatCurrency(line.unit_price)} €`,
    `${line.vat_rate}%`,
    `${line.irpf_rate}%`,
    `${line.retention_rate}%`,
    `${formatCurrency(line.line_amount)} €`,
  ])

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 110,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 15, halign: "center" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 15, halign: "center" },
      5: { cellWidth: 15, halign: "center" },
      6: { cellWidth: 25, halign: "right" },
    },
  })

  // Obtener la posición Y después de la tabla
  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Añadir resumen de totales
  doc.setFontSize(10)
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.text("Base imponible:", 130, finalY)
  doc.text(`${formatCurrency(invoice.base_amount)} €`, 180, finalY, { align: "right" })

  doc.text("IVA:", 130, finalY + 5)
  doc.text(`${formatCurrency(invoice.vat_amount)} €`, 180, finalY + 5, { align: "right" })

  if (invoice.irpf_amount > 0) {
    doc.text("IRPF:", 130, finalY + 10)
    doc.text(`-${formatCurrency(invoice.irpf_amount)} €`, 180, finalY + 10, { align: "right" })
  }

  if (invoice.retention_amount > 0) {
    doc.text("Retención:", 130, finalY + 15)
    doc.text(`-${formatCurrency(invoice.retention_amount)} €`, 180, finalY + 15, { align: "right" })
  }

  // Línea separadora
  const lineY = finalY + (invoice.irpf_amount > 0 || invoice.retention_amount > 0 ? 20 : 10)
  doc.setDrawColor(200, 200, 200)
  doc.line(130, lineY, 180, lineY)

  // Total
  doc.setFont("helvetica", "bold")
  doc.text("TOTAL:", 130, lineY + 5)
  doc.text(`${formatCurrency(invoice.total_amount)} €`, 180, lineY + 5, { align: "right" })
  doc.setFont("helvetica", "normal")

  // Añadir notas si existen
  if (invoice.notes && invoice.notes.trim() !== "") {
    const notesY = lineY + 15
    doc.setFontSize(10)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text("Notas:", 14, notesY)

    // Dividir las notas en líneas para que no se salgan de la página
    const notesText = invoice.notes || "" // Ensure notes is never undefined
    const splitNotes = doc.splitTextToSize(notesText, 180)
    doc.text(splitNotes, 14, notesY + 5)
  }

  // Añadir firma si existe
  if (invoice.signature) {
    try {
      // Calcular la posición Y para la firma
      let signatureY = lineY + 30
      if (invoice.notes && invoice.notes.trim() !== "") {
        // Si hay notas, ajustar la posición de la firma
        const notesText = invoice.notes || "" // Ensure notes is never undefined
        const splitNotes = doc.splitTextToSize(notesText, 180)
        signatureY += splitNotes.length * 5
      }

      // Añadir título de firma
      doc.setFontSize(10)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
      doc.text("Firma:", 14, signatureY)

      // Añadir la imagen de la firma
      doc.addImage(invoice.signature, "PNG", 14, signatureY + 2, 50, 20)
    } catch (error) {
      console.error("Error al añadir la firma al PDF:", error)
    }
  }

  // Añadir pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" },
    )
  }

  // Si se solicita descargar el archivo, hacerlo
  if (downloadFile) {
    doc.save(fileName)
    return undefined
  }

  // Si no se solicita descargar, devolver el blob
  const blob = doc.output("blob")
  return blob
}
