"use client"

import { useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { format, addDays, isWeekend } from "date-fns"

interface WorkSchedule {
  id: string
  user_id: string
  day_of_week: number
  start_time: string
  end_time: string
  buffer_time_minutes: number
  is_active: boolean
  breaks: WorkScheduleBreak[]
}

interface WorkScheduleBreak {
  id: string
  work_schedule_id: string
  break_name: string
  start_time: string
  end_time: string
  is_active: boolean
  sort_order: number
}

interface ExistingAppointment {
  id: string
  start_time: string
  end_time: string
  professional_id: string
  date: string
  status: string
}

interface AvailableSlot {
  date: string
  startTime: string
  endTime: string
  professionalId: string
  professionalName: string
  duration: number
  isPreferred: boolean
  conflictLevel: "none" | "low" | "medium" | "high"
  serviceCompatible: boolean
  bufferBefore: number
  bufferAfter: number
}

interface AvailabilityOptions {
  professionalIds?: string[]
  serviceId?: number
  startDate?: Date
  endDate?: Date
  duration: number
  preferredTimes?: string[] // ["09:00", "14:00"]
  avoidWeekends?: boolean
  minSlotDuration?: number
  includeBufferTime?: boolean
  onlyPreferredTimes?: boolean
}

interface ProfessionalAvailability {
  professionalId: string
  professionalName: string
  totalSlots: number
  availableSlots: AvailableSlot[]
  workSchedules: WorkSchedule[]
  isAvailableToday: boolean
  nextAvailableSlot?: AvailableSlot
}

export function useProfessionalAvailability(organizationId?: number) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<ProfessionalAvailability[]>([])

  // Función principal para calcular disponibilidad
  const calculateAvailability = useCallback(
    async (options: AvailabilityOptions): Promise<ProfessionalAvailability[]> => {
      if (!organizationId) return []

      setLoading(true)
      setError(null)

      try {
        // 1. Obtener profesionales
        const professionals = await getProfessionals(options.professionalIds, options.serviceId)

        // 2. Obtener horarios de trabajo con descansos
        const workSchedules = await getWorkSchedules(professionals.map((p) => p.id))

        // 3. Obtener citas existentes
        const existingAppointments = await getExistingAppointments(
          professionals.map((p) => p.id),
          options.startDate || new Date(),
          options.endDate || addDays(new Date(), 30),
        )

        // 4. Calcular slots disponibles para cada profesional
        const availabilityResults: ProfessionalAvailability[] = []

        for (const professional of professionals) {
          const professionalSchedules = workSchedules.filter((ws) => ws.user_id === professional.id)
          const professionalAppointments = existingAppointments.filter((apt) => apt.professional_id === professional.id)

          const availableSlots = await calculateSlotsForProfessional(
            professional,
            professionalSchedules,
            professionalAppointments,
            options,
          )

          availabilityResults.push({
            professionalId: professional.id,
            professionalName: professional.name,
            totalSlots: availableSlots.length,
            availableSlots,
            workSchedules: professionalSchedules,
            isAvailableToday: availableSlots.some((slot) => slot.date === format(new Date(), "yyyy-MM-dd")),
            nextAvailableSlot: availableSlots[0], // El primero es el más próximo
          })
        }

        setAvailability(availabilityResults)
        return availabilityResults
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error calculando disponibilidad"
        setError(errorMessage)
        console.error("Error calculating availability:", err)
        return []
      } finally {
        setLoading(false)
      }
    },
    [organizationId],
  )

  // Obtener profesionales (filtrados por servicio si se especifica)
  const getProfessionals = async (professionalIds?: string[], serviceId?: number) => {
    let query = supabase
      .from("users")
      .select("id, name, email")
      .eq("organization_id", organizationId)
      .eq("type", 1) // Solo profesionales médicos
      .eq("is_active", true)

    if (professionalIds && professionalIds.length > 0) {
      query = query.in("id", professionalIds)
    }

    const { data: professionals, error } = await query

    if (error) throw error

    // Si se especifica un servicio, filtrar por profesionales que lo ofrecen
    if (serviceId && professionals) {
      const { data: userServices, error: serviceError } = await supabase
        .from("user_services")
        .select("user_id")
        .eq("service_id", serviceId)

      if (serviceError) throw serviceError

      const serviceUserIds = userServices?.map((us) => us.user_id) || []
      return professionals.filter((prof) => serviceUserIds.includes(prof.id))
    }

    return professionals || []
  }

  // Obtener horarios de trabajo con descansos
  const getWorkSchedules = async (professionalIds: string[]): Promise<WorkSchedule[]> => {
    const { data: schedules, error } = await supabase
      .from("work_schedules")
      .select(`
        *,
        work_schedule_breaks:work_schedule_breaks(*)
      `)
      .in("user_id", professionalIds)
      .eq("is_active", true)
      .order("day_of_week")

    if (error) throw error

    return (schedules || []).map((schedule) => ({
      ...schedule,
      buffer_time_minutes: schedule.buffer_time_minutes || 5,
      breaks: (schedule.work_schedule_breaks || [])
        .filter((breakItem: any) => breakItem.is_active)
        .sort((a: any, b: any) => a.sort_order - b.sort_order),
    }))
  }

  // Obtener citas existentes
  const getExistingAppointments = async (
    professionalIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<ExistingAppointment[]> => {
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("id, start_time, end_time, professional_id, date, status")
      .in("professional_id", professionalIds)
      .gte("date", format(startDate, "yyyy-MM-dd"))
      .lte("date", format(endDate, "yyyy-MM-dd"))
      .neq("status", "cancelled")

    if (error) throw error
    return appointments || []
  }

  // Calcular slots para un profesional específico
  const calculateSlotsForProfessional = async (
    professional: { id: string; name: string },
    schedules: WorkSchedule[],
    appointments: ExistingAppointment[],
    options: AvailabilityOptions,
  ): Promise<AvailableSlot[]> => {
    const slots: AvailableSlot[] = []
    const startDate = options.startDate || new Date()
    const endDate = options.endDate || addDays(new Date(), 30)

    let currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      // Saltar fines de semana si se especifica
      if (options.avoidWeekends && isWeekend(currentDate)) {
        currentDate = addDays(currentDate, 1)
        continue
      }

      const dayOfWeek = currentDate.getDay()
      const dateStr = format(currentDate, "yyyy-MM-dd")

      // Obtener horarios para este día
      const daySchedules = schedules.filter((s) => s.day_of_week === dayOfWeek)

      // Obtener citas para este día
      const dayAppointments = appointments.filter((apt) => apt.date === dateStr)

      // Calcular slots para cada horario del día
      for (const schedule of daySchedules) {
        const daySlots = calculateSlotsForSchedule(schedule, dayAppointments, currentDate, professional, options)
        slots.push(...daySlots)
      }

      currentDate = addDays(currentDate, 1)
    }

    // Ordenar por fecha y hora
    return slots.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })
  }

  // Calcular slots para un horario específico
  const calculateSlotsForSchedule = (
    schedule: WorkSchedule,
    dayAppointments: ExistingAppointment[],
    date: Date,
    professional: { id: string; name: string },
    options: AvailabilityOptions,
  ): AvailableSlot[] => {
    const slots: AvailableSlot[] = []
    const dateStr = format(date, "yyyy-MM-dd")

    const startMinutes = timeToMinutes(schedule.start_time)
    const endMinutes = timeToMinutes(schedule.end_time)
    const slotDuration = options.minSlotDuration || 15 // Slots de 15 minutos por defecto
    const requiredDuration = options.duration
    const bufferTime = options.includeBufferTime ? schedule.buffer_time_minutes : 0

    for (let minutes = startMinutes; minutes + requiredDuration <= endMinutes; minutes += slotDuration) {
      const slotStart = minutesToTime(minutes)
      const slotEnd = minutesToTime(minutes + requiredDuration)

      // Verificar si está en horario preferido (si se especifica)
      if (options.onlyPreferredTimes && options.preferredTimes) {
        const isPreferredTime = options.preferredTimes.some((preferredTime) => {
          const preferredMinutes = timeToMinutes(preferredTime)
          return Math.abs(minutes - preferredMinutes) <= 30 // Tolerancia de 30 minutos
        })

        if (!isPreferredTime) continue
      }

      // Verificar descansos
      const isInBreak = schedule.breaks.some((breakItem) => {
        const breakStart = timeToMinutes(breakItem.start_time)
        const breakEnd = timeToMinutes(breakItem.end_time)
        return minutes < breakEnd && minutes + requiredDuration > breakStart
      })

      if (isInBreak) continue

      // Verificar conflictos con citas existentes (incluyendo buffer time)
      const hasConflict = dayAppointments.some((apt) => {
        const aptStart = timeToMinutes(apt.start_time) - bufferTime
        const aptEnd = timeToMinutes(apt.end_time) + bufferTime
        return minutes < aptEnd && minutes + requiredDuration > aptStart
      })

      if (hasConflict) continue

      // Calcular nivel de preferencia
      const isPreferred = options.preferredTimes?.includes(slotStart) || false

      // Evaluar nivel de conflicto basado en carga del día
      const conflictLevel = evaluateConflictLevel(dayAppointments.length, schedule)

      // Verificar compatibilidad con servicio
      const serviceCompatible = true // Por ahora siempre true, se puede mejorar

      slots.push({
        date: dateStr,
        startTime: slotStart,
        endTime: slotEnd,
        professionalId: professional.id,
        professionalName: professional.name,
        duration: requiredDuration,
        isPreferred,
        conflictLevel,
        serviceCompatible,
        bufferBefore: bufferTime,
        bufferAfter: bufferTime,
      })
    }

    return slots
  }

  // Evaluar nivel de conflicto
  const evaluateConflictLevel = (
    appointmentCount: number,
    schedule: WorkSchedule,
  ): "none" | "low" | "medium" | "high" => {
    const workHours = timeToMinutes(schedule.end_time) - timeToMinutes(schedule.start_time)
    const maxPossibleAppointments = Math.floor(workHours / 60) // Asumiendo citas de 1 hora promedio

    const occupancyRate = appointmentCount / maxPossibleAppointments

    if (occupancyRate >= 0.9) return "high"
    if (occupancyRate >= 0.7) return "medium"
    if (occupancyRate >= 0.4) return "low"
    return "none"
  }

  // Funciones auxiliares
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  // Función para obtener próximo slot disponible
  const getNextAvailableSlot = useCallback(
    async (professionalId: string, serviceId?: number, duration = 30): Promise<AvailableSlot | null> => {
      const options: AvailabilityOptions = {
        professionalIds: [professionalId],
        serviceId,
        duration,
        startDate: new Date(),
        endDate: addDays(new Date(), 7), // Próximos 7 días
        minSlotDuration: 15,
      }

      const results = await calculateAvailability(options)
      const professional = results.find((r) => r.professionalId === professionalId)

      return professional?.nextAvailableSlot || null
    },
    [calculateAvailability],
  )

  // Función para verificar disponibilidad específica
  const checkSpecificAvailability = useCallback(
    async (
      professionalId: string,
      date: Date,
      startTime: string,
      duration: number,
      excludeAppointmentId?: string,
    ): Promise<boolean> => {
      try {
        const dateStr = format(date, "yyyy-MM-dd")
        const dayOfWeek = date.getDay()

        // Obtener horario de trabajo
        const { data: schedules } = await supabase
          .from("work_schedules")
          .select(`
            *,
            work_schedule_breaks:work_schedule_breaks(*)
          `)
          .eq("user_id", professionalId)
          .eq("day_of_week", dayOfWeek)
          .eq("is_active", true)

        if (!schedules || schedules.length === 0) return false

        // Verificar si está dentro del horario de trabajo
        const startMinutes = timeToMinutes(startTime)
        const endMinutes = startMinutes + duration

        const isWithinWorkHours = schedules.some((schedule) => {
          const workStart = timeToMinutes(schedule.start_time)
          const workEnd = timeToMinutes(schedule.end_time)
          return startMinutes >= workStart && endMinutes <= workEnd
        })

        if (!isWithinWorkHours) return false

        // Verificar descansos
        const isInBreak = schedules.some((schedule) =>
          schedule.work_schedule_breaks?.some((breakItem: any) => {
            if (!breakItem.is_active) return false
            const breakStart = timeToMinutes(breakItem.start_time)
            const breakEnd = timeToMinutes(breakItem.end_time)
            return startMinutes < breakEnd && endMinutes > breakStart
          }),
        )

        if (isInBreak) return false

        // Verificar conflictos con citas
        let appointmentQuery = supabase
          .from("appointments")
          .select("start_time, end_time")
          .eq("professional_id", professionalId)
          .eq("date", dateStr)
          .neq("status", "cancelled")

        if (excludeAppointmentId) {
          appointmentQuery = appointmentQuery.neq("id", excludeAppointmentId)
        }

        const { data: appointments } = await appointmentQuery

        const hasConflict = appointments?.some((apt) => {
          const aptStart = timeToMinutes(apt.start_time)
          const aptEnd = timeToMinutes(apt.end_time)
          return startMinutes < aptEnd && endMinutes > aptStart
        })

        return !hasConflict
      } catch (error) {
        console.error("Error checking specific availability:", error)
        return false
      }
    },
    [],
  )

  // Estadísticas de disponibilidad
  const availabilityStats = useMemo(() => {
    const totalProfessionals = availability.length
    const availableToday = availability.filter((a) => a.isAvailableToday).length
    const totalSlots = availability.reduce((sum, a) => sum + a.totalSlots, 0)
    const averageSlotsPerProfessional = totalProfessionals > 0 ? Math.round(totalSlots / totalProfessionals) : 0

    return {
      totalProfessionals,
      availableToday,
      totalSlots,
      averageSlotsPerProfessional,
      occupancyRate: totalSlots > 0 ? Math.round((1 - totalSlots / (totalProfessionals * 40)) * 100) : 0, // Asumiendo 40 slots máximos por profesional
    }
  }, [availability])

  return {
    // Estados
    loading,
    error,
    availability,
    availabilityStats,

    // Funciones principales
    calculateAvailability,
    getNextAvailableSlot,
    checkSpecificAvailability,

    // Utilidades
    timeToMinutes,
    minutesToTime,
  }
}
