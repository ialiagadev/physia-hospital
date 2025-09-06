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
  CreditCard,
} from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { useUserServices } from "../services/use-user-services"
import { useConsultations } from "@/hooks/use-consultations"
import { useServices } from "@/hooks/use-services"
import { useVacations } from "@/hooks/use-vacations"
import { useAppointmentConflicts } from "@/hooks/use-appointment-conflicts"
import { useAuth } from "@/app/contexts/auth-context"
import { formatPhoneNumber, isValidPhoneNumber } from "@/utils/phone-utils"
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

// Prefijos telefónicos comunes
const PHONE_PREFIXES = [
  { code: "+34", country: "España", flag: "🇪🇸" },
  { code: "+33", country: "Francia", flag: "🇫🇷" },
  { code: "+49", country: "Alemania", flag: "🇩🇪" },
  { code: "+39", country: "Italia", flag: "🇮🇹" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+44", country: "Reino Unido", flag: "🇬🇧" },
  { code: "+1", country: "Estados Unidos", flag: "🇺🇸" },
  { code: "+52", country: "México", flag: "🇲🇽" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+212", country: "Marruecos", flag: "🇲🇦" },
]

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
  const { users } = useUsers(organizationId)
  const { getServicesByUser, loading: userServicesLoading, error: userServicesError } = useUserServices(organizationId!)
  const { consultations, loading: consultationsLoading, getAvailableConsultations } = useConsultations(organizationId)
  const { services, loading: servicesLoading } = useServices(organizationId)
  const { getAvailableUsers } = useVacations(organizationId)
  const { conflicts, loading: conflictsLoading, checkConflicts } = useAppointmentConflicts(organizationId)

  // Estados simplificados
  const [availableConsultations, setAvailableConsultations] = useState<typeof consultations>([])
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [filteredServices, setFilteredServices] = useState<any[]>([]) // ✅ servicios filtrados por profesional
  const [loadingProfessionalServices, setLoadingProfessionalServices] = useState(false) // ✅ NUEVO: loading específico
  const [searchTerm, setSearchTerm] = useState("")
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [searchingClients, setSearchingClients] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null)
  const [telefonoValidado, setTelefonoValidado] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [telefonoFormateado, setTelefonoFormateado] = useState("")

  // 🆕 Estados para cliente nuevo
  const [phonePrefix, setPhonePrefix] = useState("+34")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [taxId, setTaxId] = useState("")

  // 🆕 Estados para recurrencia
  const [recurrencePreview, setRecurrencePreview] = useState<RecurrencePreview | null>(null)
  const [showRecurrencePreview, setShowRecurrencePreview] = useState(false)

  // Refs para timeouts
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const conflictCheckTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const consultationCheckTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // 🔧 OBTENER PROFESIONAL ID DE LISTA DE ESPERA CORRECTAMENTE
  const getWaitingListProfessionalId = useCallback(() => {
    if (!waitingListEntry?.preferred_professional_id) {
      return null
    }
    // Convertir el UUID a número usando los últimos 8 caracteres
    const professionalUuid = waitingListEntry.preferred_professional_id
    if (typeof professionalUuid === "string" && professionalUuid.length >= 8) {
      const professionalId = Number.parseInt(professionalUuid.slice(-8), 16)
      return professionalId > 0 ? professionalId : null
    }
    return null
  }, [waitingListEntry])

  // Función para calcular hora fin
  const calcularHoraFin = useCallback((horaInicio: string, duracion: number) => {
    const [horas, minutos] = horaInicio.split(":").map(Number)
    const totalMinutos = horas * 60 + minutos + duracion
    const nuevasHoras = Math.floor(totalMinutos / 60)
    const nuevosMinutos = totalMinutos % 60
    return `${nuevasHoras.toString().padStart(2, "0")}:${nuevosMinutos.toString().padStart(2, "0")}`
  }, [])

  // 🔧 ESTADO DEL FORMULARIO CON FECHAS Y PROFESIONAL CORREGIDOS
  const [formData, setFormData] = useState(() => {
    const waitingListProfessionalId = getWaitingListProfessionalId()

    const defaultProfessionalId = citaExistente?.profesionalId || waitingListProfessionalId || profesionalId || 0

    return {
      telefonoPaciente: citaExistente?.telefonoPaciente || waitingListEntry?.client_phone || "",
      nombrePaciente: citaExistente?.nombrePaciente || waitingListEntry?.client_name?.split(" ")[0] || "",
      apellidosPaciente:
        citaExistente?.apellidosPaciente || waitingListEntry?.client_name?.split(" ").slice(1).join(" ") || "",
      // 🔧 FECHA CORREGIDA - siempre como Date local
      fecha: citaExistente?.fecha ? ensureLocalDate(citaExistente.fecha) : ensureLocalDate(fecha),
      hora: citaExistente?.hora || hora,
      duracion: citaExistente?.duracion || waitingListEntry?.service_duration || 45,
      notas: citaExistente?.notas || waitingListEntry?.notes || "",
      profesionalId: defaultProfessionalId,
      estado: citaExistente?.estado || ("pendiente" as EstadoCita),
      consultationId:
        citaExistente?.consultationId && citaExistente.consultationId !== "" ? citaExistente.consultationId : "none",
      service_id: citaExistente?.service_id
        ? Number(citaExistente.service_id)
        : waitingListEntry?.service_id
          ? Number(waitingListEntry.service_id)
          : null, // ✅ Mantener servicio de lista de espera si existe
      // 🆕 CAMPOS PARA RECURRENCIA - Añadida opción "daily"
      isRecurring: citaExistente?.isRecurring || false,
      recurrenceType: citaExistente?.recurrenceType || "weekly",
      recurrenceInterval: citaExistente?.recurrenceInterval || 1,
      // 🔧 FECHA DE RECURRENCIA CORREGIDA
      recurrenceEndDate: citaExistente?.recurrenceEndDate
        ? ensureLocalDate(citaExistente.recurrenceEndDate)
        : addMonths(ensureLocalDate(fecha), 3),
    }
  })

  // 🆕 Inicializar campos de cliente nuevo si hay datos existentes
  useEffect(() => {
    if (citaExistente?.telefonoPaciente) {
      // Separar prefijo y número si existe
      const fullPhone = citaExistente.telefonoPaciente
      const prefix = PHONE_PREFIXES.find((p) => fullPhone.startsWith(p.code))
      if (prefix) {
        setPhonePrefix(prefix.code)
        setPhoneNumber(fullPhone.substring(prefix.code.length))
      } else {
        setPhoneNumber(fullPhone)
      }
    } else if (waitingListEntry?.client_phone) {
      const fullPhone = waitingListEntry.client_phone
      const prefix = PHONE_PREFIXES.find((p) => fullPhone.startsWith(p.code))
      if (prefix) {
        setPhonePrefix(prefix.code)
        setPhoneNumber(fullPhone.substring(prefix.code.length))
      } else {
        setPhoneNumber(fullPhone)
      }
    }
  }, [citaExistente, waitingListEntry])

  // 🆕 Efecto para generar preview de recurrencia
  useEffect(() => {
    if (formData.isRecurring && formData.recurrenceType && formData.recurrenceEndDate) {
      try {
        const config: RecurrenceConfig = {
          type: formData.recurrenceType as "daily" | "weekly" | "monthly", // ✅ Añadida "daily"
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

  // ✅ FUNCIÓN MEJORADA: Actualizar servicios basados en el profesional seleccionado
  const updateServices = useCallback(
    async (professionalId: number) => {
      if (!professionalId || professionalId === 0) {
        setFilteredServices([])
        return
      }

      // Encontrar el UUID del profesional
      const professionalUuid = users.find((u) => Number.parseInt(u.id.slice(-8), 16) === professionalId)?.id
      if (!professionalUuid) {
        setFilteredServices([])
        return
      }

      setLoadingProfessionalServices(true) // ✅ Loading específico
      try {
        const professionalServices = await getServicesByUser(professionalUuid)
        setFilteredServices(professionalServices)
      } catch (error) {
        console.error("Error fetching professional services:", error)
        setFilteredServices([])
      } finally {
        setLoadingProfessionalServices(false) // ✅ FINALLY agregado
      }
    },
    [users, getServicesByUser],
  )

  // ✅ EFECTO MEJORADO: Actualizar servicios cuando cambie el profesional
  useEffect(() => {
    const professionalIdNumber =
      typeof formData.profesionalId === "string" ? Number.parseInt(formData.profesionalId) : formData.profesionalId
    if (professionalIdNumber && professionalIdNumber !== 0) {
      updateServices(professionalIdNumber)
    } else {
      setFilteredServices([])
    }
  }, [formData.profesionalId, updateServices])

  // ✅ VALIDACIÓN MEJORADA: Verificar compatibilidad servicio-profesional para lista de espera
  useEffect(() => {
    // Solo validar si viene de lista de espera y ya se cargaron los servicios del profesional
    if (
      waitingListEntry &&
      formData.profesionalId &&
      formData.service_id &&
      filteredServices.length > 0 &&
      !loadingProfessionalServices
    ) {
      const serviceExists = filteredServices.find((s) => s.id === formData.service_id)
      if (!serviceExists) {
        // ✅ Si el servicio no es compatible, resetear a null
        console.warn(
          `Servicio ${formData.service_id} no disponible para profesional ${formData.profesionalId}. Reseteando.`,
        )
        setFormData((prev) => ({ ...prev, service_id: null }))
      }
    }
  }, [waitingListEntry, formData.profesionalId, formData.service_id, filteredServices, loadingProfessionalServices])

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
    // Only check if we have the minimum required data
    if (!formData.fecha || !formData.hora || !formData.duracion) {
      return
    }

    // If no professional is selected yet, clear conflicts and return
    if (!formData.profesionalId) {
      // We can't directly call setConflicts, so we'll let the hook handle empty results
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

  // Verificar conflictos cuando cambien los datos relevantes
  useEffect(() => {
    checkAppointmentConflicts()
  }, [checkAppointmentConflicts])

  // Verificar conflictos inmediatamente si el profesional viene preseleccionado (desde calendario)
  useEffect(() => {
    if (profesionalId && formData.profesionalId && users.length > 0) {
      // Solo verificar si tenemos los datos básicos
      if (formData.fecha && formData.hora && formData.duracion) {
        checkAppointmentConflicts()
      }
    }
  }, [profesionalId, users.length, checkAppointmentConflicts])

  // ✅ ACTUALIZAR USUARIOS FILTRADOS - SIMPLIFICADO (ya no filtra por servicio)
  const updateFilteredUsers = useCallback(async () => {
    const usersToFilter = users.filter((user) => user.type === 1) // Solo profesionales

    // Filtrar por vacaciones
    const availableUsers = getAvailableUsers(usersToFilter, formData.fecha)
    setFilteredUsers(availableUsers)

    // 🔧 LÓGICA DE RESETEO CORREGIDA - considerar también lista de espera
    const waitingListProfessionalId = getWaitingListProfessionalId()

    // Si el profesional seleccionado ya no está disponible, resetear
    // PERO NO resetear si viene preseleccionado desde el calendario O desde lista de espera
    if (
      formData.profesionalId &&
      formData.profesionalId !== profesionalId && // No resetear si viene del calendario
      formData.profesionalId !== waitingListProfessionalId && // 🔧 No resetear si viene de lista de espera
      !availableUsers.find((user) => Number.parseInt(user.id.slice(-8), 16) === formData.profesionalId)
    ) {
      setFormData((prev) => ({
        ...prev,
        profesionalId: waitingListProfessionalId || profesionalId || 0,
      }))
    }
  }, [formData.fecha, formData.profesionalId, users, getAvailableUsers, profesionalId, getWaitingListProfessionalId])

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
      const searchValue = waitingListEntry.client_phone || waitingListEntry.client_name || ""
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

    // Separar prefijo y número para cliente existente
    const fullPhone = client.phone || ""
    const prefix = PHONE_PREFIXES.find((p) => fullPhone.startsWith(p.code))
    if (prefix) {
      setPhonePrefix(prefix.code)
      setPhoneNumber(fullPhone.substring(prefix.code.length))
    } else {
      setPhoneNumber(fullPhone)
    }
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
        setPhoneNumber(phoneDigits)
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

  // ✅ HANDLER MEJORADO: Para cambio de profesional con reset de servicio
  const handleProfessionalChange = useCallback((value: string) => {
    const newProfessionalId = Number.parseInt(value)
    setFormData((prev) => ({
      ...prev,
      profesionalId: newProfessionalId,
      service_id: null, // ✅ Reset service when professional changes
    }))
  }, [])

  // ✅ HANDLER MEJORADO: Para cambio de servicio con validación
  const handleServiceChange = useCallback(
    (value: string) => {
      const selectedService = filteredServices.find((s) => s.id.toString() === value)
      setFormData((prev) => ({
        ...prev,
        service_id: Number(value),
        duracion: selectedService ? selectedService.duration : prev.duracion,
      }))
    },
    [filteredServices],
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

  // 🆕 Handler para cambio de prefijo telefónico
  const handlePhonePrefixChange = useCallback((value: string) => {
    setPhonePrefix(value)
    // 🔧 NO actualizar formData.telefonoPaciente aquí para evitar duplicación
  }, [])

  // 🆕 Handler para cambio de número telefónico
  const handlePhoneNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "") // Solo números
    setPhoneNumber(value)
    // 🔧 NO actualizar formData.telefonoPaciente aquí para evitar duplicación
  }, [])

  // 🆕 Verificar si el botón debe estar deshabilitado
  const isSubmitDisabled = useCallback(() => {
    return searchingClients || consultationsLoading || conflictsLoading || conflicts.length > 0
  }, [searchingClients, consultationsLoading, conflictsLoading, conflicts.length])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const newErrors: { [key: string]: string } = {}

      // 🆕 LOGS PARA DEBUGGEAR
      console.log("=== DEBUG SUBMIT ===")
      console.log("clienteEncontrado:", clienteEncontrado)
      console.log("phoneNumber:", phoneNumber)
      console.log("phonePrefix:", phonePrefix)
      console.log("taxId:", taxId)
      console.log("taxId.trim():", taxId.trim())
      console.log("!clienteEncontrado:", !clienteEncontrado)

      // Validaciones básicas
      if (!clienteEncontrado && !phoneNumber.trim()) {
        newErrors.telefono = "El teléfono es obligatorio"
      } else if (!clienteEncontrado && phoneNumber && !isValidPhoneNumber(phonePrefix + phoneNumber)) {
        newErrors.telefono = "Formato de teléfono inválido"
      }

      if (!formData.nombrePaciente.trim()) {
        newErrors.nombre = "El nombre es obligatorio"
      }

      if (!formData.service_id) {
        newErrors.service = "Debes seleccionar un servicio"
      }

      if (!formData.profesionalId || formData.profesionalId === 0) {
        newErrors.profesional = "Debes seleccionar un profesional"
      }

      // ✅ NUEVA VALIDACIÓN: Verificar compatibilidad profesional-servicio
      if (formData.profesionalId && formData.service_id) {
        const serviceExists = filteredServices.find((s) => s.id === formData.service_id)
        if (!serviceExists) {
          newErrors.service = "El servicio seleccionado no está disponible para este profesional"
        }
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
          type: formData.recurrenceType as "daily" | "weekly" | "monthly", // ✅ Añadida "daily"
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
        setErrors(newErrors)
        return
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      // 🆕 CREAR OBJETO newClientData CON LOGS
      const newClientData = !clienteEncontrado
        ? {
            phonePrefix: phonePrefix,
            taxId: taxId.trim() || undefined,
            fullPhone: phonePrefix + phoneNumber,
          }
        : undefined

      console.log("=== CREANDO newClientData ===")
      console.log("newClientData:", newClientData)

      const nuevaCita: Partial<Cita> = {
        ...formData,
        // 🔧 CORREGIR: Solo usar el número sin prefijo si es cliente nuevo, o el teléfono completo si es existente
        telefonoPaciente: clienteEncontrado ? clienteEncontrado.phone : phoneNumber, // Solo el número sin prefijo
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
        // 🆕 AÑADIR: Datos del cliente nuevo si no existe
        newClientData: newClientData,
      }

      console.log("=== CITA FINAL ===")
      console.log("nuevaCita:", nuevaCita)
      console.log("nuevaCita.newClientData:", nuevaCita.newClientData)

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
      filteredServices,
      phoneNumber, // 🆕 AÑADIDA DEPENDENCIA
      phonePrefix, // 🆕 AÑADIDA DEPENDENCIA
      taxId, // 🆕 AÑADIDA DEPENDENCIA
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
                  {waitingListEntry.client_phone && (
                    <div>
                      <strong>Teléfono:</strong> {waitingListEntry.client_phone}
                    </div>
                  )}
                  {waitingListEntry.service_name && (
                    <div>
                      <strong>Servicio:</strong> {waitingListEntry.service_name}
                    </div>
                  )}
                  {waitingListEntry.professional_name && (
                    <div>
                      <strong>Profesional preferido:</strong> {waitingListEntry.professional_name}
                    </div>
                  )}
                  {waitingListEntry.service_duration && (
                    <div>
                      <strong>Duración estimada:</strong> {waitingListEntry.service_duration} min
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
                {/* ✅ NUEVA ADVERTENCIA: Si el servicio no es compatible */}
                {waitingListEntry.service_id &&
                  formData.profesionalId &&
                  filteredServices.length > 0 &&
                  !filteredServices.find((s) => s.id === waitingListEntry.service_id) && (
                    <div className="text-sm mt-2 text-amber-700 bg-amber-100 p-2 rounded">
                      ⚠️ <strong>Atención:</strong> El servicio "{waitingListEntry.service_name}" no está disponible para
                      el profesional seleccionado. Selecciona un servicio compatible.
                    </div>
                  )}
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

          {/* 🆕 Campos adicionales para cliente nuevo */}
          {!clienteEncontrado && (
            <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-medium text-blue-800">Datos del nuevo cliente</Label>
              </div>

              {/* Campo de teléfono con selector de prefijo */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4" />
                  Teléfono *
                </Label>
                <div className="flex gap-2">
                  <Select value={phonePrefix} onValueChange={handlePhonePrefixChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHONE_PREFIXES.map((prefix) => (
                        <SelectItem key={prefix.code} value={prefix.code}>
                          <div className="flex items-center gap-2">
                            <span>{prefix.flag}</span>
                            <span>{prefix.code}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                    placeholder="612345678"
                    required={!clienteEncontrado}
                    className={`flex-1 ${errors.telefono ? "border-red-500" : ""}`}
                  />
                </div>
                {phonePrefix && phoneNumber && (
                  <p className="text-sm text-gray-600">
                    Teléfono completo:{" "}
                    <strong>
                      {phonePrefix}
                      {phoneNumber}
                    </strong>
                  </p>
                )}
              </div>

              {/* Campo NIF */}
              <div className="space-y-2">
                <Label htmlFor="taxId" className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4" />
                  NIF/CIF (opcional)
                </Label>
                <Input
                  id="taxId"
                  value={taxId}
                  onChange={(e) => {
                    console.log("NIF onChange:", e.target.value) // 🆕 LOG
                    setTaxId(e.target.value)
                  }}
                  placeholder="12345678A o B12345678"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">Introduce el NIF para personas físicas o CIF para empresas</p>
                {/* 🆕 MOSTRAR VALOR ACTUAL */}
                <p className="text-xs text-blue-600">Valor actual: "{taxId}"</p>
              </div>
            </div>
          )}

          {/* ✅ PROFESIONAL PRIMERO - MOVIDO ANTES DEL SERVICIO */}
          <div className="space-y-2">
            <Label htmlFor="profesional" className="flex items-center gap-2 text-sm font-medium">
              Profesional *
            </Label>
            <Select value={formData.profesionalId.toString()} onValueChange={handleProfessionalChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un profesional *" />
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
            {errors.profesional && <p className="text-sm text-red-600">{errors.profesional}</p>}
          </div>

          {/* ✅ SERVICIO SEGUNDO - FILTRADO POR PROFESIONAL */}
          <div className="space-y-2">
            <Label htmlFor="service" className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4" />
              Servicio *
              {(loadingProfessionalServices || userServicesLoading) && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            <Select
              value={formData.service_id ? formData.service_id.toString() : ""}
              onValueChange={handleServiceChange}
              disabled={!formData.profesionalId || loadingProfessionalServices || userServicesLoading}
              required
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !formData.profesionalId
                      ? "Primero selecciona un profesional"
                      : loadingProfessionalServices || userServicesLoading
                        ? "Cargando servicios..."
                        : filteredServices.length === 0
                          ? "No hay servicios disponibles"
                          : "Selecciona un servicio"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredServices.map((service) => (
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

            {/* Loading indicator */}
            {(loadingProfessionalServices || userServicesLoading) && formData.profesionalId && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando servicios del profesional...
              </div>
            )}

            {/* Error message */}
            {userServicesError && <p className="text-sm text-red-600">{userServicesError}</p>}

            {/* Status messages */}
            {formData.profesionalId &&
              !loadingProfessionalServices &&
              !userServicesLoading &&
              filteredServices.length === 0 && (
                <p className="text-sm text-amber-600">Este profesional no tiene servicios asignados</p>
              )}

            {formData.profesionalId &&
              !loadingProfessionalServices &&
              !userServicesLoading &&
              filteredServices.length > 0 && (
                <p className="text-sm text-blue-600">
                  {filteredServices.length} servicio(s) disponible(s) para este profesional
                </p>
              )}

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
                        <SelectItem value="daily">Diaria</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="recurrenceInterval">
                      Cada{" "}
                      {formData.recurrenceType === "daily"
                        ? "días"
                        : formData.recurrenceType === "weekly"
                          ? "semanas"
                          : "meses"}
                    </Label>
                    <Select
                      value={formData.recurrenceInterval.toString()}
                      onValueChange={(value) => handleRecurrenceChange("recurrenceInterval", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* ✅ Opciones ajustadas según el tipo */}
                        {formData.recurrenceType === "daily"
                          ? [1, 2, 3, 4, 5, 6, 7].map((interval) => (
                              <SelectItem key={interval} value={interval.toString()}>
                                {interval} {interval === 1 ? "día" : "días"}
                              </SelectItem>
                            ))
                          : formData.recurrenceType === "weekly"
                            ? [1, 2, 3, 4].map((interval) => (
                                <SelectItem key={interval} value={interval.toString()}>
                                  {interval} {interval === 1 ? "semana" : "semanas"}
                                </SelectItem>
                              ))
                            : [1, 2, 3, 4, 6, 8, 12].map((interval) => (
                                <SelectItem key={interval} value={interval.toString()}>
                                  {interval} {interval === 1 ? "mes" : "meses"}
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
            <p>• Para clientes nuevos, selecciona el prefijo telefónico y añade el NIF si es necesario</p>
            <p>• Selecciona un profesional para ver sus servicios disponibles</p>
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
            {/* ✅ NUEVO CONSEJO: Sobre compatibilidad de servicios */}
            {waitingListEntry && (
              <p className="text-blue-600">
                • ✅ El sistema garantiza que solo se asignen servicios compatibles con el profesional
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
