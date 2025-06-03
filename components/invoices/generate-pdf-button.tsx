"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface GeneratePdfButtonProps {
  invoiceId: number
}

export function GeneratePdfButton({ invoiceId }: GeneratePdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const generatePdf = async () => {
    setIsLoading(true)

    try {
      console.log("Iniciando generación de PDF para factura ID:", invoiceId)

      // Obtener la factura con todos los datos necesarios
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          clients (*),
          organizations (*)
        `)
        .eq("id", invoiceId)
        .single()

      if (invoiceError || !invoice) {
        throw new Error("No se pudo obtener la información de la factura")
      }

      // Obtener líneas de factura
      const { data: invoiceLines, error: linesError } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("id", { ascending: true })

      if (linesError) {
        throw new Error("No se pudieron obtener las líneas de la factura")
      }

      // Importar el generador de PDF
      const { generatePdf } = await import("@/lib/pdf-generator")

      // Preparar los datos para el PDF
      const pdfInvoice = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        base_amount: invoice.base_amount,
        vat_amount: invoice.vat_amount,
        irpf_amount: invoice.irpf_amount,
        retention_amount: invoice.retention_amount || 0,
        total_amount: invoice.total_amount,
        notes: invoice.notes || "",
        signature: invoice.signature,
        invoice_type: invoice.invoice_type,
        original_invoice_number: invoice.original_invoice_number,
        rectification_reason: invoice.rectification_reason,
        organization: {
          name: invoice.organizations.name,
          tax_id: invoice.organizations.tax_id,
          address: invoice.organizations.address || "",
          postal_code: invoice.organizations.postal_code || "",
          city: invoice.organizations.city || "",
          province: invoice.organizations.province || "",
          country: invoice.organizations.country || "España",
          email: invoice.organizations.email || "",
          phone: invoice.organizations.phone || "",
          logo_url: invoice.organizations.logo_url || null,
          logo_path: invoice.organizations.logo_path || null,
        },
        client_data: {
          name: invoice.clients.name,
          tax_id: invoice.clients.tax_id,
          address: invoice.clients.address || "",
          postal_code: invoice.clients.postal_code || "",
          city: invoice.clients.city || "",
          province: invoice.clients.province || "",
          country: invoice.clients.country || "España",
          email: invoice.clients.email || "",
          phone: invoice.clients.phone || "",
          client_type: invoice.clients.client_type || "private",
        },
      }

      // Nombre del archivo PDF
      const pdfFileName = `factura-${invoice.invoice_number}.pdf`

      // Generar y descargar el PDF
      await generatePdf(pdfInvoice, invoiceLines || [], pdfFileName, true)

      toast({
        title: "PDF generado correctamente",
        description: "La factura ha sido generada en formato PDF",
      })
    } catch (error) {
      console.error("Error al generar el PDF:", error)
      toast({
        title: "Error al generar el PDF",
        description: error instanceof Error ? error.message : "Ha ocurrido un error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={generatePdf} disabled={isLoading}>
      <FileText className="mr-2 h-4 w-4" />
      {isLoading ? "Generando..." : "Generar PDF"}
    </Button>
  )
}
