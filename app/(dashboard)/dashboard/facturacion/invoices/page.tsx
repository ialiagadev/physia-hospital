"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Filter, X, ChevronDown } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { OrganizationSelector } from "@/components/organization-selector"
import { useToast } from "@/hooks/use-toast"
import { InvoiceStatusSelector } from "@/components/invoices/invoice-status-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { BulkDownloadButton } from "@/components/invoices/bulk-download-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface DateFilters {
  startDate?: Date
  endDate?: Date
  year?: string
  month?: string
}

// Actualizar los estados según la restricción de la base de datos
const statusOptions = [
  { value: "draft", label: "Borrador", color: "bg-yellow-100 text-yellow-800" },
  { value: "sent", label: "Enviada", color: "bg-blue-100 text-blue-800" },
  { value: "paid", label: "Pagada", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelada", color: "bg-red-100 text-red-800" },
  { value: "rectified", label: "Rectificada", color: "bg-purple-100 text-purple-800" },
  { value: "overdue", label: "Vencida", color: "bg-orange-100 text-orange-800" },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set())
  const [dateFilters, setDateFilters] = useState<DateFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
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

      // Aplicar filtros de fecha
      if (dateFilters.startDate) {
        query = query.gte("issue_date", format(dateFilters.startDate, "yyyy-MM-dd"))
      }

      if (dateFilters.endDate) {
        query = query.lte("issue_date", format(dateFilters.endDate, "yyyy-MM-dd"))
      }

      if (dateFilters.year) {
        query = query.gte("issue_date", `${dateFilters.year}-01-01`)
        query = query.lte("issue_date", `${dateFilters.year}-12-31`)
      }

      if (dateFilters.month && dateFilters.year) {
        const monthNum = dateFilters.month.padStart(2, "0")
        const daysInMonth = new Date(Number.parseInt(dateFilters.year), Number.parseInt(dateFilters.month), 0).getDate()
        query = query.gte("issue_date", `${dateFilters.year}-${monthNum}-01`)
        query = query.lte("issue_date", `${dateFilters.year}-${monthNum}-${daysInMonth}`)
      }

      const { data, error } = await query

      if (error) throw error

      setInvoices(data || [])
      // Limpiar selecciones cuando se filtran los datos
      setSelectedInvoices(new Set())
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

  // Cargar facturas al inicio y cuando cambian los filtros
  useEffect(() => {
    loadInvoices()
  }, [selectedOrgId, dateFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Función para actualizar el estado de una factura específica en el estado local
  const handleStatusChange = (invoiceId: number, newStatus: string) => {
    // Actualizar el estado local inmediatamente
    setInvoices((currentInvoices) =>
      currentInvoices.map((invoice) => {
        if (invoice.id === invoiceId) {
          return { ...invoice, status: newStatus }
        }
        return invoice
      }),
    )
  }

  // Función para cambiar el estado de múltiples facturas
  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedInvoices.size === 0) return

    setIsUpdatingStatus(true)

    try {
      const invoiceIds = Array.from(selectedInvoices)

      // Actualización optimista de la UI - Actualizar inmediatamente antes de la llamada a la API
      setInvoices((currentInvoices) => {
        return currentInvoices.map((invoice) => {
          if (selectedInvoices.has(invoice.id)) {
            return { ...invoice, status: newStatus }
          }
          return invoice
        })
      })

      // Actualizar en Supabase
      const { error } = await supabase.from("invoices").update({ status: newStatus }).in("id", invoiceIds)

      if (error) {
        console.error("Error de Supabase:", error)
        throw new Error(`Error al actualizar el estado: ${error.message}`)
      }

      const statusLabel = statusOptions.find((option) => option.value === newStatus)?.label || newStatus

      toast({
        title: "Estado actualizado",
        description: `Se ha cambiado el estado de ${selectedInvoices.size} factura${selectedInvoices.size !== 1 ? "s" : ""} a "${statusLabel}".`,
      })

      // Limpiar selección después de la actualización exitosa
      setSelectedInvoices(new Set())
    } catch (error) {
      console.error("Error al actualizar el estado:", error)

      // En caso de error, recargar los datos originales
      await loadInvoices()

      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de las facturas",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Función para actualizar facturas a "sent" cuando se descargan
  const handleInvoicesDownloaded = (invoiceIds: number[]) => {
    // Actualizar el estado local inmediatamente
    setInvoices((currentInvoices) =>
      currentInvoices.map((invoice) =>
        invoiceIds.includes(invoice.id) && invoice.status === "draft" ? { ...invoice, status: "sent" } : invoice,
      ),
    )

    // Actualizar cada factura individualmente usando Supabase directamente
    invoiceIds.forEach(async (id) => {
      const invoice = invoices.find((inv) => inv.id === id)
      if (invoice?.status === "draft") {
        try {
          await supabase.from("invoices").update({ status: "sent" }).eq("id", id)
        } catch (error) {
          console.error("Error al actualizar estado después de descarga:", error)
        }
      }
    })
  }

  // Funciones para manejar selección múltiple
  const handleSelectInvoice = (invoiceId: number, checked: boolean) => {
    const newSelected = new Set(selectedInvoices)
    if (checked) {
      newSelected.add(invoiceId)
    } else {
      newSelected.delete(invoiceId)
    }
    setSelectedInvoices(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(invoices.map((invoice) => invoice.id)))
    } else {
      setSelectedInvoices(new Set())
    }
  }

  const isAllSelected = invoices.length > 0 && selectedInvoices.size === invoices.length
  const isIndeterminate = selectedInvoices.size > 0 && selectedInvoices.size < invoices.length

  // Funciones para manejar filtros de fecha
  const handleDateFilterChange = (key: keyof DateFilters, value: any) => {
    setDateFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const clearDateFilters = () => {
    setDateFilters({})
  }

  const hasActiveFilters = Object.values(dateFilters).some((value) => value !== undefined && value !== "")

  // Generar años para el selector
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

  // Generar meses
  const months = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground">
            Gestiona tus facturas
            {selectedInvoices.size > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({selectedInvoices.size} seleccionada{selectedInvoices.size !== 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? "border-primary" : ""}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1">•</span>
            )}
          </Button>
          <Button asChild>
            <Link href="/dashboard/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Link>
          </Button>
        </div>
      </div>

      {/* Selector de organización */}
      <OrganizationSelector selectedOrgId={selectedOrgId} onSelectOrganization={setSelectedOrgId} />

      {/* Panel de filtros */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Filtros de fecha</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Rango de fechas */}
              <div className="space-y-2">
                <Label>Fecha desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFilters.startDate
                        ? format(dateFilters.startDate, "dd/MM/yyyy", { locale: es })
                        : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFilters.startDate}
                      onSelect={(date) => handleDateFilterChange("startDate", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateFilters.endDate ? format(dateFilters.endDate, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFilters.endDate}
                      onSelect={(date) => handleDateFilterChange("endDate", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro por año */}
              <div className="space-y-2">
                <Label>Año</Label>
                <Select
                  value={dateFilters.year || ""}
                  onValueChange={(value) => handleDateFilterChange("year", value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por mes */}
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select
                  value={dateFilters.month || ""}
                  onValueChange={(value) => handleDateFilterChange("month", value || undefined)}
                  disabled={!dateFilters.year}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones para facturas seleccionadas */}
      {selectedInvoices.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedInvoices.size} factura{selectedInvoices.size !== 1 ? "s" : ""} seleccionada
                {selectedInvoices.size !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <BulkDownloadButton
                  selectedInvoiceIds={Array.from(selectedInvoices)}
                  onDownloadComplete={handleInvoicesDownloaded}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isUpdatingStatus}>
                      {isUpdatingStatus ? "Actualizando..." : "Cambiar estado"}
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {statusOptions.map((status) => (
                      <DropdownMenuItem
                        key={status.value}
                        onClick={() => handleBulkStatusChange(status.value)}
                        className="flex items-center gap-2"
                      >
                        <div className={`w-2 h-2 rounded-full ${status.color.split(" ")[0]}`} />
                        {status.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="sm" onClick={() => setSelectedInvoices(new Set())}>
                  Limpiar selección
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  className={
                    isIndeterminate
                      ? "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      : ""
                  }
                />
              </TableHead>
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
                <TableCell colSpan={7} className="h-24 text-center">
                  Cargando facturas...
                </TableCell>
              </TableRow>
            ) : invoices.length > 0 ? (
              invoices.map((invoice) => (
                <TableRow key={invoice.id} className="transition-colors hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedInvoices.has(invoice.id)}
                      onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell>{new Date(invoice.issue_date).toLocaleDateString("es-ES")}</TableCell>
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
                <TableCell colSpan={7} className="h-24 text-center">
                  {hasActiveFilters
                    ? "No se encontraron facturas con los filtros aplicados"
                    : "No hay facturas registradas"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
