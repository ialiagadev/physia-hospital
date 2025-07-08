"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import type { WorkSchedule } from "@/types/calendar"

export function useWorkSchedules(organizationId?: string) {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSchedules = useCallback(async () => {
    if (!organizationId) {
      setSchedules([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Obtener todos los usuarios profesionales de la organización
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id")
        .eq("organization_id", Number.parseInt(organizationId))
        .eq("type", 1) // Solo profesionales

      if (usersError) {
        throw usersError
      }

      if (!users || users.length === 0) {
        setSchedules([])
        return
      }

      const userIds = users.map((user) => user.id)

      // Obtener todos los horarios de trabajo con sus descansos
      const { data: workSchedules, error: schedulesError } = await supabase
        .from("work_schedules")
        .select(`
          *,
          work_schedule_breaks(*)
        `)
        .in("user_id", userIds)
        .eq("is_active", true)
        .order("user_id")
        .order("day_of_week")

      if (schedulesError) {
        throw schedulesError
      }

      // Procesar los datos para incluir los descansos ordenados
      const processedSchedules: WorkSchedule[] = (workSchedules || []).map((schedule) => {
        return {
          id: schedule.id,
          user_id: schedule.user_id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_active: schedule.is_active,
          buffer_time_minutes: schedule.buffer_time_minutes || 5,
          date_exception: schedule.date_exception,
          is_exception: schedule.is_exception || false,
          created_at: schedule.created_at,
          updated_at: schedule.updated_at,
          breaks: (schedule.work_schedule_breaks || [])
            .filter((breakItem: any) => breakItem.is_active !== false)
            .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((breakItem: any) => ({
              id: breakItem.id,
              work_schedule_id: breakItem.work_schedule_id,
              break_name: breakItem.break_name || "Descanso",
              start_time: breakItem.start_time,
              end_time: breakItem.end_time,
              is_active: breakItem.is_active !== false,
              sort_order: breakItem.sort_order || 0,
              created_at: breakItem.created_at,
              updated_at: breakItem.updated_at,
            })),
        }
      })

      setSchedules(processedSchedules)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error fetching schedules"
      setError(errorMessage)
      console.error("Error in useWorkSchedules:", err)
    } finally {
      setLoading(false)
    }
  }, [organizationId]) // ← useCallback con dependencia estable

  // CORREGIDO: Función para guardar horarios de un usuario específico
  const saveSchedules = useCallback(
    async (userId: string, newSchedules: Partial<WorkSchedule>[]) => {
      if (!userId) throw new Error("User ID is required")

      try {
        // Eliminar horarios existentes del usuario
        const { error: deleteError } = await supabase.from("work_schedules").delete().eq("user_id", userId)

        if (deleteError) {
          throw deleteError
        }

        // Insertar nuevos horarios
        const schedulesToInsert = newSchedules.map((schedule) => ({
          user_id: userId,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_active: schedule.is_active ?? true,
          buffer_time_minutes: schedule.buffer_time_minutes || 5,
          date_exception: schedule.date_exception || null,
          is_exception: schedule.is_exception || false,
        }))

        const { data: insertedSchedules, error: insertError } = await supabase
          .from("work_schedules")
          .insert(schedulesToInsert)
          .select()

        if (insertError) {
          throw insertError
        }

        // Insertar descansos para cada horario
        const breaksToInsert: any[] = []
        newSchedules.forEach((schedule, index) => {
          if (schedule.breaks && schedule.breaks.length > 0) {
            const scheduleId = insertedSchedules[index].id
            schedule.breaks.forEach((breakItem, breakIndex) => {
              breaksToInsert.push({
                work_schedule_id: scheduleId,
                break_name: breakItem.break_name || `Descanso ${breakIndex + 1}`,
                start_time: breakItem.start_time,
                end_time: breakItem.end_time,
                is_active: breakItem.is_active ?? true,
                sort_order: breakItem.sort_order ?? breakIndex,
              })
            })
          }
        })

        if (breaksToInsert.length > 0) {
          const { error: breaksError } = await supabase.from("work_schedule_breaks").insert(breaksToInsert)

          if (breaksError) {
            throw breaksError
          }
        }

        // Refetch todos los horarios después de guardar
        await fetchSchedules()
        return schedules.filter((s) => s.user_id === userId)
      } catch (err) {
        console.error("Error saving schedules:", err)
        throw err
      }
    },
    [fetchSchedules, schedules],
  ) // ← useCallback con dependencias estables

  // CORREGIDO: Función para obtener horarios de un usuario específico
  const getUserSchedules = useCallback(
    (userId: string) => {
      return schedules.filter((s) => s.user_id === userId)
    },
    [schedules],
  ) // ← useCallback con dependencia estable

  // CORREGIDO: Función para obtener horarios por día
  const getSchedulesByDay = useCallback(
    (dayOfWeek: number) => {
      return schedules.filter((s) => s.day_of_week === dayOfWeek && s.is_active)
    },
    [schedules],
  ) // ← useCallback con dependencia estable

  const checkAvailability = useCallback(
    async (userId: string, date: Date, startTime: string, endTime: string) => {
      if (!userId) return false

      try {
        const dayOfWeek = date.getDay()
        // Obtener horarios del usuario para ese día
        const userSchedules = schedules.filter(
          (s) => s.user_id === userId && s.day_of_week === dayOfWeek && s.is_active,
        )

        if (userSchedules.length === 0) {
          return false
        }

        const startMinutes = timeToMinutes(startTime)
        const endMinutes = timeToMinutes(endTime)

        // Verificar cada horario del día
        for (const schedule of userSchedules) {
          const scheduleStart = timeToMinutes(schedule.start_time)
          const scheduleEnd = timeToMinutes(schedule.end_time)

          // Verificar si está dentro del horario de trabajo
          if (startMinutes >= scheduleStart && endMinutes <= scheduleEnd) {
            // Verificar que no esté en ningún descanso
            const isInBreak = schedule.breaks?.some(
              (breakItem) =>
                breakItem.is_active &&
                startMinutes < timeToMinutes(breakItem.end_time) &&
                endMinutes > timeToMinutes(breakItem.start_time),
            )

            if (!isInBreak) {
              return true
            }
          }
        }

        return false
      } catch (err) {
        console.error("Error checking availability:", err)
        return false
      }
    },
    [schedules],
  ) // ← useCallback con dependencia estable

  const getAvailableSlots = useCallback(
    async (userId: string, date: Date, slotDuration = 30) => {
      if (!userId) return []

      try {
        const dayOfWeek = date.getDay()
        const userSchedules = schedules.filter(
          (s) => s.user_id === userId && s.day_of_week === dayOfWeek && s.is_active,
        )

        if (userSchedules.length === 0) {
          return []
        }

        const slots: { start: string; end: string }[] = []

        for (const schedule of userSchedules) {
          const startMinutes = timeToMinutes(schedule.start_time)
          const endMinutes = timeToMinutes(schedule.end_time)

          // Generar slots considerando descansos
          for (let minutes = startMinutes; minutes + slotDuration <= endMinutes; minutes += slotDuration) {
            const slotStart = minutesToTime(minutes)
            const slotEnd = minutesToTime(minutes + slotDuration)

            // Verificar si está en algún descanso
            const isInBreak = schedule.breaks?.some(
              (breakItem) =>
                breakItem.is_active &&
                minutes < timeToMinutes(breakItem.end_time) &&
                minutes + slotDuration > timeToMinutes(breakItem.start_time),
            )

            if (!isInBreak) {
              const isAvailable = await checkAvailability(userId, date, slotStart, slotEnd)
              if (isAvailable) {
                slots.push({ start: slotStart, end: slotEnd })
              }
            }
          }
        }

        return slots
      } catch (err) {
        console.error("Error getting available slots:", err)
        return []
      }
    },
    [schedules, checkAvailability],
  ) // ← useCallback con dependencias estables

  // Función auxiliar para convertir tiempo a minutos
  const timeToMinutes = useCallback((time: string): number => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }, [])

  // Función auxiliar para convertir minutos a tiempo
  const minutesToTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }, [])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules]) // ← Dependencia estable

  return {
    schedules,
    loading,
    error,
    saveSchedules,
    getUserSchedules, // ← Ahora es estable
    getSchedulesByDay, // ← Ahora es estable
    checkAvailability,
    getAvailableSlots,
    refetch: fetchSchedules,
  }
}
