import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// Actualizar la interfaz Invoice para incluir el campo de retención y firma
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
  organization: {
    name: string
    tax_id: string
    address: string
    postal_code: string
    city: string
    province: string
    country: string
    email?: string
    phone?: string
  }
  client_data: {
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

// Actualizar la interfaz InvoiceLine para incluir el campo de retención
interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  irpf_rate: number
  retention_rate: number // Nuevo campo
  line_amount: number
}

// Mejorar la función generatePdf para incluir todos los datos obligatorios
export const generatePdf = (invoice: Invoice, lines: InvoiceLine[], filename: string) => {
  try {
    // Crear un nuevo documento PDF
    const doc = new jsPDF()

    // Configurar fuentes y tamaños
    doc.setFont("helvetica")
    doc.setFontSize(20)

    // Título
    doc.text("FACTURA", 105, 20, { align: "center" })
    doc.setFontSize(14)
    doc.text(invoice.invoice_number, 105, 30, { align: "center" })

    // Fecha
    doc.setFontSize(10)
    doc.text(`Fecha: ${new Date(invoice.issue_date).toLocaleDateString()}`, 20, 40)

    // Información de la organización (emisor)
    doc.setFontSize(12)
    doc.text("EMISOR:", 20, 50)
    doc.setFontSize(10)
    doc.text(invoice.organization.name, 20, 55)
    doc.text(`CIF/NIF: ${invoice.organization.tax_id}`, 20, 60)
    doc.text(invoice.organization.address, 20, 65)
    doc.text(
      `${invoice.organization.postal_code} ${invoice.organization.city}, ${invoice.organization.province}`,
      20,
      70,
    )
    doc.text(`País: ${invoice.organization.country || "España"}`, 20, 75)

    if (invoice.organization.email) {
      doc.text(`Email: ${invoice.organization.email}`, 20, 80)
    }

    if (invoice.organization.phone) {
      doc.text(`Teléfono: ${invoice.organization.phone}`, 20, 85)
    }

    // Información del cliente (receptor)
    doc.setFontSize(12)
    doc.text("CLIENTE:", 120, 50)
    doc.setFontSize(10)
    doc.text(invoice.client_data.name, 120, 55)
    doc.text(`CIF/NIF: ${invoice.client_data.tax_id}`, 120, 60)
    doc.text(invoice.client_data.address, 120, 65)
    doc.text(`${invoice.client_data.postal_code} ${invoice.client_data.city}, ${invoice.client_data.province}`, 120, 70)
    doc.text(`País: ${invoice.client_data.country || "España"}`, 120, 75)

    if (invoice.client_data.email) {
      doc.text(`Email: ${invoice.client_data.email}`, 120, 80)
    }

    if (invoice.client_data.phone) {
      doc.text(`Teléfono: ${invoice.client_data.phone}`, 120, 85)
    }

    // Tabla de líneas de factura
    const startY = 95 // Ajustar la posición inicial de la tabla
    doc.setFontSize(10)
    const tableColumn = ["Descripción", "Cantidad", "Precio", "IVA %", "IRPF %", "Retención %", "Importe"]
    const tableRows: any[] = []

    lines.forEach((line) => {
      const lineData = [
        line.description,
        line.quantity.toString(),
        `${line.unit_price.toFixed(2)} €`,
        `${line.vat_rate} %`,
        `${line.irpf_rate} %`,
        `${line.retention_rate} %`, // Nuevo campo
        `${line.line_amount.toFixed(2)} €`,
      ]
      tableRows.push(lineData)
    })

    // Usar autoTable como una función independiente
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      theme: "striped",
      headStyles: {
        fillColor: [66, 66, 66],
        textColor: 255,
        fontStyle: "bold",
      },
      margin: { top: startY },
    })

    // Obtener la posición final de la tabla
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable?.finalY || 150

    // Totales
    doc.setFontSize(10)
    doc.text(`Base Imponible: ${invoice.base_amount.toFixed(2)} €`, 150, finalY + 10, { align: "right" })
    doc.text(`IVA: ${invoice.vat_amount.toFixed(2)} €`, 150, finalY + 15, { align: "right" })
    doc.text(`IRPF: -${invoice.irpf_amount.toFixed(2)} €`, 150, finalY + 20, { align: "right" })
    doc.text(`Retención: -${invoice.retention_amount.toFixed(2)} €`, 150, finalY + 25, { align: "right" }) // Nueva línea
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(`Total: ${invoice.total_amount.toFixed(2)} €`, 150, finalY + 35, { align: "right" }) // Ajustar posición

    // Notas
    if (invoice.notes) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text("Notas:", 20, finalY + 40)

      // Dividir las notas en líneas para que no se salgan del PDF
      const splitNotes = doc.splitTextToSize(invoice.notes, 170)
      doc.text(splitNotes, 20, finalY + 45)
    }

    // Añadir firma si existe
    if (invoice.signature) {
      const signatureY = finalY + (invoice.notes ? 60 : 45)

      // Añadir texto de firma
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text("Firma:", 20, signatureY)

      // Añadir la imagen de la firma
      try {
        doc.addImage(invoice.signature, "PNG", 20, signatureY + 5, 50, 25)
      } catch (error) {
        console.error("Error al añadir la firma:", error)
      }
    }

    // Guardar el PDF
    doc.save(filename)
  } catch (error) {
    console.error("Error detallado al generar PDF:", error)
    throw error
  }
}
