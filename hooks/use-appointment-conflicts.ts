"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

interface ConflictAppointment {
  id: string
  client_name: string
  start_time: string
  end_time: string
  professional_name: string
  status: string
  type: "appointment" | "group_activity" | "work_break" | "outside_hours"
}

interface ScheduleBreak {
  id: string
  break_name: string
  start_time: string
  end_time: string
  is_active: boolean
}

export function useAppointmentConflicts(organizationId?: number) {
  const [conflicts, setConflicts] = useState<ConflictAppointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkConflicts = useCallback(
    async (
      date: Date | string,
      startTime: string,
      duration: number,
      professionalId: string,
      excludeAppointmentId?: string,
      excludeGroupActivityId?: string,
    ) => {
      if (!organizationId || !date || !startTime || !duration || !professionalId) {
        setConflicts([])
        return []
      }

      setLoading(true)
      setError(null)

      try {
        const dateString =
          typeof date === "string"
            ? date
            : `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`
        const appointmentDate = new Date(dateString)
        const dayOfWeek = appointmentDate.getDay() // 0=Domingo, 1=Lunes, etc.

        const [hours, minutes] = startTime.split(":").map(Number)
        const totalMinutes = hours * 60 + minutes + duration
        const endHours = Math.floor(totalMinutes / 60)
        const endMinutes = totalMinutes % 60
        const endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`

        // 1. Verificar citas individuales
        let appointmentsQuery = supabase
          .from("appointments")
          .select(`
            id,
            start_time,
            end_time,
            status,
            clients!inner (
              name
            ),
            professional:users!professional_id (
              name,
              email
            )
          `)
          .eq("organization_id", organizationId)
          .eq("date", dateString)
          .eq("professional_id", professionalId)
          .neq("status", "cancelled")
          .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`)

        if (excludeAppointmentId) {
          appointmentsQuery = appointmentsQuery.neq("id", excludeAppointmentId)
        }

        const { data: appointments, error: appointmentsError } = await appointmentsQuery

        if (appointmentsError) {
          setError(appointmentsError.message)
          return []
        }

        // 2. Verificar actividades grupales
        let groupQuery = supabase
          .from("group_activities")
          .select(`
            id,
            name,
            start_time,
            end_time,
            status,
            professional:users!professional_id (
              name,
              email
            )
          `)
          .eq("organization_id", organizationId)
          .eq("date", dateString)
          .eq("professional_id", professionalId)
          .neq("status", "cancelled")
          .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`)

        if (excludeGroupActivityId) {
          groupQuery = groupQuery.neq("id", excludeGroupActivityId)
        }

        const { data: groupActivities, error: groupError } = await groupQuery

        if (groupError) {
          setError(groupError.message)
          return []
        }

        // 3. Verificar horarios de trabajo y descansos
        let workSchedules = null
        let currentScheduleId = null

        // Primero buscar excepciones para esta fecha específica
        const { data: exceptionSchedules, error: exceptionError } = await supabase
          .from("work_schedules")
          .select(`
            id,
            start_time,
            end_time,
            break_start,
            break_end,
            buffer_time_minutes,
            is_exception,
            date_exception
          `)
          .eq("user_id", professionalId)
          .eq("is_active", true)
          .eq("is_exception", true)
          .eq("date_exception", dateString)

        if (exceptionSchedules && exceptionSchedules.length > 0) {
          workSchedules = exceptionSchedules
          currentScheduleId = exceptionSchedules[0].id
        } else {
          // Si no hay excepciones, buscar horario regular para este día
          const { data: regularSchedules, error: regularError } = await supabase
            .from("work_schedules")
            .select(`
              id,
              start_time,
              end_time,
              break_start,
              break_end,
              buffer_time_minutes,
              day_of_week,
              is_exception
            `)
            .eq("user_id", professionalId)
            .eq("is_active", true)
            .eq("day_of_week", dayOfWeek)
            .eq("is_exception", false)

          if (regularSchedules && regularSchedules.length > 0) {
            workSchedules = regularSchedules
            currentScheduleId = regularSchedules[0].id
          }

          if (regularError) {
            console.warn("Error obteniendo horarios regulares:", regularError)
          }
        }

        // Obtener los descansos del horario específico del día
        let scheduleBreaks: ScheduleBreak[] = []
        if (currentScheduleId) {
          const { data: breaks, error: breaksError } = await supabase
            .from("work_schedule_breaks")
            .select(`
              id,
              break_name,
              start_time,
              end_time,
              is_active,
              work_schedule_id
            `)
            .eq("work_schedule_id", currentScheduleId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true })

          if (breaks && !breaksError) {
            scheduleBreaks = breaks as ScheduleBreak[]
          }

          if (breaksError) {
            console.warn("Error obteniendo descansos del horario:", breaksError)
          }
        }

        if (exceptionError) {
          console.warn("Error obteniendo excepciones de horario:", exceptionError)
        }

        // 4. Procesar conflictos con horarios y descansos
        const workConflicts: ConflictAppointment[] = []

        if (workSchedules && workSchedules.length > 0) {
          for (const schedule of workSchedules) {
            // Verificar si está fuera del horario laboral
            if (startTime < schedule.start_time || endTime > schedule.end_time) {
              workConflicts.push({
                id: `outside-hours-${schedule.id}`,
                client_name: `🚫 Fuera del horario laboral (${schedule.start_time} - ${schedule.end_time})`,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                professional_name: "Sistema",
                status: "blocked",
                type: "outside_hours",
              })
            }

            // Verificar conflicto con descanso principal (break_start/break_end)
            if (schedule.break_start && schedule.break_end) {
              const breakOverlap = !(endTime <= schedule.break_start || startTime > schedule.break_end)

              if (breakOverlap) {
                workConflicts.push({
                  id: `main-break-${schedule.id}`,
                  client_name: `☕ Descanso principal`,
                  start_time: schedule.break_start,
                  end_time: schedule.break_end,
                  professional_name: "Sistema",
                  status: "blocked",
                  type: "work_break",
                })
              }
            }

            // Verificar conflictos con descansos adicionales del día específico
            for (const breakItem of scheduleBreaks) {
              const breakOverlap = !(endTime <= breakItem.start_time || startTime > breakItem.end_time)

              if (breakOverlap) {
                workConflicts.push({
                  id: `break-${breakItem.id}`,
                  client_name: `☕ ${breakItem.break_name}`,
                  start_time: breakItem.start_time,
                  end_time: breakItem.end_time,
                  professional_name: "Sistema",
                  status: "blocked",
                  type: "work_break",
                })
              }
            }
          }
        } else {
          // Si no hay horario definido para este día, es un conflicto
          workConflicts.push({
            id: `no-schedule-${dayOfWeek}`,
            client_name: `🚫 Sin horario laboral definido para este día`,
            start_time: "00:00",
            end_time: "23:59",
            professional_name: "Sistema",
            status: "blocked",
            type: "outside_hours",
          })
        }

        // Combinar todos los conflictos
        const conflictList: ConflictAppointment[] = [
          // Conflictos de citas individuales
          ...(appointments || []).map((apt) => ({
            id: apt.id,
            client_name: (apt.clients as any)?.name || "Cliente desconocido",
            start_time: apt.start_time,
            end_time: apt.end_time,
            professional_name:
              (apt.professional as any)?.name || (apt.professional as any)?.email || "Profesional desconocido",
            status: apt.status,
            type: "appointment" as const,
          })),

          // Conflictos de actividades grupales
          ...(groupActivities || []).map((activity) => ({
            id: activity.id,
            client_name: `👥 ${activity.name}`,
            start_time: activity.start_time,
            end_time: activity.end_time,
            professional_name:
              (activity.professional as any)?.name ||
              (activity.professional as any)?.email ||
              "Profesional desconocido",
            status: activity.status,
            type: "group_activity" as const,
          })),

          // Conflictos con horarios y descansos
          ...workConflicts,
        ]

        setConflicts(conflictList)
        return conflictList
      } catch (err) {
        console.error("Error general en checkConflicts:", err)
        setError("Error al verificar conflictos")
        setConflicts([])
        return []
      } finally {
        setLoading(false)
      }
    },
    [organizationId],
  )

  return {
    conflicts,
    loading,
    error,
    checkConflicts,
  }
}
