import { supabase } from "@/lib/supabase/client"
import type { WorkSchedule } from "@/types/calendar"

export class WorkScheduleService {
  // Obtener horarios de trabajo de un usuario
  static async getWorkSchedules(userId: string): Promise<WorkSchedule[]> {
    const { data, error } = await supabase.from("work_schedules").select("*").eq("user_id", userId).order("day_of_week")

    if (error) {
      console.error("Error fetching work schedules:", error)
      throw error
    }

    return data || []
  }

  // Guardar horarios de trabajo
  static async saveWorkSchedules(userId: string, schedules: Partial<WorkSchedule>[]): Promise<WorkSchedule[]> {
    try {
      // Primero eliminar horarios existentes
      const { error: deleteError } = await supabase.from("work_schedules").delete().eq("user_id", userId)

      if (deleteError) {
        console.error("Error deleting existing schedules:", deleteError)
        throw deleteError
      }

      // Insertar nuevos horarios
      const schedulesToInsert = schedules.map((schedule) => ({
        user_id: userId,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_active: schedule.is_active ?? true,
        break_start: schedule.break_start || null,
        break_end: schedule.break_end || null,
        date_exception: schedule.date_exception || null,
        is_exception: schedule.is_exception || false,
      }))

      const { data, error } = await supabase.from("work_schedules").insert(schedulesToInsert).select()

      if (error) {
        console.error("Error saving work schedules:", error)
        throw error
      }

      return data
    } catch (error) {
      console.error("Error in saveWorkSchedules:", error)
      throw error
    }
  }

  // Verificar si un usuario está disponible en una fecha y hora específica
  static async isUserAvailable(userId: string, date: Date, startTime: string, endTime: string): Promise<boolean> {
    const dayOfWeek = date.getDay()

    // Obtener horario del día
    const { data: schedules } = await supabase
      .from("work_schedules")
      .select("*")
      .eq("user_id", userId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)

    if (!schedules || schedules.length === 0) {
      return false // No hay horario configurado para este día
    }

    // Verificar si la hora está dentro del horario de trabajo
    for (const schedule of schedules) {
      if (startTime >= schedule.start_time && endTime <= schedule.end_time) {
        // Verificar si no está en horario de descanso
        if (schedule.break_start && schedule.break_end) {
          if (startTime >= schedule.break_start && startTime < schedule.break_end) {
            return false // Está en horario de descanso
          }
          if (endTime > schedule.break_start && endTime <= schedule.break_end) {
            return false // Termina en horario de descanso
          }
        }
        return true
      }
    }

    return false
  }

  // Obtener horarios disponibles para un día específico
  static async getAvailableSlots(
    userId: string,
    date: Date,
    slotDuration = 30, // duración en minutos
  ): Promise<{ start: string; end: string }[]> {
    const dayOfWeek = date.getDay()

    const { data: schedules } = await supabase
      .from("work_schedules")
      .select("*")
      .eq("user_id", userId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)

    if (!schedules || schedules.length === 0) {
      return []
    }

    // Obtener citas existentes para ese día
    const { data: appointments } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("professional_id", userId)
      .eq("date", date.toISOString().split("T")[0])
      .neq("status", "cancelled")

    const slots: { start: string; end: string }[] = []

    for (const schedule of schedules) {
      const startMinutes = timeToMinutes(schedule.start_time)
      const endMinutes = timeToMinutes(schedule.end_time)

      for (let minutes = startMinutes; minutes + slotDuration <= endMinutes; minutes += slotDuration) {
        const slotStart = minutesToTime(minutes)
        const slotEnd = minutesToTime(minutes + slotDuration)

        // Verificar si no está en descanso
        if (schedule.break_start && schedule.break_end) {
          const breakStart = timeToMinutes(schedule.break_start)
          const breakEnd = timeToMinutes(schedule.break_end)
          if (minutes >= breakStart && minutes < breakEnd) {
            continue // Saltar horario de descanso
          }
        }

        // Verificar si no hay cita existente
        const hasConflict = appointments?.some((apt) => {
          const aptStart = timeToMinutes(apt.start_time)
          const aptEnd = timeToMinutes(apt.end_time)
          return minutes < aptEnd && minutes + slotDuration > aptStart
        })

        if (!hasConflict) {
          slots.push({ start: slotStart, end: slotEnd })
        }
      }
    }

    return slots
  }

  // Obtener slots disponibles para un rango de fechas
  static async getAvailableSlotsForDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    slotDuration = 30,
    maxSlotsPerDay = 10,
  ): Promise<{ date: string; slots: { start: string; end: string }[] }[]> {
    const result: { date: string; slots: { start: string; end: string }[] }[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0]
      const slots = await this.getAvailableSlots(userId, currentDate, slotDuration)

      result.push({
        date: dateStr,
        slots: slots.slice(0, maxSlotsPerDay), // Limitar slots por día
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return result
  }

  // Verificar disponibilidad con duración específica
  static async checkAvailabilityWithDuration(
    userId: string,
    date: Date,
    startTime: string,
    duration: number,
  ): Promise<boolean> {
    const [hours, minutes] = startTime.split(":").map(Number)
    const totalMinutes = hours * 60 + minutes + duration
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    const endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`

    return this.isUserAvailable(userId, date, startTime, endTime)
  }
}

// Funciones auxiliares
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}
