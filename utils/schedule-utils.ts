import type { User } from "@/types/calendar"

export interface WorkingHours {
  start: number // minutos desde medianoche
  end: number // minutos desde medianoche
  breakStart?: number
  breakEnd?: number
}

export interface DaySchedule {
  dayOfWeek: number
  hours: WorkingHours[]
  isActive: boolean
}

// Convertir tiempo HH:MM a minutos desde medianoche
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

// Convertir minutos a formato HH:MM
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

// Obtener horarios de trabajo para un día específico
export function getWorkingHoursForDay(user: User, dayOfWeek: number): WorkingHours[] {
  if (!user.work_schedules) return []

  const daySchedules = user.work_schedules.filter(
    (schedule) => schedule.day_of_week === dayOfWeek && schedule.is_active,
  )

  return daySchedules.map((schedule) => ({
    start: timeToMinutes(schedule.start_time),
    end: timeToMinutes(schedule.end_time),
    breakStart: schedule.break_start ? timeToMinutes(schedule.break_start) : undefined,
    breakEnd: schedule.break_end ? timeToMinutes(schedule.break_end) : undefined,
  }))
}

// Obtener el rango completo de horas para mostrar en el calendario
export function getCalendarTimeRange(users: User[], dayOfWeek: number): { start: number; end: number } {
  let earliestStart = 24 * 60 // 24:00 en minutos
  let latestEnd = 0

  for (const user of users) {
    const workingHours = getWorkingHoursForDay(user, dayOfWeek)

    for (const hours of workingHours) {
      if (hours.start < earliestStart) {
        earliestStart = hours.start
      }
      if (hours.end > latestEnd) {
        latestEnd = hours.end
      }
    }
  }

  // Si no hay horarios configurados, usar valores por defecto
  if (earliestStart === 24 * 60) {
    earliestStart = 8 * 60 // 8:00
    latestEnd = 18 * 60 // 18:00
  }

  // Redondear a horas completas y agregar margen
  earliestStart = Math.floor(earliestStart / 60) * 60
  latestEnd = Math.ceil(latestEnd / 60) * 60

  return { start: earliestStart, end: latestEnd }
}

// Verificar si un usuario está trabajando en una hora específica
export function isUserWorkingAt(user: User, dayOfWeek: number, timeInMinutes: number): boolean {
  const workingHours = getWorkingHoursForDay(user, dayOfWeek)

  for (const hours of workingHours) {
    // Verificar si está en horario de trabajo
    if (timeInMinutes >= hours.start && timeInMinutes < hours.end) {
      // Verificar si no está en descanso
      if (hours.breakStart && hours.breakEnd) {
        if (timeInMinutes >= hours.breakStart && timeInMinutes < hours.breakEnd) {
          return false // Está en descanso
        }
      }
      return true
    }
  }

  return false
}

// Generar slots de tiempo para un día específico
export function generateTimeSlots(users: User[], dayOfWeek: number, interval = 30): string[] {
  const { start, end } = getCalendarTimeRange(users, dayOfWeek)
  const slots: string[] = []

  for (let minutes = start; minutes < end; minutes += interval) {
    slots.push(minutesToTime(minutes))
  }

  return slots
}

// Obtener horarios de trabajo para mostrar en la UI
export function getWorkScheduleDisplay(user: User): string {
  if (!user.work_schedules || user.work_schedules.length === 0) {
    return "Sin horarios configurados"
  }

  const activeSchedules = user.work_schedules.filter((s) => s.is_active)
  if (activeSchedules.length === 0) {
    return "Sin horarios activos"
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

  return activeSchedules
    .map((schedule) => {
      const dayName = dayNames[schedule.day_of_week || 0]
      let timeRange = `${schedule.start_time}-${schedule.end_time}`

      if (schedule.break_start && schedule.break_end) {
        timeRange += ` (descanso: ${schedule.break_start}-${schedule.break_end})`
      }

      return `${dayName}: ${timeRange}`
    })
    .join(", ")
}
