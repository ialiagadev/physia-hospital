"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, Search, Clock, FileText } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarSearch } from "@/components/calendar/calendar-search"
import { ProfesionalesLegend } from "@/components/calendar/profesionales-legend"
import { AppointmentFormModal } from "@/components/calendar/appointment-form-modal"
import { AppointmentDetailsModal } from "@/components/calendar/appointment-details-modal"
import { DailyBillingModal } from "../calendar/daily-billing-modal"
import { ListView } from "@/components/calendar/list-view"
import { ProfesionalesView } from "@/components/calendar/profesionales-view"
import { ConsultationsView } from "@/components/calendar/consultations-view"
import { ServicesView } from "@/components/services/services-view"
import { GroupActivityDetailsModal } from "@/components/group-activities/group-activity-details-modal"
import { useUsers } from "@/hooks/use-users"
import { useAppointments } from "@/hooks/use-appointments"
import { useClients } from "@/hooks/use-clients"
import { useConsultations } from "@/hooks/use-consultations"
import { useServices } from "@/hooks/use-services"
import { useVacations } from "@/hooks/use-vacations"
import { useWorkSchedules } from "@/hooks/use-work-schedules"
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
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { GroupActivitiesWrapper } from "../group-activities-wrapper"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarGroupActivitiesWrapper } from "../calendar/calendar-group-activities-wrapper"
import { useGroupActivitiesContext } from "@/app/contexts/group-activities-context"

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
  const [showDailyBillingModal, setShowDailyBillingModal] = useState(false)

  // Estados para actividades grupales
  const [showGroupActivityDetails, setShowGroupActivityDetails] = useState(false)
  const [selectedGroupActivity, setSelectedGroupActivity] = useState<any>(null)

  // Estado para datos de lista de espera
  const [waitingListEntry, setWaitingListEntry] = useState<any>(null)

  // Función para eliminar entrada de lista de espera
  const removeFromWaitingList = async (entryId: string) => {
    try {
      const { error } = await supabase.from("waiting_list").delete().eq("id", entryId)
      if (error) throw error
      toast.success("Entrada eliminada de la lista de espera")
    } catch (error) {
      console.error("Error removing from waiting list:", error)
      toast.error("Error al eliminar de la lista de espera")
    }
  }

  // Hooks de datos optimizados
  const { users, currentUser, loading: usersLoading, refetch: refetchUsers } = useUsers(organizationId)
  const { clients, loading: clientsLoading, error: clientsError, createClient } = useClients(organizationId)
  const {
    consultations,
    loading: consultationsLoading,
    error: consultationsError,
    refetch: refetchConsultations,
    getFirstAvailableConsultation,
  } = useConsultations(organizationId)
  const {
    services,
    loading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useServices(organizationId)

  // Hook de vacaciones optimizado
  const {
    vacationRequests,
    loading: vacationLoading,
    isUserOnVacation: isUserOnVacationHook,
    getUserVacation,
    getAvailableUsers,
  } = useVacations(organizationId)

  // Hook de horarios de trabajo
  const { schedules: allWorkSchedules, loading: schedulesLoading } = useWorkSchedules(organizationId?.toString())

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

  // ✅ FUNCIÓN MEJORADA PARA VERIFICAR CITAS DEL DÍA
  const hasAppointmentsToday = () => {
    const today = format(currentDate, "yyyy-MM-dd")
    return appointments.some((apt) => format(new Date(apt.date), "yyyy-MM-dd") === today)
  }

  // ✅ FUNCIÓN ESPECÍFICA PARA CITAS COMPLETADAS (OPCIONAL)
  const hasCompletedAppointmentsToday = () => {
    const today = format(currentDate, "yyyy-MM-dd")
    return appointments.some((apt) => format(new Date(apt.date), "yyyy-MM-dd") === today && apt.status === "completed")
  }

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
      const { data: existingType } = await supabase
        .from("appointment_types")
        .select("id")
        .eq("user_id", userId)
        .eq("name", "Consulta General")
        .single()

      if (existingType) {
        return existingType.id
      }

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
      throw error
    }
  }

  // Handlers de citas optimizados
  const handleAddAppointment = async (appointmentData: any) => {
    try {
      if (!currentUser) {
        return
      }

      // Buscar cliente existente - VERIFICAR SI YA VIENE SELECCIONADO
      let clientId: number

      // Si ya hay un cliente seleccionado desde el modal, usarlo
      if (appointmentData.clienteEncontrado) {
        clientId = appointmentData.clienteEncontrado.id
      } else {
        // Buscar primero por teléfono (restricción única)
        let existingClient = null
        if (appointmentData.telefonoPaciente) {
          existingClient = clients.find((c) => c.phone === appointmentData.telefonoPaciente)
        }

        // Si no encuentra por teléfono, buscar por nombre
        if (!existingClient) {
          const fullName = `${appointmentData.nombrePaciente} ${appointmentData.apellidosPaciente || ""}`
            .toLowerCase()
            .trim()
          existingClient = clients.find((c) => c.name.toLowerCase() === fullName)
        }

        if (existingClient) {
          clientId = existingClient.id
        } else {
          // Crear nuevo cliente solo si no existe
          const newClient = await createClient({
            name: `${appointmentData.nombrePaciente} ${appointmentData.apellidosPaciente || ""}`.trim(),
            phone: appointmentData.telefonoPaciente,
            organization_id: currentUser.organization_id,
          })
          clientId = newClient.id
        }
      }
      // Determinar el profesional
      let professionalUuid = currentUser.id
      if (appointmentData.profesionalId) {
        const prof = users.find((u) => {
          const numericId = Number.parseInt(u.id.slice(-8), 16)
          return numericId === appointmentData.profesionalId
        })
        if (prof) {
          professionalUuid = prof.id
        }
      }

      const appointmentTypeId = await getDefaultAppointmentType(professionalUuid)

      let consultationId = null
      if (appointmentData.consultationId && appointmentData.consultationId !== "none") {
        consultationId = appointmentData.consultationId
      }

      const newAppointment: AppointmentInsert = {
        user_id: currentUser.id,
        organization_id: currentUser.organization_id,
        professional_id: professionalUuid,
        client_id: clientId,
        appointment_type_id: appointmentTypeId,
        consultation_id: consultationId,
        date: format(appointmentData.fecha, "yyyy-MM-dd"),
        start_time: appointmentData.hora,
        end_time: appointmentData.horaFin || calculateEndTime(appointmentData.hora, appointmentData.duracion),
        duration: appointmentData.duracion || 30,
        status: mapEstadoToStatus(appointmentData.estado) || "confirmed",
        notes: appointmentData.notas || undefined,
        created_by: currentUser.id,
        service_id: appointmentData.service_id || null,
        // Campos de recurrencia
        is_recurring: appointmentData.isRecurring || false,
        recurrence_type: appointmentData.isRecurring ? appointmentData.recurrenceType || "weekly" : null,
        recurrence_interval: appointmentData.isRecurring ? appointmentData.recurrenceInterval || 1 : null,
        recurrence_end_date:
          appointmentData.isRecurring && appointmentData.recurrenceEndDate
            ? format(appointmentData.recurrenceEndDate, "yyyy-MM-dd")
            : null,
        parent_appointment_id: appointmentData.parentAppointmentId || null,
      }

      await createAppointment(newAppointment)

      // Si viene de lista de espera, eliminarla después de crear la cita
      if (waitingListEntry?.id) {
        await removeFromWaitingList(waitingListEntry.id)
      }

      toast.success("Cita creada correctamente")
    } catch (error) {
      console.error("Error creating appointment:", error)
      toast.error("Error al crear la cita")
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
        consultation_id: appointment.consultation_id,
      })
    } catch (error) {
      throw error
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      await deleteAppointment(appointmentId)
    } catch (error) {
      console.error("Error al eliminar la cita:", error)
    } finally {
      // Siempre resetear los estados, incluso si hay error
      setSelectedAppointment(null)
      setShowDetailsModal(false)
    }
  }

  const handleSelectAppointment = (appointment: AppointmentWithDetails) => {
    setSelectedAppointment(appointment)
    setShowDetailsModal(true)
  }

  // Handler para actividades grupales
  const handleSelectGroupActivity = (cita: any) => {
    if (cita.isGroupActivity && cita.groupActivityData) {
      setSelectedGroupActivity(cita.groupActivityData)
      setShowGroupActivityDetails(true)
    }
  }

  // Handler para citas en formato legacy - ACTUALIZADO
  const handleSelectLegacyAppointment = (cita: any) => {
    // Si es actividad grupal, usar el handler específico
    if (cita.isGroupActivity) {
      handleSelectGroupActivity(cita)
      return
    }

    // Para citas normales, mantener la lógica existente
    const originalAppointment = appointments.find((apt) => {
      const numericId = Number.parseInt(apt.id.slice(-8), 16)
      return numericId === cita.id
    })

    if (originalAppointment) {
      handleSelectAppointment(originalAppointment)
    }
  }

  // Handler para actualizar citas en formato legacy
  const handleUpdateLegacyAppointment = async (cita: any) => {
    const originalAppointment = appointments.find((apt) => Number.parseInt(apt.id.slice(-8), 16) === cita.id)
    if (originalAppointment) {
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
  const isUserOnVacationDate = isUserOnVacationHook
  const getUserVacationOnDate = getUserVacation

  // FUNCIONES DE CONVERSIÓN SIMPLIFICADAS PARA OTRAS VISTAS
  const convertAppointmentsToLegacyFormat = (appointments: AppointmentWithDetails[]) => {
    return appointments.map((apt) => ({
      id: Number.parseInt(apt.id.slice(-8), 16),
      nombrePaciente: apt.client?.name?.split(" ")[0] || "Sin nombre",
      apellidosPaciente: apt.client?.name?.split(" ").slice(1).join(" ") || "",
      telefonoPaciente: apt.client?.phone || "",
      hora: apt.start_time,
      horaInicio: apt.start_time,
      horaFin: apt.end_time,
      duracion: apt.duration,
      tipo: apt.appointment_type?.name || "Consulta",
      notas: apt.notes || "",
      fecha: new Date(apt.date),
      profesionalId: Number.parseInt(apt.professional_id.slice(-8), 16),
      estado: mapStatusToEstado(apt.status),
      consultationId: apt.consultation_id,
      consultation: apt.consultation,
      clienteId: apt.client_id,
    }))
  }

  const convertUsersToLegacyFormat = (users: any[]) => {
    const medicalProfessionals = users.filter((user) => user.type === 1)
    return medicalProfessionals.map((user) => ({
      id: Number.parseInt(user.id.slice(-8), 16),
      nombre: user.name || "",
      name: user.name || "",
      especialidad: user.settings?.specialty || "Medicina General",
      color: user.settings?.calendar_color || "#3B82F6",
      type: user.type,
      settings: user.settings,
    }))
  }

  // COMPONENTE PARA HANDLERS DE ACTIVIDADES GRUPALES
  function GroupActivityHandlers({ children }: { children: React.ReactNode }) {
    const {
      updateActivity: updateGroupActivity,
      deleteActivity: deleteGroupActivity,
      addParticipant: addGroupActivityParticipant,
      removeParticipant: removeGroupActivityParticipant,
    } = useGroupActivitiesContext()

    // HANDLERS MEJORADOS PARA ACTIVIDADES GRUPALES
    const handleAddGroupActivityParticipant = async (activityId: string, clientId: number, notes?: string) => {
      try {
        await addGroupActivityParticipant(activityId, clientId, notes)
        toast.success("Participante añadido correctamente")
        setShowGroupActivityDetails(false)
        setSelectedGroupActivity(null)
      } catch (error) {
        console.error("Error adding participant:", error)
        toast.error("Error al añadir participante")
        throw error
      }
    }

    const handleRemoveGroupActivityParticipant = async (participantId: string) => {
      try {
        await removeGroupActivityParticipant(participantId)
        toast.success("Participante eliminado correctamente")
        setShowGroupActivityDetails(false)
        setSelectedGroupActivity(null)
      } catch (error) {
        console.error("Error removing participant:", error)
        toast.error("Error al eliminar participante")
        throw error
      }
    }

    const handleUpdateGroupActivity = async (id: string, updates: any) => {
      try {
        await updateGroupActivity(id, updates)
        toast.success("Actividad actualizada correctamente")
      } catch (error) {
        console.error("Error updating group activity:", error)
        toast.error("Error al actualizar la actividad")
        throw error
      }
    }

    const handleDeleteGroupActivity = async (id: string) => {
      try {
        await deleteGroupActivity(id)
        toast.success("Actividad eliminada correctamente")
        setShowGroupActivityDetails(false)
        setSelectedGroupActivity(null)
      } catch (error) {
        console.error("Error deleting group activity:", error)
        toast.error("Error al eliminar la actividad")
        throw error
      }
    }

    return (
      <>
        {children}
        {/* Modal de detalles de actividad grupal */}
        {showGroupActivityDetails && selectedGroupActivity && (
          <GroupActivityDetailsModal
            isOpen={showGroupActivityDetails}
            onClose={() => {
              setShowGroupActivityDetails(false)
              setSelectedGroupActivity(null)
            }}
            activity={selectedGroupActivity}
            onUpdate={handleUpdateGroupActivity}
            onDelete={handleDeleteGroupActivity}
            onAddParticipant={handleAddGroupActivityParticipant}
            onRemoveParticipant={handleRemoveGroupActivityParticipant}
            organizationId={organizationId!}
            users={users}
            services={services}
          />
        )}
      </>
    )
  }

  // Mostrar loading si no tenemos organizationId o si los datos están cargando
  if (
    !organizationId ||
    usersLoading ||
    appointmentsLoading ||
    consultationsLoading ||
    clientsLoading ||
    servicesLoading ||
    vacationLoading ||
    schedulesLoading
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
          <CalendarGroupActivitiesWrapper organizationId={organizationId} users={users} appointments={appointments}>
            {({ combinedAppointments, legacyUsers: wrapperLegacyUsers }) => (
              <GroupActivityHandlers>
                <div className="h-full flex flex-col">
                  {/* Barra de herramientas reorganizada */}
                  <div className="border-b px-4 py-2">
                    <div className="flex items-center justify-between">
                      {/* Tabs de vista temporal y sub-vista JUNTAS */}
                      <div className="flex items-center gap-4">
                        <Tabs
                          value={vistaCalendario}
                          onValueChange={(value) => setVistaCalendario(value as VistaCalendario)}
                        >
                          <TabsList>
                            <TabsTrigger value="dia">Día</TabsTrigger>
                            <TabsTrigger value="semana">Semana</TabsTrigger>
                            <TabsTrigger value="mes">Mes</TabsTrigger>
                          </TabsList>
                        </Tabs>

                        {/* Separador visual */}
                        <div className="w-px h-6 bg-border" />

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
                                citas={combinedAppointments}
                                onSelectCita={handleSelectLegacyAppointment}
                                placeholder="Buscar citas..."
                              />
                            </div>
                          )}
                        </div>

                        {/* Profesionales - SOLO ICONO */}
                        <div className="relative">
                          <ProfesionalesLegend
                            profesionales={wrapperLegacyUsers}
                            profesionalesSeleccionados={usuariosSeleccionados.map((id) => {
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
                            iconOnly={true}
                          />
                        </div>

                        {/* Tiempo - SOLO ICONO */}
                        <Select
                          value={intervaloTiempo.toString()}
                          onValueChange={(value) => setIntervaloTiempo(Number(value) as IntervaloTiempo)}
                        >
                          <SelectTrigger className="w-10">
                            <Clock className="h-16 w-16" />
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

                        {/* ✅ BOTÓN FACTURAR DÍA MEJORADO - Solo en vista día y si hay citas */}
                        {vistaCalendario === "dia" && hasAppointmentsToday() && (
                          <Button
                            onClick={() => setShowDailyBillingModal(true)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Facturar Día
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Título de fecha único - AHORA CLICKEABLE */}
                  <div className="px-4 py-3 border-b">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" className="text-xl font-medium capitalize hover:bg-muted/50 p-0 h-auto">
                          {getDateTitle()}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={currentDate}
                          onSelect={(date) => {
                            if (date) {
                              setCurrentDate(date)
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Vista del calendario */}
                  <div className="flex-1 overflow-auto">
                    {subVistaCalendario === "horario" && (
                      <>
                        {vistaCalendario === "dia" && (
                          <HorarioViewDynamic
                            date={currentDate}
                            citas={combinedAppointments.filter((cita) => {
                              const citaDate = new Date(cita.fecha)
                              return citaDate.toDateString() === currentDate.toDateString()
                            })}
                            profesionales={wrapperLegacyUsers.filter((user) =>
                              usuariosSeleccionados.some((selectedId) => {
                                try {
                                  return Number.parseInt(selectedId.slice(-8), 16) === user.id
                                } catch {
                                  return false
                                }
                              }),
                            )}
                            users={users.filter((user) => usuariosSeleccionados.includes(user.id))}
                            workSchedules={allWorkSchedules}
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
                            citas={combinedAppointments}
                            profesionales={wrapperLegacyUsers}
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
                            citas={combinedAppointments}
                            profesionales={wrapperLegacyUsers}
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
                        citas={combinedAppointments}
                        profesionales={wrapperLegacyUsers}
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
              </GroupActivityHandlers>
            )}
          </CalendarGroupActivitiesWrapper>
        )}

        {tabPrincipal === "lista-espera" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-auto p-4">
              <WaitingListView
                organizationId={organizationId}
                onScheduleAppointment={(entry) => {
                  setWaitingListEntry(entry)
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
            <div className="flex-1 overflow-auto">
              <GroupActivitiesWrapper organizationId={organizationId} users={users} />
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
                citas={convertAppointmentsToLegacyFormat(appointments)}
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
          fecha={currentDate}
          hora="09:00"
          waitingListEntry={waitingListEntry}
          onClose={() => {
            setShowNewAppointmentModal(false)
            setWaitingListEntry(null)
          }}
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

      {/* ✅ MODAL DE FACTURACIÓN DIARIA ACTUALIZADO */}
      {showDailyBillingModal && (
        <DailyBillingModal
          isOpen={showDailyBillingModal}
          onClose={() => setShowDailyBillingModal(false)}
          selectedDate={currentDate}
        />
      )}
    </div>
  )
}

export default MedicalCalendarSystem
