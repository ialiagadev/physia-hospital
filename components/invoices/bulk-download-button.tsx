"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, X } from "lucide-react"
import { downloadSelectedInvoices } from "@/lib/invoice-export"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface BulkDownloadButtonProps {
  selectedInvoiceIds: number[]
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function BulkDownloadButton({
  selectedInvoiceIds,
  variant = "default",
  size = "sm",
  className,
}: BulkDownloadButtonProps) {
  const { toast } = useToast()
  const [isDownloading, setIsDownloading] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState("")
  const [isCancelled, setIsCancelled] = useState(false)

  const handleDownload = async () => {
    if (selectedInvoiceIds.length === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos una factura para descargar",
        variant: "destructive",
      })
      return
    }

    setIsDownloading(true)
    setShowProgress(true)
    setProgress(0)
    setProgressMessage("Iniciando descarga...")
    setIsCancelled(false)

    try {
      const result = await downloadSelectedInvoices(selectedInvoiceIds, (current, total, message) => {
        if (isCancelled) return
        const progressPercent = Math.round((current / total) * 100)
        setProgress(progressPercent)
        setProgressMessage(message)
      })

      if (result.success) {
        toast({
          title: "Descarga completada",
          description: `Se han descargado ${result.successCount} de ${result.totalInvoices} facturas`,
        })
      } else {
        toast({
          title: "Descarga parcial",
          description: `Se han descargado ${result.successCount} de ${result.totalInvoices} facturas. Algunas facturas no se pudieron procesar.`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error en descarga masiva:", error)
      toast({
        title: "Error en descarga",
        description: error instanceof Error ? error.message : "No se pudieron descargar las facturas",
        variant: "destructive",
      })
    } finally {
      // Pequeño retraso para mostrar el 100% antes de cerrar
      setTimeout(() => {
        setIsDownloading(false)
        setShowProgress(false)
      }, 500)
    }
  }

  const handleCancel = () => {
    setIsCancelled(true)
    setIsDownloading(false)
    setShowProgress(false)
    toast({
      title: "Descarga cancelada",
      description: "La descarga de facturas ha sido cancelada",
    })
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={isDownloading || selectedInvoiceIds.length === 0}
        className={className}
      >
        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
        {isDownloading ? "Descargando..." : "Descargar PDFs"}
      </Button>

      <Dialog open={showProgress} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Descargando facturas</DialogTitle>
            <DialogDescription>Generando PDFs y preparando archivo ZIP. Por favor, espera...</DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center mt-2 text-muted-foreground">{progressMessage}</p>
            <p className="text-xs text-center mt-1 text-muted-foreground">
              {progress}% completado ({selectedInvoiceIds.length} facturas)
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={!isDownloading}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
