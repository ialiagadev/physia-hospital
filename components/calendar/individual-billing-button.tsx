"use client"

import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import { format } from "date-fns"
import type { AppointmentWithDetails } from "@/types/calendar"

interface IndividualBillingButtonProps {
  appointment: AppointmentWithDetails
  onBillingComplete?: () => void
}

export function IndividualBillingButton({ appointment, onBillingComplete }: IndividualBillingButtonProps) {
  const { userProfile } = useAuth()
  const { toast } = useToast()
  const [generating, setGenerating] = useState(false)

  const validateClientData = () => {
    const client = appointment.client
    const missingFields: string[] = []

    if (!client.name?.trim()) missingFields.push("Nombre")
    if (!(client as any).tax_id?.trim()) missingFields.push("CIF/NIF")
    if (!(client as any).address?.trim()) missingFields.push("Dirección")
    if (!(client as any).postal_code?.trim()) missingFields.push("Código Postal")
    if (!(client as any).city?.trim()) missingFields.push("Ciudad")

    return {
      isValid: missingFields.length === 0,
      missingFields,
    }
  }

  const generateInvoice = async () => {
    if (!userProfile?.organization_id) return

    // Validar datos del cliente
    const validation = validateClientData()
    if (!validation.isValid) {
      toast({
        title: "Datos incompletos",
        description: `Faltan los siguientes datos del cliente: ${validation.missingFields.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setGenerating(true)

    try {
      // Importar las funciones necesarias
      const { generateUniqueInvoiceNumber } = await import("@/lib/invoice-utils")
      const { generatePdf } = await import("@/lib/pdf-generator")
      const { savePdfToStorage } = await import("@/lib/storage-utils")

      // Obtener datos de la organización
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userProfile.organization_id)
        .single()

      if (orgError || !orgData) {
        throw new Error("No se pudieron obtener los datos de la organización")
      }

      // Generar número de factura único
      const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(
        userProfile.organization_id,
        "normal",
      )

      // Preparar línea de factura
      const servicePrice = appointment.service?.price || 50
      const invoiceLines = [
        {
          id: crypto.randomUUID(),
          description: `${appointment.consultation?.name || "Consulta"} - ${appointment.professional.name} (${appointment.start_time}-${appointment.end_time}) [${appointment.status}]`,
          quantity: 1,
          unit_price: servicePrice,
          discount_percentage: 0,
          vat_rate: 21,
          irpf_rate: 0,
          retention_rate: 0,
          line_amount: servicePrice,
          professional_id: null,
        },
      ]

      // Calcular totales
      const subtotalAmount = invoiceLines.reduce((sum, line) => {
        return sum + line.quantity * line.unit_price
      }, 0)

      const totalDiscountAmount = invoiceLines.reduce((sum, line) => {
        const lineSubtotal = line.quantity * line.unit_price
        const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
        return sum + lineDiscount
      }, 0)

      const baseAmount = subtotalAmount - totalDiscountAmount

      const vatAmount = invoiceLines.reduce((sum, line) => {
        const lineSubtotal = line.quantity * line.unit_price
        const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
        const lineBase = lineSubtotal - lineDiscount
        const lineVat = (lineBase * line.vat_rate) / 100
        return sum + lineVat
      }, 0)

      const irpfAmount = invoiceLines.reduce((sum, line) => {
        const lineSubtotal = line.quantity * line.unit_price
        const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
        const lineBase = lineSubtotal - lineDiscount
        const lineIrpf = (lineBase * line.irpf_rate) / 100
        return sum + lineIrpf
      }, 0)

      const retentionAmount = invoiceLines.reduce((sum, line) => {
        const lineSubtotal = line.quantity * line.unit_price
        const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
        const lineBase = lineSubtotal - lineDiscount
        const lineRetention = (lineBase * line.retention_rate) / 100
        return sum + lineRetention
      }, 0)

      const totalAmount = baseAmount + vatAmount - irpfAmount - retentionAmount

      // Preparar datos de la factura
      const client = appointment.client
      const clientInfoText = `Cliente: ${client.name}, CIF/NIF: ${(client as any).tax_id}, Dirección: ${(client as any).address}, ${(client as any).postal_code} ${(client as any).city}, ${(client as any).province}`
      const additionalNotes = `Factura generada para cita del ${format(new Date(appointment.date), "dd/MM/yyyy")} - ${appointment.start_time} (Estado: ${appointment.status})`
      const fullNotes = clientInfoText + "\n\n" + additionalNotes

      // Crear factura en la base de datos
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          organization_id: userProfile.organization_id,
          invoice_number: invoiceNumberFormatted,
          client_id: appointment.client_id,
          issue_date: appointment.date,
          invoice_type: "normal",
          status: "sent",
          base_amount: baseAmount,
          vat_amount: vatAmount,
          irpf_amount: irpfAmount,
          retention_amount: retentionAmount,
          total_amount: totalAmount,
          discount_amount: totalDiscountAmount,
          notes: fullNotes,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Crear líneas de factura
      const invoiceLines_db = invoiceLines.map((line) => ({
        invoice_id: invoiceData.id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percentage: line.discount_percentage,
        vat_rate: line.vat_rate,
        irpf_rate: line.irpf_rate,
        retention_rate: line.retention_rate,
        line_amount: line.line_amount,
        professional_id: line.professional_id ? Number.parseInt(line.professional_id) : null,
      }))

      const { error: linesError } = await supabase.from("invoice_lines").insert(invoiceLines_db)

      if (linesError) {
        console.error("Error saving invoice lines:", linesError)
      }

      // Actualizar número de factura en la organización
      const { error: updateOrgError } = await supabase
        .from("organizations")
        .update({ last_invoice_number: newInvoiceNumber })
        .eq("id", userProfile.organization_id)

      if (updateOrgError) {
        console.error("Error updating organization:", updateOrgError)
      }

      // Generar PDF
      try {
        const newInvoice = {
          id: invoiceData.id,
          invoice_number: invoiceNumberFormatted,
          issue_date: appointment.date,
          invoice_type: "normal" as const,
          status: "sent",
          base_amount: baseAmount,
          vat_amount: vatAmount,
          irpf_amount: irpfAmount,
          retention_amount: retentionAmount,
          total_amount: totalAmount,
          discount_amount: totalDiscountAmount,
          notes: fullNotes,
          signature: null,
          organization: {
            name: orgData.name,
            tax_id: orgData.tax_id,
            address: orgData.address,
            postal_code: orgData.postal_code,
            city: orgData.city,
            province: orgData.province,
            country: orgData.country,
            email: orgData.email,
            phone: orgData.phone,
            invoice_prefix: orgData.invoice_prefix,
            logo_url: orgData.logo_url,
            logo_path: orgData.logo_path,
          },
          client_data: {
            name: client.name,
            tax_id: (client as any).tax_id || "",
            address: (client as any).address || "",
            postal_code: (client as any).postal_code || "",
            city: (client as any).city || "",
            province: (client as any).province || "",
            country: "España",
            email: (client as any).email || "",
            phone: (client as any).phone || "",
            client_type: "private",
          },
        }

        // Generar PDF y descargarlo automáticamente
        const pdfBlob = await generatePdf(newInvoice, invoiceLines, `factura-${invoiceNumberFormatted}.pdf`, true)

        // Guardar PDF en storage si se generó correctamente
        if (pdfBlob && pdfBlob instanceof Blob) {
          try {
            const pdfUrl = await savePdfToStorage(
              pdfBlob,
              `factura-${invoiceNumberFormatted}.pdf`,
              userProfile.organization_id,
            )

            // Actualizar la factura con la URL del PDF
            await supabase.from("invoices").update({ pdf_url: pdfUrl }).eq("id", invoiceData.id)
          } catch (pdfError) {
            console.error("Error saving PDF:", pdfError)
            // No fallar por error de PDF
          }
        }
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError)
        // No fallar por error de PDF
      }

      toast({
        title: "Factura generada",
        description: `Factura ${invoiceNumberFormatted} creada correctamente`,
      })

      // Callback para actualizar la UI si es necesario
      if (onBillingComplete) {
        onBillingComplete()
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      toast({
        title: "Error",
        description: "No se pudo generar la factura",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateInvoice}
      disabled={generating}
      className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 bg-transparent"
    >
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      {generating ? "Generando..." : "Facturar"}
    </Button>
  )
}
