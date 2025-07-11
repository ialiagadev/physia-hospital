import { supabase } from "@/lib/supabase/client"
import type { AppointmentWithDetails, AppointmentInsert, AppointmentUpdate } from "@/types/calendar"
import { RecurrenceService } from "./recurrence-service"
import { format } from "date-fns"

export class AppointmentService {
  // Obtener citas con detalles completos (incluyendo consulta)
  static async getAppointmentsWithDetails(
    startDate?: string,
    endDate?: string,
    professionalIds?: string[],
  ): Promise<AppointmentWithDetails[]> {
    let query = supabase
      .from("appointments")
      .select(`
        *,
        client:clients(*),
        professional:users!appointments_professional_id_fkey(*),
        appointment_type:appointment_types(*),
        consultation:consultations(*),
        created_by_user:users!appointments_created_by_fkey(*)
      `)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    // Filtrar por rango de fechas
    if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate)
    } else if (startDate) {
      query = query.gte("date", startDate)
    } else if (endDate) {
      query = query.lte("date", endDate)
    }

    // Filtrar por profesionales
    if (professionalIds && professionalIds.length > 0) {
      query = query.in("professional_id", professionalIds)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching appointments:", error)
      throw error
    }

    return data as AppointmentWithDetails[]
  }

  // 🆕 Crear cita (simple: si es recurrente, crea múltiples citas individuales)
  static async createAppointment(appointment: AppointmentInsert): Promise<AppointmentWithDetails> {
    // Si es una cita recurrente, crear múltiples citas individuales
    if (appointment.is_recurring && appointment.recurrence_type && appointment.recurrence_end_date) {
      return this.createMultipleAppointments(appointment)
    }

    // Crear cita normal (sin campos de recurrencia)
    const cleanAppointment = { ...appointment }
    delete cleanAppointment.is_recurring
    delete cleanAppointment.recurrence_type
    delete cleanAppointment.recurrence_interval
    delete cleanAppointment.recurrence_end_date
    delete cleanAppointment.parent_appointment_id

    const { data, error } = await supabase
      .from("appointments")
      .insert(cleanAppointment)
      .select(`
        *,
        client:clients(*),
        professional:users!appointments_professional_id_fkey(*),
        appointment_type:appointment_types(*),
        consultation:consultations(*),
        created_by_user:users!appointments_created_by_fkey(*)
      `)
      .single()

    if (error) {
      console.error("Error creating appointment:", error)
      throw error
    }

    return data as AppointmentWithDetails
  }

  // 🆕 Crear múltiples citas individuales para recurrencia
  static async createMultipleAppointments(appointment: AppointmentInsert): Promise<AppointmentWithDetails> {
    if (!appointment.recurrence_type || !appointment.recurrence_end_date) {
      throw new Error("Configuración de recurrencia incompleta")
    }

    // Generar fechas de la serie
    const startDate = new Date(appointment.date)
    const config = {
      type: appointment.recurrence_type,
      interval: appointment.recurrence_interval || 1,
      endDate: new Date(appointment.recurrence_end_date),
    }

    const recurringDates = RecurrenceService.generateRecurringDates(startDate, config)

    if (recurringDates.length === 0) {
      throw new Error("No se pudieron generar fechas para la recurrencia")
    }

    console.log(`Creating ${recurringDates.length} individual appointments for recurrence`)

    // Crear una cita individual para cada fecha (SIN campos de recurrencia)
    const appointmentsToCreate = recurringDates.map((date) => {
      const cleanAppointment = { ...appointment }
      // Eliminar campos de recurrencia - cada cita es independiente
      delete cleanAppointment.is_recurring
      delete cleanAppointment.recurrence_type
      delete cleanAppointment.recurrence_interval
      delete cleanAppointment.recurrence_end_date
      delete cleanAppointment.parent_appointment_id

      // Asignar la fecha específica
      cleanAppointment.date = format(date, "yyyy-MM-dd")

      return cleanAppointment
    })

    // Insertar todas las citas de una vez
    const { data, error } = await supabase
      .from("appointments")
      .insert(appointmentsToCreate)
      .select(`
        *,
        client:clients(*),
        professional:users!appointments_professional_id_fkey(*),
        appointment_type:appointment_types(*),
        consultation:consultations(*),
        created_by_user:users!appointments_created_by_fkey(*)
      `)

    if (error) {
      console.error("Error creating recurring appointments:", error)
      throw error
    }

    console.log(`Successfully created ${data.length} appointments`)

    // Retornar la primera cita como referencia
    return data[0] as AppointmentWithDetails
  }

  // Actualizar cita
  static async updateAppointment(id: string, updates: AppointmentUpdate): Promise<AppointmentWithDetails> {
    const { data, error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        client:clients(*),
        professional:users!appointments_professional_id_fkey(*),
        appointment_type:appointment_types(*),
        consultation:consultations(*),
        created_by_user:users!appointments_created_by_fkey(*)
      `)
      .single()

    if (error) {
      console.error("Error updating appointment:", error)
      throw error
    }

    return data as AppointmentWithDetails
  }

  // Eliminar cita
  static async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase.from("appointments").delete().eq("id", id)

    if (error) {
      console.error("Error deleting appointment:", error)
      throw error
    }
  }

  // Verificar disponibilidad (ahora incluye consulta)
  static async checkAvailability(
    professionalId: string,
    consultationId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<{ professionalAvailable: boolean; consultationAvailable: boolean }> {
    // Verificar disponibilidad del profesional
    let professionalQuery = supabase
      .from("appointments")
      .select("id")
      .eq("professional_id", professionalId)
      .eq("date", date)
      .neq("status", "cancelled")
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)

    if (excludeAppointmentId) {
      professionalQuery = professionalQuery.neq("id", excludeAppointmentId)
    }

    // Verificar disponibilidad de la consulta
    let consultationQuery = supabase
      .from("appointments")
      .select("id")
      .eq("consultation_id", consultationId)
      .eq("date", date)
      .neq("status", "cancelled")
      .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)

    if (excludeAppointmentId) {
      consultationQuery = consultationQuery.neq("id", excludeAppointmentId)
    }

    const [professionalResult, consultationResult] = await Promise.all([professionalQuery, consultationQuery])

    if (professionalResult.error || consultationResult.error) {
      console.error("Error checking availability:", {
        professional: professionalResult.error,
        consultation: consultationResult.error,
      })
      throw professionalResult.error || consultationResult.error
    }

    return {
      professionalAvailable: professionalResult.data.length === 0,
      consultationAvailable: consultationResult.data.length === 0,
    }
  }
}
