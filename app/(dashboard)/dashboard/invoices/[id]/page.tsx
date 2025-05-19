import Link from "next/link"
import { cookies } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GeneratePdfButton } from "@/components/invoices/generate-pdf-button"

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerSupabaseClient()

  // Obtener factura con información del cliente y líneas
  const { data: invoice, error } = await supabase
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
    .eq("id", params.id)
    .single()

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">Factura no encontrada</h1>
        <p className="text-muted-foreground mb-6">
          La factura que estás buscando no existe o no tienes permisos para verla.
        </p>
        <Button asChild>
          <Link href="/dashboard/invoices">Volver a Facturas</Link>
        </Button>
      </div>
    )
  }

  // Obtener líneas de factura
  const { data: invoiceLines } = await supabase
    .from("invoice_lines")
    .select("*")
    .eq("invoice_id", params.id)
    .order("id", { ascending: true })

  // Función para obtener el color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80"
      case "issued":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100/80"
      case "paid":
        return "bg-green-100 text-green-800 hover:bg-green-100/80"
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100/80"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100/80"
    }
  }

  // Función para traducir el estado
  const getStatusText = (status: string) => {
    switch (status) {
      case "draft":
        return "Borrador"
      case "issued":
        return "Emitida"
      case "paid":
        return "Pagada"
      case "rejected":
        return "Rechazada"
      default:
        return status
    }
  }

  // Obtener datos del cliente (desde la relación o desde las notas)
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
    // Extraer información básica del cliente de las notas
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
          <h1 className="text-3xl font-bold tracking-tight">Factura {invoice.invoice_number}</h1>
          <p className="text-muted-foreground">{new Date(invoice.issue_date).toLocaleDateString()}</p>
        </div>
        <div className="flex space-x-2">
          <GeneratePdfButton invoiceId={invoice.id} />
          <Button asChild variant="outline">
            <Link href="/dashboard/invoices">Volver</Link>
          </Button>
        </div>
      </div>

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
                <p>{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha</p>
                <p>{new Date(invoice.issue_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <p>Normal</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <Badge className={getStatusColor(invoice.status)} variant="outline">
                  {getStatusText(invoice.status)}
                </Badge>
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
                  <th className="text-right py-2">Retención %</th>
                  <th className="text-right py-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {invoiceLines &&
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
                  ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="text-right py-2 font-medium">
                    Base Imponible:
                  </td>
                  <td className="text-right py-2">{invoice.base_amount.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td colSpan={6} className="text-right py-2 font-medium">
                    IVA:
                  </td>
                  <td className="text-right py-2">{invoice.vat_amount.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td colSpan={6} className="text-right py-2 font-medium">
                    IRPF:
                  </td>
                  <td className="text-right py-2">-{invoice.irpf_amount.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td colSpan={6} className="text-right py-2 font-medium">
                    Retención:
                  </td>
                  <td className="text-right py-2">-{invoice.retention_amount.toFixed(2)} €</td>
                </tr>
                <tr>
                  <td colSpan={6} className="text-right py-2 font-bold">
                    Total:
                  </td>
                  <td className="text-right py-2 font-bold">{invoice.total_amount.toFixed(2)} €</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
