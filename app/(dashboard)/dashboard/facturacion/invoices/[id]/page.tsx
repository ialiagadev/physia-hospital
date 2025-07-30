"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceStatusSelector } from "@/components/invoices/invoice-status-selector"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Download, Lock, AlertTriangle, Edit, Plus, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type InvoiceStatus = "draft" | "issued" | "sent" | "paid"

interface InvoiceData {
  id: number
  invoice_number: string
  issue_date: string
  status: InvoiceStatus
  notes?: string
  base_amount: number
  vat_amount: number
  irpf_amount: number
  retention_amount: number
  total_amount: number
  payment_method: string
  payment_method_other: string
  validated_at?: string
  clients?: {
    name: string
    tax_id: string
    address: string
    postal_code: string
    city: string
    province: string
    country: string
    email: string
    phone: string
    client_type: string
    dir3_codes: any
  }
  organizations?: {
    name: string
  }
}

interface InvoiceLine {
  id: number
  description: string
  quantity: number
  unit_price: number
  discount_percentage?: number
  vat_rate: number
  irpf_rate: number
  retention_rate: number
  line_amount: number
  professional_id?: number | null
}

interface EditInvoiceFormProps {
  invoice: InvoiceData
  invoiceLines: InvoiceLine[]
  onSuccess: () => void
  onCancel: () => void
}

