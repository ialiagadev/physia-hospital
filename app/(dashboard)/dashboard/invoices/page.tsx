"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrganizationSelector } from "@/components/organization-selector"
import { useToast } from "@/hooks/use-toast"
import { InvoiceStatusSelector } from "@/components/invoices/invoice-status-selector"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const { toast } = useToast()

  // Función para cargar facturas
  const loadInvoices = async () => {
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

  // Cargar facturas al inicio y cuando cambia la organización seleccionada
  useEffect(() => {
    loadInvoices()
  }, [selectedOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Función para actualizar el estado de una factura específica en el estado local
  const handleStatusChange = (invoiceId: number, newStatus: string) => {
    setInvoices((currentInvoices) =>
      currentInvoices.map((invoice) => (invoice.id === invoiceId ? { ...invoice, status: newStatus } : invoice)),
    )
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
                <TableRow key={invoice.id} className="transition-colors hover:bg-muted/30">
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                  <TableCell>{invoice.clients?.name || "-"}</TableCell>
                  <TableCell>
                    <InvoiceStatusSelector
                      invoiceId={invoice.id}
                      currentStatus={invoice.status}
                      size="sm"
                      onStatusChange={(newStatus) => handleStatusChange(invoice.id, newStatus)}
                    />
                  </TableCell>
                  <TableCell className="text-right">{invoice.total_amount.toFixed(2)} €</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="transition-colors hover:bg-primary/10">
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
