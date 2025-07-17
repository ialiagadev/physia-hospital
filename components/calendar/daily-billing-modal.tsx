"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import {
  FileText,
  X,
  CheckCircle,
  Users,
  Euro,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Zap,
  Package,
  User,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import JSZip from "jszip"

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
    service_vat_rate?: number
    service_irpf_rate?: number
    service_name?: string
    service_retention_rate?: number
    status: string
    type?: "appointment" | "group_activity"
    activity_name?: string
    is_invoiced?: boolean
    invoice_info?: {
      invoice_number: string
      created_at: string
      id: string
    }
  }>
  total_amount: number
  has_complete_data: boolean
  missing_fields: string[]
  invoiceable_appointments: number
  invoiced_appointments: number
  payment_method?: "tarjeta" | "efectivo" | "transferencia" | "paypal" | "bizum" | "otro"
  payment_method_other?: string
}

interface BillingProgress {
  phase: "validating" | "generating" | "creating_pdfs" | "creating_zip" | "completed" | "error"
  current: number
  total: number
  message: string
  errors: string[]
  currentClient?: string
  zipProgress?: number
}

interface GeneratedInvoice {
  invoiceNumber: string
  clientName: string
  amount: number
  pdfBlob: Blob
  invoiceId: string
}

const STATUS_LABELS = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No se presentó",
  registered: "Registrado",
  attended: "Asistió",
}

const STATUS_COLORS = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  no_show: "bg-gray-100 text-gray-800",
  registered: "bg-blue-100 text-blue-800",
  attended: "bg-green-100 text-green-800",
}

