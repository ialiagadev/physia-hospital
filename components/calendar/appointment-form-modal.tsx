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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Loader2,
  Phone,
  User,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Info,
  Briefcase,
  Search,
  CalendarIcon,
  Clock,
  ClipboardList,
  Repeat,
  Ban,
} from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { useConsultations } from "@/hooks/use-consultations"
import { useServices } from "@/hooks/use-services"
import { useVacations } from "@/hooks/use-vacations"
import { useAppointmentConflicts } from "@/hooks/use-appointment-conflicts"
import { useAuth } from "@/app/contexts/auth-context"
import { normalizePhoneNumber, formatPhoneNumber, isValidPhoneNumber } from "@/utils/phone-utils"
import { supabase } from "@/lib/supabase/client"
import { RecurrenceService } from "@/lib/services/recurrence-service"
import type { Cita, EstadoCita, RecurrenceConfig, RecurrencePreview } from "@/types/calendar"
import { format, addMonths } from "date-fns"

interface AppointmentFormModalProps {
  fecha: Date
  hora: string
  profesionalId?: number
  position?: { x: number; y: number }
  citaExistente?: Cita
  waitingListEntry?: any
  onClose: () => void
  onSubmit: (cita: Partial<Cita>) => void
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

// 🔧 FUNCIONES AUXILIARES PARA MANEJO DE FECHAS
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const parseDateFromInput = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day) // month - 1 porque los meses en JS van de 0-11
}

