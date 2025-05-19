"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { OrganizationSelector } from "@/components/organization-selector"
import { useToast } from "@/hooks/use-toast"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const { toast } = useToast()

  // Cargar facturas basadas en la organización seleccionada
  useEffect(() => {
    async function loadInvoices() {
      setLoading(true)

      try {
        let query = supabase
          .from("invoices")
          .select(`
            *,
            clients (
              name,
              tax_id
            )
          `)
          .order("created_at", { ascending: false })

        // Filtrar por organización si se ha seleccionado una específica
        if (selectedOrgId !== "all") {
          query = query.eq("organization_id", selectedOrgId)
        }

        const { data, error } = await query

        if (error) throw error

        setInvoices(data || [])
      } catch (error) {
        console.error("Error al cargar facturas:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las facturas",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadInvoices()
  }, [selectedOrgId, toast])

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground">Gestiona tus facturas</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Factura
          </Link>
        </Button>
      </div>

      {/* Selector de organización */}
      <OrganizationSelector selectedOrgId={selectedOrgId} onSelectOrganization={setSelectedOrgId} className="mb-6" />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Cargando facturas...
                </TableCell>
              </TableRow>
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell>{invoice.clients?.name || "-"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)} variant="outline">
                      {getStatusText(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{invoice.total_amount.toFixed(2)} €</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/invoices/${invoice.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay facturas registradas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