// Componente de progreso mejorado
function EnhancedProgressBar({ progress }: { progress: BillingProgress }) {
  const getPhaseIcon = () => {
    switch (progress.phase) {
      case "validating":
        return <CheckCircle className="h-5 w-5 text-blue-500 animate-pulse" />
      case "generating":
        return <Zap className="h-5 w-5 text-yellow-500 animate-bounce" />
      case "creating_pdfs":
        return <FileText className="h-5 w-5 text-green-500 animate-pulse" />
      case "creating_zip":
        return <Package className="h-5 w-5 text-purple-500 animate-spin" />
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getPhaseColor = () => {
    switch (progress.phase) {
      case "validating":
        return "bg-blue-500"
      case "generating":
        return "bg-yellow-500"
      case "creating_pdfs":
        return "bg-green-500"
      case "creating_zip":
        return "bg-purple-500"
      case "completed":
        return "bg-green-600"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPhaseLabel = () => {
    switch (progress.phase) {
      case "validating":
        return "Validando datos"
      case "generating":
        return "Generando facturas"
      case "creating_pdfs":
        return "Creando PDFs"
      case "creating_zip":
        return "Empaquetando ZIP"
      case "completed":
        return "¡Completado!"
      case "error":
        return "Error"
      default:
        return "Procesando"
    }
  }

  const progressPercentage =
    progress.phase === "creating_zip" && progress.zipProgress
      ? progress.zipProgress
      : (progress.current / progress.total) * 100

  return (
    <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {getPhaseIcon()}
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900">{getPhaseLabel()}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {progress.currentClient ? `Procesando: ${progress.currentClient}` : progress.message}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{Math.round(progressPercentage)}%</div>
            <div className="text-xs text-gray-500">
              {progress.current} de {progress.total}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Progress value={progressPercentage} className="h-3 bg-gray-200" />
            <div
              className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${getPhaseColor()}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            {["validating", "generating", "creating_pdfs", "creating_zip", "completed"].map((phase, index) => {
              const isActive = progress.phase === phase
              const isCompleted =
                ["validating", "generating", "creating_pdfs", "creating_zip", "completed"].indexOf(progress.phase) >
                index
              return (
                <div
                  key={phase}
                  className={`flex flex-col items-center gap-1 ${
                    isActive ? "text-blue-600 font-medium" : isCompleted ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isActive ? "bg-blue-500 animate-pulse" : isCompleted ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <span className="capitalize">
                    {phase === "creating_pdfs" ? "PDFs" : phase === "creating_zip" ? "ZIP" : phase.replace("_", " ")}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-blue-100">
            <p className="text-sm text-gray-700 font-medium">{progress.message}</p>
            {progress.phase === "creating_zip" && (
              <div className="mt-2 flex items-center gap-2 text-xs text-purple-600">
                <Package className="h-3 w-3 animate-spin" />
                <span>Comprimiendo archivos PDF...</span>
              </div>
            )}
          </div>
          {progress.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Errores encontrados ({progress.errors.length})
              </h4>
              <div className="max-h-24 overflow-y-auto">
                <ul className="text-sm text-red-700 space-y-1">
                  {progress.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
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
  const [generatedInvoices, setGeneratedInvoices] = useState<GeneratedInvoice[]>([])
  const [existingInvoices, setExistingInvoices] = useState<
    Map<
      number,
      {
        invoice_number: string
        created_at: string
        id: string
      }
    >
  >(new Map())
  const [clientPaymentMethods, setClientPaymentMethods] = useState<
    Map<
      number,
      {
        method: "tarjeta" | "efectivo" | "transferencia" | "paypal" | "bizum" | "otro"
        other?: string
      }
    >
  >(new Map())

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dataFilter, setDataFilter] = useState<string>("all")

  useEffect(() => {
    if (isOpen && userProfile?.organization_id) {
      loadDayAppointments()
    }
  }, [isOpen, selectedDate, userProfile])

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...clientsData]

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.client_tax_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.appointments.some(
            (apt) =>
              apt.professional_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              apt.consultation_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              apt.activity_name?.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((client) => client.appointments.some((apt) => apt.status === statusFilter))
    }

    if (dataFilter === "complete") {
      filtered = filtered.filter((client) => client.has_complete_data)
    } else if (dataFilter === "incomplete") {
      filtered = filtered.filter((client) => !client.has_complete_data)
    }

    setFilteredClientsData(filtered)
  }, [clientsData, searchTerm, statusFilter, dataFilter])

  const handlePaymentMethodChange = (clientId: number, method: string, other?: string) => {
    setClientPaymentMethods((prev) => {
      const newMap = new Map(prev)
      newMap.set(clientId, {
        method: method as "tarjeta" | "efectivo" | "transferencia" | "paypal" | "bizum" | "otro",
        other: method === "otro" ? other : undefined,
      })
      return newMap
    })
  }

  const loadDayAppointments = async () => {
    setLoading(true)
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd")

      // Cargar citas individuales
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
            name,
            price,
            vat_rate,
            irpf_rate,
            retention_rate
          )
        `)
        .eq("organization_id", userProfile!.organization_id)
        .eq("date", dateStr)
        .order("client_id")

      if (error) {
        throw error
      }

      // Cargar actividades grupales
      const { data: groupActivities, error: groupError } = await supabase
        .from("group_activities")
        .select(`
          id,
          name,
          start_time,
          end_time,
          professional_id,
          service_id,
          group_activity_participants (
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
            )
          )
        `)
        .eq("organization_id", userProfile!.organization_id)
        .eq("date", dateStr)

      if (groupError) {
        throw groupError
      }

      // Cargar datos auxiliares para resolver en JS
      const [usersData, servicesData] = await Promise.all([
        supabase.from("users").select("id, name").eq("organization_id", userProfile!.organization_id),
        supabase
          .from("services")
          .select("id, name, price, vat_rate, irpf_rate, retention_rate")
          .eq("organization_id", userProfile!.organization_id),
      ])

      const users = usersData.data || []
      const services = servicesData.data || []

      // Combinar datos
      const allAppointments = appointments || []
      const clientsMap = new Map<number, ClientAppointmentData>()

      // Procesar citas individuales
      allAppointments.forEach((apt: any) => {
        const client = apt.clients
        const clientId = client.id

        if (!clientsMap.has(clientId)) {
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
            invoiceable_appointments: 0,
            invoiced_appointments: 0,
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
          service_name: apt.services?.name,
          service_vat_rate: apt.services?.vat_rate ?? 0,
          service_irpf_rate: apt.services?.irpf_rate ?? 0,
          service_retention_rate: apt.services?.retention_rate ?? 0,
          status: apt.status,
          type: "appointment",
        })

        clientData.total_amount += servicePrice
      })

      // Procesar actividades grupales
      groupActivities?.forEach((activity: any) => {
        const professional = users.find((user) => user.id === activity.professional_id)
        const service = services.find((svc) => svc.id === activity.service_id)

        const validParticipants =
          activity.group_activity_participants?.filter(
            (p: any) => p.status === "attended" || p.status === "registered",
          ) || []

        validParticipants.forEach((participant: any) => {
          const client = participant.clients
          const clientId = client.id

          if (!clientsMap.has(clientId)) {
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
              invoiceable_appointments: 0,
              invoiced_appointments: 0,
            })
          }

          const clientData = clientsMap.get(clientId)!
          const servicePrice = service?.price || 50

          clientData.appointments.push({
            id: `group_${activity.id}_${participant.client_id}`,
            start_time: activity.start_time,
            end_time: activity.end_time,
            professional_name: professional?.name || "Sin asignar",
            consultation_name: activity.name,
            notes: null,
            service_price: servicePrice,
            service_vat_rate: service?.vat_rate ?? 0,
            service_irpf_rate: service?.irpf_rate ?? 0,
            service_retention_rate: service?.retention_rate ?? 0,
            status: participant.status,
            type: "group_activity",
            activity_name: activity.name,
          })

          clientData.total_amount += servicePrice
        })
      })

      const clientsArray = Array.from(clientsMap.values())
      setClientsData(clientsArray)

      // Verificar facturas existentes ANTES de seleccionar
      const clientIds = clientsArray.map((client) => client.client_id)
      await checkExistingInvoices(clientIds, dateStr, clientsArray)
    } catch (error) {
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
    const clientData = clientsData.find((c) => c.client_id === clientId)

    // Permitir selección si hay citas sin facturar
    if (clientData && clientData.invoiceable_appointments === 0) {
      return // No permitir si no hay citas facturables
    }

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
      .filter((client) => client.has_complete_data && client.invoiceable_appointments > 0)
      .map((client) => client.client_id)
    setSelectedClients(new Set(validClientIds))
  }

  const handleDeselectAll = () => {
    setSelectedClients(new Set())
  }

  const generateInvoices = async () => {
    if (selectedClients.size === 0) return

    setGenerating(true)
    setGeneratedInvoices([])

    const selectedClientsArray = Array.from(selectedClients)

    setProgress({
      phase: "validating",
      current: 0,
      total: selectedClientsArray.length,
      message: "🔍 Validando datos de clientes y preparando el proceso...",
      errors: [],
    })

    try {
      const { generateUniqueInvoiceNumber } = await import("@/lib/invoice-utils")
      const { generatePdf } = await import("@/lib/pdf-generator")
      const { savePdfToStorage } = await import("@/lib/storage-utils")

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userProfile!.organization_id)
        .single()

      if (orgError || !orgData) {
        throw new Error("No se pudieron obtener los datos de la organización")
      }

      setProgress((prev) => ({
        ...prev!,
        phase: "generating",
        message: "⚡ Iniciando generación de facturas...",
      }))

      const errors: string[] = []
      let successCount = 0
      const invoicesForZip: GeneratedInvoice[] = []

      // Filtrar clientes ya facturados antes de generar
      const validSelectedClients = Array.from(selectedClients).filter((clientId) => {
        const isAlreadyInvoiced = existingInvoices.has(clientId)
        if (isAlreadyInvoiced) {
          console.warn(`Cliente ${clientId} ya tiene factura, se omite`)
        }
        return !isAlreadyInvoiced
      })

      if (validSelectedClients.length === 0) {
        toast({
          title: "⚠️ Sin clientes válidos",
          description: "Todos los clientes seleccionados ya han sido facturados",
          variant: "destructive",
        })
        return
      }

      for (let i = 0; i < validSelectedClients.length; i++) {
        const clientId = validSelectedClients[i]
        const clientData = clientsData.find((c) => c.client_id === clientId)!

        setProgress((prev) => ({
          ...prev!,
          current: i + 1,
          message: `📄 Generando factura ${i + 1} de ${validSelectedClients.length}`,
          currentClient: clientData.client_name,
        }))

        try {
          const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(
            userProfile!.organization_id,
            "normal",
          )

          // Obtener método de pago específico del cliente
          const clientPaymentInfo = clientPaymentMethods.get(clientId) || { method: "tarjeta" }
          const paymentMethod = clientPaymentInfo.method
          const paymentMethodOther = clientPaymentInfo.other

          // Validar método de pago específico del cliente
          if (paymentMethod === "otro" && !paymentMethodOther?.trim()) {
            errors.push(`${clientData.client_name}: Método de pago 'Otro' sin especificar`)
            continue
          }

          // En la función generateInvoices, filtrar solo las citas no facturadas
          const invoiceLines = clientData.appointments
            .filter((apt) => !apt.is_invoiced) // Solo citas no facturadas
            .map((apt) => ({
              id: crypto.randomUUID(),
              description:
                apt.type === "group_activity"
                  ? `Actividad Grupal: ${apt.activity_name} - ${apt.professional_name} (${apt.start_time}-${apt.end_time})`
                  : `${apt.service_name || "Servicio médico"} - ${apt.professional_name} (${apt.start_time}-${apt.end_time})`,
              quantity: 1,
              unit_price: apt.service_price || 50,
              discount_percentage: 0,
              vat_rate: apt.service_vat_rate ?? 0,
              irpf_rate: apt.service_irpf_rate ?? 0,
              retention_rate: apt.service_retention_rate ?? 0,
              line_amount: apt.service_price || 50,
              professional_id: null,
            }))

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

          const clientInfoText = `Cliente: ${clientData.client_name}, CIF/NIF: ${clientData.client_tax_id}, Dirección: ${clientData.client_address}, ${clientData.client_postal_code} ${clientData.client_city}, ${clientData.client_province}`

          const additionalNotes = `Factura generada automáticamente para citas del ${format(selectedDate, "dd/MM/yyyy", { locale: es })} `

          const fullNotes = clientInfoText + "\n\n" + additionalNotes

          // Incluir método de pago específico del cliente en la inserción
          const { data: invoiceData, error: invoiceError } = await supabase
            .from("invoices")
            .insert({
              organization_id: userProfile!.organization_id,
              invoice_number: invoiceNumberFormatted,
              client_id: clientId,
              appointment_id: clientData.appointments[0]?.type === "appointment" ? clientData.appointments[0].id : null,
              group_activity_id:
                clientData.appointments[0]?.type === "group_activity"
                  ? clientData.appointments[0].id.split("_")[1]
                  : null,
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
              payment_method: paymentMethod, // Método específico del cliente
              payment_method_other: paymentMethod === "otro" ? paymentMethodOther : null, // Método específico del cliente
              created_by: userProfile!.id,
            })
            .select()
            .single()

          if (invoiceError) throw invoiceError

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

          const { error: updateOrgError } = await supabase
            .from("organizations")
            .update({ last_invoice_number: newInvoiceNumber })
            .eq("id", userProfile!.organization_id)

          if (updateOrgError) {
            console.error("Error updating organization:", updateOrgError)
          }

          setProgress((prev) => ({
            ...prev!,
            phase: "creating_pdfs",
            message: `📄 Generando PDF para ${clientData.client_name}...`,
            currentClient: clientData.client_name,
          }))

          try {
            // Incluir método de pago específico del cliente en el objeto de factura para PDF
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
              payment_method: paymentMethod, // Método específico del cliente
              payment_method_other: paymentMethod === "otro" ? paymentMethodOther : null, // Método específico del cliente
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

            const pdfBlob = await generatePdf(newInvoice, invoiceLines, `factura-${invoiceNumberFormatted}.pdf`, false)

            if (pdfBlob && pdfBlob instanceof Blob) {
              invoicesForZip.push({
                invoiceNumber: invoiceNumberFormatted,
                clientName: clientData.client_name,
                amount: totalAmount,
                pdfBlob: pdfBlob,
                invoiceId: invoiceData.id,
              })

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

          // ✅ AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL:
          // Actualizar TODAS las citas del cliente como facturadas
          setClientsData((prevClients) =>
            prevClients.map((client) => {
              if (client.client_id === clientId) {
                return {
                  ...client,
                  appointments: client.appointments.map((apt) => ({
                    ...apt,
                    is_invoiced: true, // Marcar TODAS las citas como facturadas
                    invoice_info: {
                      invoice_number: invoiceNumberFormatted,
                      created_at: invoiceData.created_at,
                      id: invoiceData.id,
                    },
                  })),
                  invoiceable_appointments: 0, // Ya no hay citas facturables
                  invoiced_appointments: client.appointments.length, // Todas están facturadas
                  total_amount: 0, // El total ahora es 0 porque todas están facturadas
                }
              }
              return client
            }),
          )

          // Actualización optimista inmediata
          setExistingInvoices((prev) =>
            new Map(prev).set(clientId, {
              invoice_number: invoiceNumberFormatted,
              created_at: invoiceData.created_at,
              id: invoiceData.id,
            }),
          )

          // Remover de seleccionados
          setSelectedClients((prev) => {
            const newSet = new Set(prev)
            newSet.delete(clientId)
            return newSet
          })
        } catch (error) {
          console.error(`Error generating invoice for client ${clientData.client_name}:`, error)
          errors.push(`${clientData.client_name}: ${error instanceof Error ? error.message : "Error desconocido"}`)
        }

        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      if (invoicesForZip.length > 0) {
        setProgress((prev) => ({
          ...prev!,
          phase: "creating_zip",
          message: "📦 Empaquetando facturas en archivo ZIP...",
          zipProgress: 0,
        }))

        const zip = new JSZip()

        for (let i = 0; i < invoicesForZip.length; i++) {
          const invoice = invoicesForZip[i]

          setProgress((prev) => ({
            ...prev!,
            zipProgress: ((i + 1) / invoicesForZip.length) * 100,
            message: `📦 Añadiendo ${invoice.invoiceNumber} al ZIP... (${i + 1}/${invoicesForZip.length})`,
          }))

          const cleanClientName = invoice.clientName
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_")
            .substring(0, 30)

          const fileName = `${invoice.invoiceNumber}_${cleanClientName}.pdf`
          zip.file(fileName, invoice.pdfBlob)

          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        setProgress((prev) => ({
          ...prev!,
          message: "🗜️ Comprimiendo archivo ZIP...",
          zipProgress: 95,
        }))

        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 6 },
        })

        setProgress((prev) => ({
          ...prev!,
          message: "💾 ZIP listo para descarga...",
          zipProgress: 100,
        }))

        setGeneratedInvoices(invoicesForZip)
      }

      // Re-consulta final para confirmar
      await checkExistingInvoices(
        clientsData.map((c) => c.client_id),
        format(selectedDate, "yyyy-MM-dd"),
        clientsData,
      )

      setProgress({
        phase: "completed",
        current: validSelectedClients.length,
        total: validSelectedClients.length,
        message: `🎉 ¡Proceso completado exitosamente! ${successCount} facturas generadas. Usa el botón "Descargar ZIP" para obtener el archivo.`,
        errors,
      })

      if (successCount > 0) {
        toast({
          title: "🎉 Facturas generadas",
          description: `Se generaron ${successCount} facturas correctamente. Usa el botón para descargar el ZIP`,
        })
      }

      if (errors.length > 0) {
        toast({
          title: "⚠️ Algunos errores encontrados",
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
        message: "❌ Error en el proceso de facturación",
        errors: [error instanceof Error ? error.message : "Error desconocido"],
      })
    } finally {
      setGenerating(false)
    }
  }

  const downloadZipAgain = async () => {
    if (generatedInvoices.length === 0) return

    try {
      const zip = new JSZip()

      generatedInvoices.forEach((invoice) => {
        const cleanClientName = invoice.clientName
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\s+/g, "")
          .replace(/\s+/g, "_")
          .substring(0, 30)

        const fileName = `${invoice.invoiceNumber}_${cleanClientName}.pdf`
        zip.file(fileName, invoice.pdfBlob)
      })

      const zipBlob = await zip.generateAsync({ type: "blob" })

      const dateStr = format(selectedDate, "yyyy-MM-dd")
      const zipFileName = `facturas_${dateStr}_${generatedInvoices.length}_facturas.zip`

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = zipFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "📦 ZIP descargado",
        description: `Se descargó nuevamente el archivo con ${generatedInvoices.length} facturas`,
      })
    } catch (error) {
      console.error("Error downloading ZIP:", error)
      toast({
        title: "❌ Error",
        description: "No se pudo descargar el archivo ZIP",
        variant: "destructive",
      })
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

  const checkExistingInvoices = async (clientIds: number[], dateStr: string, clientsArray: ClientAppointmentData[]) => {
    if (!userProfile?.organization_id || clientIds.length === 0) return

    try {
      // Nueva lógica: Verificar cada cita/actividad específicamente
      for (const client of clientsArray) {
        for (const appointment of client.appointments) {
          let query = supabase
            .from("invoices")
            .select("id, invoice_number, created_at")
            .eq("organization_id", userProfile.organization_id)

          if (appointment.type === "appointment") {
            query = query.eq("appointment_id", appointment.id)
          } else if (appointment.type === "group_activity") {
            const activityId = appointment.id.split("_")[1] // Extraer el ID de la actividad
            query = query.eq("group_activity_id", activityId).eq("client_id", client.client_id)
          }

          const { data, error } = await query.limit(1)

          if (error) throw error

          if (data && data.length > 0) {
            // Marcar esta cita específica como facturada
            appointment.is_invoiced = true
            appointment.invoice_info = {
              invoice_number: data[0].invoice_number,
              created_at: data[0].created_at,
              id: data[0].id,
            }
          } else {
            appointment.is_invoiced = false
          }
        }

        // Recalcular totales solo con citas no facturadas
        const nonInvoicedAppointments = client.appointments.filter((apt) => !apt.is_invoiced)
        client.total_amount = nonInvoicedAppointments.reduce((sum, apt) => sum + (apt.service_price || 50), 0)
        client.invoiceable_appointments = nonInvoicedAppointments.length
        client.invoiced_appointments = client.appointments.length - nonInvoicedAppointments.length
      }

      // Seleccionar automáticamente solo clientes que tengan citas sin facturar
      const clientsToSelect = clientsArray
        .filter((client) => client.has_complete_data && client.invoiceable_appointments > 0)
        .map((client) => client.client_id)

      setSelectedClients(new Set(clientsToSelect))

      // Actualizar el mapa de facturas existentes (para compatibilidad con UI)
      const invoicesMap = new Map()
      clientsArray.forEach((client) => {
        // Solo marcar como "completamente facturado" si TODAS las citas están facturadas
        if (client.invoiced_appointments > 0 && client.invoiceable_appointments === 0) {
          const firstInvoice = client.appointments.find((apt) => apt.invoice_info)?.invoice_info
          if (firstInvoice) {
            invoicesMap.set(client.client_id, firstInvoice)
          }
        }
      })

      setExistingInvoices(invoicesMap)
    } catch (error) {
      console.error("Error checking existing invoices:", error)
    }
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
                  {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })} - Citas individuales +
                  Actividades grupales
                </p>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay citas ni actividades grupales</h3>
              <p className="text-gray-600">No se encontraron citas ni actividades grupales para este día.</p>
            </div>
          ) : (
            <>
              {progress && <EnhancedProgressBar progress={progress} />}

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
                        <p className="text-sm text-gray-600">Total Citas/Actividades</p>
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
                  <CardTitle className="text-sm font-medium">Estados de las citas y actividades</CardTitle>
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
                  Seleccionar Válidos (
                  {filteredClientsData.filter((c) => c.has_complete_data && c.invoiceable_appointments > 0).length})
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
                      existingInvoices.has(client.client_id)
                        ? "border-yellow-200 bg-yellow-50 opacity-75"
                        : !client.has_complete_data
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
                          disabled={!client.has_complete_data || generating || client.invoiceable_appointments === 0}
                          className="mt-1"
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Link href={`/dashboard/clients/${client.client_id}`}>
                              <h3 className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer transition-colors duration-200">
                                {client.client_name}
                              </h3>
                            </Link>
                            <Link href={`/dashboard/clients/${client.client_id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Ver/editar datos del cliente"
                              >
                                <User className="h-3 w-3" />
                              </Button>
                            </Link>

                            {/* Mostrar aviso de factura existente PRIMERO */}
                            {existingInvoices.has(client.client_id) ? (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Ya facturado
                              </Badge>
                            ) : client.has_complete_data ? (
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

                          {/* Mostrar información de facturación más detallada */}
                          {client.invoiced_appointments > 0 && (
                            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                              <div className="flex items-center gap-1 mb-1">
                                <AlertTriangle className="h-3 w-3" />
                                <strong>Facturación parcial:</strong>
                              </div>
                              <p>
                                {client.invoiced_appointments} de {client.appointments.length} citas ya facturadas
                                <br />
                                <span className="text-xs text-yellow-600">
                                  {client.invoiceable_appointments} citas pendientes de facturar
                                </span>
                              </p>
                            </div>
                          )}

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
                                <strong>Citas/Actividades:</strong> {client.appointments.length}
                              </p>
                            </div>
                          </div>

                          {/* Selector de método de pago por cliente */}
                          {client.has_complete_data && client.invoiceable_appointments > 0 && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                              <div className="flex items-center gap-2 mb-2">
                                <CreditCard className="h-4 w-4 text-blue-600" />
                                <Label className="text-sm font-medium text-blue-900">Método de Pago</Label>
                              </div>
                              <div className="space-y-2">
                                <Select
                                  value={clientPaymentMethods.get(client.client_id)?.method || "tarjeta"}
                                  onValueChange={(value) => handlePaymentMethodChange(client.client_id, value)}
                                  disabled={generating}
                                >
                                  <SelectTrigger className="w-full bg-white">
                                    <SelectValue placeholder="Método de pago" />
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
                                {clientPaymentMethods.get(client.client_id)?.method === "otro" && (
                                  <Input
                                    placeholder="Especificar método"
                                    value={clientPaymentMethods.get(client.client_id)?.other || ""}
                                    onChange={(e) =>
                                      handlePaymentMethodChange(client.client_id, "otro", e.target.value)
                                    }
                                    className="text-sm bg-white"
                                    disabled={generating}
                                  />
                                )}
                              </div>
                            </div>
                          )}

                          {/* Mostrar detalles de cada cita con su estado de facturación */}
                          <div className="space-y-2 mb-3">
                            {client.appointments.map((apt, index) => (
                              <div
                                key={apt.id}
                                className={`flex items-center justify-between text-sm p-2 rounded ${
                                  apt.is_invoiced ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">
                                    {apt.start_time}-{apt.end_time}
                                  </span>
                                  <span>({apt.professional_name})</span>
                                  {apt.type === "group_activity" && (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                                      Actividad Grupal
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      STATUS_COLORS[apt.status as keyof typeof STATUS_COLORS] ||
                                      "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {STATUS_LABELS[apt.status as keyof typeof STATUS_LABELS] || apt.status}
                                  </Badge>
                                  {/* Mostrar estado de facturación por cita */}
                                  {apt.is_invoiced && (
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                                      Facturada #{apt.invoice_info?.invoice_number}
                                    </Badge>
                                  )}
                                </div>
                                <span
                                  className={`font-medium ${apt.is_invoiced ? "text-yellow-600 line-through" : ""}`}
                                >
                                  {formatCurrency(apt.service_price || 50)}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              {client.appointments.length} cita{client.appointments.length !== 1 ? "s" : ""}/actividad
                              {client.appointments.length !== 1 ? "es" : ""}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-lg">
                                {formatCurrency(client.total_amount)}
                                {client.invoiced_appointments > 0 && (
                                  <span className="text-xs text-gray-500 block">(Solo citas pendientes)</span>
                                )}
                              </div>
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
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedClients.size} cliente{selectedClients.size !== 1 ? "s" : ""} seleccionado
              {selectedClients.size !== 1 ? "s" : ""} • Total: {formatCurrency(getTotalSelected())}
            </div>
            <div className="flex gap-2">
              {generatedInvoices.length > 0 && (
                <Button onClick={downloadZipAgain} variant="outline" className="bg-green-50 border-green-200">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar ZIP ({generatedInvoices.length})
                </Button>
              )}
              <Button
                onClick={generateInvoices}
                disabled={selectedClients.size === 0 || generating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generating ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generar Facturas ({selectedClients.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