function EditInvoiceForm({ invoice, invoiceLines, onSuccess, onCancel }: EditInvoiceFormProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    notes: invoice.notes || "",
    payment_method: invoice.payment_method || "tarjeta",
    payment_method_other: invoice.payment_method_other || "",
  })

  const [editableLines, setEditableLines] = useState<InvoiceLine[]>(
    invoiceLines.map((line) => ({
      ...line,
      discount_percentage: line.discount_percentage || 0,
    })),
  )

  const calculateLineAmount = (line: InvoiceLine) => {
    const subtotal = line.quantity * line.unit_price
    const discount = (subtotal * (line.discount_percentage || 0)) / 100
    return subtotal - discount
  }

  const handleLineChange = (id: number, field: string, value: string | number) => {
    setEditableLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          const updatedLine = { ...line, [field]: value }

          // Recalcular el importe de línea cuando cambie cantidad, precio unitario o descuento
          if (field === "quantity" || field === "unit_price" || field === "discount_percentage") {
            updatedLine.line_amount = calculateLineAmount(updatedLine)
          }

          return updatedLine
        }
        return line
      }),
    )
  }

  const addLine = () => {
    const newLine: InvoiceLine = {
      id: Date.now(), // ID temporal para nuevas líneas
      description: "",
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      vat_rate: 21,
      irpf_rate: 0,
      retention_rate: 0,
      line_amount: 0,
      professional_id: null,
    }
    setEditableLines((prev) => [...prev, newLine])
  }

  const removeLine = (id: number) => {
    if (editableLines.length > 1) {
      setEditableLines((prev) => prev.filter((line) => line.id !== id))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Calcular totales
  const subtotalAmount = editableLines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unit_price
    return sum + lineSubtotal
  }, 0)

  const totalDiscountAmount = editableLines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unit_price
    const lineDiscount = (lineSubtotal * (line.discount_percentage || 0)) / 100
    return sum + lineDiscount
  }, 0)

  const baseAmount = subtotalAmount - totalDiscountAmount

  const vatAmount = editableLines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unit_price
    const lineDiscount = (lineSubtotal * (line.discount_percentage || 0)) / 100
    const lineBase = lineSubtotal - lineDiscount
    const lineVat = (lineBase * line.vat_rate) / 100
    return sum + lineVat
  }, 0)

  const irpfAmount = editableLines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unit_price
    const lineDiscount = (lineSubtotal * (line.discount_percentage || 0)) / 100
    const lineBase = lineSubtotal - lineDiscount
    const lineIrpf = (lineBase * line.irpf_rate) / 100
    return sum + lineIrpf
  }, 0)

  const retentionAmount = editableLines.reduce((sum, line) => {
    const lineSubtotal = line.quantity * line.unit_price
    const lineDiscount = (lineSubtotal * (line.discount_percentage || 0)) / 100
    const lineBase = lineSubtotal - lineDiscount
    const lineRetention = (lineBase * line.retention_rate) / 100
    return sum + lineRetention
  }, 0)

  const totalAmount = baseAmount + vatAmount - irpfAmount - retentionAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Actualizar la factura (sin incluir issue_date)
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          notes: formData.notes,
          payment_method: formData.payment_method,
          payment_method_other: formData.payment_method === "otro" ? formData.payment_method_other : null,
          base_amount: baseAmount,
          vat_amount: vatAmount,
          irpf_amount: irpfAmount,
          retention_amount: retentionAmount,
          total_amount: totalAmount,
        })
        .eq("id", invoice.id)

      if (invoiceError) {
        throw new Error(`Error al actualizar la factura: ${invoiceError.message}`)
      }

      // Eliminar líneas existentes
      const { error: deleteError } = await supabase.from("invoice_lines").delete().eq("invoice_id", invoice.id)

      if (deleteError) {
        throw new Error(`Error al eliminar líneas existentes: ${deleteError.message}`)
      }

      // Insertar líneas actualizadas
      const linesToInsert = editableLines.map((line) => ({
        invoice_id: invoice.id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_percentage: line.discount_percentage || 0,
        vat_rate: line.vat_rate,
        irpf_rate: line.irpf_rate,
        retention_rate: line.retention_rate,
        line_amount: line.line_amount,
        professional_id: line.professional_id,
      }))

      const { error: linesError } = await supabase.from("invoice_lines").insert(linesToInsert)

      if (linesError) {
        throw new Error(`Error al guardar las líneas: ${linesError.message}`)
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar la factura")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issue_date_readonly">Fecha de Emisión</Label>
          <Input
            id="issue_date_readonly"
            type="date"
            value={invoice.issue_date}
            readOnly
            className="bg-muted cursor-not-allowed"
            title="La fecha de emisión no puede modificarse"
          />
          <p className="text-xs text-muted-foreground">La fecha de emisión no puede modificarse</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_method">Método de Pago</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value) => handleSelectChange("payment_method", value)}
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
      </div>

      {formData.payment_method === "otro" && (
        <div className="space-y-2">
          <Label htmlFor="payment_method_other">Especificar método de pago</Label>
          <Input
            id="payment_method_other"
            name="payment_method_other"
            value={formData.payment_method_other}
            onChange={handleChange}
            placeholder="Especifica el método de pago..."
            required
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Notas adicionales para la factura"
          rows={3}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Líneas de Factura</h3>
          <Button type="button" onClick={addLine} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Añadir Línea
          </Button>
        </div>

        {editableLines.map((line, index) => (
          <div key={line.id} className="border p-4 rounded-md space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Línea {index + 1}</h4>
              {editableLines.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(line.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  value={line.description}
                  onChange={(e) => handleLineChange(line.id, "description", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={line.quantity}
                  onChange={(e) => handleLineChange(line.id, "quantity", Number.parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Precio Unitario (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unit_price}
                  onChange={(e) => handleLineChange(line.id, "unit_price", Number.parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descuento (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={line.discount_percentage || 0}
                  onChange={(e) =>
                    handleLineChange(line.id, "discount_percentage", Number.parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>IVA (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={line.vat_rate}
                  onChange={(e) => handleLineChange(line.id, "vat_rate", Number.parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IRPF (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={line.irpf_rate}
                  onChange={(e) => handleLineChange(line.id, "irpf_rate", Number.parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Retención (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={line.retention_rate}
                  onChange={(e) => handleLineChange(line.id, "retention_rate", Number.parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-sm text-muted-foreground">
                Subtotal: {(line.quantity * line.unit_price).toFixed(2)} €
              </div>
              {(line.discount_percentage || 0) > 0 && (
                <div className="text-sm text-red-600">
                  Descuento ({line.discount_percentage}%): -
                  {((line.quantity * line.unit_price * (line.discount_percentage || 0)) / 100).toFixed(2)} €
                </div>
              )}
              <div className="font-medium">Importe: {line.line_amount.toFixed(2)} €</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{subtotalAmount.toFixed(2)} €</span>
            </div>
            {totalDiscountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuentos totales:</span>
                <span>-{totalDiscountAmount.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Base imponible:</span>
              <span>{baseAmount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span>IVA:</span>
              <span>{vatAmount.toFixed(2)} €</span>
            </div>
            {irpfAmount > 0 && (
              <div className="flex justify-between">
                <span>IRPF:</span>
                <span>-{irpfAmount.toFixed(2)} €</span>
              </div>
            )}
            {retentionAmount > 0 && (
              <div className="flex justify-between">
                <span>Retención:</span>
                <span>-{retentionAmount.toFixed(2)} €</span>
              </div>
            )}
            <hr />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{totalAmount.toFixed(2)} €</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  )
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const invoiceId = params.id as string

  const loadInvoice = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          clients (
            *
          ),
          organizations (
            *
          )
        `)
        .eq("id", invoiceId)
        .single()

      if (invoiceError) {
        throw invoiceError
      }

      if (!invoiceData) {
        setError("Factura no encontrada")
        return
      }

      // Asegurar que el status sea un tipo válido
      const validStatuses: InvoiceStatus[] = ["draft", "issued", "sent", "paid"]
      const status = validStatuses.includes(invoiceData.status as InvoiceStatus)
        ? (invoiceData.status as InvoiceStatus)
        : "draft"

      setInvoice({
        ...invoiceData,
        status,
      })

      const { data: linesData, error: linesError } = await supabase
        .from("invoice_lines")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("id", { ascending: true })

      if (linesError) {
        // Error handled silently for lines
      } else {
        setInvoiceLines(linesData || [])
      }
    } catch (error) {
      setError("Error al cargar la factura")
      toast({
        title: "Error",
        description: "No se pudo cargar la factura",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (invoiceId) {
      loadInvoice()
    }
  }, [invoiceId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (newStatus: string) => {
    if (invoice) {
      const validStatuses: InvoiceStatus[] = ["draft", "issued", "sent", "paid"]
      const status = validStatuses.includes(newStatus as InvoiceStatus) ? (newStatus as InvoiceStatus) : "draft"
      setInvoice({ ...invoice, status })
    }
  }

  const handleEditSuccess = () => {
    setEditModalOpen(false)
    loadInvoice() // Recargar los datos después de editar
    toast({
      title: "Borrador actualizado",
      description: "Los cambios se han guardado correctamente",
    })
  }

  const getStatusText = (status: InvoiceStatus) => {
    switch (status) {
      case "draft":
        return "Borrador"
      case "issued":
        return "Emitida"
      case "sent":
        return "Enviada"
      case "paid":
        return "Pagada"
      default:
        return status
    }
  }

  const getStatusBadgeVariant = (status: InvoiceStatus) => {
    switch (status) {
      case "draft":
        return "secondary" as const
      case "issued":
        return "default" as const
      case "sent":
        return "default" as const
      case "paid":
        return "default" as const
      default:
        return "default" as const
    }
  }

  const isDraft = invoice?.status === "draft"
  const isValidated = invoice?.validated_at != null

  const handleDownloadPDF = () => {
    if (isDraft) {
      toast({
        title: "Acción no permitida",
        description: "No se puede descargar una factura en borrador",
        variant: "destructive",
      })
      return
    }

    // Aquí iría la lógica de descarga normal
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank")
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando factura...</p>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">Factura no encontrada</h1>
        <p className="text-muted-foreground mb-6">
          {error || "La factura que estás buscando no existe o no tienes permisos para verla."}
        </p>
        <Button asChild>
          <Link href="/dashboard/facturacion/invoices">Volver a Facturas</Link>
        </Button>
      </div>
    )
  }

  let clientData = null
  if (invoice.clients) {
    clientData = {
      name: invoice.clients.name,
      tax_id: invoice.clients.tax_id,
      address: invoice.clients.address,
      postal_code: invoice.clients.postal_code,
      city: invoice.clients.city,
      province: invoice.clients.province,
      country: invoice.clients.country,
      email: invoice.clients.email,
      phone: invoice.clients.phone,
      client_type: invoice.clients.client_type,
      dir3_codes: invoice.clients.dir3_codes,
    }
  } else if (invoice.notes && invoice.notes.includes("Cliente:")) {
    const notesText = invoice.notes || ""
    clientData = {
      name: notesText.match(/Cliente: ([^,]+)/)?.[1] || "No disponible",
      tax_id: notesText.match(/CIF\/NIF: ([^,]+)/)?.[1] || "No disponible",
      address: notesText.match(/Dirección: ([^,]+)/)?.[1] || "No disponible",
      postal_code: "",
      city: "",
      province: "",
      country: "",
      email: "",
      phone: "",
      client_type: "private",
      dir3_codes: null,
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {isDraft ? "Borrador de Factura" : `Factura ${invoice.invoice_number}`}
            </h1>
            <Badge variant={getStatusBadgeVariant(invoice.status)}>{getStatusText(invoice.status)}</Badge>
            {isValidated && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Validada
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{new Date(invoice.issue_date).toLocaleDateString("es-ES")}</p>
        </div>

        <div className="flex space-x-2">
          {/* Botón de Editar - Solo visible para borradores */}
          {isDraft && (
            <Button onClick={() => setEditModalOpen(true)} variant="default" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Editar Borrador
            </Button>
          )}

          <Button asChild variant="outline">
            <Link href="/dashboard/facturacion/invoices">Volver</Link>
          </Button>
        </div>
      </div>

      {/* Alerta para borradores */}
      {isDraft && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Esta factura está en borrador.</strong> No se puede descargar, imprimir ni enviar hasta que sea
            validada. Puedes editarla usando el botón "Editar Borrador" o validarla cambiando su estado a "Emitida".
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta para facturas validadas */}
      {isValidated && !isDraft && (
        <Alert className="border-blue-200 bg-blue-50">
          <Lock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Factura validada.</strong> Los campos sensibles de esta factura no pueden modificarse para mantener
            la integridad fiscal.
            {invoice.validated_at && (
              <span className="block text-sm mt-1">
                Validada el{" "}
                {new Date(invoice.validated_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información de la Factura</CardTitle>
            <CardDescription>Detalles generales de la factura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Número</p>
                <p>{isDraft ? "BORRADOR" : invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                <p>{new Date(invoice.issue_date).toLocaleDateString("es-ES")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <p>Normal</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <InvoiceStatusSelector
                  invoiceId={invoice.id}
                  currentStatus={invoice.status}
                  onStatusChange={handleStatusChange}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Método de Pago</p>
                <p>
                  {invoice.payment_method === "tarjeta" && "Tarjeta"}
                  {invoice.payment_method === "efectivo" && "Efectivo"}
                  {invoice.payment_method === "transferencia" && "Transferencia"}
                  {invoice.payment_method === "paypal" && "PayPal"}
                  {invoice.payment_method === "bizum" && "Bizum"}
                  {invoice.payment_method === "otro" && `Otro: ${invoice.payment_method_other || "No especificado"}`}
                  {!invoice.payment_method && "No especificado"}
                </p>
              </div>
            </div>

            {invoice.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notas</p>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
            <CardDescription>Información del cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientData ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                  <p>{clientData.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CIF/NIF</p>
                  <p>{clientData.tax_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dirección</p>
                  <p>{clientData.address}</p>
                  {clientData.postal_code && clientData.city && (
                    <p>
                      {clientData.postal_code} {clientData.city}, {clientData.province}
                    </p>
                  )}
                </div>
                {clientData.email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{clientData.email}</p>
                  </div>
                )}
                {clientData.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                    <p>{clientData.phone}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No hay información del cliente disponible</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Líneas de Factura</CardTitle>
          <CardDescription>Detalle de los productos o servicios facturados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Descripción</th>
                  <th className="text-right py-2">Cantidad</th>
                  <th className="text-right py-2">Precio</th>
                  <th className="text-right py-2">IVA %</th>
                  <th className="text-right py-2">IRPF %</th>
                  <th className="text-right py-2">Ret. %</th>
                  <th className="text-right py-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {invoiceLines && invoiceLines.length > 0 ? (
                  invoiceLines.map((line) => (
                    <tr key={line.id} className="border-b">
                      <td className="py-2">{line.description}</td>
                      <td className="text-right py-2">{line.quantity}</td>
                      <td className="text-right py-2">{line.unit_price.toFixed(2)} €</td>
                      <td className="text-right py-2">{line.vat_rate}%</td>
                      <td className="text-right py-2">{line.irpf_rate}%</td>
                      <td className="text-right py-2">{line.retention_rate}%</td>
                      <td className="text-right py-2">{line.line_amount.toFixed(2)} €</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted-foreground">
                      No hay líneas de factura disponibles
                    </td>
                  </tr>
                )}
              </tbody>
              {invoiceLines && invoiceLines.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={6} className="text-right py-2 font-medium">
                      Base Imponible:
                    </td>
                    <td className="text-right py-2">{invoice.base_amount?.toFixed(2) || "0.00"} €</td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="text-right py-2 font-medium">
                      IVA:
                    </td>
                    <td className="text-right py-2">{invoice.vat_amount?.toFixed(2) || "0.00"} €</td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="text-right py-2 font-medium">
                      IRPF:
                    </td>
                    <td className="text-right py-2">-{invoice.irpf_amount?.toFixed(2) || "0.00"} €</td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="text-right py-2 font-medium">
                      Retención:
                    </td>
                    <td className="text-right py-2">-{invoice.retention_amount?.toFixed(2) || "0.00"} €</td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="text-right py-2 font-bold">
                      Total:
                    </td>
                    <td className="text-right py-2 font-bold">{invoice.total_amount?.toFixed(2) || "0.00"} €</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Edición */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Borrador de Factura</DialogTitle>
          </DialogHeader>
          {invoice && (
            <EditInvoiceForm
              invoice={invoice}
              invoiceLines={invoiceLines}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}