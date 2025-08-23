"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import JSZip from "jszip"
import { supabase } from "@/lib/supabase/client"
import { StorageService } from "@/lib/storage-service"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BulkDownloadButtonProps {
  selectedExpenseIds: number[]
  onDownloadComplete?: (expenseIds: number[]) => void
}

export function BulkDownloadButton({ selectedExpenseIds, onDownloadComplete }: BulkDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const performDownload = async () => {
    if (selectedExpenseIds.length === 0) return

    setIsLoading(true)

    try {
      // Obtener los gastos con archivos adjuntos
      const { data: expenses, error } = await supabase
        .from("expenses")
        .select("id, description, receipt_path, expense_date, supplier_name")
        .in("id", selectedExpenseIds)
        .not("receipt_path", "is", null)

      if (error) {
        throw new Error("No se pudieron obtener los gastos")
      }

      const expensesWithFiles = expenses || []

      if (expensesWithFiles.length === 0) {
        toast({
          title: "Sin archivos",
          description: "Los gastos seleccionados no tienen archivos adjuntos",
          variant: "destructive",
        })
        return
      }

      if (expensesWithFiles.length === 1) {
        // Descarga individual
        await downloadSingleFile(expensesWithFiles[0])
      } else {
        // Descarga múltiple en ZIP
        await downloadMultipleFiles(expensesWithFiles)
      }

      if (onDownloadComplete) {
        onDownloadComplete(selectedExpenseIds)
      }

      toast({
        title: "Descarga completada",
        description: `Se ${expensesWithFiles.length === 1 ? "descargó el archivo" : `descargaron ${expensesWithFiles.length} archivos`} correctamente`,
      })
    } catch (error) {
      console.error("Error al descargar archivos:", error)
      toast({
        title: "Error",
        description: "No se pudieron descargar los archivos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadSingleFile = async (expense: any) => {
    const downloadUrl = await StorageService.getDownloadUrl(expense.receipt_path)
    if (!downloadUrl) {
      throw new Error("No se pudo generar la URL de descarga")
    }

    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(`Error al obtener el archivo: ${response.status}`)
    }

    const blob = await response.blob()
    const fileName = expense.receipt_path.split("/").pop() || `gasto_${expense.id}`

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const downloadMultipleFiles = async (expenses: any[]) => {
    const zip = new JSZip()

    const downloadPromises = expenses.map(async (expense) => {
      try {
        const downloadUrl = await StorageService.getDownloadUrl(expense.receipt_path)
        if (!downloadUrl) return

        const response = await fetch(downloadUrl)
        if (!response.ok) return

        const blob = await response.blob()
        const fileName = expense.receipt_path.split("/").pop() || `gasto_${expense.id}`
        const folderName = `${expense.expense_date}_${expense.description.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}`

        zip.file(`${folderName}/${fileName}`, blob)
      } catch (error) {
        console.error(`Error al procesar archivo del gasto ${expense.id}:`, error)
      }
    })

    await Promise.all(downloadPromises)

    const fileCount = Object.keys(zip.files).length
    if (fileCount === 0) {
      throw new Error("No se pudo descargar ningún archivo")
    }

    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gastos-${new Date().toISOString().split("T")[0]}.zip`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  const isDisabled = isLoading || selectedExpenseIds.length === 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={performDownload} disabled={isDisabled}>
            {isLoading ? <Download className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {isLoading
              ? "Descargando..."
              : selectedExpenseIds.length === 1
                ? "Descargar archivo"
                : `Descargar ${selectedExpenseIds.length} archivos`}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Descargar archivos adjuntos de gastos seleccionados</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
