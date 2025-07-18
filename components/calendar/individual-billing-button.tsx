"use client"

import { useState, useEffect } from "react"
import { FileText, Loader2, AlertTriangle, CheckCircle, Clock, Download, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  const [existingInvoice, setExistingInvoice] = useState<{
    invoice_number: string
    created_at: string
    id: string
  } | null>(null)
  const [checkingInvoice, setCheckingInvoice] = useState(true)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Estado del formulario
  const [formData, setFormData] = useState({
    issue_date: new Date().toISOString().split("T")[0],
    notes: "",
    payment_method: "tarjeta" as "tarjeta" | "efectivo" | "transferencia" | "paypal" | "bizum" | "otro",
    payment_method_other: "",
  })

  const hasService = appointment.service?.id && appointment.service?.price
  const serviceData = appointment.service

  const validateClientData = () => {
    const client = appointment.client
    if (!client) {
      return { isValid: false, missingFields: ["Cliente completo"] }
    }

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

  const clientValidation = validateClientData()

  const generateInvoice = async () => {
    if (!userProfile?.organization_id) {
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

      // Usar precio del servicio
      const servicePrice = serviceData!.price
      const invoiceLines = [
        {
          id: crypto.randomUUID(),
          description: `${serviceData!.name} - ${appointment.professional?.name || "Sin profesional"} (${appointment.start_time}-${appointment.end_time})`,
          quantity: 1,
          unit_price: servicePrice,
          discount_percentage: 0,
          vat_rate: serviceData!.vat_rate ?? 0,
          irpf_rate: serviceData!.irpf_rate ?? 0,
          retention_rate: serviceData!.retention_rate ?? 0,
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
        const lineVat = (lineBase * (line.vat_rate ?? 0)) / 100
        return sum + lineVat
      }, 0)

      const irpfAmount = invoiceLines.reduce((sum, line) => {
        const lineSubtotal = line.quantity * line.unit_price
        const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
        const lineBase = lineSubtotal - lineDiscount
        const lineIrpf = (lineBase * (line.irpf_rate ?? 0)) / 100
        return sum + lineIrpf
      }, 0)

      const retentionAmount = invoiceLines.reduce((sum, line) => {
        const lineSubtotal = line.quantity * line.unit_price
        const lineDiscount = (lineSubtotal * line.discount_percentage) / 100
        const lineBase = lineSubtotal - lineDiscount
        const lineRetention = (lineBase * (line.retention_rate ?? 0)) / 100
        return sum + lineRetention
      }, 0)

      const totalAmount = baseAmount + vatAmount - irpfAmount - retentionAmount

      // Preparar datos de la factura
      const client = appointment.client!
      const clientInfoText = `Cliente: ${client.name}, CIF/NIF: ${(client as any).tax_id}, Dirección: ${(client as any).address}, ${(client as any).postal_code} ${(client as any).city}, ${(client as any).province}`
      const additionalNotes = `Factura generada para cita del ${format(new Date(appointment.date), "dd/MM/yyyy")} - ${appointment.start_time}
Servicio: ${serviceData!.name} - ${servicePrice}€`
      const fullNotes =
        clientInfoText + "\n\n" + additionalNotes + (formData.notes ? `\n\nNotas adicionales: ${formData.notes}` : "")

      // Crear factura en la base de datos
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          organization_id: userProfile.organization_id,
          invoice_number: invoiceNumberFormatted,
          client_id: appointment.client_id,
          appointment_id: appointment.id,
          issue_date: formData.issue_date,
          invoice_type: "normal",
          status: "paid",
          base_amount: baseAmount,
          vat_amount: vatAmount,
          irpf_amount: irpfAmount,
          retention_amount: retentionAmount,
          total_amount: totalAmount,
          discount_amount: totalDiscountAmount,
          notes: fullNotes,
          payment_method: formData.payment_method,
          payment_method_other: formData.payment_method === "otro" ? formData.payment_method_other : null,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Actualización optimista inmediata
      setExistingInvoice({
        invoice_number: invoiceNumberFormatted,
        created_at: invoiceData.created_at,
        id: invoiceData.id,
      })

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
          issue_date: formData.issue_date,
          invoice_type: "normal" as const,
          status: "paid",
          base_amount: baseAmount,
          vat_amount: vatAmount,
          irpf_amount: irpfAmount,
          retention_amount: retentionAmount,
          total_amount: totalAmount,
          discount_amount: totalDiscountAmount,
          notes: fullNotes,
          signature: null,
          payment_method: formData.payment_method,
          payment_method_other: formData.payment_method === "otro" ? formData.payment_method_other : null,
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

        const filename = `factura-${invoiceNumberFormatted}.pdf`

        // Generar PDF SIN descarga automática primero
        const pdfBlob = await generatePdf(newInvoice, invoiceLines, filename, false)

        // Guardar PDF en storage si se generó correctamente
        if (pdfBlob && pdfBlob instanceof Blob) {
          // Guardar el blob para descarga opcional
          setPdfBlob(pdfBlob)

          try {
            const pdfUrl = await savePdfToStorage(pdfBlob, filename, userProfile.organization_id)
            await supabase.from("invoices").update({ pdf_url: pdfUrl }).eq("id", invoiceData.id)
          } catch (pdfError) {
            console.error("Error saving PDF:", pdfError)
          }
        }
      } catch (pdfError) {
        console.error("Error generating PDF:", pdfError)
      }

      toast({
        title: "Factura generada",
        description: `Factura ${invoiceNumberFormatted} creada correctamente (${servicePrice}€)`,
      })

      // Cerrar modal y llamar al callback si existe
      setIsModalOpen(false)
      if (onBillingComplete) {
        onBillingComplete()
      }
    } catch (error) {
      console.error("Error generating invoice:", error)
      // Revertir actualización optimista en caso de error
      setExistingInvoice(null)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar la factura",
        variant: "destructive",
      })
    } finally {
      setGenerating(false)
    }
  }

  const checkExistingInvoice = async () => {
    if (!userProfile?.organization_id || !appointment.id) {
      setCheckingInvoice(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, created_at")
        .eq("organization_id", userProfile.organization_id)
        .eq("appointment_id", appointment.id)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        setExistingInvoice(data[0])
      }
    } catch (error) {
      console.error("Error checking existing invoice:", error)
    } finally {
      setCheckingInvoice(false)
    }
  }

  useEffect(() => {
    checkExistingInvoice()
  }, [appointment.id, appointment.client_id, appointment.date, userProfile])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  // Si no hay servicio, mostrar mensaje de error
  if (!hasService) {
    return (
      <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Sin servicio asociado</span>
        </div>
      </div>
    )
  }

  // Si faltan datos del cliente, mostrar mensaje
  if (!clientValidation.isValid) {
    return (
      <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
        <div className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>Faltan datos: {clientValidation.missingFields.join(", ")}</span>
        </div>
      </div>
    )
  }

  // Si está verificando factura existente
  if (checkingInvoice) {
    return (
      <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 animate-spin" />
          <span>Verificando...</span>
        </div>
      </div>
    )
  }

  // Si ya existe factura
  if (existingInvoice) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Ya facturado</span>
          </div>
          <div className="text-xs mt-1">Factura #{existingInvoice.invoice_number}</div>
          <div className="text-xs text-gray-600">
            {format(new Date(existingInvoice.created_at), "dd/MM/yyyy HH:mm")}
          </div>
        </div>
        {pdfBlob && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const url = window.URL.createObjectURL(pdfBlob)
              const link = document.createElement("a")
              link.href = url
              link.download = `factura-${existingInvoice.invoice_number}.pdf`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              window.URL.revokeObjectURL(url)
            }}
            className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Descargar PDF"
          >
            <Download className="h-3 w-3" />
          </Button>
        )}
      </div>
    )
  }

  // Si todo está bien, mostrar botón de facturar
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        disabled={generating}
        className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 bg-transparent"
      >
        <FileText className="h-4 w-4" />
        Facturar
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Facturar Cita
            </DialogTitle>
            <DialogDescription>
              Crear factura para la cita de {appointment.client.name} del{" "}
              {format(new Date(appointment.date), "dd/MM/yyyy")} a las {appointment.start_time}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información de la cita */}
            <Card>
              <CardHeader>
                <CardTitle>Información de la Cita</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Cliente:</span> {appointment.client.name}
                  </div>
                  <div>
                    <span className="font-medium">Fecha:</span> {format(new Date(appointment.date), "dd/MM/yyyy")}
                  </div>
                  <div>
                    <span className="font-medium">Hora:</span> {appointment.start_time} - {appointment.end_time}
                  </div>
                  <div>
                    <span className="font-medium">Profesional:</span> {appointment.professional?.name}
                  </div>
                  {appointment.service && (
                    <>
                      <div>
                        <span className="font-medium">Servicio:</span> {appointment.service.name}
                      </div>
                      <div>
                        <span className="font-medium">Precio:</span> {formatCurrency(appointment.service.price)}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Datos de la factura */}
            <Card>
              <CardHeader>
                <CardTitle>Datos de la Factura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="issue_date">Fecha de Emisión</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notas adicionales para la factura..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Método de Pago */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Método de Pago
                </CardTitle>
                <CardDescription>Selecciona el método de pago utilizado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Método de Pago</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value: "tarjeta" | "efectivo" | "transferencia" | "paypal" | "bizum" | "otro") =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_method: value,
                        payment_method_other: value !== "otro" ? "" : prev.payment_method_other,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="bizum">Bizum</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.payment_method === "otro" && (
                  <div className="space-y-2">
                    <Label htmlFor="payment_method_other">Especificar método de pago</Label>
                    <Input
                      id="payment_method_other"
                      value={formData.payment_method_other}
                      onChange={(e) => setFormData((prev) => ({ ...prev, payment_method_other: e.target.value }))}
                      placeholder="Especifica el método de pago..."
                      required
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={generateInvoice} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                "Crear Factura"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
