"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, AlertTriangle, FileX } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import JSZip from "jszip"
import { supabase } from "@/lib/supabase/client"
import { generatePdf } from "@/lib/pdf-generator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BulkDownloadButtonProps {
  selectedInvoiceIds: number[]
  onDownloadComplete?: (invoiceIds: number[]) => void
}

export function BulkDownloadButton({ selectedInvoiceIds, onDownloadComplete }: BulkDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [downloadableInvoices, setDownloadableInvoices] = useState<any[]>([])
  const [draftInvoices, setDraftInvoices] = useState<any[]>([])
  const [allAreDrafts, setAllAreDrafts] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const { toast } = useToast()

  // Verificar el estado de las facturas cuando cambian las seleccionadas
  useEffect(() => {
    if (selectedInvoiceIds.length > 0) {
      checkInvoicesStatusSilently()
    } else {
      setAllAreDrafts(false)
      setDownloadableInvoices([])
      setDraftInvoices([])
    }
  }, [selectedInvoiceIds])

  const checkInvoicesStatusSilently = async () => {
    if (selectedInvoiceIds.length === 0) return

    setIsCheckingStatus(true)
    try {
      const { data: invoicesStatus, error: statusError } = await supabase
        .from("invoices")
        .select("id, status, invoice_number")
        .in("id", selectedInvoiceIds)

      if (statusError) {
        console.error("Error al verificar estado:", statusError)
        return
      }

      const downloadable = invoicesStatus?.filter((inv) => inv.status !== "draft") || []
      const drafts = invoicesStatus?.filter((inv) => inv.status === "draft") || []

      setDownloadableInvoices(downloadable)
      setDraftInvoices(drafts)
      setAllAreDrafts(downloadable.length === 0 && drafts.length > 0)
    } catch (error) {
      console.error("Error al verificar facturas:", error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const checkInvoicesStatus = async () => {
    if (selectedInvoiceIds.length === 0) return

    try {
      // Si ya sabemos que todas son borradores, mostrar error inmediatamente
      if (allAreDrafts) {
        toast({
          title: "Sin facturas para descargar",
          description: "Todas las facturas seleccionadas están en borrador y no se pueden descargar",
          variant: "destructive",
        })
        return
      }

      // Si hay borradores, mostrar diálogo de confirmación
      if (draftInvoices.length > 0) {
        setShowConfirmDialog(true)
      } else {
        // Si no hay borradores, proceder directamente
        await performDownload(downloadableInvoices.map((inv) => inv.id))
      }
    } catch (error) {
      console.error("Error al verificar facturas:", error)
      toast({
        title: "Error",
        description: "No se pudo verificar el estado de las facturas",
        variant: "destructive",
      })
    }
  }

  const performDownload = async (invoiceIds: number[]) => {
    setIsLoading(true)
    setShowConfirmDialog(false)

    try {
      // Si solo hay una factura, descargarla directamente
      if (invoiceIds.length === 1) {
        await downloadSingleInvoice(invoiceIds[0])
      } else {
        // Si hay múltiples facturas, crear un ZIP
        await downloadMultipleInvoices(invoiceIds)
      }

      // Notificar que la descarga se completó
      if (onDownloadComplete) {
        onDownloadComplete(invoiceIds)
      }

      toast({
        title: "Descarga completada",
        description: `Se ${invoiceIds.length === 1 ? "descargó la factura" : `descargaron ${invoiceIds.length} facturas`} correctamente`,
      })
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
      base_amount: Number(invoice.base_amount) || 0,
      vat_amount: Number(invoice.vat_amount) || 0,
      irpf_amount: Number(invoice.irpf_amount) || 0,
      retention_amount: Number(invoice.retention_amount) || 0,
      total_amount: Number(invoice.total_amount) || 0,
      discount_amount: Number(invoice.discount_amount) || 0,
      // ✅ Incluir campos de Verifactu
      verifactu_qr_code: invoice.verifactu_qr_code || null,
      verifactu_status: invoice.verifactu_status || null,
      verifactu_response: invoice.verifactu_response || null,
    }
    return mappedInvoice
  }

  const downloadSingleInvoice = async (invoiceId: number) => {
    // ✅ Obtener los datos de la factura incluyendo campos de Verifactu
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

    // ✅ Verificar que no sea borrador (doble verificación)
    if (invoice.status === "draft") {
      throw new Error("No se puede descargar una factura en borrador")
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
      quantity: Number(line.quantity) || 0,
      unit_price: Number(line.unit_price) || 0,
      discount_percentage: Number(line.discount_percentage) || 0,
      vat_rate: Number(line.vat_rate) || 0,
      irpf_rate: Number(line.irpf_rate) || 0,
      retention_rate: Number(line.retention_rate) || 0,
      line_amount: Number(line.line_amount) || 0,
    }))

    // Mapear los datos al formato correcto
    const mappedInvoice = mapInvoiceData(invoice)

    // Generar el PDF con QR de Verifactu
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
    } else {
      throw new Error("No se pudo generar el PDF")
    }
  }

  const downloadMultipleInvoices = async (invoiceIds: number[]) => {
    const zip = new JSZip()

    // ✅ Obtener datos de todas las facturas seleccionadas incluyendo Verifactu
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

    // ✅ Filtrar borradores (verificación adicional)
    const nonDraftInvoices = invoices.filter((inv) => inv.status !== "draft")
    if (nonDraftInvoices.length === 0) {
      throw new Error("Todas las facturas seleccionadas están en borrador")
    }

    // Obtener todas las líneas de las facturas (solo las no-borrador)
    const nonDraftIds = nonDraftInvoices.map((inv) => inv.id)
    const { data: allLines, error: linesError } = await supabase
      .from("invoice_lines")
      .select("*")
      .in("invoice_id", nonDraftIds)

    if (linesError) {
      throw new Error("No se pudieron obtener las líneas de las facturas")
    }

    // Generar un PDF para cada factura y añadirlo al ZIP
    const pdfPromises = nonDraftInvoices.map(async (invoice, index) => {
      const invoiceLines = allLines?.filter((line) => line.invoice_id === invoice.id) || []

      // Validar líneas
      const validLines = invoiceLines.map((line) => ({
        ...line,
        quantity: Number(line.quantity) || 0,
        unit_price: Number(line.unit_price) || 0,
        discount_percentage: Number(line.discount_percentage) || 0,
        vat_rate: Number(line.vat_rate) || 0,
        irpf_rate: Number(line.irpf_rate) || 0,
        retention_rate: Number(line.retention_rate) || 0,
        line_amount: Number(line.line_amount) || 0,
      }))

      const fileName = `factura-${invoice.invoice_number}.pdf`

      try {
        // Mapear los datos al formato correcto
        const mappedInvoice = mapInvoiceData(invoice)
        const pdfBlob = await generatePdf(mappedInvoice, validLines, fileName, false)

        if (pdfBlob && pdfBlob instanceof Blob) {
          zip.file(fileName, pdfBlob)
        }
      } catch (error) {
        console.error(`❌ Error al generar PDF para factura ${invoice.invoice_number}:`, error)
      }
    })

    await Promise.all(pdfPromises)

    // Verificar que se añadieron archivos al ZIP
    const fileCount = Object.keys(zip.files).length
    if (fileCount === 0) {
      throw new Error("No se pudo generar ningún PDF")
    }

    // Generar el archivo ZIP
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    })

    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `facturas-${new Date().toISOString().split("T")[0]}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  // Determinar el texto y el icono del botón
  const getButtonContent = () => {
    if (isLoading) {
      return {
        icon: <Download className="mr-2 h-4 w-4 animate-spin" />,
        text: "Descargando...",
      }
    }

    if (selectedInvoiceIds.length === 0) {
      return {
        icon: <Download className="mr-2 h-4 w-4" />,
        text: "Descargar PDF",
      }
    }

    if (allAreDrafts) {
      return {
        icon: <FileX className="mr-2 h-4 w-4" />,
        text:
          selectedInvoiceIds.length === 1
            ? "Borrador - No descargable"
            : `${selectedInvoiceIds.length} Borradores - No descargables`,
      }
    }

    if (draftInvoices.length > 0) {
      return {
        icon: <AlertTriangle className="mr-2 h-4 w-4" />,
        text:
          downloadableInvoices.length === 1
            ? `Descargar 1 PDF (${draftInvoices.length} borrador${draftInvoices.length !== 1 ? "es" : ""})`
            : `Descargar ${downloadableInvoices.length} PDFs (${draftInvoices.length} borrador${draftInvoices.length !== 1 ? "es" : ""})`,
      }
    }

    return {
      icon: <Download className="mr-2 h-4 w-4" />,
      text: selectedInvoiceIds.length === 1 ? "Descargar PDF" : `Descargar ${selectedInvoiceIds.length} PDFs`,
    }
  }

  const buttonContent = getButtonContent()
  const isDisabled = isLoading || selectedInvoiceIds.length === 0 || allAreDrafts || isCheckingStatus

  const ButtonComponent = (
    <Button
      variant={allAreDrafts ? "secondary" : "outline"}
      size="sm"
      onClick={checkInvoicesStatus}
      disabled={isDisabled}
      className={allAreDrafts ? "opacity-60 cursor-not-allowed" : ""}
    >
      {buttonContent.icon}
      {buttonContent.text}
    </Button>
  )

  return (
    <TooltipProvider>
      <>
        {allAreDrafts ? (
          <Tooltip>
            <TooltipTrigger asChild>{ButtonComponent}</TooltipTrigger>
            <TooltipContent>
              <p>Las facturas en borrador no se pueden descargar</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          ButtonComponent
        )}

        {/* Diálogo de confirmación cuando hay borradores */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Facturas en borrador detectadas
              </DialogTitle>
              <DialogDescription className="space-y-3">
                <p>
                  Se encontraron <strong>{draftInvoices.length}</strong> factura{draftInvoices.length !== 1 ? "s" : ""}{" "}
                  en borrador que no se pueden descargar:
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 max-h-32 overflow-y-auto">
                  <ul className="text-sm space-y-1">
                    {draftInvoices.map((invoice) => (
                      <li key={invoice.id} className="text-amber-800">
                        • {invoice.invoice_number || `Borrador ID: ${invoice.id}`}
                      </li>
                    ))}
                  </ul>
                </div>
                <p>
                  ¿Deseas continuar descargando solo las <strong>{downloadableInvoices.length}</strong> factura
                  {downloadableInvoices.length !== 1 ? "s" : ""} válida{downloadableInvoices.length !== 1 ? "s" : ""}?
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => performDownload(downloadableInvoices.map((inv) => inv.id))}
                disabled={downloadableInvoices.length === 0}
              >
                Descargar {downloadableInvoices.length} factura{downloadableInvoices.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </TooltipProvider>
  )
}
