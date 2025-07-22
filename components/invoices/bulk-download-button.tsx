"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import JSZip from "jszip"
import { supabase } from "@/lib/supabase/client"
import { generatePdf } from "@/lib/pdf-generator"

interface BulkDownloadButtonProps {
  selectedInvoiceIds: number[]
  onDownloadComplete?: (invoiceIds: number[]) => void
}

export function BulkDownloadButton({ selectedInvoiceIds, onDownloadComplete }: BulkDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDownload = async () => {
    if (selectedInvoiceIds.length === 0) return

    setIsLoading(true)

    try {
      // Si solo hay una factura, descargarla directamente
      if (selectedInvoiceIds.length === 1) {
        await downloadSingleInvoice(selectedInvoiceIds[0])
      } else {
        // Si hay múltiples facturas, crear un ZIP
        await downloadMultipleInvoices(selectedInvoiceIds)
      }

      // Notificar que la descarga se completó
      if (onDownloadComplete) {
        onDownloadComplete(selectedInvoiceIds)
      }
    } catch (error) {
      console.error("Error al descargar facturas:", error)
      toast({
        title: "Error",
        description: "No se pudieron descargar las facturas",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para mapear los datos de Supabase al formato esperado por el generador de PDF
  const mapInvoiceData = (invoice: any) => {
    const mappedInvoice = {
      ...invoice,
      // Mapear organization (singular) desde organizations (plural)
      organization: Array.isArray(invoice.organizations) ? invoice.organizations[0] : invoice.organizations,
      // Mapear client_data desde clients
      client_data: Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients,
      // Asegurar que los totales están definidos
      base_amount: invoice.base_amount || 0,
      vat_amount: invoice.vat_amount || 0,
      irpf_amount: invoice.irpf_amount || 0,
      retention_amount: invoice.retention_amount || 0,
      total_amount: invoice.total_amount || 0,
    }

    // Debug: Verificar totales
    console.log("Totales mapeados:", {
      base_amount: mappedInvoice.base_amount,
      vat_amount: mappedInvoice.vat_amount,
      irpf_amount: mappedInvoice.irpf_amount,
      retention_amount: mappedInvoice.retention_amount,
      total_amount: mappedInvoice.total_amount,
    })

    return mappedInvoice
  }

  const downloadSingleInvoice = async (invoiceId: number) => {
    // Obtener los datos de la factura
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        *,
        clients (*),
        organizations (*)
      `)
      .eq("id", invoiceId)
      .single()

    if (error || !invoice) {
      throw new Error("No se pudo obtener la factura")
    }

    // Obtener las líneas de la factura
    const { data: lines, error: linesError } = await supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoiceId)

    if (linesError) {
      console.error("Error al obtener líneas:", linesError)
      throw new Error("No se pudieron obtener las líneas de la factura")
    }

    // Validar y mapear las líneas
    const validLines = (lines || []).map((line) => ({
      ...line,
      quantity: line.quantity || 0,
      unit_price: line.unit_price || 0,
      vat_rate: line.vat_rate || 0,
      irpf_rate: line.irpf_rate || 0,
      retention_rate: line.retention_rate || 0,
      line_amount: line.line_amount || 0,
    }))

    // Debug: Verificar líneas
    console.log("Líneas validadas:", validLines)

    // Mapear los datos al formato correcto
    const mappedInvoice = mapInvoiceData(invoice)

    // Debug: Verificar que los datos están correctos
    console.log("Datos de la factura mapeados:", mappedInvoice)
    console.log("Líneas de la factura:", lines)

    // Generar el PDF
    const fileName = `factura-${invoice.invoice_number}.pdf`
    const pdfBlob = await generatePdf(mappedInvoice, validLines, fileName, false)

    // Si el PDF se generó correctamente, descargarlo
    if (pdfBlob && pdfBlob instanceof Blob) {
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 100)
    }
  }

  const downloadMultipleInvoices = async (invoiceIds: number[]) => {
    const zip = new JSZip()

    // Obtener datos de todas las facturas seleccionadas
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(`
        *,
        clients (*),
        organizations (*)
      `)
      .in("id", invoiceIds)

    if (error || !invoices) {
      throw new Error("No se pudieron obtener las facturas")
    }

    // Obtener todas las líneas de las facturas
    const { data: allLines, error: linesError } = await supabase
      .from("invoice_lines")
      .select("*")
      .in("invoice_id", invoiceIds)

    if (linesError) {
      throw new Error("No se pudieron obtener las líneas de las facturas")
    }

    // Debug: Verificar datos obtenidos
    console.log("Facturas obtenidas:", invoices)
    console.log("Líneas obtenidas:", allLines)

    // Generar un PDF para cada factura y añadirlo al ZIP
    const pdfPromises = invoices.map(async (invoice) => {
      const invoiceLines = allLines?.filter((line) => line.invoice_id === invoice.id) || []
      const fileName = `factura-${invoice.invoice_number}.pdf`

      try {
        // Mapear los datos al formato correcto
        const mappedInvoice = mapInvoiceData(invoice)

        console.log(`Generando PDF para factura ${invoice.invoice_number}:`, {
          invoice: mappedInvoice,
          lines: invoiceLines,
        })

        const pdfBlob = await generatePdf(mappedInvoice, invoiceLines, fileName, false)
        if (pdfBlob && pdfBlob instanceof Blob) {
          zip.file(fileName, pdfBlob)
        } else {
          console.error(`No se pudo generar PDF para factura ${invoice.invoice_number}`)
        }
      } catch (error) {
        console.error(`Error al generar PDF para factura ${invoice.invoice_number}:`, error)
      }
    })

    await Promise.all(pdfPromises)

    // Verificar que se añadieron archivos al ZIP
    const fileCount = Object.keys(zip.files).length
    console.log(`Archivos en el ZIP: ${fileCount}`)

    if (fileCount === 0) {
      throw new Error("No se pudo generar ningún PDF")
    }

    // Generar el archivo ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `facturas-${new Date().toISOString().split("T")[0]}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading || selectedInvoiceIds.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      {isLoading
        ? "Descargando..."
        : selectedInvoiceIds.length === 1
          ? "Descargar PDF"
          : `Descargar ${selectedInvoiceIds.length} PDFs`}
    </Button>
  )
}
