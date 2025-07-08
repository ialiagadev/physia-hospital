import { supabase } from "@/lib/supabase/client"
import type { WorkSchedule, WorkScheduleBreak } from "@/types/calendar"

export class WorkScheduleService {
  // Obtener horarios de trabajo de un usuario CON sus descansos
  static async getWorkSchedules(userId: string): Promise<WorkSchedule[]> {
    const { data: schedules, error } = await supabase
      .from("work_schedules")
      .select(`
        *,
        work_schedule_breaks(*)
      `)
      .eq("user_id", userId)
      .order("day_of_week")

    if (error) {
      console.error("Error fetching work schedules:", error)
      throw error
    }

    // Procesar los datos para incluir los descansos ordenados
    const processedSchedules: WorkSchedule[] = (schedules || []).map((schedule) => {
      return {
        ...schedule,
        buffer_time_minutes: schedule.buffer_time_minutes || 5, // Default 5 minutos
        breaks: (schedule.work_schedule_breaks || [])
          .filter((breakItem: any) => breakItem.is_active !== false) // Incluir activos y null
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

    return processedSchedules
  }

  // Guardar horarios de trabajo CON descansos
  static async saveWorkSchedules(userId: string, schedules: Partial<WorkSchedule>[]): Promise<WorkSchedule[]> {
    try {
      // 1. Eliminar horarios existentes (esto también eliminará los descansos por CASCADE)
      const { error: deleteError } = await supabase.from("work_schedules").delete().eq("user_id", userId)

      if (deleteError) {
        console.error("Error deleting existing schedules:", deleteError)
        throw deleteError
      }

      // 2. Insertar nuevos horarios
      const schedulesToInsert = schedules.map((schedule) => ({
        user_id: userId,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_active: schedule.is_active ?? true,
        buffer_time_minutes: schedule.buffer_time_minutes || 5,
        break_start: schedule.break_start || null, // Mantener para compatibilidad
        break_end: schedule.break_end || null, // Mantener para compatibilidad
        date_exception: schedule.date_exception || null,
        is_exception: schedule.is_exception || false,
      }))

      const { data: insertedSchedules, error: insertError } = await supabase
        .from("work_schedules")
        .insert(schedulesToInsert)
        .select()

      if (insertError) {
        console.error("Error saving work schedules:", insertError)
        throw insertError
      }

      // 3. Insertar descansos para cada horario
      const breaksToInsert: any[] = []

      schedules.forEach((schedule, index) => {
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

      // Insertar descansos si los hay
      if (breaksToInsert.length > 0) {
        const { error: breaksError } = await supabase.from("work_schedule_breaks").insert(breaksToInsert)

        if (breaksError) {
          console.error("Error saving breaks:", breaksError)
          throw breaksError
        }
      }

      // 4. Retornar horarios completos con descansos
      return await this.getWorkSchedules(userId)
    } catch (error) {
      console.error("Error in saveWorkSchedules:", error)
      throw error
    }
  }

  // Añadir descanso a un horario específico
  static async addBreakToSchedule(
    scheduleId: string,
    breakData: Partial<WorkScheduleBreak>,
  ): Promise<WorkScheduleBreak> {
    const { data, error } = await supabase
      .from("work_schedule_breaks")
      .insert({
        work_schedule_id: scheduleId,
        break_name: breakData.break_name || "Nuevo Descanso",
        start_time: breakData.start_time!,
        end_time: breakData.end_time!,
        is_active: breakData.is_active ?? true,
        sort_order: breakData.sort_order ?? 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Error adding break:", error)
      throw error
    }

    return data
  }

  // Eliminar descanso
  static async removeBreak(breakId: string): Promise<void> {
    const { error } = await supabase.from("work_schedule_breaks").delete().eq("id", breakId)

    if (error) {
      console.error("Error removing break:", error)
      throw error
    }
  }

  // Actualizar descanso
  static async updateBreak(breakId: string, breakData: Partial<WorkScheduleBreak>): Promise<WorkScheduleBreak> {
    const { data, error } = await supabase
      .from("work_schedule_breaks")
      .update({
        break_name: breakData.break_name,
        start_time: breakData.start_time,
        end_time: breakData.end_time,
        is_active: breakData.is_active,
        sort_order: breakData.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq("id", breakId)
      .select()
      .single()

    if (error) {
      console.error("Error updating break:", error)
      throw error
    }

    return data
  }

  // Verificar si un usuario está disponible (considerando múltiples descansos y buffer time)
  static async isUserAvailable(
    userId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const dayOfWeek = date.getDay()

    // Obtener horario del día con descansos
    const schedules = await this.getWorkSchedules(userId)
    const daySchedules = schedules.filter((s) => s.day_of_week === dayOfWeek && s.is_active)

    if (daySchedules.length === 0) {
      return false // No hay horario configurado para este día
    }

    // Verificar cada horario del día
    for (const schedule of daySchedules) {
      // Verificar si está dentro del horario de trabajo
      if (startTime >= schedule.start_time && endTime <= schedule.end_time) {
        // Verificar que no esté en ningún descanso
        const isInBreak = schedule.breaks?.some(
          (breakItem) => breakItem.is_active && startTime < breakItem.end_time && endTime > breakItem.start_time,
        )

        if (isInBreak) {
          continue // Está en descanso, probar siguiente horario
        }

        // Verificar buffer time con citas existentes
        const hasBufferConflict = await this.checkBufferTimeConflict(
          userId,
          date,
          startTime,
          endTime,
          schedule.buffer_time_minutes,
          excludeAppointmentId,
        )

        if (!hasBufferConflict) {
          return true // Está disponible
        }
      }
    }

    return false
  }

  // Verificar conflictos con buffer time
  private static async checkBufferTimeConflict(
    userId: string,
    date: Date,
    startTime: string,
    endTime: string,
    bufferMinutes: number,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const dateStr = date.toISOString().split("T")[0]

    // Calcular tiempos con buffer
    const bufferStartTime = this.subtractMinutes(startTime, bufferMinutes)
    const bufferEndTime = this.addMinutes(endTime, bufferMinutes)

    // Buscar citas que puedan tener conflicto
    let query = supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("professional_id", userId)
      .eq("date", dateStr)
      .neq("status", "cancelled")

    if (excludeAppointmentId) {
      query = query.neq("id", excludeAppointmentId)
    }

    const { data: appointments } = await query

    if (!appointments || appointments.length === 0) {
      return false // No hay conflictos
    }

    // Verificar solapamiento con buffer
    return appointments.some((apt) => bufferStartTime < apt.end_time && bufferEndTime > apt.start_time)
  }

  // Obtener slots disponibles considerando múltiples descansos y buffer time
  static async getAvailableSlots(
    userId: string,
    date: Date,
    slotDuration = 30,
    excludeAppointmentId?: string,
  ): Promise<{ start: string; end: string }[]> {
    const schedules = await this.getWorkSchedules(userId)
    const dayOfWeek = date.getDay()
    const daySchedules = schedules.filter((s) => s.day_of_week === dayOfWeek && s.is_active)

    if (daySchedules.length === 0) {
      return []
    }

    const slots: { start: string; end: string }[] = []

    for (const schedule of daySchedules) {
      const startMinutes = this.timeToMinutes(schedule.start_time)
      const endMinutes = this.timeToMinutes(schedule.end_time)

      // Generar slots considerando descansos
      for (let minutes = startMinutes; minutes + slotDuration <= endMinutes; minutes += slotDuration) {
        const slotStart = this.minutesToTime(minutes)
        const slotEnd = this.minutesToTime(minutes + slotDuration)

        // Verificar si está en algún descanso
        const isInBreak = schedule.breaks?.some(
          (breakItem) =>
            breakItem.is_active &&
            minutes < this.timeToMinutes(breakItem.end_time) &&
            minutes + slotDuration > this.timeToMinutes(breakItem.start_time),
        )

        if (isInBreak) {
          continue // Saltar si está en descanso
        }

        // Verificar disponibilidad con buffer time
        const isAvailable = await this.isUserAvailable(userId, date, slotStart, slotEnd, excludeAppointmentId)

        if (isAvailable) {
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

  // Funciones auxiliares
  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  private static addMinutes(time: string, minutes: number): string {
    const totalMinutes = this.timeToMinutes(time) + minutes
    return this.minutesToTime(totalMinutes)
  }

  private static subtractMinutes(time: string, minutes: number): string {
    const totalMinutes = Math.max(0, this.timeToMinutes(time) - minutes)
    return this.minutesToTime(totalMinutes)
  }
}
