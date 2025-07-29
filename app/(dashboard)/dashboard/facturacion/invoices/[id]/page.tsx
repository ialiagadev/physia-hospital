"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceStatusSelector } from "@/components/invoices/invoice-status-selector"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Download, Lock, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

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
  vat_rate: number
  irpf_rate: number
  retention_rate: number
  line_amount: number
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          {!isDraft && (
            <Button onClick={handleDownloadPDF} variant="outline" className="flex items-center gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
          )}
          {isDraft && (
            <Button
              disabled
              variant="outline"
              className="flex items-center gap-2 opacity-50 cursor-not-allowed bg-transparent"
              title="No se puede descargar una factura en borrador"
            >
              <Lock className="h-4 w-4" />
              Descargar PDF
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
            validada. Para validarla, cambia su estado a "Emitida".
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
    </div>
  )
}
