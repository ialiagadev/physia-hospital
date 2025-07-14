"use client"

import type React from "react"
import { useMemo } from "react"
import { GroupActivitiesProvider,useGroupActivitiesContext } from "@/app/contexts/group-activities-context"
import type { AppointmentWithDetails } from "@/types/calendar"

interface CalendarGroupActivitiesWrapperProps {
  organizationId: number
  users: any[]
  appointments: AppointmentWithDetails[]
  children: (combinedData: {
    combinedAppointments: any[]
    legacyUsers: any[]
  }) => React.ReactNode
}

// ✅ COMPONENTE INTERNO QUE USA EL CONTEXTO
function CalendarWithCombinedData({
  appointments,
  users,
  children,
}: {
  appointments: AppointmentWithDetails[]
  users: any[]
  children: (combinedData: { combinedAppointments: any[]; legacyUsers: any[] }) => React.ReactNode
}) {
  // ✅ USAR EL CONTEXTO AQUÍ
  const { activities: groupActivities } = useGroupActivitiesContext()

  // ✅ FUNCIONES DE CONVERSIÓN
  const mapStatusToEstado = (status: string) => {
    const mapping = {
      confirmed: "confirmada",
      pending: "pendiente",
      cancelled: "cancelada",
      completed: "completada",
      no_show: "no_show",
    } as const
    return mapping[status as keyof typeof mapping] || "confirmada"
  }

  const calculateDurationFromTimes = (startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const [endHours, endMinutes] = endTime.split(":").map(Number)
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = endHours * 60 + endMinutes
    return endTotalMinutes - startTotalMinutes
  }

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

  const convertGroupActivitiesToLegacyFormat = (activities: any[]) => {
    return activities.map((activity) => ({
      id: `group_${activity.id}`,
      nombrePaciente: `👥 ${activity.name}`,
      apellidosPaciente: `(${activity.current_participants}/${activity.max_participants})`,
      telefonoPaciente: activity.professional?.name || "Sin asignar",
      hora: activity.start_time,
      horaInicio: activity.start_time,
      horaFin: activity.end_time,
      duracion: calculateDurationFromTimes(activity.start_time, activity.end_time),
      tipo: "Actividad Grupal",
      notas: activity.description || "",
      fecha: new Date(activity.date),
      profesionalId: users.find((u) => u.id === activity.professional_id)
        ? Number.parseInt(users.find((u) => u.id === activity.professional_id)!.id.slice(-8), 16)
        : 0,
      estado:
        activity.status === "active" ? "confirmada" : activity.status === "completed" ? "completada" : "cancelada",
      consultationId: activity.consultation_id,
      consultation: activity.consultation,
      isGroupActivity: true,
      groupActivityData: activity,
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

  // ✅ DATOS COMBINADOS CON useMemo PARA OPTIMIZACIÓN
  const combinedData = useMemo(() => {
    const legacyAppointments = convertAppointmentsToLegacyFormat(appointments)
    const legacyGroupActivities = convertGroupActivitiesToLegacyFormat(groupActivities)
    const legacyUsers = convertUsersToLegacyFormat(users)

    return {
      combinedAppointments: [...legacyAppointments, ...legacyGroupActivities],
      legacyUsers,
    }
  }, [appointments, groupActivities, users])

  return children(combinedData)
}

// ✅ WRAPPER PRINCIPAL
export function CalendarGroupActivitiesWrapper({
  organizationId,
  users,
  appointments,
  children,
}: CalendarGroupActivitiesWrapperProps) {
  return (
    <GroupActivitiesProvider organizationId={organizationId} users={users}>
      <CalendarWithCombinedData appointments={appointments} users={users}>
        {children}
      </CalendarWithCombinedData>
    </GroupActivitiesProvider>
  )
}
