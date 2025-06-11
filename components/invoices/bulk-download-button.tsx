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
      throw new Error("No se pudieron obtener las líneas de la factura")
    }

    // Generar el PDF
    const fileName = `factura-${invoice.invoice_number}.pdf`
    const pdfBlob = await generatePdf(invoice, lines || [], fileName, true)

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

    // Generar un PDF para cada factura y añadirlo al ZIP
    const pdfPromises = invoices.map(async (invoice) => {
      const invoiceLines = allLines?.filter((line) => line.invoice_id === invoice.id) || []
      const fileName = `factura-${invoice.invoice_number}.pdf`

      try {
        const pdfBlob = await generatePdf(invoice, invoiceLines, fileName, false)
        if (pdfBlob && pdfBlob instanceof Blob) {
          zip.file(fileName, pdfBlob)
        }
      } catch (error) {
        console.error(`Error al generar PDF para factura ${invoice.invoice_number}:`, error)
      }
    })

    await Promise.all(pdfPromises)

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
