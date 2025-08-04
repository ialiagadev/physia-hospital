"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, AlertTriangle, FileText } from "lucide-react"
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
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const { toast } = useToast()

  // Verificar el estado de las facturas cuando cambian las seleccionadas
  useEffect(() => {
    if (selectedInvoiceIds.length > 0) {
      checkInvoicesStatusSilently()
    } else {
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

      // ✅ CAMBIO: Ahora todas las facturas son descargables (incluyendo borradores)
      const downloadable = invoicesStatus || []
      const drafts = invoicesStatus?.filter((inv) => inv.status === "draft") || []

      setDownloadableInvoices(downloadable)
      setDraftInvoices(drafts)
    } catch (error) {
      console.error("Error al verificar facturas:", error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const checkInvoicesStatus = async () => {
    if (selectedInvoiceIds.length === 0) return

    try {
      // ✅ CAMBIO: Si hay borradores, mostrar diálogo informativo (no bloqueante)
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

      // ✅ MENSAJE ACTUALIZADO para incluir información sobre borradores
      const draftsCount = draftInvoices.filter((d) => invoiceIds.includes(d.id)).length
      const officialsCount = invoiceIds.length - draftsCount

      let description = `Se ${invoiceIds.length === 1 ? "descargó la factura" : `descargaron ${invoiceIds.length} facturas`} correctamente`

      if (draftsCount > 0 && officialsCount > 0) {
        description += ` (${officialsCount} oficial${officialsCount !== 1 ? "es" : ""}, ${draftsCount} borrador${draftsCount !== 1 ? "es" : ""})`
      } else if (draftsCount > 0) {
        description += ` (${draftsCount} borrador${draftsCount !== 1 ? "es" : ""})`
      }

      toast({
        title: "Descarga completada",
        description,
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

    // ✅ DETERMINAR SI ES BORRADOR
    const isDraft = invoice.status === "draft"

    // Generar el PDF con el parámetro isDraft
    const fileName = `${isDraft ? "borrador-" : ""}factura-${invoice.invoice_number || invoiceId}.pdf`
    const pdfBlob = await generatePdf(mappedInvoice, validLines, fileName, isDraft)

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

    // Obtener todas las líneas de las facturas
    const { data: allLines, error: linesError } = await supabase
      .from("invoice_lines")
      .select("*")
      .in("invoice_id", invoiceIds)

    if (linesError) {
      throw new Error("No se pudieron obtener las líneas de las facturas")
    }

    // Generar un PDF para cada factura y añadirlo al ZIP
    const pdfPromises = invoices.map(async (invoice, index) => {
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

      // ✅ DETERMINAR SI ES BORRADOR
      const isDraft = invoice.status === "draft"
      const fileName = `${isDraft ? "borrador-" : ""}factura-${invoice.invoice_number || invoice.id}.pdf`

      try {
        // Mapear los datos al formato correcto
        const mappedInvoice = mapInvoiceData(invoice)
        const pdfBlob = await generatePdf(mappedInvoice, validLines, fileName, isDraft)

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

    // ✅ CAMBIO: Mostrar información sobre borradores sin bloquear
    if (draftInvoices.length > 0) {
      const officialsCount = downloadableInvoices.length - draftInvoices.length

      if (officialsCount === 0) {
        // Solo borradores
        return {
          icon: <FileText className="mr-2 h-4 w-4" />,
          text:
            selectedInvoiceIds.length === 1
              ? "Descargar borrador"
              : `Descargar ${selectedInvoiceIds.length} borradores`,
        }
      } else {
        // Mezcla de oficiales y borradores
        return {
          icon: <AlertTriangle className="mr-2 h-4 w-4" />,
          text: `Descargar ${downloadableInvoices.length} PDFs (${draftInvoices.length} borrador${draftInvoices.length !== 1 ? "es" : ""})`,
        }
      }
    }

    return {
      icon: <Download className="mr-2 h-4 w-4" />,
      text: selectedInvoiceIds.length === 1 ? "Descargar PDF" : `Descargar ${selectedInvoiceIds.length} PDFs`,
    }
  }

  const buttonContent = getButtonContent()
  const isDisabled = isLoading || selectedInvoiceIds.length === 0 || isCheckingStatus

  const ButtonComponent = (
    <Button variant="outline" size="sm" onClick={checkInvoicesStatus} disabled={isDisabled}>
      {buttonContent.icon}
      {buttonContent.text}
    </Button>
  )

  return (
    <TooltipProvider>
      <>
        {draftInvoices.length > 0 && draftInvoices.length === selectedInvoiceIds.length ? (
          <Tooltip>
            <TooltipTrigger asChild>{ButtonComponent}</TooltipTrigger>
            <TooltipContent>
              <p>Se descargarán como borradores con marca de agua</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          ButtonComponent
        )}

        {/* ✅ DIÁLOGO ACTUALIZADO: Informativo, no bloqueante */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Facturas en borrador incluidas
              </DialogTitle>
              <DialogDescription className="space-y-3">
                <p>
                  Se encontraron <strong>{draftInvoices.length}</strong> factura{draftInvoices.length !== 1 ? "s" : ""}{" "}
                  en borrador que se descargarán con marca de agua:
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
                <p>Los borradores se descargarán claramente marcados como tales para evitar confusiones fiscales.</p>
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
