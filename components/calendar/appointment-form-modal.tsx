"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Phone, User, CheckCircle, AlertTriangle, MapPin, Info, Briefcase, Search } from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { useConsultations } from "@/hooks/use-consultations"
import { useAuth } from "@/app/contexts/auth-context"
import { normalizePhoneNumber, formatPhoneNumber, isValidPhoneNumber } from "@/utils/phone-utils"
import { supabase } from "@/lib/supabase/client"
import type { Cita, EstadoCita } from "@/types/calendar"

interface AppointmentFormModalProps {
  fecha: Date
  hora: string
  profesionalId?: number
  position?: { x: number; y: number }
  citaExistente?: Cita
  onClose: () => void
  onSubmit: (cita: Partial<Cita>) => void
}

interface Service {
  id: number
  name: string
  description?: string
  price: number
  duration: number
  color: string
  category?: string
  active: boolean
  organization_id: number
}

interface SupabaseUser {
  id: string
  name: string | null
  email: string
  role: string
  organization_id: number
  type: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

interface ClientMatch {
  id: number
  name: string
  phone: string
  matchType: "phone" | "name"
}

const estadosCita = [
  { value: "confirmada", label: "Aprobada" },
  { value: "pendiente", label: "Pendiente" },
  { value: "cancelada", label: "Cancelada" },
]

export function AppointmentFormModal({
  fecha,
  hora,
  profesionalId,
  position,
  citaExistente,
  onClose,
  onSubmit,
}: AppointmentFormModalProps) {
  const { userProfile } = useAuth()
  const organizationId = userProfile?.organization_id ? Number(userProfile.organization_id) : undefined
  const { clients } = useClients(organizationId)
  const { users } = useUsers(organizationId)
  const { consultations, loading: consultationsLoading, getAvailableConsultations } = useConsultations(organizationId)

  // Estados para servicios
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [filteredUsers, setFilteredUsers] = useState<SupabaseUser[]>([])
  const [loadingFilteredUsers, setLoadingFilteredUsers] = useState(false)

  // Estados para búsqueda mejorada de clientes
  const [searchTerm, setSearchTerm] = useState("")
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [searchingClients, setSearchingClients] = useState(false)

  // Refs para evitar llamadas múltiples
  const isCheckingRef = useRef(false)
  const lastCheckParamsRef = useRef<string>("")
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Función para calcular hora fin - memoizada para evitar re-creaciones
  const calcularHoraFin = useCallback((horaInicio: string, duracion: number) => {
    const [horas, minutos] = horaInicio.split(":").map(Number)
    const totalMinutos = horas * 60 + minutos + duracion
    const nuevasHoras = Math.floor(totalMinutos / 60)
    const nuevosMinutos = totalMinutos % 60
    return `${nuevasHoras.toString().padStart(2, "0")}:${nuevosMinutos.toString().padStart(2, "0")}`
  }, [])

  const [formData, setFormData] = useState({
    telefonoPaciente: citaExistente?.telefonoPaciente || "",
    nombrePaciente: citaExistente?.nombrePaciente || "",
    apellidosPaciente: citaExistente?.apellidosPaciente || "",
    hora: citaExistente?.hora || hora,
    duracion: citaExistente?.duracion || 45,
    notas: citaExistente?.notas || "",
    profesionalId: citaExistente?.profesionalId || profesionalId || 1,
    estado: citaExistente?.estado || ("pendiente" as EstadoCita),
    consultationId:
      citaExistente?.consultationId && citaExistente.consultationId !== "" ? citaExistente.consultationId : "none",
    service_id: citaExistente?.service_id || "",
  })

  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [telefonoValidado, setTelefonoValidado] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [telefonoFormateado, setTelefonoFormateado] = useState("")
  const [availableConsultations, setAvailableConsultations] = useState(consultations)
  const [checkingConsultations, setCheckingConsultations] = useState(false)

  // Inicializar el campo de búsqueda con los datos existentes
  useEffect(() => {
    if (citaExistente) {
      const searchValue =
        citaExistente.telefonoPaciente ||
        `${citaExistente.nombrePaciente} ${citaExistente.apellidosPaciente || ""}`.trim()
      setSearchTerm(searchValue)
    }
  }, [citaExistente])

  // Función mejorada para buscar clientes - optimizada para números
  const searchClients = useCallback(
    async (term: string) => {
      if (!term || term.length < 1) {
        setClientMatches([])
        setShowMatches(false)
        return
      }

      // Limpiar timeout anterior
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      setSearchingClients(true)

      try {
        const matches: ClientMatch[] = []
        const termLower = term.toLowerCase().trim()

        // Buscar por teléfono SOLO si tiene 3 o más dígitos consecutivos
        const phoneDigits = term.replace(/\D/g, "") // Extraer solo dígitos
        if (phoneDigits.length >= 3) {
          const { data: phoneMatches, error: phoneError } = await supabase
            .from("clients")
            .select("id, name, phone")
            .eq("organization_id", organizationId)
            .ilike("phone", `%${phoneDigits}%`)
            .limit(10)

          if (!phoneError && phoneMatches) {
            phoneMatches.forEach((client) => {
              matches.push({
                id: client.id,
                name: client.name,
                phone: client.phone || "",
                matchType: "phone",
              })
            })
          }
        }

        // Buscar por nombre solo si no es un número puro
        if (!/^\d+$/.test(term)) {
          const { data: nameMatches, error: nameError } = await supabase
            .from("clients")
            .select("id, name, phone")
            .eq("organization_id", organizationId)
            .ilike("name", `%${termLower}%`)
            .limit(10)

          if (!nameError && nameMatches) {
            nameMatches.forEach((client) => {
              // Evitar duplicados si ya se encontró por teléfono
              if (!matches.find((m) => m.id === client.id)) {
                matches.push({
                  id: client.id,
                  name: client.name,
                  phone: client.phone || "",
                  matchType: "name",
                })
              }
            })
          }
        }

        setClientMatches(matches)
        setShowMatches(matches.length > 0)
      } catch (error) {
        console.error("Error searching clients:", error)
        setClientMatches([])
        setShowMatches(false)
      } finally {
        setSearchingClients(false)
      }
    },
    [organizationId],
  )

  // Función para seleccionar un cliente de las coincidencias
  const selectClient = useCallback((client: ClientMatch) => {
    setClienteEncontrado(client)
    setTelefonoValidado(true)
    setShowMatches(false)

    const nombreCompleto = client.name.split(" ")
    const nombre = nombreCompleto[0] || ""
    const apellidos = nombreCompleto.slice(1).join(" ") || ""

    setFormData((prev) => ({
      ...prev,
      telefonoPaciente: client.phone || "",
      nombrePaciente: nombre,
      apellidosPaciente: apellidos,
    }))

    setSearchTerm(`${client.name} - ${client.phone}`)
    setTelefonoFormateado(formatPhoneNumber(client.phone || ""))
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchTerm(value)

      // Resetear estado
      setClienteEncontrado(null)
      setTelefonoValidado(false)
      setTelefonoFormateado("")

      // Limpiar timeout anterior
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Buscar con debounce
      searchTimeoutRef.current = setTimeout(() => {
        searchClients(value)
      }, 300)
    },
    [searchClients],
  )

  const handleSearchBlur = useCallback(() => {
    // Si no hay cliente seleccionado pero hay texto, intentar extraer datos
    if (!clienteEncontrado && searchTerm) {
      const phoneDigits = searchTerm.replace(/\D/g, "")

      // Si tiene 3 o más dígitos, tratarlo como teléfono
      if (phoneDigits.length >= 3) {
        setFormData((prev) => ({ ...prev, telefonoPaciente: phoneDigits }))
        setTelefonoValidado(true)
        setTelefonoFormateado(formatPhoneNumber(phoneDigits))
      } else {
        // Si parece un nombre, extraer nombre y apellidos
        const parts = searchTerm.trim().split(" ")
        const nombre = parts[0] || ""
        const apellidos = parts.slice(1).join(" ") || ""
        setFormData((prev) => ({
          ...prev,
          nombrePaciente: nombre,
          apellidosPaciente: apellidos,
          telefonoPaciente: "",
        }))
      }
    }

    // Ocultar coincidencias después de un delay
    setTimeout(() => setShowMatches(false), 200)
  }, [clienteEncontrado, searchTerm])

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Inicializar filteredUsers con users al cargar
  useEffect(() => {
    const convertedUsers: SupabaseUser[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      type: 1,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }))
    setFilteredUsers(convertedUsers)
  }, [users])

  // Cargar servicios al montar el componente
  useEffect(() => {
    const fetchServices = async () => {
      if (!organizationId) return

      setLoadingServices(true)
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("active", true)
          .order("name")

        if (error) throw error
        setServices(data || [])
      } catch (error) {
        console.error("Error al cargar servicios:", error)
      } finally {
        setLoadingServices(false)
      }
    }

    fetchServices()
  }, [organizationId])

  // Filtrar usuarios según el servicio seleccionado
  useEffect(() => {
    const filterUsersByService = async () => {
      if (!formData.service_id || !organizationId) {
        const convertedUsers: SupabaseUser[] = users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id,
          type: 1,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
        }))
        setFilteredUsers(convertedUsers)
        return
      }

      setLoadingFilteredUsers(true)
      try {
        const { data, error } = await supabase
          .from("user_services")
          .select(`
            user_id,
            users!inner (
              id,
              name,
              email,
              role,
              organization_id,
              type
            )
          `)
          .eq("service_id", formData.service_id)

        if (error) throw error

        const serviceUsers: SupabaseUser[] = []
        if (data) {
          for (const item of data) {
            if (item.users && typeof item.users === "object" && !Array.isArray(item.users)) {
              const user = item.users as any
              if (user.organization_id === organizationId && user.type === 1) {
                serviceUsers.push({
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  organization_id: user.organization_id,
                  type: user.type,
                })
              }
            }
          }
        }

        setFilteredUsers(serviceUsers)

        if (
          formData.profesionalId &&
          !serviceUsers.find((user) => Number.parseInt(user.id.slice(-8), 16) === formData.profesionalId)
        ) {
          setFormData((prev) => ({ ...prev, profesionalId: 0 }))
        }
      } catch (error) {
        console.error("Error al filtrar usuarios por servicio:", error)
        const convertedUsers: SupabaseUser[] = users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id,
          type: 1,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
        }))
        setFilteredUsers(convertedUsers)
      } finally {
        setLoadingFilteredUsers(false)
      }
    }

    filterUsersByService()
  }, [formData.service_id, users, organizationId, formData.profesionalId])

  // Inicializar consultas disponibles
  useEffect(() => {
    setAvailableConsultations(consultations)
  }, [consultations])

  // Función optimizada para verificar consultas disponibles
  const checkAvailableConsultations = useCallback(
    async (hora: string, duracion: number) => {
      if (!hora || !duracion || !organizationId || consultations.length === 0) {
        return
      }

      const checkParams = `${hora}-${duracion}-${fecha.toISOString().split("T")[0]}`

      if (isCheckingRef.current || lastCheckParamsRef.current === checkParams) {
        return
      }

      isCheckingRef.current = true
      lastCheckParamsRef.current = checkParams
      setCheckingConsultations(true)

      try {
        const endTime = calcularHoraFin(hora, duracion)
        const dateString = fecha.toISOString().split("T")[0]
        const available = await getAvailableConsultations(dateString, hora, endTime, citaExistente?.id?.toString())
        setAvailableConsultations(available)

        if (
          formData.consultationId &&
          formData.consultationId !== "none" &&
          !available.find((c) => c.id === formData.consultationId)
        ) {
          setFormData((prev) => ({ ...prev, consultationId: "none" }))
        }
      } catch (error) {
        console.error("Error al verificar disponibilidad de consultas")
        setAvailableConsultations(consultations)
      } finally {
        setCheckingConsultations(false)
        isCheckingRef.current = false
      }
    },
    [
      organizationId,
      consultations,
      calcularHoraFin,
      getAvailableConsultations,
      fecha,
      citaExistente?.id,
      formData.consultationId,
    ],
  )

  // Verificar consultas con debounce
  useEffect(() => {
    if (!organizationId || consultations.length === 0) {
      return
    }

    const shouldCheck =
      formData.consultationId !== "none" || (citaExistente?.consultationId && citaExistente.consultationId !== "")

    if (!shouldCheck) {
      setAvailableConsultations(consultations)
      setCheckingConsultations(false)
      return
    }

    const timeoutId = setTimeout(() => {
      checkAvailableConsultations(formData.hora, formData.duracion)
    }, 800)

    return () => clearTimeout(timeoutId)
  }, [
    formData.hora,
    formData.duracion,
    formData.consultationId,
    organizationId,
    consultations,
    checkAvailableConsultations,
    citaExistente?.consultationId,
  ])

  // Manejar cambios de hora y duración
  const handleHoraChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaHora = e.target.value
    setFormData((prev) => ({ ...prev, hora: nuevaHora }))
    lastCheckParamsRef.current = ""
  }, [])

  const handleDuracionChange = useCallback((value: string) => {
    const nuevaDuracion = Number.parseInt(value)
    setFormData((prev) => ({ ...prev, duracion: nuevaDuracion }))
    lastCheckParamsRef.current = ""
  }, [])

  // Manejar cambio de servicio
  const handleServiceChange = useCallback(
    (value: string) => {
      if (value === "none") {
        setFormData((prev) => ({
          ...prev,
          service_id: "",
        }))
        return
      }

      const selectedService = services.find((s) => s.id.toString() === value)
      setFormData((prev) => ({
        ...prev,
        service_id: value,
        duracion: selectedService ? selectedService.duration : prev.duracion,
      }))
    },
    [services],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      // Validaciones
      const newErrors: { [key: string]: string } = {}

      if (!formData.telefonoPaciente.trim()) {
        newErrors.telefono = "El teléfono es obligatorio"
      } else if (!isValidPhoneNumber(formData.telefonoPaciente)) {
        newErrors.telefono = "Formato de teléfono inválido"
      }

      if (!formData.nombrePaciente.trim()) {
        newErrors.nombre = "El nombre es obligatorio"
      }

      if (!clienteEncontrado && !formData.telefonoPaciente.trim()) {
        newErrors.telefono = "Debes proporcionar un teléfono válido"
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      const nuevaCita: Partial<Cita> = {
        ...formData,
        telefonoPaciente: normalizePhoneNumber(formData.telefonoPaciente),
        fecha,
        horaFin: calcularHoraFin(formData.hora, formData.duracion),
        horaInicio: formData.hora,
        id: citaExistente?.id || Date.now(),
        estado: formData.estado,
        consultationId:
          formData.consultationId === "none" || !formData.consultationId ? undefined : formData.consultationId,
      }

      onSubmit(nuevaCita)
      onClose()
    },
    [formData, clienteEncontrado, calcularHoraFin, fecha, citaExistente?.id, onSubmit, onClose],
  )

  // Mostrar mensaje si no hay organizationId
  if (!organizationId) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p>No se pudo obtener la información de la organización.</p>
            <Button onClick={onClose} className="mt-4">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[95vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {citaExistente ? "Editar Cita" : "Nueva Cita"}
            {clienteEncontrado && <CheckCircle className="h-4 w-4 text-green-600" />}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-1">
          {/* Campo de búsqueda mejorado */}
          <div className="space-y-2">
            <Label htmlFor="searchTerm" className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4" />
              Buscar paciente *
            </Label>
            <div className="relative">
              <Input
                id="searchTerm"
                value={searchTerm}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                onFocus={() => searchTerm && searchClients(searchTerm)}
                placeholder="Buscar por teléfono (3+ dígitos), nombre o apellido..."
                required
                className={`w-full ${errors.telefono ? "border-red-500" : ""} ${clienteEncontrado ? "border-green-500" : ""}`}
              />
              {searchingClients && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
              {clienteEncontrado && !searchingClients && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
            </div>

            {/* Lista de coincidencias */}
            {showMatches && clientMatches.length > 0 && (
              <div className="relative z-50">
                <div className="absolute top-0 left-0 right-0 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {clientMatches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0 flex items-center gap-2"
                      onClick={() => selectClient(match)}
                    >
                      {match.matchType === "phone" ? (
                        <Phone className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <User className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{match.name}</div>
                        <div className="text-sm text-gray-500 truncate">{match.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errors.telefono && <p className="text-sm text-red-600">{errors.telefono}</p>}
            {telefonoFormateado && <p className="text-sm text-gray-600">Formato: {telefonoFormateado}</p>}
          </div>

          {/* Información del cliente encontrado */}
          {clienteEncontrado && (
            <Alert className="border-green-200 bg-green-50">
              <User className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                <strong>Cliente existente:</strong> {clienteEncontrado.name}
                <br />
                <span className="text-sm">Teléfono registrado: {clienteEncontrado.phone}</span>
                <br />
                <span className="text-sm">Los datos se han completado automáticamente</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Advertencia si es cliente nuevo */}
          {!clienteEncontrado && searchTerm && !searchingClients && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <strong>Cliente nuevo</strong>
                <br />
                <span className="text-sm">Se creará un nuevo cliente con estos datos.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Datos del paciente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombrePaciente" className="text-sm font-medium">
                Nombre *
              </Label>
              <Input
                id="nombrePaciente"
                value={formData.nombrePaciente}
                onChange={(e) => setFormData({ ...formData, nombrePaciente: e.target.value })}
                required
                className={`w-full ${errors.nombre ? "border-red-500" : ""}`}
                placeholder="Nombre del paciente"
              />
              {errors.nombre && <p className="text-sm text-red-600">{errors.nombre}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellidosPaciente" className="text-sm font-medium">
                Apellidos
              </Label>
              <Input
                id="apellidosPaciente"
                value={formData.apellidosPaciente}
                onChange={(e) => setFormData({ ...formData, apellidosPaciente: e.target.value })}
                placeholder="Apellidos del paciente"
                className="w-full"
              />
            </div>
          </div>

          {/* Campo de teléfono separado */}
          <div className="space-y-2">
            <Label htmlFor="telefonoPaciente" className="flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4" />
              Teléfono del paciente *
            </Label>
            <Input
              id="telefonoPaciente"
              value={formData.telefonoPaciente}
              onChange={(e) => setFormData({ ...formData, telefonoPaciente: e.target.value })}
              placeholder="Ej: +34 612 345 678 o 612345678"
              required
              className={`w-full ${errors.telefono ? "border-red-500" : ""}`}
            />
          </div>

          {/* Servicio */}
          <div className="space-y-2">
            <Label htmlFor="service" className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4" />
              Servicio (opcional)
              {loadingServices && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            <Select value={formData.service_id} onValueChange={handleServiceChange} disabled={loadingServices}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingServices ? "Cargando servicios..." : "Selecciona un servicio"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin servicio específico</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{service.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {service.duration}min • €{service.price}
                          {service.category && ` • ${service.category}`}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.service_id && (
              <p className="text-sm text-blue-600">Solo se mostrarán profesionales asignados a este servicio</p>
            )}
          </div>

          {/* Horario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hora" className="text-sm font-medium">
                Hora
              </Label>
              <Input
                id="hora"
                type="time"
                value={formData.hora}
                onChange={handleHoraChange}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duracion" className="text-sm font-medium">
                Duración (min)
              </Label>
              <Select value={formData.duracion.toString()} onValueChange={handleDuracionChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Consulta */}
          <div className="space-y-2">
            <Label htmlFor="consultation" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Consulta (opcional)
              {checkingConsultations && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            {consultations.length > 0 ? (
              <>
                <Select
                  value={formData.consultationId}
                  onValueChange={(value) => setFormData({ ...formData, consultationId: value })}
                  disabled={consultationsLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={consultationsLoading ? "Cargando consultas..." : "Sin consulta específica"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin consulta específica</SelectItem>
                    {availableConsultations.map((consultation) => (
                      <SelectItem key={consultation.id} value={consultation.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: consultation.color }}
                          />
                          <span className="truncate">{consultation.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!consultationsLoading && availableConsultations.length === 0 && consultations.length > 0 && (
                  <p className="text-sm text-amber-600">No hay consultas disponibles en este horario</p>
                )}
              </>
            ) : (
              <div className="p-3 bg-gray-50 rounded-md border-2 border-dashed border-gray-200">
                <p className="text-sm text-gray-600 text-center">No hay consultas configuradas en tu organización</p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Las citas se crearán sin asignar consulta específica
                </p>
              </div>
            )}
          </div>

          {/* Profesional */}
          <div className="space-y-2">
            <Label htmlFor="profesional" className="flex items-center gap-2 text-sm font-medium">
              Profesional
              {loadingFilteredUsers && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            <Select
              value={formData.profesionalId.toString()}
              onValueChange={(value) => setFormData({ ...formData, profesionalId: Number.parseInt(value) })}
              disabled={loadingFilteredUsers}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={loadingFilteredUsers ? "Filtrando profesionales..." : "Selecciona un profesional"}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={Number.parseInt(user.id.slice(-8), 16).toString()}>
                    <div className="flex items-center gap-2 w-full">
                      <span className="truncate">{user.name || user.email}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">({user.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.service_id && filteredUsers.length === 0 && !loadingFilteredUsers && (
              <p className="text-sm text-amber-600">No hay profesionales asignados a este servicio</p>
            )}
            {formData.service_id && filteredUsers.length > 0 && (
              <p className="text-sm text-blue-600">
                Mostrando {filteredUsers.length} profesional(es) asignado(s) al servicio
              </p>
            )}
            {!formData.service_id && (
              <p className="text-sm text-gray-500">Mostrando todos los profesionales disponibles</p>
            )}
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="estado" className="text-sm font-medium">
              Estado
            </Label>
            <Select
              value={formData.estado}
              onValueChange={(value: EstadoCita) => setFormData({ ...formData, estado: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {estadosCita.map((estado) => (
                  <SelectItem key={estado.value} value={estado.value}>
                    {estado.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas" className="text-sm font-medium">
              Notas
            </Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Notas adicionales..."
              rows={3}
              className="w-full resize-none"
            />
          </div>

          {/* Información adicional */}
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded">
            <p className="flex items-center gap-1">
              <Info className="h-3 w-3 flex-shrink-0" />
              <strong>Consejos:</strong>
            </p>
            <p>• Busca por teléfono (3+ dígitos), nombre o apellido para encontrar clientes existentes</p>
            <p>• Selecciona un servicio para filtrar profesionales específicos</p>
            <p>• Las consultas son opcionales - puedes crear citas sin asignar consulta</p>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={searchingClients || checkingConsultations || consultationsLoading}>
              {citaExistente ? "Actualizar" : "Crear"} Cita
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
