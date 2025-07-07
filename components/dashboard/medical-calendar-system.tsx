"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarSearch } from "@/components/calendar/calendar-search"
import { ProfesionalesLegend } from "@/components/calendar/profesionales-legend"
import { AppointmentFormModal } from "@/components/calendar/appointment-form-modal"
import { AppointmentDetailsModal } from "@/components/calendar/appointment-details-modal"
import { ListView } from "@/components/calendar/list-view"
import { ProfesionalesView } from "@/components/calendar/profesionales-view"
import { ConsultationsView } from "@/components/calendar/consultations-view"
import { ServicesView } from "@/components/services/services-view"
import { useUsers } from "@/hooks/use-users"
import { useAppointments } from "@/hooks/use-appointments"
import { useClients } from "@/hooks/use-clients"
import { useConsultations } from "@/hooks/use-consultations"
import { useServices } from "@/hooks/use-services"
import { useVacationRequests } from "@/hooks/use-vacation-requests"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { WaitingListView } from "../waiting-list/waiting-list-view"
import type {
  IntervaloTiempo,
  VistaCalendario,
  SubVistaCalendario,
  AppointmentWithDetails,
  AppointmentInsert,
  EstadoCita,
} from "@/types/calendar"
import { WeekView } from "@/components/calendar/week-view"
import { MonthView } from "@/components/calendar/month-view"
import { HorarioViewDynamic } from "@/components/calendar/horario-view-dynamic"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Define TabPrincipal locally to include new tabs
type TabPrincipal = "calendario" | "lista-espera" | "actividades-grupales" | "usuarios" | "consultas" | "servicios"

// Mapeo de estados del español al inglés para la base de datos
const mapEstadoToStatus = (estado: string): "confirmed" | "pending" | "cancelled" | "completed" | "no_show" => {
  const mapping = {
    confirmada: "confirmed",
    pendiente: "pending",
    cancelada: "cancelled",
    completada: "completed",
    no_show: "no_show",
  } as const
  return mapping[estado as keyof typeof mapping] || "confirmed"
}

// Mapeo inverso para mostrar en la UI
const mapStatusToEstado = (status: string): EstadoCita => {
  const mapping = {
    confirmed: "confirmada",
    pending: "pendiente",
    cancelled: "cancelada",
    completed: "completada",
    no_show: "no_show",
  } as const
  return mapping[status as keyof typeof mapping] || "confirmada"
}

