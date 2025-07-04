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
import { Loader2, Phone, User, CheckCircle, AlertTriangle, MapPin, Info, Briefcase } from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { useConsultations } from "@/hooks/use-consultations"
import { useAuth } from "@/app/contexts/auth-context"
import { normalizePhoneNumber, arePhoneNumbersEqual, formatPhoneNumber, isValidPhoneNumber } from "@/utils/phone-utils"
import { toast } from "sonner"
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

const tiposCita = ["Consulta", "Revisión", "Urgencia", "Seguimiento", "Cirugía menor", "Vacunación"]

const estadosCita = [
  { value: "confirmada", label: "Confirmada" },
  { value: "pendiente", label: "Pendiente" },
  { value: "cancelada", label: "Cancelada" },
  { value: "completada", label: "Completada" },
  { value: "no_show", label: "No se presentó" },
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

  // Refs para evitar llamadas múltiples
  const isCheckingRef = useRef(false)
  const lastCheckParamsRef = useRef<string>("")

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
    tipo: citaExistente?.tipo || "Consulta",
    notas: citaExistente?.notas || "",
    profesionalId: citaExistente?.profesionalId || profesionalId || 1,
    estado: citaExistente?.estado || ("pendiente" as EstadoCita),
    consultationId: citaExistente?.consultationId || "none",
    service_id: citaExistente?.service_id || "",
  })

  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [telefonoValidado, setTelefonoValidado] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [telefonoFormateado, setTelefonoFormateado] = useState("")
  const [availableConsultations, setAvailableConsultations] = useState(consultations)
  const [checkingConsultations, setCheckingConsultations] = useState(false)

  // Inicializar filteredUsers con users al cargar
  useEffect(() => {
    // Convertir users a SupabaseUser format
    const convertedUsers: SupabaseUser[] = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization_id: user.organization_id,
      type: 1, // Asumiendo que todos son tipo 1 (profesionales)
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
        toast.error("Error al cargar servicios")
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
        // Convertir users a SupabaseUser format
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

        // Procesar los datos correctamente
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

        // Si el profesional seleccionado no está en la lista filtrada, limpiar la selección
        if (
          formData.profesionalId &&
          !serviceUsers.find((user) => Number.parseInt(user.id.slice(-8), 16) === formData.profesionalId)
        ) {
          setFormData((prev) => ({ ...prev, profesionalId: 0 }))
          toast.info("El profesional seleccionado no está asignado a este servicio")
        }
      } catch (error) {
        console.error("Error al filtrar usuarios por servicio:", error)
        // En caso de error, usar todos los usuarios
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
        toast.error("Error al filtrar profesionales por servicio")
      } finally {
        setLoadingFilteredUsers(false)
      }
    }

    filterUsersByService()
  }, [formData.service_id, users, organizationId, formData.profesionalId])

  // Inicializar consultas disponibles - solo una vez cuando cambian las consultas
  useEffect(() => {
    setAvailableConsultations(consultations)
  }, [consultations])

  // Función optimizada para verificar consultas disponibles - solo se ejecuta cuando es necesario
  const checkAvailableConsultations = useCallback(
    async (hora: string, duracion: number) => {
      if (!hora || !duracion || !organizationId || consultations.length === 0) {
        return
      }

      // Crear una clave única para estos parámetros
      const checkParams = `${hora}-${duracion}-${fecha.toISOString().split("T")[0]}`

      // Si ya estamos verificando con los mismos parámetros, no hacer nada
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

        // Si la consulta seleccionada ya no está disponible, limpiar la selección
        if (
          formData.consultationId &&
          formData.consultationId !== "none" &&
          !available.find((c) => c.id === formData.consultationId)
        ) {
          setFormData((prev) => ({ ...prev, consultationId: "none" }))
          toast.warning("La consulta seleccionada ya no está disponible en este horario")
        }
      } catch (error) {
        toast.error("Error al verificar disponibilidad de consultas")
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

  // Verificar consultas solo cuando hay una consulta seleccionada - con debounce
  useEffect(() => {
    if (!organizationId || consultations.length === 0) {
      return
    }

    // Solo verificar si hay una consulta seleccionada o si estamos editando una cita con consulta
    const shouldCheck =
      formData.consultationId !== "none" || (citaExistente?.consultationId && citaExistente.consultationId !== "")

    if (!shouldCheck) {
      // Si no hay consulta seleccionada, usar todas las consultas disponibles
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

  // Función memoizada para buscar cliente
  const buscarClientePorTelefono = useCallback(
    async (telefono: string) => {
      if (!telefono || !isValidPhoneNumber(telefono)) {
        setClienteEncontrado(null)
        setTelefonoValidado(false)
        return
      }

      setBuscandoCliente(true)
      try {
        const clienteExacto = clients.find((cliente) => {
          if (!cliente.phone) return false
          return arePhoneNumbersEqual(cliente.phone, telefono)
        })

        if (clienteExacto) {
          setClienteEncontrado(clienteExacto)
          setTelefonoValidado(true)
          const nombreCompleto = clienteExacto.name.split(" ")
          const nombre = nombreCompleto[0] || ""
          const apellidos = nombreCompleto.slice(1).join(" ") || ""

          setFormData((prev) => ({
            ...prev,
            nombrePaciente: nombre,
            apellidosPaciente: apellidos,
          }))
          setTelefonoFormateado(formatPhoneNumber(telefono))
          toast.success(`Cliente encontrado: ${clienteExacto.name}`, {
            description: `Teléfono: ${clienteExacto.phone}`,
          })
        } else {
          setClienteEncontrado(null)
          setTelefonoValidado(true)
          setTelefonoFormateado(formatPhoneNumber(telefono))
          if (!citaExistente) {
            setFormData((prev) => ({
              ...prev,
              nombrePaciente: "",
              apellidosPaciente: "",
            }))
          }
          toast.info("Cliente nuevo - completa los datos", {
            description: `Teléfono: ${formatPhoneNumber(telefono)}`,
          })
        }
      } catch (error) {
        toast.error("Error al buscar cliente")
        setClienteEncontrado(null)
        setTelefonoValidado(false)
      } finally {
        setBuscandoCliente(false)
      }
    },
    [clients, citaExistente],
  )

  // Validar teléfono - memoizada
  const validarTelefono = useCallback((telefono: string) => {
    if (!telefono.trim()) {
      setErrors((prev) => ({ ...prev, telefono: "El teléfono es obligatorio" }))
      return false
    }

    if (!isValidPhoneNumber(telefono)) {
      setErrors((prev) => ({
        ...prev,
        telefono: "Formato de teléfono inválido. Debe tener entre 9 y 15 dígitos",
      }))
      return false
    }

    setErrors((prev) => ({ ...prev, telefono: "" }))
    return true
  }, [])

  // Manejar cambio de teléfono
  const handleTelefonoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const telefono = e.target.value
      setFormData((prev) => ({ ...prev, telefonoPaciente: telefono }))

      // Resetear estado de búsqueda
      setClienteEncontrado(null)
      setTelefonoValidado(false)
      setTelefonoFormateado("")

      // Validar formato
      validarTelefono(telefono)
    },
    [validarTelefono],
  )

  // Manejar cuando se sale del campo teléfono
  const handleTelefonoBlur = useCallback(() => {
    const telefono = formData.telefonoPaciente.trim()
    if (validarTelefono(telefono)) {
      buscarClientePorTelefono(telefono)
    }
  }, [formData.telefonoPaciente, validarTelefono, buscarClientePorTelefono])

  // Manejar cambios de hora y duración
  const handleHoraChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaHora = e.target.value
    setFormData((prev) => ({ ...prev, hora: nuevaHora }))
    // Reset de la verificación para permitir nueva verificación
    lastCheckParamsRef.current = ""
  }, [])

  const handleDuracionChange = useCallback((value: string) => {
    const nuevaDuracion = Number.parseInt(value)
    setFormData((prev) => ({ ...prev, duracion: nuevaDuracion }))
    // Reset de la verificación para permitir nueva verificación
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

      if (selectedService) {
        toast.info(`Servicio seleccionado: ${selectedService.name}`, {
          description: `Duración ajustada a ${selectedService.duration} minutos`,
        })
      }
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

      if (!telefonoValidado) {
        newErrors.telefono = "Debes validar el teléfono primero (sal del campo para validar)"
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        toast.error("Por favor corrige los errores en el formulario")
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
        // Si consultationId es "none", enviarlo como string vacío
        consultationId: formData.consultationId === "none" ? "" : formData.consultationId,
      }

      onSubmit(nuevaCita)
      onClose()
    },
    [formData, telefonoValidado, calcularHoraFin, fecha, citaExistente?.id, onSubmit, onClose],
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {citaExistente ? "Editar Cita" : "Nueva Cita"}
            {clienteEncontrado && <CheckCircle className="h-4 w-4 text-green-600" />}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teléfono - Campo principal y obligatorio */}
          <div>
            <Label htmlFor="telefonoPaciente" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Teléfono del paciente *
            </Label>
            <div className="relative">
              <Input
                id="telefonoPaciente"
                value={formData.telefonoPaciente}
                onChange={handleTelefonoChange}
                onBlur={handleTelefonoBlur}
                placeholder="Ej: +34 612 345 678 o 612345678"
                required
                className={`${errors.telefono ? "border-red-500" : ""} ${telefonoValidado ? "border-green-500" : ""}`}
              />
              {buscandoCliente && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
              {telefonoValidado && !buscandoCliente && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
            </div>
            {errors.telefono && <p className="text-sm text-red-600 mt-1">{errors.telefono}</p>}
            {telefonoFormateado && <p className="text-sm text-gray-600 mt-1">Formato: {telefonoFormateado}</p>}
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
          {telefonoValidado && !clienteEncontrado && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <strong>Cliente nuevo</strong>
                <br />
                <span className="text-sm">Este teléfono no está registrado. Se creará un nuevo cliente.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Datos del paciente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nombrePaciente">Nombre *</Label>
              <Input
                id="nombrePaciente"
                value={formData.nombrePaciente}
                onChange={(e) => setFormData({ ...formData, nombrePaciente: e.target.value })}
                required
                className={errors.nombre ? "border-red-500" : ""}
                placeholder="Nombre del paciente"
              />
              {errors.nombre && <p className="text-sm text-red-600 mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <Label htmlFor="apellidosPaciente">Apellidos</Label>
              <Input
                id="apellidosPaciente"
                value={formData.apellidosPaciente}
                onChange={(e) => setFormData({ ...formData, apellidosPaciente: e.target.value })}
                placeholder="Apellidos del paciente"
              />
            </div>
          </div>

          {/* Servicio */}
          <div>
            <Label htmlFor="service" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Servicio (opcional) {loadingServices && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            <Select value={formData.service_id} onValueChange={handleServiceChange} disabled={loadingServices}>
              <SelectTrigger>
                <SelectValue placeholder={loadingServices ? "Cargando servicios..." : "Selecciona un servicio"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin servicio específico</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                      <div className="flex-1">
                        <div className="font-medium">{service.name}</div>
                        <div className="text-xs text-gray-500">
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
              <p className="text-sm text-blue-600 mt-1">Solo se mostrarán profesionales asignados a este servicio</p>
            )}
          </div>

          {/* Horario */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" type="time" value={formData.hora} onChange={handleHoraChange} required />
            </div>
            <div>
              <Label htmlFor="duracion">Duración (min)</Label>
              <Select value={formData.duracion.toString()} onValueChange={handleDuracionChange}>
                <SelectTrigger>
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

          {/* Consulta - AHORA OPCIONAL */}
          <div>
            <Label htmlFor="consultation" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Consulta (opcional) {checkingConsultations && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            <Select
              value={formData.consultationId}
              onValueChange={(value) => setFormData({ ...formData, consultationId: value })}
              disabled={consultationsLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={consultationsLoading ? "Cargando consultas..." : "Selecciona una consulta (opcional)"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin consulta específica</SelectItem>
                {availableConsultations.map((consultation) => (
                  <SelectItem key={consultation.id} value={consultation.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: consultation.color }} />
                      {consultation.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!consultationsLoading && availableConsultations.length === 0 && consultations.length > 0 && (
              <p className="text-sm text-amber-600 mt-1">No hay consultas disponibles en este horario</p>
            )}
            {!consultationsLoading && consultations.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">No hay consultas configuradas</p>
            )}
          </div>

          {/* Profesional */}
          <div>
            <Label htmlFor="profesional" className="flex items-center gap-2">
              Profesional {loadingFilteredUsers && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            <Select
              value={formData.profesionalId.toString()}
              onValueChange={(value) => setFormData({ ...formData, profesionalId: Number.parseInt(value) })}
              disabled={loadingFilteredUsers}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingFilteredUsers ? "Filtrando profesionales..." : "Selecciona un profesional"}
                />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={Number.parseInt(user.id.slice(-8), 16).toString()}>
                    <div className="flex items-center gap-2">
                      <span>{user.name || user.email}</span>
                      <span className="text-xs text-gray-500">({user.role})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.service_id && filteredUsers.length === 0 && !loadingFilteredUsers && (
              <p className="text-sm text-amber-600 mt-1">No hay profesionales asignados a este servicio</p>
            )}
            {formData.service_id && filteredUsers.length > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                Mostrando {filteredUsers.length} profesional(es) asignado(s) al servicio
              </p>
            )}
            {!formData.service_id && (
              <p className="text-sm text-gray-500 mt-1">Mostrando todos los profesionales disponibles</p>
            )}
          </div>

          {/* Tipo de cita */}
          <div>
            <Label htmlFor="tipo">Tipo de cita</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposCita.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div>
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={formData.estado}
              onValueChange={(value: EstadoCita) => setFormData({ ...formData, estado: value })}
            >
              <SelectTrigger>
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
          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          {/* Información adicional */}
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded">
            <p className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              <strong>Consejos:</strong>
            </p>
            <p>• El teléfono es obligatorio para enviar recordatorios</p>
            <p>• Selecciona un servicio para filtrar profesionales específicos</p>
            <p>• Las consultas son opcionales - puedes crear citas sin asignar consulta</p>
            <p>• Sal del campo teléfono para validar y buscar cliente</p>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!telefonoValidado || buscandoCliente || checkingConsultations || consultationsLoading}
              className="gap-2"
            >
              {(buscandoCliente || checkingConsultations || consultationsLoading) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {citaExistente ? "Actualizar" : "Crear"} Cita
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