const ensureLocalDate = (date: Date | string): Date => {
  if (typeof date === "string") {
    // Si es string, parsearlo como fecha local
    return parseDateFromInput(date.split("T")[0])
  }
  // Si ya es Date, crear una nueva fecha local para evitar mutaciones
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function AppointmentFormModal({
  fecha,
  hora,
  profesionalId,
  position,
  citaExistente,
  waitingListEntry,
  onClose,
  onSubmit,
}: AppointmentFormModalProps) {
  const { userProfile } = useAuth()
  const organizationId = userProfile?.organization_id ? Number(userProfile.organization_id) : undefined

  // Hooks centralizados
  const { clients } = useClients(organizationId)
  const { users, getUsersByService } = useUsers(organizationId)
  const { consultations, loading: consultationsLoading, getAvailableConsultations } = useConsultations(organizationId)
  const { services, loading: servicesLoading } = useServices(organizationId)
  const { getAvailableUsers } = useVacations(organizationId)
  const { conflicts, loading: conflictsLoading, checkConflicts } = useAppointmentConflicts(organizationId)

  // Estados simplificados
  const [availableConsultations, setAvailableConsultations] = useState<typeof consultations>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [searchingClients, setSearchingClients] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null)
  const [telefonoValidado, setTelefonoValidado] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [telefonoFormateado, setTelefonoFormateado] = useState("")

  // 🆕 Estados para recurrencia
  const [recurrencePreview, setRecurrencePreview] = useState<RecurrencePreview | null>(null)
  const [showRecurrencePreview, setShowRecurrencePreview] = useState(false)

  // Refs para timeouts
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const conflictCheckTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const consultationCheckTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Función para calcular hora fin
  const calcularHoraFin = useCallback((horaInicio: string, duracion: number) => {
    const [horas, minutos] = horaInicio.split(":").map(Number)
    const totalMinutos = horas * 60 + minutos + duracion
    const nuevasHoras = Math.floor(totalMinutos / 60)
    const nuevosMinutos = totalMinutos % 60
    return `${nuevasHoras.toString().padStart(2, "0")}:${nuevosMinutos.toString().padStart(2, "0")}`
  }, [])

  // 🔧 ESTADO DEL FORMULARIO CON FECHAS CORREGIDAS
  const [formData, setFormData] = useState({
    telefonoPaciente: citaExistente?.telefonoPaciente || waitingListEntry?.phone || "",
    nombrePaciente: citaExistente?.nombrePaciente || waitingListEntry?.client_name?.split(" ")[0] || "",
    apellidosPaciente:
      citaExistente?.apellidosPaciente || waitingListEntry?.client_name?.split(" ").slice(1).join(" ") || "",
    // 🔧 FECHA CORREGIDA - siempre como Date local
    fecha: citaExistente?.fecha ? ensureLocalDate(citaExistente.fecha) : ensureLocalDate(fecha),
    hora: citaExistente?.hora || hora,
    duracion: citaExistente?.duracion || waitingListEntry?.estimated_duration || 45,
    notas: citaExistente?.notas || waitingListEntry?.notes || "",
    profesionalId: citaExistente?.profesionalId || profesionalId || waitingListEntry?.preferred_professional_id || 1,
    estado: citaExistente?.estado || ("pendiente" as EstadoCita),
    consultationId:
      citaExistente?.consultationId && citaExistente.consultationId !== "" ? citaExistente.consultationId : "none",
    service_id: citaExistente?.service_id
      ? Number(citaExistente.service_id)
      : waitingListEntry?.service_id
        ? Number(waitingListEntry.service_id)
        : services.length > 0
          ? services[0].id
          : null,
    // 🆕 CAMPOS PARA RECURRENCIA
    isRecurring: citaExistente?.isRecurring || false,
    recurrenceType: citaExistente?.recurrenceType || "weekly",
    recurrenceInterval: citaExistente?.recurrenceInterval || 1,
    // 🔧 FECHA DE RECURRENCIA CORREGIDA
    recurrenceEndDate: citaExistente?.recurrenceEndDate
      ? ensureLocalDate(citaExistente.recurrenceEndDate)
      : addMonths(ensureLocalDate(fecha), 3),
  })

  // 🆕 Efecto para generar preview de recurrencia
  useEffect(() => {
    if (formData.isRecurring && formData.recurrenceType && formData.recurrenceEndDate) {
      try {
        const config: RecurrenceConfig = {
          type: formData.recurrenceType as "weekly" | "monthly",
          interval: formData.recurrenceInterval,
          endDate: formData.recurrenceEndDate,
        }
        const preview = RecurrenceService.generatePreview(formData.fecha, config)
        setRecurrencePreview(preview)
      } catch (error) {
        console.error("Error generating recurrence preview:", error)
        setRecurrencePreview(null)
      }
    } else {
      setRecurrencePreview(null)
    }
  }, [
    formData.isRecurring,
    formData.recurrenceType,
    formData.recurrenceInterval,
    formData.recurrenceEndDate,
    formData.fecha,
  ])

  // Verificar consultas disponibles
  const checkConsultationAvailability = useCallback(async () => {
    if (!formData.hora || !formData.duracion || consultationsLoading) {
      return
    }

    try {
      const endTime = calcularHoraFin(formData.hora, formData.duracion)
      // 🔧 USAR FECHA LOCAL CORRECTAMENTE
      const dateString = formatDateForInput(formData.fecha)

      const available = await getAvailableConsultations(
        dateString,
        formData.hora,
        endTime,
        citaExistente?.id ? citaExistente.id.toString() : undefined,
      )

      setAvailableConsultations(available)

      if (
        formData.consultationId &&
        formData.consultationId !== "none" &&
        !available.find((c) => c.id === formData.consultationId)
      ) {
        setFormData((prev) => ({ ...prev, consultationId: "none" }))
      }
    } catch (error) {
      setAvailableConsultations(consultations)
    }
  }, [
    formData.hora,
    formData.duracion,
    formData.fecha,
    consultationsLoading,
    getAvailableConsultations,
    calcularHoraFin,
    citaExistente?.id,
    formData.consultationId,
    consultations,
  ])

  // Verificar conflictos de citas
  const checkAppointmentConflicts = useCallback(async () => {
    if (!formData.fecha || !formData.hora || !formData.duracion || !formData.profesionalId) {
      return
    }

    const professionalUuid = users.find((u) => Number.parseInt(u.id.slice(-8), 16) === formData.profesionalId)?.id
    if (!professionalUuid) return

    await checkConflicts(
      formData.fecha,
      formData.hora,
      formData.duracion,
      professionalUuid,
      citaExistente?.id ? citaExistente.id.toString() : undefined,
    )
  }, [
    formData.fecha,
    formData.hora,
    formData.duracion,
    formData.profesionalId,
    users,
    checkConflicts,
    citaExistente?.id,
  ])

  // Filtrar usuarios - CORREGIDO y SIN console.log
  const updateFilteredUsers = useCallback(async () => {
    let usersToFilter = users.filter((user) => user.type === 1) // Solo profesionales

    // Siempre filtrar por servicio ya que es obligatorio
    if (formData.service_id) {
      usersToFilter = await getUsersByService(formData.service_id)
    }

    // Filtrar por vacaciones
    const availableUsers = getAvailableUsers(usersToFilter, formData.fecha)
    setFilteredUsers(availableUsers)

    // Si el profesional seleccionado ya no está disponible, resetear
    if (
      formData.profesionalId &&
      !availableUsers.find((user) => Number.parseInt(user.id.slice(-8), 16) === formData.profesionalId)
    ) {
      setFormData((prev) => ({ ...prev, profesionalId: 0 }))
    }
  }, [formData.service_id, formData.fecha, formData.profesionalId, users, getUsersByService, getAvailableUsers])

  // Función para buscar clientes
  const searchClients = useCallback(
    async (term: string) => {
      if (!term || term.length < 1) {
        setClientMatches([])
        setShowMatches(false)
        return
      }

      setSearchingClients(true)
      try {
        const matches: ClientMatch[] = []
        const termLower = term.toLowerCase().trim()
        const phoneDigits = term.replace(/\D/g, "")

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

        if (!/^\d+$/.test(term)) {
          const { data: nameMatches, error: nameError } = await supabase
            .from("clients")
            .select("id, name, phone")
            .eq("organization_id", organizationId)
            .ilike("name", `%${termLower}%`)
            .limit(10)

          if (!nameError && nameMatches) {
            nameMatches.forEach((client) => {
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
        setClientMatches([])
        setShowMatches(false)
      } finally {
        setSearchingClients(false)
      }
    },
    [organizationId],
  )

  // Effects optimizados
  useEffect(() => {
    if (!consultationsLoading) {
      if (consultations.length > 0) {
        checkConsultationAvailability()
      } else {
        setAvailableConsultations([])
      }
    }
  }, [consultations, consultationsLoading, checkConsultationAvailability])

  // Verificar consultas con debounce
  useEffect(() => {
    if (consultationCheckTimeoutRef.current) {
      clearTimeout(consultationCheckTimeoutRef.current)
    }
    consultationCheckTimeoutRef.current = setTimeout(() => {
      checkConsultationAvailability()
    }, 300)

    return () => {
      if (consultationCheckTimeoutRef.current) {
        clearTimeout(consultationCheckTimeoutRef.current)
      }
    }
  }, [formData.hora, formData.duracion, formData.fecha])

  // Verificar conflictos con debounce
  useEffect(() => {
    if (conflictCheckTimeoutRef.current) {
      clearTimeout(conflictCheckTimeoutRef.current)
    }
    conflictCheckTimeoutRef.current = setTimeout(() => {
      checkAppointmentConflicts()
    }, 500)

    return () => {
      if (conflictCheckTimeoutRef.current) {
        clearTimeout(conflictCheckTimeoutRef.current)
      }
    }
  }, [checkAppointmentConflicts])

  // Actualizar usuarios filtrados
  useEffect(() => {
    updateFilteredUsers()
  }, [updateFilteredUsers])

  // Inicializar búsqueda con datos existentes o de lista de espera
  useEffect(() => {
    if (citaExistente) {
      const searchValue =
        citaExistente.telefonoPaciente ||
        `${citaExistente.nombrePaciente} ${citaExistente.apellidosPaciente || ""}`.trim()
      setSearchTerm(searchValue)
    } else if (waitingListEntry) {
      const searchValue = waitingListEntry.phone || waitingListEntry.client_name || ""
      setSearchTerm(searchValue)
    }
  }, [citaExistente, waitingListEntry])

  // Limpiar timeouts
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
      if (conflictCheckTimeoutRef.current) clearTimeout(conflictCheckTimeoutRef.current)
      if (consultationCheckTimeoutRef.current) clearTimeout(consultationCheckTimeoutRef.current)
    }
  }, [])

  // Handlers
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
      setClienteEncontrado(null)
      setTelefonoValidado(false)
      setTelefonoFormateado("")

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(() => {
        searchClients(value)
      }, 300)
    },
    [searchClients],
  )

  const handleSearchBlur = useCallback(() => {
    if (!clienteEncontrado && searchTerm) {
      const phoneDigits = searchTerm.replace(/\D/g, "")
      if (phoneDigits.length >= 3) {
        setFormData((prev) => ({ ...prev, telefonoPaciente: phoneDigits }))
        setTelefonoValidado(true)
        setTelefonoFormateado(formatPhoneNumber(phoneDigits))
      } else {
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
    setTimeout(() => setShowMatches(false), 200)
  }, [clienteEncontrado, searchTerm])

  // Handler para manejar service_id como número o null - SIN console.log
  const handleServiceChange = useCallback(
    (value: string) => {
      const selectedService = services.find((s) => s.id.toString() === value)
      setFormData((prev) => ({
        ...prev,
        service_id: Number(value),
        duracion: selectedService ? selectedService.duration : prev.duracion,
      }))
    },
    [services],
  )

  // 🆕 Manejar cambio de recurrencia
  const handleRecurrenceChange = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  // 🔧 HANDLER PARA CAMBIO DE FECHA CORREGIDO
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value
    if (dateString) {
      const nuevaFecha = parseDateFromInput(dateString)
      setFormData((prev) => ({ ...prev, fecha: nuevaFecha }))
    }
  }, [])

  // 🔧 HANDLER PARA CAMBIO DE FECHA DE RECURRENCIA CORREGIDO
  const handleRecurrenceEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateString = e.target.value
      const date = dateString ? parseDateFromInput(dateString) : null
      handleRecurrenceChange("recurrenceEndDate", date)
    },
    [handleRecurrenceChange],
  )

  // 🆕 Verificar si el botón debe estar deshabilitado
  const isSubmitDisabled = useCallback(() => {
    return (
      searchingClients || consultationsLoading || conflictsLoading || conflicts.length > 0 // 🔥 NUEVA CONDICIÓN: Deshabilitar si hay conflictos
    )
  }, [searchingClients, consultationsLoading, conflictsLoading, conflicts.length])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

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

      if (!formData.service_id) {
        newErrors.service = "Debes seleccionar un servicio"
      }

      // 🆕 Validaciones de recurrencia
      if (formData.isRecurring) {
        if (!formData.recurrenceEndDate) {
          newErrors.recurrenceEndDate = "Debes seleccionar una fecha de finalización"
        }
        if (formData.recurrenceInterval < 1 || formData.recurrenceInterval > 12) {
          newErrors.recurrenceInterval = "El intervalo debe estar entre 1 y 12"
        }

        // Validar usando el servicio de recurrencia
        const config: RecurrenceConfig = {
          type: formData.recurrenceType as "weekly" | "monthly",
          interval: formData.recurrenceInterval,
          endDate: formData.recurrenceEndDate,
        }

        const validationErrors = RecurrenceService.validateRecurrenceConfig(config)
        if (validationErrors.length > 0) {
          newErrors.recurrence = validationErrors.join(", ")
        }
      }

      // 🔥 NUEVA VALIDACIÓN: Bloquear si hay conflictos
      if (conflicts.length > 0) {
        newErrors.conflicts = "No se puede crear la cita debido a conflictos de horario"
        return
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      const nuevaCita: Partial<Cita> = {
        ...formData,
        telefonoPaciente: normalizePhoneNumber(formData.telefonoPaciente),
        fecha: formData.fecha,
        horaFin: calcularHoraFin(formData.hora, formData.duracion),
        horaInicio: formData.hora,
        id: citaExistente?.id || Date.now(),
        estado: formData.estado,
        consultationId:
          formData.consultationId === "none" || !formData.consultationId ? undefined : formData.consultationId,
        profesionalId: formData.profesionalId || profesionalId,
        // 🆕 Campos de recurrencia
        isRecurring: formData.isRecurring,
        recurrenceType: formData.isRecurring ? formData.recurrenceType : undefined,
        recurrenceInterval: formData.isRecurring ? formData.recurrenceInterval : undefined,
        recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate : undefined,
        clienteEncontrado: clienteEncontrado,
      }

      onSubmit(nuevaCita)
      onClose()
    },
    [
      formData,
      clienteEncontrado,
      calcularHoraFin,
      citaExistente?.id,
      onSubmit,
      onClose,
      profesionalId,
      conflicts.length,
    ],
  )

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
            {citaExistente ? "Editar Cita" : waitingListEntry ? "Programar desde Lista de Espera" : "Nueva Cita"}
            {clienteEncontrado && <CheckCircle className="h-4 w-4 text-green-600" />}
            {formData.isRecurring && <Repeat className="h-4 w-4 text-blue-600" />}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-1">
          {/* Indicador de lista de espera */}
          {waitingListEntry && (
            <Alert className="border-blue-200 bg-blue-50">
              <ClipboardList className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <strong>📋 Programando desde Lista de Espera</strong>
                <br />
                <div className="text-sm mt-2 space-y-1">
                  <div>
                    <strong>Cliente:</strong> {waitingListEntry.client_name}
                  </div>
                  {waitingListEntry.phone && (
                    <div>
                      <strong>Teléfono:</strong> {waitingListEntry.phone}
                    </div>
                  )}
                  {waitingListEntry.service_name && (
                    <div>
                      <strong>Servicio:</strong> {waitingListEntry.service_name}
                    </div>
                  )}
                  {waitingListEntry.estimated_duration && (
                    <div>
                      <strong>Duración estimada:</strong> {waitingListEntry.estimated_duration} min
                    </div>
                  )}
                  {waitingListEntry.notes && (
                    <div>
                      <strong>Notas:</strong> {waitingListEntry.notes}
                    </div>
                  )}
                </div>
                <div className="text-sm mt-2 text-blue-700">
                  Los datos se han pre-rellenado automáticamente. Puedes modificarlos si es necesario.
                </div>
                <div className="text-sm mt-1 text-blue-600 font-medium">
                  ✅ Al crear la cita, se eliminará automáticamente de la lista de espera.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Campo de búsqueda */}
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
                className={`w-full ${errors.telefono ? "border-red-500" : ""} ${
                  clienteEncontrado ? "border-green-500" : ""
                }`}
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
          {!clienteEncontrado && searchTerm && !searchingClients && !waitingListEntry && (
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
              Servicio *{servicesLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            <Select
              value={formData.service_id ? formData.service_id.toString() : ""}
              onValueChange={handleServiceChange}
              disabled={servicesLoading}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={servicesLoading ? "Cargando servicios..." : "Selecciona un servicio"} />
              </SelectTrigger>
              <SelectContent>
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
            {errors.service && <p className="text-sm text-red-600">{errors.service}</p>}
          </div>

          {/* Fecha y Horario */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha" className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="h-4 w-4" />
                Fecha *
              </Label>
              {/* 🔧 INPUT DE FECHA CORREGIDO */}
              <Input
                id="fecha"
                type="date"
                value={formatDateForInput(formData.fecha)}
                onChange={handleDateChange}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora" className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Hora *
              </Label>
              <Input
                id="hora"
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData((prev) => ({ ...prev, hora: e.target.value }))}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duracion" className="text-sm font-medium">
                Duración (min)
              </Label>
              <Select
                value={formData.duracion.toString()}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, duracion: Number.parseInt(value) }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="75">75 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="105">105 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                  <SelectItem value="135">135 min</SelectItem>
                  <SelectItem value="150">150 min</SelectItem>
                  <SelectItem value="165">165 min</SelectItem>
                  <SelectItem value="180">180 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 🆕 SECCIÓN DE RECURRENCIA */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="isRecurring"
                checked={formData.isRecurring}
                onCheckedChange={(checked) => handleRecurrenceChange("isRecurring", checked)}
              />
              <Label htmlFor="isRecurring" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Repetir esta cita
              </Label>
            </div>

            {formData.isRecurring && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recurrenceType">Frecuencia</Label>
                    <Select
                      value={formData.recurrenceType}
                      onValueChange={(value) => handleRecurrenceChange("recurrenceType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="recurrenceInterval">
                      Cada {formData.recurrenceType === "weekly" ? "semanas" : "meses"}
                    </Label>
                    <Select
                      value={formData.recurrenceInterval.toString()}
                      onValueChange={(value) => handleRecurrenceChange("recurrenceInterval", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 6, 8, 12].map((interval) => (
                          <SelectItem key={interval} value={interval.toString()}>
                            {interval}{" "}
                            {formData.recurrenceType === "weekly"
                              ? interval === 1
                                ? "semana"
                                : "semanas"
                              : interval === 1
                                ? "mes"
                                : "meses"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="recurrenceEndDate">Hasta el</Label>
                  {/* 🔧 INPUT DE FECHA DE RECURRENCIA CORREGIDO */}
                  <Input
                    id="recurrenceEndDate"
                    type="date"
                    value={formData.recurrenceEndDate ? formatDateForInput(formData.recurrenceEndDate) : ""}
                    onChange={handleRecurrenceEndDateChange}
                    min={formatDateForInput(formData.fecha)}
                    className={`w-full ${errors.recurrenceEndDate ? "border-red-500" : ""}`}
                    required={formData.isRecurring}
                  />
                  {errors.recurrenceEndDate && <p className="text-sm text-red-600 mt-1">{errors.recurrenceEndDate}</p>}
                </div>

                {/* Preview de recurrencia */}
                {recurrencePreview && (
                  <div className="bg-white p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Vista previa</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowRecurrencePreview(!showRecurrencePreview)}
                      >
                        {showRecurrencePreview ? "Ocultar" : "Ver fechas"}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Se crearán <strong>{recurrencePreview.count}</strong> citas hasta el{" "}
                      <strong>{format(formData.recurrenceEndDate, "dd/MM/yyyy")}</strong>
                    </p>
                    {recurrencePreview.conflicts.length > 0 && (
                      <Alert className="mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          ⚠️ {recurrencePreview.conflicts.length} fechas pueden tener conflictos
                        </AlertDescription>
                      </Alert>
                    )}
                    {showRecurrencePreview && (
                      <div className="max-h-32 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-1 text-xs">
                          {recurrencePreview.dates.slice(0, 12).map((date, index) => (
                            <div
                              key={index}
                              className={`p-1 rounded text-center ${
                                recurrencePreview.conflicts.some((conflict) => conflict.getTime() === date.getTime())
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100"
                              }`}
                            >
                              {format(date, "dd/MM")}
                            </div>
                          ))}
                          {recurrencePreview.dates.length > 12 && (
                            <div className="p-1 text-center text-gray-500">
                              +{recurrencePreview.dates.length - 12} más
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {errors.recurrence && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">{errors.recurrence}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* 🔥 ADVERTENCIA DE CONFLICTOS MEJORADA */}
          {conflicts.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <Ban className="h-4 w-4" />
              <AlertDescription className="text-red-800">
                <strong>🚫 Conflicto de horario - No se puede crear la cita</strong>
                <br />
                <span className="text-sm">
                  Ya existe{conflicts.length > 1 ? "n" : ""} {conflicts.length} cita{conflicts.length > 1 ? "s" : ""} en
                  este horario:
                </span>
                <div className="mt-2 space-y-1">
                  {conflicts.map((apt) => (
                    <div key={apt.id} className="text-sm bg-red-100 p-2 rounded border-l-4 border-red-400">
                      <div className="font-medium">{apt.client_name}</div>
                      <div className="text-xs text-red-700">
                        {apt.start_time} - {apt.end_time} • {apt.professional_name} • Estado: {apt.status}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm font-medium">
                  <strong>Debes cambiar el horario, profesional o fecha para continuar.</strong>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {conflictsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando disponibilidad...
            </div>
          )}

          {/* Consulta */}
          <div className="space-y-2">
            <Label htmlFor="consultation" className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Consulta (opcional)
              {consultationsLoading && <Loader2 className="h-3 w-3 animate-spin" />}
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
                {!consultationsLoading &&
                  availableConsultations.length > 0 &&
                  availableConsultations.length < consultations.length && (
                    <p className="text-sm text-blue-600">
                      {availableConsultations.length} de {consultations.length} consultas disponibles
                    </p>
                  )}
              </>
            ) : consultationsLoading ? (
              <div className="p-3 bg-gray-50 rounded-md border-2 border-dashed border-gray-200">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm text-gray-600">Cargando consultas...</p>
                </div>
              </div>
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
            </Label>
            <Select
              value={formData.profesionalId.toString()}
              onValueChange={(value) => setFormData({ ...formData, profesionalId: Number.parseInt(value) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un profesional" />
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
            {formData.service_id && filteredUsers.length === 0 && (
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
            <p>• El sistema verificará automáticamente conflictos de horario</p>
            {formData.isRecurring && <p>• Las citas recurrentes se crean todas de una vez</p>}
            {waitingListEntry && (
              <p className="text-blue-600">• Los datos de la lista de espera se han pre-rellenado automáticamente</p>
            )}
            {waitingListEntry && (
              <p className="text-green-600">• Al crear la cita, se eliminará automáticamente de la lista de espera</p>
            )}
            {conflicts.length > 0 && (
              <p className="text-red-600 font-medium">
                • ⚠️ Hay conflictos de horario - debes resolverlos antes de continuar
              </p>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitDisabled()}>
              {conflicts.length > 0 && <Ban className="h-4 w-4 mr-2" />}
              {citaExistente ? "Actualizar" : "Crear"}
              {formData.isRecurring && recurrencePreview ? ` (${recurrencePreview.count} citas)` : " Cita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
