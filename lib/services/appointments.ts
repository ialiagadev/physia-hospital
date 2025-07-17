import { supabase } from "@/lib/supabase/client"
import type { AppointmentWithDetails, AppointmentInsert, AppointmentUpdate } from "@/types/calendar"
import { RecurrenceService, type RecurrenceConfig } from "./recurrence-service"
import { format } from "date-fns"

export class AppointmentService {
  // Obtener citas con detalles completos (incluyendo consulta)
  static async getAppointmentsWithDetails(
    startDate?: string,
    endDate?: string,
    professionalIds?: string[],
    organizationId?: number,
  ): Promise<AppointmentWithDetails[]> {
    let query = supabase
      .from("appointments")
      .select(`
        *,
        client:clients(*),
        professional:users!appointments_professional_id_fkey(*),
        appointment_type:appointment_types(*),
        consultation:consultations(*),
        service:services(*),
        created_by_user:users!appointments_created_by_fkey(*)
      `)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    // Filtrar por organización si se proporciona
    if (organizationId) {
      query = query.eq("organization_id", organizationId)
    }

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
        service:services(*),
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

    // ✅ VALIDAR TIPO DE RECURRENCIA
    if (!["daily", "weekly", "monthly"].includes(appointment.recurrence_type)) {
      throw new Error(`Tipo de recurrencia no válido: ${appointment.recurrence_type}`)
    }

    // Generar fechas de la serie
    const startDate = new Date(appointment.date)
    const config: RecurrenceConfig = {
      type: appointment.recurrence_type as "daily" | "weekly" | "monthly",
      interval: appointment.recurrence_interval || 1,
      endDate: new Date(appointment.recurrence_end_date),
    }

    // ✅ VALIDAR CONFIGURACIÓN ANTES DE GENERAR
    const validationErrors = RecurrenceService.validateRecurrenceConfig(config)
    if (validationErrors.length > 0) {
      throw new Error(`Configuración de recurrencia inválida: ${validationErrors.join(", ")}`)
    }

    const recurringDates = RecurrenceService.generateRecurringDates(startDate, config)

    if (recurringDates.length === 0) {
      throw new Error("No se pudieron generar fechas para la recurrencia")
    }

    // ✅ LÍMITE DE SEGURIDAD
    const maxInstances = RecurrenceService.getMaxInstances(config.type)
    if (recurringDates.length > maxInstances) {
      throw new Error(`Demasiadas citas para crear (${recurringDates.length}). Máximo permitido: ${maxInstances}`)
    }

    console.log(`Creating ${recurringDates.length} individual appointments for ${config.type} recurrence`)

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

    // ✅ INSERTAR EN LOTES PARA EVITAR TIMEOUTS
    const batchSize = 50
    const allCreatedAppointments: AppointmentWithDetails[] = []

    for (let i = 0; i < appointmentsToCreate.length; i += batchSize) {
      const batch = appointmentsToCreate.slice(i, i + batchSize)

      const { data, error } = await supabase
        .from("appointments")
        .insert(batch)
        .select(`
          *,
          client:clients(*),
          professional:users!appointments_professional_id_fkey(*),
          appointment_type:appointment_types(*),
          consultation:consultations(*),
          service:services(*),
          created_by_user:users!appointments_created_by_fkey(*)
        `)

      if (error) {
        console.error(`Error creating batch ${i / batchSize + 1}:`, error)
        throw error
      }

      allCreatedAppointments.push(...(data as AppointmentWithDetails[]))

      // Pequeña pausa entre lotes
      if (i + batchSize < appointmentsToCreate.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(`Successfully created ${allCreatedAppointments.length} appointments`)

    // Retornar la primera cita como referencia
    return allCreatedAppointments[0]
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
        service:services(*),
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

  // ✅ NUEVA: Eliminar múltiples citas (para series recurrentes)
  static async deleteMultipleAppointments(appointmentIds: string[]): Promise<void> {
    if (appointmentIds.length === 0) return

    const { error } = await supabase.from("appointments").delete().in("id", appointmentIds)

    if (error) {
      console.error("Error deleting multiple appointments:", error)
      throw error
    }

    console.log(`Successfully deleted ${appointmentIds.length} appointments`)
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

    // Verificar disponibilidad de la consulta (solo si se especifica)
    let consultationQuery = null
    if (consultationId && consultationId !== "none") {
      consultationQuery = supabase
        .from("appointments")
        .select("id")
        .eq("consultation_id", consultationId)
        .eq("date", date)
        .neq("status", "cancelled")
        .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)

      if (excludeAppointmentId) {
        consultationQuery = consultationQuery.neq("id", excludeAppointmentId)
      }
    }

    const queries = [professionalQuery]
    if (consultationQuery) {
      queries.push(consultationQuery)
    }

    const results = await Promise.all(queries)
    const professionalResult = results[0]
    const consultationResult = results[1] || { data: [], error: null }

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

  // ✅ NUEVA: Verificar conflictos para múltiples fechas (para recurrencia)
  static async checkMultipleAvailability(
    professionalId: string,
    consultationId: string,
    dates: string[],
    startTime: string,
    endTime: string,
  ): Promise<{ date: string; available: boolean; conflicts: any[] }[]> {
    const results = []

    for (const date of dates) {
      try {
        const availability = await this.checkAvailability(professionalId, consultationId, date, startTime, endTime)

        // Si hay conflictos, obtener detalles
        let conflicts: any[] = []
        if (!availability.professionalAvailable || !availability.consultationAvailable) {
          const { data } = await supabase
            .from("appointments")
            .select("id, start_time, end_time, client:clients(name)")
            .eq("professional_id", professionalId)
            .eq("date", date)
            .neq("status", "cancelled")
            .or(`start_time.lt.${endTime},end_time.gt.${startTime}`)

          conflicts = data || []
        }

        results.push({
          date,
          available: availability.professionalAvailable && availability.consultationAvailable,
          conflicts,
        })
      } catch (error) {
        results.push({
          date,
          available: false,
          conflicts: [],
        })
      }
    }

    return results
  }
}