const MedicalCalendarSystem: React.FC = () => {
  const { userProfile } = useAuth()

  // Obtener organizationId del perfil del usuario
  const organizationId = userProfile?.organization_id ? Number(userProfile.organization_id) : undefined

  // Estados principales
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tabPrincipal, setTabPrincipal] = useState<TabPrincipal>("calendario")
  const [vistaCalendario, setVistaCalendario] = useState<VistaCalendario>("dia")
  const [subVistaCalendario, setSubVistaCalendario] = useState<SubVistaCalendario>("horario")
  const [intervaloTiempo, setIntervaloTiempo] = useState<IntervaloTiempo>(60)

  // Estados de UI
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null)
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<string[]>([])
  const [showSearch, setShowSearch] = useState(false)

  // Hooks de datos - ahora con organizationId
  const { users, currentUser, loading: usersLoading, refetch: refetchUsers } = useUsers(organizationId)
  const { clients, loading: clientsLoading, error: clientsError, createClient } = useClients(organizationId)
  const {
    consultations,
    loading: consultationsLoading,
    error: consultationsError,
    refetch: refetchConsultations,
  } = useConsultations(organizationId)
  const {
    services,
    loading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useServices(organizationId)

  // Hook de vacaciones
  const { requests: vacationRequests, loading: vacationLoading, isUserOnVacation } = useVacationRequests(organizationId)

  // Calcular rango de fechas para las citas
  const getDateRange = () => {
    let startDate: string, endDate: string

    switch (vistaCalendario) {
      case "dia":
        startDate = format(currentDate, "yyyy-MM-dd")
        endDate = startDate
        break
      case "semana":
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        startDate = format(weekStart, "yyyy-MM-dd")
        endDate = format(weekEnd, "yyyy-MM-dd")
        break
      case "mes":
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        startDate = format(monthStart, "yyyy-MM-dd")
        endDate = format(monthEnd, "yyyy-MM-dd")
        break
      default:
        startDate = format(currentDate, "yyyy-MM-dd")
        endDate = startDate
    }

    return { startDate, endDate }
  }

  const { startDate, endDate } = getDateRange()

  const {
    appointments,
    loading: appointmentsLoading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments(
    organizationId,
    startDate,
    endDate,
    usuariosSeleccionados.length > 0 ? usuariosSeleccionados : undefined,
  )

  // Inicializar con todos los usuarios seleccionados
  useEffect(() => {
    if (users.length > 0) {
      setUsuariosSeleccionados(users.map((u) => u.id))
    }
  }, [users])

  // Navegación de fechas
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)

    switch (vistaCalendario) {
      case "dia":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
        break
      case "semana":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
        break
      case "mes":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
        break
    }

    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Función para obtener o crear tipo de cita por defecto
  const getDefaultAppointmentType = async (userId: string) => {
    try {
      // Buscar tipo de cita existente
      const { data: existingType } = await supabase
        .from("appointment_types")
        .select("id")
        .eq("user_id", userId)
        .eq("name", "Consulta General")
        .single()

      if (existingType) {
        return existingType.id
      }

      // Crear tipo de cita por defecto si no existe
      const { data: newType, error } = await supabase
        .from("appointment_types")
        .insert({
          user_id: userId,
          name: "Consulta General",
          duration: 30,
          color: "#3B82F6",
          icon: "🩺",
          is_active: true,
          sort_order: 1,
        })
        .select("id")
        .single()

      if (error) throw error
      return newType.id
    } catch (error) {
      console.error("Error getting/creating appointment type:", error)
      throw error
    }
  }

  // Función para obtener la primera consulta disponible (opcional)
  const getFirstAvailableConsultation = async (date: string, startTime: string, endTime: string) => {
    try {
      if (consultations.length === 0) {
        return null // Retornar null si no hay consultas
      }

      // Verificar qué consultas están ocupadas en ese horario
      const { data: occupiedConsultations, error } = await supabase
        .from("appointments")
        .select("consultation_id")
        .eq("date", date)
        .neq("status", "cancelled")
        .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)

      if (error) throw error

      const occupiedIds = occupiedConsultations?.map((apt) => apt.consultation_id) || []
      const availableConsultation = consultations.find((consultation) => !occupiedIds.includes(consultation.id))

      return availableConsultation?.id || null // Retornar null si no hay disponibles
    } catch (error) {
      console.error("Error getting available consultation:", error)
      return null
    }
  }

  // Handlers de citas
  const handleAddAppointment = async (appointmentData: any) => {
    try {
      if (!currentUser) {
        console.error("Usuario no autenticado")
        return
      }

      // Buscar o crear cliente
      let clientId: number
      const existingClient = clients.find(
        (c) =>
          c.name.toLowerCase() ===
          `${appointmentData.nombrePaciente} ${appointmentData.apellidosPaciente || ""}`.toLowerCase().trim(),
      )

      if (existingClient) {
        clientId = existingClient.id
      } else {
        // Crear nuevo cliente usando el hook
        const newClient = await createClient({
          name: `${appointmentData.nombrePaciente} ${appointmentData.apellidosPaciente || ""}`.trim(),
          phone: appointmentData.telefonoPaciente,
          organization_id: currentUser.organization_id,
        })
        clientId = newClient.id
      }

      // Determinar el profesional
      let professionalUuid = currentUser.id // Por defecto, el usuario actual
      if (appointmentData.profesionalId) {
        // Buscar el profesional por el ID numérico convertido
        const prof = users.find((u) => Number.parseInt(u.id.slice(-8), 16) === appointmentData.profesionalId)
        if (prof) {
          professionalUuid = prof.id
        }
      }

      // Obtener o crear tipo de cita por defecto para el profesional
      const appointmentTypeId = await getDefaultAppointmentType(professionalUuid)

      // Determinar la consulta (opcional)
      let consultationId = appointmentData.consultationId || null

      // Solo buscar consulta automáticamente si no se especificó una y hay consultas disponibles
      if (!consultationId && consultations.length > 0) {
        const endTime = appointmentData.horaFin || calculateEndTime(appointmentData.hora, appointmentData.duracion)
        consultationId = await getFirstAvailableConsultation(
          format(appointmentData.fecha, "yyyy-MM-dd"),
          appointmentData.hora,
          endTime,
        )
      }

      const newAppointment: AppointmentInsert = {
        user_id: currentUser.id, // Usuario que crea la cita
        organization_id: currentUser.organization_id,
        professional_id: professionalUuid, // Profesional asignado
        client_id: clientId,
        appointment_type_id: appointmentTypeId,
        consultation_id: consultationId, // Puede ser null
        date: format(appointmentData.fecha, "yyyy-MM-dd"),
        start_time: appointmentData.hora,
        end_time: appointmentData.horaFin || calculateEndTime(appointmentData.hora, appointmentData.duracion),
        duration: appointmentData.duracion || 30,
        status: mapEstadoToStatus(appointmentData.estado) || "confirmed",
        notes: appointmentData.notas || undefined,
        created_by: currentUser.id,
      }

      await createAppointment(newAppointment)
      console.log("Cita creada correctamente")
    } catch (error) {
      console.error("Error creating appointment:", error)
    }
  }

  const handleUpdateAppointment = async (appointment: AppointmentWithDetails) => {
    try {
      await updateAppointment(appointment.id, {
        date: format(new Date(appointment.date), "yyyy-MM-dd"),
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        duration: appointment.duration,
        status: appointment.status,
        notes: appointment.notes || undefined,
        professional_id: appointment.professional_id,
        consultation_id: appointment.consultation_id, // Incluir consulta en la actualización
      })
    } catch (error) {
      console.error("Error updating appointment:", error)
      throw error // Re-lanzar el error para que se maneje en el componente
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      await deleteAppointment(appointmentId)
      setSelectedAppointment(null)
      setShowDetailsModal(false)
    } catch (error) {
      console.error("Error deleting appointment:", error)
    }
  }

  const handleSelectAppointment = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment)
    setShowDetailsModal(true)
  }

  // Handler para citas en formato legacy
  const handleSelectLegacyAppointment = (cita: any) => {
    // Buscar la cita original en el array de appointments
    const originalAppointment = appointments.find((apt) => {
      // Convertir el ID numérico de vuelta a UUID parcial para comparar
      const numericId = Number.parseInt(apt.id.slice(-8), 16)
      return numericId === cita.id
    })

    if (originalAppointment) {
      handleSelectAppointment(originalAppointment)
    } else {
      console.error("No se pudo cargar los detalles de la cita")
    }
  }

  // Handler para actualizar citas en formato legacy
  const handleUpdateLegacyAppointment = async (cita: any) => {
    // Buscar la cita original
    const originalAppointment = appointments.find((apt) => Number.parseInt(apt.id.slice(-8), 16) === cita.id)

    if (originalAppointment) {
      // Crear el objeto actualizado
      const updatedAppointment = {
        ...originalAppointment,
        date: format(cita.fecha, "yyyy-MM-dd"),
        start_time: cita.hora,
        end_time: cita.horaFin || calculateEndTime(cita.hora, cita.duracion),
        duration: cita.duracion,
        professional_id:
          users.find((u) => Number.parseInt(u.id.slice(-8), 16) === cita.profesionalId)?.id ||
          originalAppointment.professional_id,
      }

      await handleUpdateAppointment(updatedAppointment)
    } else {
      console.error("No se pudo encontrar la cita para actualizar")
    }
  }

  // Handlers de usuarios
  const handleToggleUsuario = (userId: string) => {
    setUsuariosSeleccionados((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleToggleAllUsuarios = () => {
    const todosSeleccionados = usuariosSeleccionados.length === users.length
    setUsuariosSeleccionados(todosSeleccionados ? [] : users.map((u) => u.id))
  }

  // Utility functions
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(":").map(Number)
    const totalMinutes = hours * 60 + minutes + duration
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`
  }

  // Formatear título de fecha
  const getDateTitle = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }

    switch (vistaCalendario) {
      case "dia":
        return currentDate.toLocaleDateString("es-ES", options)
      case "semana":
        return `Semana del ${currentDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
      case "mes":
        return currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
      default:
        return ""
    }
  }

  // Funciones helper para vacaciones
  const isUserOnVacationDate = (userId: string, date: Date | string): boolean => {
    const dateStr = typeof date === "string" ? date : format(date, "yyyy-MM-dd")
    return vacationRequests.some(
      (vacation) =>
        vacation.user_id === userId &&
        vacation.status === "approved" &&
        vacation.start_date <= dateStr &&
        vacation.end_date >= dateStr,
    )
  }

  const getUserVacationOnDate = (userId: string, date: Date | string) => {
    const dateStr = typeof date === "string" ? date : format(date, "yyyy-MM-dd")
    return (
      vacationRequests.find(
        (vacation) =>
          vacation.user_id === userId &&
          vacation.status === "approved" &&
          vacation.start_date <= dateStr &&
          vacation.end_date >= dateStr,
      ) || null
    )
  }

  const getBlockedUsersOnDate = (date: Date | string): string[] => {
    const dateStr = typeof date === "string" ? date : format(date, "yyyy-MM-dd")
    const blocked = vacationRequests
      .filter(
        (vacation) => vacation.status === "approved" && vacation.start_date <= dateStr && vacation.end_date >= dateStr,
      )
      .map((vacation) => vacation.user_id)

    return [...new Set(blocked)]
  }

  const convertAppointmentsToLegacyFormat = (appointments: AppointmentWithDetails[]) => {
    return appointments.map((apt) => ({
      id: Number.parseInt(apt.id.slice(-8), 16), // Convertir UUID a número para compatibilidad
      nombrePaciente: apt.client?.name?.split(" ")[0] || "Sin nombre",
      apellidosPaciente: apt.client?.name?.split(" ").slice(1).join(" ") || "",
      telefonoPaciente: apt.client?.phone || "",
      hora: apt.start_time,
      horaInicio: apt.start_time, // Agregar horaInicio
      horaFin: apt.end_time,
      duracion: apt.duration,
      tipo: apt.appointment_type?.name || "Consulta",
      notas: apt.notes || "",
      fecha: new Date(apt.date), // Asegurar que sea un objeto Date
      profesionalId: Number.parseInt(apt.professional_id.slice(-8), 16), // Convertir UUID a número
      estado: mapStatusToEstado(apt.status),
      consultationId: apt.consultation_id, // Incluir ID de consulta
      consultation: apt.consultation, // Incluir datos completos de consulta
      clienteId: apt.client_id, // Agregar clienteId
    }))
  }

  const convertUsersToLegacyFormat = (users: any[]) => {
    // Filtrar solo usuarios tipo 1 (profesionales médicos)
    const medicalProfessionals = users.filter((user) => user.type === 1)

    return medicalProfessionals.map((user) => ({
      id: Number.parseInt(user.id.slice(-8), 16), // Convertir UUID a número
      nombre: user.name || "",
      name: user.name || "",
      especialidad: user.settings?.specialty || "Medicina General",
      // Usar el color de la base de datos o un color por defecto
      color: user.settings?.calendar_color || "#3B82F6",
      type: user.type, // Incluir la propiedad type
      settings: user.settings,
    }))
  }

  // Mostrar loading si no tenemos organizationId o si los datos están cargando
  if (
    !organizationId ||
    usersLoading ||
    appointmentsLoading ||
    consultationsLoading ||
    clientsLoading ||
    servicesLoading ||
    vacationLoading
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Cargando...</h2>
          <p className="text-gray-600">Configurando tu calendario médico</p>
          {!organizationId && <p className="text-sm text-gray-500 mt-2">Esperando información de organización...</p>}
        </div>
      </div>
    )
  }

  // Mostrar errores si los hay
  if (clientsError || consultationsError || servicesError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error al cargar datos</h2>
          {clientsError && <p className="text-red-500">Clientes: {clientsError}</p>}
          {consultationsError && <p className="text-red-500">Consultas: {consultationsError}</p>}
          {servicesError && <p className="text-red-500">Servicios: {servicesError}</p>}
        </div>
      </div>
    )
  }

  const legacyAppointments = convertAppointmentsToLegacyFormat(appointments)
  const legacyUsers = convertUsersToLegacyFormat(users)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header simplificado */}
      <div className="border-b px-4 py-2 bg-white">
        <h1 className="text-lg font-semibold">Calendario Médico</h1>
      </div>

      {/* Tabs principales reorganizados */}
      <div className="border-b">
        <Tabs value={tabPrincipal} onValueChange={(value) => setTabPrincipal(value as TabPrincipal)}>
          <div className="px-4 py-2">
            <TabsList>
              <TabsTrigger value="calendario">📅 Calendario</TabsTrigger>
              <TabsTrigger value="lista-espera">📋 Lista de espera</TabsTrigger>
              <TabsTrigger value="actividades-grupales">👥 Actividades grupales</TabsTrigger>
              <TabsTrigger value="usuarios" className="text-green-600">
                👤 Usuarios
              </TabsTrigger>
              <TabsTrigger value="consultas" className="text-green-600">
                🏥 Consultas
              </TabsTrigger>
              <TabsTrigger value="servicios" className="text-green-600">
                ⚕️ Servicios
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-hidden">
        {tabPrincipal === "calendario" && (
          <div className="h-full flex flex-col">
            {/* Barra de herramientas reorganizada */}
            <div className="border-b px-4 py-2">
              <div className="flex items-center justify-between">
                {/* Tabs de vista temporal */}
                <Tabs value={vistaCalendario} onValueChange={(value) => setVistaCalendario(value as VistaCalendario)}>
                  <TabsList>
                    <TabsTrigger value="dia">Día</TabsTrigger>
                    <TabsTrigger value="semana">Semana</TabsTrigger>
                    <TabsTrigger value="mes">Mes</TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Controles de navegación y herramientas unificados */}
                <div className="flex items-center gap-2">
                  {/* Navegación: antes-hoy-después */}
                  <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Hoy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* Separador visual */}
                  <div className="w-px h-6 bg-border mx-2" />

                  {/* Lupa - Búsqueda */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSearch(!showSearch)}
                      className={showSearch ? "bg-muted" : ""}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    {showSearch && (
                      <div className="absolute top-full left-0 mt-1 w-64 z-50">
                        <CalendarSearch
                          citas={legacyAppointments}
                          onSelectCita={handleSelectLegacyAppointment}
                          placeholder="Buscar citas..."
                        />
                      </div>
                    )}
                  </div>

                  {/* Profesionales - Usuarios */}
                  <div className="relative">
                    <ProfesionalesLegend
                      profesionales={legacyUsers}
                      profesionalesSeleccionados={usuariosSeleccionados.map((id) => {
                        // Safely convert UUID to number, with fallback
                        try {
                          return Number.parseInt(id.slice(-8), 16)
                        } catch {
                          return 0
                        }
                      })}
                      onToggleProfesional={(profesionalId) => {
                        const userId = users.find((u) => {
                          try {
                            return Number.parseInt(u.id.slice(-8), 16) === profesionalId
                          } catch {
                            return false
                          }
                        })?.id
                        if (userId) handleToggleUsuario(userId)
                      }}
                      onToggleAll={handleToggleAllUsuarios}
                    />
                  </div>

                  {/* Ajustes - Select compacto */}
                  <Select
                    value={intervaloTiempo.toString()}
                    onValueChange={(value) => setIntervaloTiempo(Number(value) as IntervaloTiempo)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Programar cita - "+" */}
                  <Button onClick={() => setShowNewAppointmentModal(true)} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Sub-navegación del calendario */}
            <div className="border-b">
              <div className="px-4 py-2">
                <Tabs
                  value={subVistaCalendario}
                  onValueChange={(value) => setSubVistaCalendario(value as SubVistaCalendario)}
                >
                  <TabsList>
                    <TabsTrigger value="horario">Horario</TabsTrigger>
                    <TabsTrigger value="lista">Lista</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Título de fecha único */}
            <div className="px-4 py-3 border-b">
              <h2 className="text-xl font-medium capitalize">{getDateTitle()}</h2>
            </div>

            {/* Vista del calendario */}
            <div className="flex-1 overflow-auto">
              {subVistaCalendario === "horario" && (
                <>
                  {vistaCalendario === "dia" && (
                    <HorarioViewDynamic
                      date={currentDate}
                      citas={legacyAppointments.filter((cita) => {
                        const citaDate = new Date(cita.fecha)
                        return citaDate.toDateString() === currentDate.toDateString()
                      })}
                      profesionales={legacyUsers.filter((user) =>
                        usuariosSeleccionados.some((selectedId) => {
                          try {
                            return Number.parseInt(selectedId.slice(-8), 16) === user.id
                          } catch {
                            return false
                          }
                        }),
                      )}
                      users={users.filter((user) => usuariosSeleccionados.includes(user.id))}
                      onSelectCita={handleSelectLegacyAppointment}
                      profesionalSeleccionado="todos"
                      profesionalesSeleccionados={usuariosSeleccionados.map((id) => {
                        try {
                          return Number.parseInt(id.slice(-8), 16)
                        } catch {
                          return 0
                        }
                      })}
                      intervaloTiempo={intervaloTiempo}
                      onUpdateCita={handleUpdateLegacyAppointment}
                      onAddCita={handleAddAppointment}
                      vacationRequests={vacationRequests}
                      isUserOnVacationDate={isUserOnVacationDate}
                      getUserVacationOnDate={getUserVacationOnDate}
                    />
                  )}
                  {vistaCalendario === "semana" && (
                    <WeekView
                      date={currentDate}
                      citas={legacyAppointments}
                      profesionales={legacyUsers}
                      onSelectCita={handleSelectLegacyAppointment}
                      profesionalesSeleccionados={usuariosSeleccionados.map((id) => {
                        try {
                          return Number.parseInt(id.slice(-8), 16)
                        } catch {
                          return 0
                        }
                      })}
                      intervaloTiempo={intervaloTiempo}
                      onUpdateCita={handleUpdateLegacyAppointment}
                      onAddCita={handleAddAppointment}
                      vacationRequests={vacationRequests}
                      isUserOnVacationDate={isUserOnVacationDate}
                      getUserVacationOnDate={getUserVacationOnDate}
                    />
                  )}
                  {vistaCalendario === "mes" && (
                    <MonthView
                      date={currentDate}
                      citas={legacyAppointments}
                      profesionales={legacyUsers}
                      onSelectCita={handleSelectLegacyAppointment}
                      profesionalesSeleccionados={usuariosSeleccionados.map((id) => {
                        try {
                          return Number.parseInt(id.slice(-8), 16)
                        } catch {
                          return 0
                        }
                      })}
                      onUpdateCita={handleUpdateLegacyAppointment}
                      onAddCita={handleAddAppointment}
                      vacationRequests={vacationRequests}
                      isUserOnVacationDate={isUserOnVacationDate}
                      getUserVacationOnDate={getUserVacationOnDate}
                    />
                  )}
                </>
              )}
              {subVistaCalendario === "lista" && (
                <ListView
                  citas={legacyAppointments}
                  profesionales={legacyUsers}
                  onSelectCita={handleSelectLegacyAppointment}
                  profesionalesSeleccionados={usuariosSeleccionados.map((id) => {
                    try {
                      return Number.parseInt(id.slice(-8), 16)
                    } catch {
                      return 0
                    }
                  })}
                />
              )}
            </div>
          </div>
        )}

        {tabPrincipal === "lista-espera" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto p-4">
              <WaitingListView
                organizationId={organizationId}
                onScheduleAppointment={(entry) => {
                  // Aquí podríamos abrir el modal de crear cita con los datos pre-rellenados
                  console.log("Programar cita para:", entry)
                  setShowNewAppointmentModal(true)
                }}
              />
            </div>
          </div>
        )}

        {tabPrincipal === "actividades-grupales" && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b">
              <h2 className="text-xl font-medium">Actividades grupales</h2>
            </div>
            
          </div>
        )}

        {tabPrincipal === "usuarios" && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b">
              <h2 className="text-xl font-medium text-green-600">Usuarios</h2>
            </div>
            <div className="flex-1 overflow-auto">
              <ProfesionalesView
                profesionales={legacyUsers}
                citas={legacyAppointments}
                users={users}
                onSelectCita={handleSelectLegacyAppointment}
                onRefreshUsers={refetchUsers}
                vacationRequests={vacationRequests}
                isUserOnVacationDate={isUserOnVacationDate}
                getUserVacationOnDate={getUserVacationOnDate}
              />
            </div>
          </div>
        )}

        {tabPrincipal === "consultas" && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b">
              <h2 className="text-xl font-medium text-green-600">Consultas</h2>
            </div>
            <div className="flex-1 overflow-auto">
              <ConsultationsView consultations={consultations} onRefreshConsultations={refetchConsultations} />
            </div>
          </div>
        )}

        {tabPrincipal === "servicios" && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b">
              <h2 className="text-xl font-medium text-green-600">Servicios</h2>
            </div>
            <div className="flex-1 overflow-auto">
              <ServicesView organizationId={organizationId} onRefreshServices={refetchServices} />
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {showNewAppointmentModal && (
        <AppointmentFormModal
          fecha={new Date()}
          hora="09:00"
          onClose={() => setShowNewAppointmentModal(false)}
          onSubmit={handleAddAppointment}
        />
      )}

      {showDetailsModal && selectedAppointment && (
        <AppointmentDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedAppointment(null)
          }}
          appointment={selectedAppointment}
          onUpdate={handleUpdateAppointment}
          onDelete={handleDeleteAppointment}
        />
      )}
    </div>
  )
}

export default MedicalCalendarSystem
