"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface ViewPdfButtonProps {
  invoiceId: number
  invoiceNumber: string
}

export function ViewPdfButton({ invoiceId, invoiceNumber }: ViewPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const viewPdf = async () => {
    setIsLoading(true)

    try {
      // Obtener la factura para verificar si tiene una URL de PDF
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("pdf_path")
        .eq("id", invoiceId)
        .single()

      if (invoiceError || !invoice) {
        console.error("Error al obtener la factura:", invoiceError)
        throw new Error("No se pudo obtener la información de la factura")
      }

      // Si la factura tiene una URL de PDF, abrirla en una nueva pestaña
      if (invoice.pdf_path) {
        window.open(invoice.pdf_path, "_blank")
      } else {
        // Si no tiene URL, intentar construir la URL basada en el número de factura
        const filePath = `public/factura-${invoiceNumber}.pdf`
        const { data: publicUrlData } = supabase.storage.from("factura-pdf").getPublicUrl(filePath)

        if (publicUrlData && publicUrlData.publicUrl) {
          window.open(publicUrlData.publicUrl, "_blank")

          // Actualizar la factura con la URL del PDF
          const { error: updateError } = await supabase
            .from("invoices")
            .update({
              pdf_path: publicUrlData.publicUrl,
            })
            .eq("id", invoiceId)

          if (updateError) {
            console.error("Error al actualizar la URL del PDF:", updateError)
            // No lanzar error, continuar aunque no se haya podido actualizar la URL
          }
        } else {
          throw new Error("No se encontró el PDF de esta factura")
        }
      }
    } catch (error) {
      console.error("Error al ver el PDF:", error)
      toast({
        title: "Error al ver el PDF",
        description: error instanceof Error ? error.message : "Ha ocurrido un error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={viewPdf} disabled={isLoading} variant="outline">
      <Eye className="mr-2 h-4 w-4" />
      {isLoading ? "Cargando..." : "Ver PDF"}
    </Button>
  )
}
