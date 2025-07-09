"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Filter, X, ChevronDown, FileText, Download } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { InvoiceStatusSelector } from "@/components/invoices/invoice-status-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { BulkDownloadButton } from "@/components/invoices/bulk-download-button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { generateUniqueInvoiceNumber } from "@/lib/invoice-utils"
import { useAuth } from "@/app/contexts/auth-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DateFilters {
  startDate?: Date
  endDate?: Date
  year?: string
  month?: string
}

const statusOptions = [
  { value: "sent", label: "Enviada", color: "bg-blue-100 text-blue-800" },
  { value: "paid", label: "Pagada", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelada", color: "bg-red-100 text-red-800" },
  { value: "rectified", label: "Rectificada", color: "bg-purple-100 text-purple-800" },
  { value: "overdue", label: "Vencida", color: "bg-orange-100 text-orange-800" },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set())
  const [dateFilters, setDateFilters] = useState<DateFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isExportingCSV, setIsExportingCSV] = useState(false)
  const { toast } = useToast()
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [selectedDateString, setSelectedDateString] = useState<string>(new Date().toISOString().split("T")[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResults, setGenerationResults] = useState<{
    generated: number
    skipped: number
    errors: string[]
  } | null>(null)

  // Usar el AuthContext para obtener la información del usuario
  const { userProfile } = useAuth()

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

      // Filtrar por la organización del usuario actual
      if (userProfile?.organization_id) {
        query = query.eq("organization_id", userProfile.organization_id)
      }

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
      setSelectedInvoices(new Set())
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las facturas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile?.organization_id) {
      loadInvoices()
    }
  }, [userProfile?.organization_id, dateFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (invoiceId: number, newStatus: string) => {
    setInvoices((currentInvoices) =>
      currentInvoices.map((invoice) => {
        if (invoice.id === invoiceId) {
          return { ...invoice, status: newStatus }
        }
        return invoice
      }),
    )
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedInvoices.size === 0) return

    setIsUpdatingStatus(true)
    try {
      const invoiceIds = Array.from(selectedInvoices)

      setInvoices((currentInvoices) => {
        return currentInvoices.map((invoice) => {
          if (selectedInvoices.has(invoice.id)) {
            return { ...invoice, status: newStatus }
          }
          return invoice
        })
      })

      const { error } = await supabase.from("invoices").update({ status: newStatus }).in("id", invoiceIds)

      if (error) {
        throw new Error(`Error al actualizar el estado: ${error.message}`)
      }

      const statusLabel = statusOptions.find((option) => option.value === newStatus)?.label || newStatus

      toast({
        title: "Estado actualizado",
        description: `Se ha cambiado el estado de ${selectedInvoices.size} factura${selectedInvoices.size !== 1 ? "s" : ""} a "${statusLabel}".`,
      })

      setSelectedInvoices(new Set())
    } catch (error) {
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

  const handleInvoicesDownloaded = (invoiceIds: number[]) => {
    // Ya no es necesario cambiar el estado porque las facturas se crean directamente como "sent"
  }

  const handleExportCSV = async () => {
    if (selectedInvoices.size === 0) {
      toast({
        title: "Sin selección",
        description: "Selecciona al menos una factura para exportar",
        variant: "destructive",
      })
      return
    }

    setIsExportingCSV(true)
    try {
      // Obtener datos completos de las facturas seleccionadas
      const { data: fullInvoicesData, error } = await supabase
        .from("invoices")
        .select(`
          *,
          clients (
            name,
            tax_id,
            address,
            postal_code,
            city,
            province,
            country,
            email,
            phone,
            client_type
          ),
          organizations (
            name
          )
        `)
        .in("id", Array.from(selectedInvoices))
        .order("invoice_number", { ascending: true })

      if (error) throw error

      if (!fullInvoicesData || fullInvoicesData.length === 0) {
        throw new Error("No se encontraron datos para exportar")
      }

      // Obtener líneas de factura para las facturas seleccionadas
      const { data: invoiceLines, error: linesError } = await supabase
        .from("invoice_lines")
        .select(`
          *,
          users!invoice_lines_professional_id_fkey (name)
        `)
        .in("invoice_id", Array.from(selectedInvoices))

      if (linesError) {
        console.error("Error al obtener líneas:", linesError)
      }

      // Crear el CSV
      const csvData = generateCSVData(fullInvoicesData, invoiceLines || [])
      downloadCSV(csvData, `facturas_${format(new Date(), "yyyy-MM-dd")}.csv`)

      toast({
        title: "Exportación completada",
        description: `Se han exportado ${selectedInvoices.size} facturas a CSV`,
      })
    } catch (error) {
      console.error("Error al exportar CSV:", error)
      toast({
        title: "Error",
        description: "No se pudo exportar el archivo CSV",
        variant: "destructive",
      })
    } finally {
      setIsExportingCSV(false)
    }
  }

  const generateCSVData = (invoices: any[], lines: any[]) => {
    // Encabezados del CSV
    const headers = [
      "Número Factura",
      "Fecha Emisión",
      "Tipo Factura",
      "Estado",
      "Cliente",
      "CIF/NIF Cliente",
      "Dirección Cliente",
      "CP Cliente",
      "Ciudad Cliente",
      "Provincia Cliente",
      "País Cliente",
      "Email Cliente",
      "Teléfono Cliente",
      "Tipo Cliente",
      "Organización",
      "Base Imponible",
      "IVA",
      "IRPF",
      "Retenciones",
      "Total",
      "Líneas de Factura",
      "Profesionales",
      "Notas",
      "Fecha Creación",
      "Fecha Vencimiento",
    ]

    // Crear mapa de líneas por factura
    const linesByInvoice = lines.reduce((acc: Record<number, any[]>, line: any) => {
      if (!acc[line.invoice_id]) {
        acc[line.invoice_id] = []
      }
      acc[line.invoice_id].push(line)
      return acc
    }, {})

    // Generar filas de datos
    const rows = invoices.map((invoice) => {
      const client = invoice.clients
      const organization = invoice.organizations
      const invoiceLines = linesByInvoice[invoice.id] || []

      // Formatear líneas de factura
      const linesText = invoiceLines
        .map((line) => `${line.description} (${line.quantity}x${line.unit_price}€)`)
        .join("; ")

      // Formatear profesionales
      const professionalsText = invoiceLines
        .filter((line) => line.users?.name)
        .map((line) => line.users.name)
        .filter((name, index, arr) => arr.indexOf(name) === index) // Eliminar duplicados
        .join("; ")

      // Obtener etiqueta del estado
      const statusLabel = statusOptions.find((opt) => opt.value === invoice.status)?.label || invoice.status

      return [
        invoice.invoice_number || "",
        invoice.issue_date ? format(new Date(invoice.issue_date), "dd/MM/yyyy") : "",
        invoice.invoice_type === "rectificative" ? "Rectificativa" : "Normal",
        statusLabel,
        client?.name || "",
        client?.tax_id || "",
        client?.address || "",
        client?.postal_code || "",
        client?.city || "",
        client?.province || "",
        client?.country || "",
        client?.email || "",
        client?.phone || "",
        client?.client_type === "public" ? "Público" : "Privado",
        organization?.name || "",
        invoice.base_amount?.toFixed(2) || "0.00",
        invoice.vat_amount?.toFixed(2) || "0.00",
        invoice.irpf_amount?.toFixed(2) || "0.00",
        invoice.retention_amount?.toFixed(2) || "0.00",
        invoice.total_amount?.toFixed(2) || "0.00",
        linesText,
        professionalsText,
        invoice.notes || "",
        invoice.created_at ? format(new Date(invoice.created_at), "dd/MM/yyyy HH:mm") : "",
        invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : "",
      ]
    })

    return [headers, ...rows]
  }

  const downloadCSV = (data: string[][], filename: string) => {
    // Convertir datos a formato CSV con punto y coma como separador
    const csvContent = data
      .map((row) =>
        row
          .map((cell) => {
            // Escapar comillas y envolver en comillas si contiene separadores
            const cellStr = String(cell || "")
            if (cellStr.includes('"') || cellStr.includes(";") || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          })
          .join(";"),
      )
      .join("\n")

    // Añadir BOM para UTF-8 (para que Excel lo abra correctamente)
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })

    // Crear enlace de descarga
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i)

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

  const generateDailyInvoices = async () => {
    if (!selectedDateString) {
      toast({
        title: "Error",
        description: "Selecciona una fecha específica",
        variant: "destructive",
      })
      return
    }

    if (!userProfile?.organization_id) {
      toast({
        title: "Error",
        description: "No se pudo obtener la información de la organización",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    const results = { generated: 0, skipped: 0, errors: [] as string[] }

    try {
      const dateStr = selectedDateString
      // Convertir a number igual que en nueva factura
      const orgId = Number.parseInt(userProfile.organization_id.toString())

      // Obtener organización completa - igual que en nueva factura
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single()

      if (orgError || !orgData) {
        throw new Error("No se pudieron obtener los datos completos de la organización")
      }

      // Buscar citas completadas del día
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          clients (*),
          appointment_types (name, price),
          users!appointments_professional_id_fkey (name)
        `)
        .eq("organization_id", orgId)
        .eq("date", dateStr)
        .eq("status", "completed")

      if (appointmentsError) {
        throw new Error(`Error al obtener las citas: ${appointmentsError.message}`)
      }

      if (!appointments || appointments.length === 0) {
        toast({
          title: "Sin citas",
          description: "No hay citas completadas para la fecha seleccionada",
        })
        setIsGenerating(false)
        return
      }

      // Verificar cuáles ya están facturadas
      const appointmentIds = appointments.map((apt) => apt.id)
      const { data: existingInvoiceLines } = await supabase
        .from("invoice_lines")
        .select("appointment_id")
        .in("appointment_id", appointmentIds)

      const invoicedAppointmentIds = new Set(existingInvoiceLines?.map((line) => line.appointment_id) || [])

      // Filtrar citas no facturadas
      const unbilledAppointments = appointments.filter((apt) => !invoicedAppointmentIds.has(apt.id))

      if (unbilledAppointments.length === 0) {
        toast({
          title: "Ya facturadas",
          description: "Todas las citas del día ya están facturadas",
        })
        setIsGenerating(false)
        return
      }

      // Agrupar por cliente
      const appointmentsByClient = unbilledAppointments.reduce(
        (acc: Record<number, { client: any; appointments: any[] }>, apt: any) => {
          if (!apt.clients?.name) {
            results.errors.push(`Cita ${apt.id}: Cliente sin nombre`)
            return acc
          }

          const clientKey = apt.client_id
          if (!acc[clientKey]) {
            acc[clientKey] = {
              client: apt.clients,
              appointments: [],
            }
          }
          acc[clientKey].appointments.push(apt)
          return acc
        },
        {} as Record<number, { client: any; appointments: any[] }>,
      )

      // Generar facturas por cliente
      for (const [clientId, { client, appointments: clientAppointments }] of Object.entries(appointmentsByClient)) {
        try {
          // Generar número de factura - igual que en nueva factura
          const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(orgId, "normal")

          // Calcular totales
          let baseAmount = 0
          const invoiceLines = clientAppointments.map((apt: any) => {
            const price = apt.appointment_types?.price || 0
            baseAmount += price
            return {
              description: `${apt.appointment_types?.name || "Consulta"} - ${format(new Date(apt.date + "T" + apt.start_time), "dd/MM/yyyy HH:mm")}`,
              quantity: 1,
              unit_price: price,
              vat_rate: 21,
              irpf_rate: 0,
              retention_rate: 0,
              line_amount: price,
              professional_id: apt.professional_id,
              appointment_id: apt.id,
            }
          })

          const vatAmount = baseAmount * 0.21
          const totalAmount = baseAmount + vatAmount

          // Información del cliente para las notas - igual que en nueva factura
          const clientInfoText = `Cliente: ${client.name}${client.tax_id ? `, CIF/NIF: ${client.tax_id}` : ""}${client.address ? `, Dirección: ${client.address}` : ""}${client.postal_code ? `, ${client.postal_code}` : ""} ${client.city || ""}${client.province ? `, ${client.province}` : ""}`

          const additionalNotes = `Factura generada automáticamente para citas del ${format(new Date(selectedDateString), "dd/MM/yyyy", { locale: es })}`

          const fullNotes = clientInfoText + `\n\nNotas adicionales: ${additionalNotes}`

          // Crear factura - estructura idéntica a nueva factura
          const { data: invoiceData, error: invoiceError } = await supabase
            .from("invoices")
            .insert({
              organization_id: orgId,
              invoice_number: invoiceNumberFormatted,
              client_id: Number.parseInt(clientId),
              issue_date: dateStr,
              invoice_type: "normal",
              status: "sent",
              base_amount: baseAmount,
              vat_amount: vatAmount,
              irpf_amount: 0,
              retention_amount: 0,
              total_amount: totalAmount,
              notes: fullNotes,
            })
            .select()
            .single()

          if (invoiceError || !invoiceData) {
            results.errors.push(`Cliente ${client.name}: Error al crear factura - ${invoiceError?.message}`)
            continue
          }

          // Crear líneas de factura - igual que en nueva factura
          const invoiceLinesData = invoiceLines.map((line: any) => ({
            invoice_id: invoiceData.id,
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            vat_rate: line.vat_rate,
            irpf_rate: line.irpf_rate,
            retention_rate: line.retention_rate,
            line_amount: line.line_amount,
            professional_id: line.professional_id ? Number.parseInt(line.professional_id.toString()) : null,
            appointment_id: line.appointment_id,
          }))

          const { error: linesError } = await supabase.from("invoice_lines").insert(invoiceLinesData)

          if (linesError) {
            results.errors.push(`Cliente ${client.name}: Error al crear líneas de factura - ${linesError.message}`)
            continue
          }

          // Actualizar contador de organización - igual que en nueva factura
          const { error: updateOrgError } = await supabase
            .from("organizations")
            .update({ last_invoice_number: newInvoiceNumber })
            .eq("id", orgId)

          if (updateOrgError) {
            // Error handled silently pero continúa
          }

          results.generated++
        } catch (error) {
          results.errors.push(`Cliente ${client.name}: ${error instanceof Error ? error.message : "Error desconocido"}`)
        }
      }

      // Actualizar lista de facturas
      await loadInvoices()
      setGenerationResults(results)

      toast({
        title: "Generación completada",
        description: `Se generaron ${results.generated} facturas. ${results.skipped} omitidas.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al generar facturas",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

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

          <Button variant="outline" onClick={() => setGenerateModalOpen(true)} disabled={!userProfile?.organization_id}>
            <FileText className="mr-2 h-4 w-4" />
            Generar del día
          </Button>

          <Button asChild>
            <Link href="/dashboard/facturacion/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Link>
          </Button>
        </div>
      </div>

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
              <div className="space-y-2">
                <Label>Fecha desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
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
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
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

      {selectedInvoices.size > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedInvoices.size} factura{selectedInvoices.size !== 1 ? "s" : ""} seleccionada
                {selectedInvoices.size !== 1 ? "s" : ""}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={isExportingCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  {isExportingCSV ? "Exportando..." : "Exportar CSV"}
                </Button>

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
                      <Link href={`/dashboard/facturacion/invoices/${invoice.id}`}>Ver</Link>
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

      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar facturas del día</DialogTitle>
            <DialogDescription>
              Selecciona la fecha para generar facturas de todas las citas completadas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="selected_date">Fecha</Label>
              <Input
                id="selected_date"
                type="date"
                value={selectedDateString}
                onChange={(e) => setSelectedDateString(e.target.value)}
                className="w-full"
              />
            </div>

            {generationResults && (
              <div className="space-y-2">
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">✅ {generationResults.generated} facturas generadas</p>
                  {generationResults.skipped > 0 && (
                    <p className="text-sm text-yellow-800">⚠️ {generationResults.skipped} citas omitidas</p>
                  )}
                </div>

                {generationResults.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md max-h-32 overflow-y-auto">
                    <p className="text-sm text-red-800 font-medium mb-1">Errores:</p>
                    {generationResults.errors.map((error, index) => (
                      <p key={index} className="text-xs text-red-700">
                        • {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGenerateModalOpen(false)
                setGenerationResults(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={generateDailyInvoices}
              disabled={isGenerating || !selectedDateString || !userProfile?.organization_id}
            >
              {isGenerating ? "Generando..." : "Generar facturas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
