import JSZip from "jszip"
import { supabase } from "@/lib/supabase/client"
import { generatePdf } from "@/lib/pdf-generator" // Asumiendo que tu generador está en esta ruta

// Tipos de datos
type ProgressCallback = (current: number, total: number, message: string) => void

interface ExportResult {
  success: boolean
  totalInvoices: number
  successCount: number
  errorCount: number
  errorInvoices: string[]
}

/**
 * Descarga múltiples facturas como PDFs en un archivo ZIP
 */
export async function downloadSelectedInvoices(
  selectedInvoiceIds: number[],
  progressCallback?: ProgressCallback,
): Promise<ExportResult> {
  if (!selectedInvoiceIds.length) {
    throw new Error("No se han seleccionado facturas para descargar")
  }

  const zip = new JSZip()
  const result: ExportResult = {
    success: false,
    totalInvoices: selectedInvoiceIds.length,
    successCount: 0,
    errorCount: 0,
    errorInvoices: [],
  }

  try {
    // Crear carpeta con fecha actual
    const currentDate = new Date().toISOString().split("T")[0]
    const folderName = `facturas_${currentDate}`
    const folder = zip.folder(folderName)

    if (!folder) {
      throw new Error("No se pudo crear la carpeta en el ZIP")
    }

    // Procesar facturas en lotes para evitar problemas de memoria
    const batchSize = 5
    const batches = Math.ceil(selectedInvoiceIds.length / batchSize)

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchStart = batchIndex * batchSize
      const batchEnd = Math.min(batchStart + batchSize, selectedInvoiceIds.length)
      const batchIds = selectedInvoiceIds.slice(batchStart, batchEnd)

      // Notificar progreso de inicio de lote
      if (progressCallback) {
        progressCallback(batchStart, selectedInvoiceIds.length, `Preparando lote ${batchIndex + 1} de ${batches}...`)
      }

      // Procesar cada factura del lote en paralelo
      const batchPromises = batchIds.map(async (invoiceId, index) => {
        const currentIndex = batchStart + index
        try {
          // Notificar progreso
          if (progressCallback) {
            progressCallback(
              currentIndex,
              selectedInvoiceIds.length,
              `Generando PDF ${currentIndex + 1} de ${selectedInvoiceIds.length}...`,
            )
          }

          // 1. Obtener datos completos de la factura
          const { data: invoice, error: invoiceError } = await supabase
            .from("invoices")
            .select(`
              *,
              organizations (
                name, tax_id, address, postal_code, city, province, country, email, phone, logo_url, logo_path
              ),
              clients (
                name, tax_id, address, postal_code, city, province, country, email, phone, client_type
              )
            `)
            .eq("id", invoiceId)
            .single()

          if (invoiceError || !invoice) {
            throw new Error(`Error al obtener la factura ${invoiceId}: ${invoiceError?.message || "No encontrada"}`)
          }

          // 2. Obtener líneas de factura
          const { data: invoiceLines, error: linesError } = await supabase
            .from("invoice_lines")
            .select("*")
            .eq("invoice_id", invoiceId)
            .order("id", { ascending: true })

          if (linesError) {
            throw new Error(`Error al obtener líneas de factura ${invoiceId}: ${linesError.message}`)
          }

          // 3. Preparar datos para el generador de PDF
          const pdfData = {
            ...invoice,
            organization: invoice.organizations,
            client_data: invoice.clients,
          }

          // 4. Generar PDF como Blob (sin descarga)
          const fileName = `${invoice.invoice_number.replace(/[^a-zA-Z0-9]/g, "_")}_${invoice.clients?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "Cliente"}.pdf`
          const pdfBlob = await generatePdf(pdfData, invoiceLines || [], fileName, false)

          if (!pdfBlob) {
            throw new Error(`Error al generar PDF para factura ${invoice.invoice_number}`)
          }

          // 5. Añadir al ZIP
          folder.file(fileName, pdfBlob)

          // Incrementar contador de éxito
          result.successCount++
          return { success: true, invoiceNumber: invoice.invoice_number }
        } catch (error) {
          console.error(`Error procesando factura ID ${invoiceId}:`, error)
          result.errorCount++
          result.errorInvoices.push(`ID ${invoiceId}: ${error instanceof Error ? error.message : "Error desconocido"}`)
          return { success: false, invoiceId }
        }
      })

      // Esperar a que se completen todas las facturas del lote
      await Promise.all(batchPromises)

      // Liberar memoria entre lotes
      if (typeof global.gc === "function") {
        global.gc()
      }
    }

    // Generar archivo de resumen
    const summaryContent = generateSummaryText(result)
    folder.file("resumen.txt", summaryContent)

    // Notificar progreso final
    if (progressCallback) {
      progressCallback(selectedInvoiceIds.length, selectedInvoiceIds.length, "Preparando descarga...")
    }

    // Generar y descargar el ZIP
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    // Crear enlace de descarga
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${folderName}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    result.success = true
    return result
  } catch (error) {
    console.error("Error al generar descarga masiva:", error)
    result.success = false
    throw error
  }
}

/**
 * Genera el contenido del archivo de resumen
 */
function generateSummaryText(result: ExportResult): string {
  const timestamp = new Date().toLocaleString("es-ES")

  return `
RESUMEN DE FACTURAS EXPORTADAS
==============================

Fecha de exportación: ${timestamp}
Total de facturas seleccionadas: ${result.totalInvoices}
Facturas exportadas con éxito: ${result.successCount}
Facturas con errores: ${result.errorCount}

${
  result.errorCount > 0
    ? `
ERRORES ENCONTRADOS:
${result.errorInvoices.map((err) => `- ${err}`).join("\n")}
`
    : ""
}

Esta exportación fue generada automáticamente.
  `.trim()
}
