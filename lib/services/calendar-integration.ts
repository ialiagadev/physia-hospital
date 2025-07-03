import { supabase } from "@/lib/supabase/client"
import type { AppointmentWithDetails } from "@/types/calendar"

export interface ProfessionalAvailability {
  professional_id: string
  date: string
  is_available: boolean
  reason?: string
  vacation_type?: string
  existing_appointments?: number
}

export interface VacationEvent {
  id: number
  vacation_request_id: number
  user_id: string
  organization_id: number
  event_date: string
  event_type: string
  is_working_day: boolean
  user_name?: string
  vacation_reason?: string
}

export class CalendarIntegrationService {
  // Verificar disponibilidad de un profesional en una fecha específica
  static async checkProfessionalAvailability(
    professionalId: string,
    date: string,
    startTime?: string,
    endTime?: string,
  ): Promise<ProfessionalAvailability> {
    try {
      // Verificar vacaciones
      const { data: vacationEvents, error: vacationError } = await supabase
        .from("vacation_calendar_events")
        .select(`
          *,
          vacation_requests!inner(
            type,
            reason,
            status
          )
        `)
        .eq("user_id", professionalId)
        .eq("event_date", date)
        .eq("vacation_requests.status", "approved")

      if (vacationError) {
        console.error("Error checking vacation events:", vacationError)
        throw vacationError
      }

      // Si hay eventos de vacaciones, no está disponible
      if (vacationEvents && vacationEvents.length > 0) {
        const vacationEvent = vacationEvents[0]
        return {
          professional_id: professionalId,
          date,
          is_available: false,
          reason: "vacation",
          vacation_type: vacationEvent.vacation_requests?.type,
        }
      }

      // Si se especifica horario, verificar conflictos con citas
      if (startTime && endTime) {
        const { data: appointments, error: appointmentError } = await supabase
          .from("appointments")
          .select("id, start_time, end_time")
          .eq("professional_id", professionalId)
          .eq("date", date)
          .neq("status", "cancelled")

        if (appointmentError) {
          console.error("Error checking appointments:", appointmentError)
          throw appointmentError
        }

        // Verificar conflictos de horario
        const hasConflict = appointments?.some((apt) => {
          const aptStart = apt.start_time
          const aptEnd = apt.end_time

          return (
            (aptStart <= startTime && aptEnd > startTime) ||
            (aptStart < endTime && aptEnd >= endTime) ||
            (aptStart >= startTime && aptEnd <= endTime)
          )
        })

        if (hasConflict) {
          return {
            professional_id: professionalId,
            date,
            is_available: false,
            reason: "appointment_conflict",
            existing_appointments: appointments?.length || 0,
          }
        }
      }

      return {
        professional_id: professionalId,
        date,
        is_available: true,
      }
    } catch (error) {
      console.error("Error checking professional availability:", error)
      throw error
    }
  }

  // Obtener eventos de vacaciones para un rango de fechas
  static async getVacationEvents(
    organizationId: number,
    startDate: string,
    endDate: string,
    professionalIds?: string[],
  ): Promise<VacationEvent[]> {
    try {
      let query = supabase
        .from("vacation_calendar_events")
        .select(`
          *,
          users!vacation_calendar_events_user_id_fkey(name, email),
          vacation_requests!vacation_calendar_events_vacation_request_id_fkey(
            type,
            reason,
            status
          )
        `)
        .eq("organization_id", organizationId)
        .gte("event_date", startDate)
        .lte("event_date", endDate)

      if (professionalIds && professionalIds.length > 0) {
        query = query.in("user_id", professionalIds)
      }

      const { data, error } = await query.order("event_date", { ascending: true })

      if (error) {
        console.error("Error fetching vacation events:", error)
        throw error
      }

      return (data || []).map((event: any) => ({
        id: event.id,
        vacation_request_id: event.vacation_request_id,
        user_id: event.user_id,
        organization_id: event.organization_id,
        event_date: event.event_date,
        event_type: event.event_type,
        is_working_day: event.is_working_day,
        user_name: event.users?.name || event.users?.email,
        vacation_reason: event.vacation_requests?.reason,
      }))
    } catch (error) {
      console.error("Error fetching vacation events:", error)
      throw error
    }
  }

  // Obtener citas con información de disponibilidad
  static async getAppointmentsWithAvailability(
    organizationId: number,
    startDate: string,
    endDate: string,
    professionalIds?: string[],
  ): Promise<(AppointmentWithDetails & { professional_available: boolean; availability_reason?: string })[]> {
    try {
      // Obtener citas normales
      let appointmentQuery = supabase
        .from("appointments")
        .select(`
          *,
          client:clients(*),
          professional:users!appointments_professional_id_fkey(*),
          appointment_type:appointment_types(*),
          consultation:consultations(*),
          created_by_user:users!appointments_created_by_fkey(*)
        `)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })

      if (professionalIds && professionalIds.length > 0) {
        appointmentQuery = appointmentQuery.in("professional_id", professionalIds)
      }

      const { data: appointments, error: appointmentError } = await appointmentQuery

      if (appointmentError) {
        console.error("Error fetching appointments:", appointmentError)
        throw appointmentError
      }

      // Verificar disponibilidad para cada cita
      const appointmentsWithAvailability = await Promise.all(
        (appointments || []).map(async (appointment: any) => {
          const availability = await this.checkProfessionalAvailability(
            appointment.professional_id,
            appointment.date,
            appointment.start_time,
            appointment.end_time,
          )

          return {
            ...appointment,
            professional_available: availability.is_available,
            availability_reason: availability.reason,
          }
        }),
      )

      return appointmentsWithAvailability
    } catch (error) {
      console.error("Error fetching appointments with availability:", error)
      throw error
    }
  }

  // Obtener slots disponibles para un profesional en un día
  static async getAvailableSlots(
    professionalId: string,
    date: string,
    slotDuration = 30,
    startHour = 8,
    endHour = 20,
  ): Promise<{ time: string; available: boolean; reason?: string }[]> {
    try {
      const slots = []

      // Generar slots de tiempo
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
          const endTime = new Date(`2000-01-01T${timeString}`)
          endTime.setMinutes(endTime.getMinutes() + slotDuration)
          const endTimeString = `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`

          const availability = await this.checkProfessionalAvailability(professionalId, date, timeString, endTimeString)

          slots.push({
            time: timeString,
            available: availability.is_available,
            reason: availability.reason,
          })
        }
      }

      return slots
    } catch (error) {
      console.error("Error getting available slots:", error)
      throw error
    }
  }
}
