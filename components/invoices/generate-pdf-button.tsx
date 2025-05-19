"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { getImageAsBase64 } from "@/lib/storage-utils"

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
        console.error("Error al obtener la factura:", invoiceError)
        throw new Error("No se pudo obtener la información de la factura")
      }

      console.log("Datos de factura obtenidos:", invoice)

      // Verificar que tenemos todos los datos de la organización
      if (!invoice.organizations || !invoice.organizations.name || !invoice.organizations.tax_id) {
        console.error("Datos de organización incompletos:", invoice.organizations)
        throw new Error("Datos de organización incompletos. Por favor, verifica la configuración de la organización.")
      }

      // Obtener líneas de factura
      const { data: invoiceLines, error: linesError } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("id", { ascending: true })

      if (linesError) {
        console.error("Error al obtener líneas de factura:", linesError)
        throw new Error("No se pudieron obtener las líneas de la factura")
      }

      console.log("Líneas de factura obtenidas:", invoiceLines)

      // Verificar que el número de factura sea único
      const { data: duplicateCheck } = await supabase
        .from("invoices")
        .select("id")
        .eq("invoice_number", invoice.invoice_number)
        .neq("id", invoiceId)
        .limit(1)

      if (duplicateCheck && duplicateCheck.length > 0) {
        console.error("Número de factura duplicado:", invoice.invoice_number)
        throw new Error(
          "Esta factura tiene un número que ya existe. Por favor, contacte al administrador para resolverlo.",
        )
      }

      // Obtener la firma como base64 si existe una URL de firma
      let signatureBase64 = null
      if (invoice.signature_url) {
        try {
          console.log("Intentando obtener firma desde URL:", invoice.signature_url)
          signatureBase64 = await getImageAsBase64(invoice.signature_url)

          if (!signatureBase64) {
            console.warn("No se pudo obtener la firma desde la URL, intentando usar la firma base64 almacenada")
            signatureBase64 = invoice.signature
          } else {
            console.log("Firma obtenida correctamente desde URL")
          }
        } catch (error) {
          console.error("Error al obtener la firma como base64:", error)
          // Intentar usar la firma base64 almacenada como respaldo
          signatureBase64 = invoice.signature
        }
      } else if (invoice.signature) {
        // Si hay una firma en base64 directamente en la factura, usarla
        console.log("Usando firma base64 almacenada en la factura")
        signatureBase64 = invoice.signature
      }

      // Verificar si tenemos una firma válida
      if (signatureBase64) {
        if (typeof signatureBase64 === "string" && signatureBase64.startsWith("data:image")) {
          console.log("Firma válida encontrada")
        } else {
          console.warn("La firma no tiene un formato base64 válido")
          signatureBase64 = null
        }
      } else {
        console.log("No se encontró ninguna firma para esta factura")
      }

      // Actualizar el estado de la factura
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "issued",
          pdf_path: `/invoices/${invoiceId}.pdf`,
        })
        .eq("id", invoiceId)

      if (updateError) {
        console.error("Error al actualizar estado de factura:", updateError)
        throw new Error(updateError.message)
      }

      console.log("Importando generador de PDF")
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
        signature: signatureBase64 || invoice.signature, // Usar la firma base64
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

      console.log("Generando PDF con datos:", {
        invoiceNumber: pdfInvoice.invoice_number,
        hasSignature: !!pdfInvoice.signature,
      })

      // Generar el PDF
      generatePdf(pdfInvoice, invoiceLines || [], `factura-${invoice.invoice_number}.pdf`)
      console.log("PDF generado correctamente")

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
