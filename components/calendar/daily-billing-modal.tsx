"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { FileText, X, CheckCircle, Users, Euro, Clock, AlertTriangle, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"

interface DailyBillingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
}

interface ClientAppointmentData {
  client_id: number
  client_name: string
  client_tax_id: string | null
  client_address: string | null
  client_postal_code: string | null
  client_city: string | null
  client_province: string | null
  client_email: string | null
  client_phone: string | null
  appointments: Array<{
    id: string
    start_time: string
    end_time: string
    professional_name: string
    consultation_name: string
    notes: string | null
    service_price?: number
    status: string
  }>
  total_amount: number
  has_complete_data: boolean
  missing_fields: string[]
}

interface BillingProgress {
  phase: "validating" | "generating" | "creating_pdfs" | "completed" | "error"
  current: number
  total: number
  message: string
  errors: string[]
}

const STATUS_LABELS = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No se presentó",
}

const STATUS_COLORS = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  no_show: "bg-gray-100 text-gray-800",
}

export function DailyBillingModal({ isOpen, onClose, selectedDate }: DailyBillingModalProps) {
  const { userProfile } = useAuth()
  const { toast } = useToast()

  const [clientsData, setClientsData] = useState<ClientAppointmentData[]>([])
  const [filteredClientsData, setFilteredClientsData] = useState<ClientAppointmentData[]>([])
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<BillingProgress | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dataFilter, setDataFilter] = useState<string>("all") // all, complete, incomplete

  // Cargar datos de citas del día
  useEffect(() => {
    if (isOpen && userProfile?.organization_id) {
      loadDayAppointments()
    }
  }, [isOpen, selectedDate, userProfile])

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...clientsData]

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.client_tax_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.appointments.some(
            (apt) =>
              apt.professional_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              apt.consultation_name.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      )
    }

    // Filtro por estado de citas
    if (statusFilter !== "all") {
      filtered = filtered.filter((client) => client.appointments.some((apt) => apt.status === statusFilter))
    }

    // Filtro por completitud de datos
    if (dataFilter === "complete") {
      filtered = filtered.filter((client) => client.has_complete_data)
    } else if (dataFilter === "incomplete") {
      filtered = filtered.filter((client) => !client.has_complete_data)
    }

    setFilteredClientsData(filtered)
  }, [clientsData, searchTerm, statusFilter, dataFilter])

  const loadDayAppointments = async () => {
    setLoading(true)

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      console.log(`🔍 Cargando TODAS las citas para la fecha: ${dateStr}`)

      // ✅ OBTENER TODAS LAS CITAS DEL DÍA SIN FILTRAR POR ESTADO
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
          id,
          start_time,
          end_time,
          notes,
          status,
          client_id,
          clients (
            id,
            name,
            tax_id,
            address,
            postal_code,
            city,
            province,
            email,
            phone
          ),
          professional:users!appointments_professional_id_fkey (
            name
          ),
          consultation:consultations (
            name
          ),
          services (
            price
          )
        `)
        .eq("organization_id", userProfile!.organization_id)
        .eq("date", dateStr)
        .order("client_id")

      if (error) {
        console.error("❌ Error en la consulta:", error)
        throw error
      }

      console.log(`📊 Total de citas encontradas: ${appointments?.length || 0}`)

      // Log de estados encontrados
      const statusCounts: Record<string, number> = {}
      appointments?.forEach((apt: any) => {
        const status = apt.status || "sin_estado"
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })
      console.log("📈 Estados de citas encontrados:", statusCounts)

      // ✅ USAR TODAS LAS CITAS SIN FILTRAR
      const allAppointments = appointments || []
      console.log(`✅ Procesando TODAS las citas: ${allAppointments.length}`)

      // Agrupar por cliente y validar datos
      const clientsMap = new Map<number, ClientAppointmentData>()

      allAppointments.forEach((apt: any) => {
        const client = apt.clients
        const clientId = client.id

        if (!clientsMap.has(clientId)) {
          // Validar datos requeridos para facturación
          const missingFields: string[] = []
          if (!client.name?.trim()) missingFields.push("Nombre")
          if (!client.tax_id?.trim()) missingFields.push("CIF/NIF")
          if (!client.address?.trim()) missingFields.push("Dirección")
          if (!client.postal_code?.trim()) missingFields.push("Código Postal")
          if (!client.city?.trim()) missingFields.push("Ciudad")

          clientsMap.set(clientId, {
            client_id: clientId,
            client_name: client.name || "Sin nombre",
            client_tax_id: client.tax_id,
            client_address: client.address,
            client_postal_code: client.postal_code,
            client_city: client.city,
            client_province: client.province,
            client_email: client.email,
            client_phone: client.phone,
            appointments: [],
            total_amount: 0,
            has_complete_data: missingFields.length === 0,
            missing_fields: missingFields,
          })
        }

        const clientData = clientsMap.get(clientId)!
        const servicePrice = apt.services?.price || 50

        clientData.appointments.push({
          id: apt.id,
          start_time: apt.start_time,
          end_time: apt.end_time,
          professional_name: apt.professional?.name || "Sin asignar",
          consultation_name: apt.consultation?.name || "Consulta general",
          notes: apt.notes,
          service_price: servicePrice,
          status: apt.status,
        })

        clientData.total_amount += servicePrice
      })

      const clientsArray = Array.from(clientsMap.values())
      setClientsData(clientsArray)

      // Seleccionar automáticamente clientes con datos completos
      const validClientIds = clientsArray.filter((client) => client.has_complete_data).map((client) => client.client_id)
      setSelectedClients(new Set(validClientIds))

      console.log(`🎯 Procesados ${clientsArray.length} clientes con citas del día`)
      console.log(`✅ ${validClientIds.length} clientes tienen datos completos para facturación`)
    } catch (error) {
      console.error("❌ Error loading day appointments:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las citas del día",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClientToggle = (clientId: number, checked: boolean) => {
    const newSelected = new Set(selectedClients)
    if (checked) {
      newSelected.add(clientId)
    } else {
      newSelected.delete(clientId)
    }
    setSelectedClients(newSelected)
  }

  const handleSelectAll = () => {
    const validClientIds = filteredClientsData
      .filter((client) => client.has_complete_data)
      .map((client) => client.client_id)
    setSelectedClients(new Set(validClientIds))
  }

  const handleDeselectAll = () => {
    setSelectedClients(new Set())
  }

  const generateInvoices = async () => {
    if (selectedClients.size === 0) return

    setGenerating(true)
    const selectedClientsArray = Array.from(selectedClients)

    setProgress({
      phase: "validating",
      current: 0,
      total: selectedClientsArray.length,
      message: "Validando datos de clientes...",
      errors: [],
    })

    try {
      // Importar funciones necesarias
      const { generateUniqueInvoiceNumber } = await import("@/lib/invoice-utils")
      const { generatePdf } = await import("@/lib/pdf-generator")
      const { savePdfToStorage } = await import("@/lib/storage-utils")

      // Obtener datos de la organización
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userProfile!.organization_id)
        .single()

      if (orgError || !orgData) {
        throw new Error("No se pudieron obtener los datos de la organización")
      }

      // Fase de generación
      setProgress((prev) => ({
        ...prev!,
        phase: "generating",
        message: "Generando facturas...",
      }))

      const errors: string[] = []
      let successCount = 0

      for (let i = 0; i < selectedClientsArray.length; i++) {
        const clientId = selectedClientsArray[i]
        const clientData = clientsData.find((c) => c.client_id === clientId)!

        setProgress((prev) => ({
          ...prev!,
          current: i + 1,
          message: `Generando factura para ${clientData.client_name}...`,
        }))

        try {
          // Generar número de factura único
          const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(
            userProfile!.organization_id,
            "normal",
          )

          // Preparar líneas de factura
          const invoiceLines = clientData.appointments.map((apt) => ({
            id: crypto.randomUUID(),
            description: `${apt.consultation_name} - ${apt.professional_name} (${apt.start_time}-${apt.end_time}) [${STATUS_LABELS[apt.status as keyof typeof STATUS_LABELS] || apt.status}]`,
            quantity: 1,
            unit_price: apt.service_price || 50,
            discount_percentage: 0,
            vat_rate: 21,
            irpf_rate: 0,
            retention_rate: 0,
            line_amount: apt.service_price || 50,
            professional_id: null,
          }))

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

          // Preparar notas de la factura
          const clientInfoText = `Cliente: ${clientData.client_name}, CIF/NIF: ${clientData.client_tax_id}, Dirección: ${clientData.client_address}, ${clientData.client_postal_code} ${clientData.client_city}, ${clientData.client_province}`
          const additionalNotes = `Factura generada automáticamente para citas del ${format(selectedDate, "dd/MM/yyyy", { locale: es })} (incluye todas las citas independientemente del estado)`
          const fullNotes = clientInfoText + "\n\n" + additionalNotes

          // Crear factura en la base de datos
          const { data: invoiceData, error: invoiceError } = await supabase
            .from("invoices")
            .insert({
              organization_id: userProfile!.organization_id,
              invoice_number: invoiceNumberFormatted,
              client_id: clientId,
              issue_date: format(selectedDate, "yyyy-MM-dd"),
              invoice_type: "normal",
              status: "sent",
              base_amount: baseAmount,
              vat_amount: vatAmount,
              irpf_amount: irpfAmount,
              retention_amount: retentionAmount,
              total_amount: totalAmount,
              discount_amount: totalDiscountAmount,
              notes: fullNotes,
              created_by: userProfile!.id,
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
            .eq("id", userProfile!.organization_id)

          if (updateOrgError) {
            console.error("Error updating organization:", updateOrgError)
          }

          // Generar PDF
          try {
            const newInvoice = {
              id: invoiceData.id,
              invoice_number: invoiceNumberFormatted,
              issue_date: format(selectedDate, "yyyy-MM-dd"),
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
                name: clientData.client_name,
                tax_id: clientData.client_tax_id || "",
                address: clientData.client_address || "",
                postal_code: clientData.client_postal_code || "",
                city: clientData.client_city || "",
                province: clientData.client_province || "",
                country: "España",
                email: clientData.client_email || "",
                phone: clientData.client_phone || "",
                client_type: "private",
              },
            }

            // Generar PDF pero no descargarlo automáticamente
            const pdfBlob = await generatePdf(newInvoice, invoiceLines, `factura-${invoiceNumberFormatted}.pdf`, false)

            // Guardar PDF en storage
            if (pdfBlob && pdfBlob instanceof Blob) {
              try {
                const pdfUrl = await savePdfToStorage(
                  pdfBlob,
                  `factura-${invoiceNumberFormatted}.pdf`,
                  userProfile!.organization_id,
                )

                await supabase.from("invoices").update({ pdf_url: pdfUrl }).eq("id", invoiceData.id)
              } catch (pdfError) {
                console.error("Error saving PDF:", pdfError)
              }
            }
          } catch (pdfError) {
            console.error("Error generating PDF:", pdfError)
          }

          successCount++
        } catch (error) {
          console.error(`Error generating invoice for client ${clientData.client_name}:`, error)
          errors.push(`${clientData.client_name}: ${error instanceof Error ? error.message : "Error desconocido"}`)
        }

        // Pequeña pausa para no saturar
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Completado
      setProgress({
        phase: "completed",
        current: selectedClientsArray.length,
        total: selectedClientsArray.length,
        message: `Proceso completado. ${successCount} facturas generadas correctamente.`,
        errors,
      })

      if (successCount > 0) {
        toast({
          title: "Facturas generadas",
          description: `Se generaron ${successCount} facturas correctamente`,
        })
      }

      if (errors.length > 0) {
        toast({
          title: "Algunos errores encontrados",
          description: `${errors.length} facturas no se pudieron generar`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error in billing process:", error)
      setProgress({
        phase: "error",
        current: 0,
        total: selectedClientsArray.length,
        message: "Error en el proceso de facturación",
        errors: [error instanceof Error ? error.message : "Error desconocido"],
      })
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  const getTotalSelected = () => {
    return filteredClientsData
      .filter((client) => selectedClients.has(client.client_id))
      .reduce((sum, client) => sum + client.total_amount, 0)
  }

  const getStatusCounts = () => {
    const counts: Record<string, number> = {}
    clientsData.forEach((client) => {
      client.appointments.forEach((apt) => {
        counts[apt.status] = (counts[apt.status] || 0) + 1
      })
    })
    return counts
  }

  if (!isOpen) return null

  const statusCounts = getStatusCounts()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Facturación del Día</h2>
                <p className="text-sm text-gray-600">
                  {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                <p className="text-xs text-blue-600">✅ Incluye TODAS las citas independientemente del estado</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-gray-600">Cargando todas las citas del día...</p>
              </div>
            </div>
          ) : clientsData.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay citas</h3>
              <p className="text-gray-600">No se encontraron citas para este día.</p>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              {progress && (
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {progress.phase === "completed" ? "Proceso Completado" : "Generando Facturas..."}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{progress.message}</span>
                        <span>
                          {progress.current} de {progress.total}
                        </span>
                      </div>
                      {progress.errors.length > 0 && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <h4 className="text-sm font-medium text-red-800 mb-2">Errores encontrados:</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {progress.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Clientes</p>
                        <p className="text-lg font-semibold">{clientsData.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Seleccionados</p>
                        <p className="text-lg font-semibold">{selectedClients.size}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Seleccionado</p>
                        <p className="text-lg font-semibold">{formatCurrency(getTotalSelected())}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Total Citas</p>
                        <p className="text-lg font-semibold">
                          {clientsData.reduce((sum, client) => sum + client.appointments.length, 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Summary */}
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Estados de las citas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <Badge
                        key={status}
                        variant="outline"
                        className={STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800"}
                      >
                        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}: {count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por cliente, CIF, profesional..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={dataFilter} onValueChange={setDataFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por datos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    <SelectItem value="complete">Datos completos</SelectItem>
                    <SelectItem value="incomplete">Datos incompletos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Controls */}
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={generating}>
                  Seleccionar Válidos ({filteredClientsData.filter((c) => c.has_complete_data).length})
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeselectAll} disabled={generating}>
                  Deseleccionar Todos
                </Button>
              </div>

              {/* Clients List */}
              <div className="space-y-3">
                {filteredClientsData.map((client) => (
                  <Card
                    key={client.client_id}
                    className={`${
                      !client.has_complete_data
                        ? "border-red-200 bg-red-50"
                        : selectedClients.has(client.client_id)
                          ? "border-blue-200 bg-blue-50"
                          : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedClients.has(client.client_id)}
                          onCheckedChange={(checked) => handleClientToggle(client.client_id, checked as boolean)}
                          disabled={!client.has_complete_data || generating}
                          className="mt-1"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900">{client.client_name}</h3>
                            {client.has_complete_data ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Datos completos
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Datos incompletos
                              </Badge>
                            )}
                          </div>

                          {!client.has_complete_data && (
                            <div className="mb-3 p-2 bg-red-100 rounded text-sm text-red-800">
                              <strong>Faltan datos:</strong> {client.missing_fields.join(", ")}
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <p>
                                <strong>CIF/NIF:</strong> {client.client_tax_id || "No especificado"}
                              </p>
                              <p>
                                <strong>Email:</strong> {client.client_email || "No especificado"}
                              </p>
                            </div>
                            <div>
                              <p>
                                <strong>Teléfono:</strong> {client.client_phone || "No especificado"}
                              </p>
                              <p>
                                <strong>Citas:</strong> {client.appointments.length}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 mb-3">
                            {client.appointments.map((apt) => (
                              <div
                                key={apt.id}
                                className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">
                                    {apt.start_time}-{apt.end_time}
                                  </span>
                                  <span>({apt.professional_name})</span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${STATUS_COLORS[apt.status as keyof typeof STATUS_COLORS] || "bg-gray-100 text-gray-800"}`}
                                  >
                                    {STATUS_LABELS[apt.status as keyof typeof STATUS_LABELS] || apt.status}
                                  </Badge>
                                </div>
                                <span className="font-medium">{formatCurrency(apt.service_price || 50)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              {client.appointments.length} cita{client.appointments.length !== 1 ? "s" : ""}
                            </div>
                            <div className="text-lg font-semibold text-green-600">
                              {formatCurrency(client.total_amount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && clientsData.length > 0 && (
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedClients.size} clientes seleccionados • {formatCurrency(getTotalSelected())} total
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={generating}>
                  Cancelar
                </Button>
                <Button
                  onClick={generateInvoices}
                  disabled={selectedClients.size === 0 || generating}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {generating ? "Generando..." : `Generar ${selectedClients.size} Facturas`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
