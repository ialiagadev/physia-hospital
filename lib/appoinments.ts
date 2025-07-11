import { createServerSupabaseClient } from "./supabase"

// Tipos actualizados para coincidir con el esquema real
interface AppointmentData {
  id: string // uuid
  date: string
  start_time: string
  end_time: string
  duration: number
  status: string
  notes: string | null
  user_id: string
  professional_id: string
  client_id: number
  appointment_type_id: string
  consultation_id: string
  day_of_week: string | null
  // 🆕 CAMPOS DE RECURRENCIA
  is_recurring?: boolean
  recurrence_type?: "weekly" | "monthly" | null
  recurrence_interval?: number | null
  recurrence_end_date?: string | null
  parent_appointment_id?: string | null
  clients: {
    id: number
    name: string
    email: string | null
    phone: string | null
  } | null
  professional: {
    id: string
    name: string
    email: string | null
  } | null
  appointment_types: {
    id: string
    name: string
  } | null
  // Nuevos campos del historial médico
  motivo_consulta?: string | null
  diagnostico?: string | null
}

interface AppointmentResponse {
  success: true
  appointments: AppointmentData[]
  date: string
  total: number
}

interface AppointmentError {
  success: false
  error: string
  appointments?: never
  date?: never
  total?: never
}

type AppointmentResult = AppointmentResponse | AppointmentError

// Función de debugging para ver qué hay en la tabla
export async function debugAppointments(organizationId: number): Promise<any> {
  try {
    const supabase = createServerSupabaseClient()

    // Consulta simple para ver todas las citas de la organización
    const { data: allAppointments, error: allError } = await supabase
      .from("appointments")
      .select("id, date, status, organization_id, is_recurring, parent_appointment_id")
      .eq("organization_id", organizationId)
      .limit(10)

    console.log("=== DEBUG: Todas las citas de la organización ===")
    console.log("Organization ID buscado:", organizationId)
    console.log("Citas encontradas:", allAppointments)
    console.log("Error:", allError)

    // Ver qué organizaciones existen
    const { data: orgs, error: orgError } = await supabase.from("appointments").select("organization_id").limit(10)

    console.log("=== DEBUG: Organization IDs que existen ===")
    console.log("Organizations:", [...new Set(orgs?.map((o) => o.organization_id))])

    return {
      allAppointments,
      organizations: [...new Set(orgs?.map((o) => o.organization_id))],
      error: allError || orgError,
    }
  } catch (error) {
    console.error("Error in debug:", error)
    return { error: "Debug failed" }
  }
}

export async function getTomorrowAppointments(
  organizationId: number,
  professionalId?: string,
): Promise<AppointmentResult> {
  try {
    const supabase = createServerSupabaseClient()

    // Calcular la fecha de mañana
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split("T")[0] // YYYY-MM-DD

    console.log("=== CONSULTA DE CITAS MAÑANA ===")
    console.log("Fecha de mañana:", tomorrowDate)
    console.log("Organization ID:", organizationId)
    console.log("Professional ID:", professionalId)

    // Primero hacer debug
    await debugAppointments(organizationId)

    // Consulta paso a paso para debuggear

    // 1. Ver todas las citas de la fecha sin filtros
    const { data: allDateAppointments, error: dateError } = await supabase
      .from("appointments")
      .select("id, date, status, organization_id, is_recurring")
      .eq("date", tomorrowDate)

    console.log("1. Todas las citas para", tomorrowDate, ":", allDateAppointments)

    // 2. Filtrar por organización
    const { data: orgAppointments, error: orgError } = await supabase
      .from("appointments")
      .select("id, date, status, organization_id, is_recurring")
      .eq("date", tomorrowDate)
      .eq("organization_id", organizationId)

    console.log("2. Citas para", tomorrowDate, "en org", organizationId, ":", orgAppointments)

    // 3. Consulta completa con historial médico y campos de recurrencia
    let query = supabase
      .from("appointments")
      .select(`
        id,
        date,
        start_time,
        end_time,
        duration,
        status,
        notes,
        user_id,
        professional_id,
        client_id,
        appointment_type_id,
        consultation_id,
        day_of_week,
        organization_id,
        is_recurring,
        recurrence_type,
        recurrence_interval,
        recurrence_end_date,
        parent_appointment_id,
        clients!appointments_client_id_fkey (
          id,
          name,
          email,
          phone
        ),
        professional:users!appointments_professional_id_fkey (
          id,
          name,
          email
        ),
        appointment_types!appointments_appointment_type_id_fkey (
          id,
          name
        ),
        medical_histories!left(
          motivo_consulta,
          diagnostico
        )
      `)
      .eq("organization_id", organizationId)
      .eq("date", tomorrowDate)

    if (professionalId) {
      query = query.eq("professional_id", professionalId)
    }

    query = query.order("start_time", { ascending: true })

    const { data, error } = await query

    console.log("3. Consulta completa - Data:", data)
    console.log("3. Consulta completa - Error:", error)

    if (error) {
      console.error("Error fetching appointments:", error)
      return { success: false, error: error.message }
    }

    // Transformar los datos para asegurar el tipo correcto
    const appointments: AppointmentData[] = (data || []).map((appointment: any) => ({
      id: appointment.id,
      date: appointment.date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      duration: appointment.duration,
      status: appointment.status,
      notes: appointment.notes,
      user_id: appointment.user_id,
      professional_id: appointment.professional_id,
      client_id: appointment.client_id,
      appointment_type_id: appointment.appointment_type_id,
      consultation_id: appointment.consultation_id,
      day_of_week: appointment.day_of_week,
      // 🆕 CAMPOS DE RECURRENCIA
      is_recurring: appointment.is_recurring,
      recurrence_type: appointment.recurrence_type,
      recurrence_interval: appointment.recurrence_interval,
      recurrence_end_date: appointment.recurrence_end_date,
      parent_appointment_id: appointment.parent_appointment_id,
      clients: appointment.clients,
      professional: appointment.professional,
      appointment_types: appointment.appointment_types,
      // Nuevos campos del historial médico
      motivo_consulta: appointment.medical_histories?.[0]?.motivo_consulta || null,
      diagnostico: appointment.medical_histories?.[0]?.diagnostico || null,
    }))

    return {
      success: true,
      appointments,
      date: tomorrowDate,
      total: appointments.length,
    }
  } catch (error) {
    console.error("Error in getTomorrowAppointments:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

export async function getAppointmentsByDate(
  organizationId: number,
  date: string,
  professionalId?: string,
): Promise<AppointmentResult> {
  try {
    const supabase = createServerSupabaseClient()

    console.log("=== CONSULTA DE CITAS POR FECHA ===")
    console.log("Fecha:", date)
    console.log("Organization ID:", organizationId)
    console.log("Professional ID:", professionalId)

    let query = supabase
      .from("appointments")
      .select(`
        id,
        date,
        start_time,
        end_time,
        duration,
        status,
        notes,
        user_id,
        professional_id,
        client_id,
        appointment_type_id,
        consultation_id,
        day_of_week,
        organization_id,
        is_recurring,
        recurrence_type,
        recurrence_interval,
        recurrence_end_date,
        parent_appointment_id,
        clients!appointments_client_id_fkey (
          id,
          name,
          email,
          phone
        ),
        professional:users!appointments_professional_id_fkey (
          id,
          name,
          email
        ),
        appointment_types!appointments_appointment_type_id_fkey (
          id,
          name
        ),
        medical_histories!left(
          motivo_consulta,
          diagnostico
        )
      `)
      .eq("organization_id", organizationId)
      .eq("date", date)

    if (professionalId) {
      query = query.eq("professional_id", professionalId)
    }

    query = query.order("start_time", { ascending: true })

    const { data, error } = await query

    console.log("Consulta por fecha - Data:", data)
    console.log("Consulta por fecha - Error:", error)

    if (error) {
      console.error("Error fetching appointments:", error)
      return { success: false, error: error.message }
    }

    // Transformar los datos para asegurar el tipo correcto
    const appointments: AppointmentData[] = (data || []).map((appointment: any) => ({
      id: appointment.id,
      date: appointment.date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      duration: appointment.duration,
      status: appointment.status,
      notes: appointment.notes,
      user_id: appointment.user_id,
      professional_id: appointment.professional_id,
      client_id: appointment.client_id,
      appointment_type_id: appointment.appointment_type_id,
      consultation_id: appointment.consultation_id,
      day_of_week: appointment.day_of_week,
      // 🆕 CAMPOS DE RECURRENCIA
      is_recurring: appointment.is_recurring,
      recurrence_type: appointment.recurrence_type,
      recurrence_interval: appointment.recurrence_interval,
      recurrence_end_date: appointment.recurrence_end_date,
      parent_appointment_id: appointment.parent_appointment_id,
      clients: appointment.clients,
      professional: appointment.professional,
      appointment_types: appointment.appointment_types,
      // Nuevos campos del historial médico - obtener el más reciente
      motivo_consulta: appointment.medical_histories?.[0]?.motivo_consulta || null,
      diagnostico: appointment.medical_histories?.[0]?.diagnostico || null,
    }))

    return {
      success: true,
      appointments,
      date,
      total: appointments.length,
    }
  } catch (error) {
    console.error("Error in getAppointmentsByDate:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

// 🆕 NUEVA FUNCIÓN: Obtener citas recurrentes por ID padre
export async function getRecurringAppointmentsByParent(
  organizationId: number,
  parentAppointmentId: string,
): Promise<AppointmentResult> {
  try {
    const supabase = createServerSupabaseClient()

    console.log("=== CONSULTA DE CITAS RECURRENTES ===")
    console.log("Organization ID:", organizationId)
    console.log("Parent Appointment ID:", parentAppointmentId)

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        date,
        start_time,
        end_time,
        duration,
        status,
        notes,
        user_id,
        professional_id,
        client_id,
        appointment_type_id,
        consultation_id,
        day_of_week,
        organization_id,
        is_recurring,
        recurrence_type,
        recurrence_interval,
        recurrence_end_date,
        parent_appointment_id,
        clients!appointments_client_id_fkey (
          id,
          name,
          email,
          phone
        ),
        professional:users!appointments_professional_id_fkey (
          id,
          name,
          email
        ),
        appointment_types!appointments_appointment_type_id_fkey (
          id,
          name
        )
      `)
      .eq("organization_id", organizationId)
      .or(`id.eq.${parentAppointmentId},parent_appointment_id.eq.${parentAppointmentId}`)
      .order("date", { ascending: true })

    if (error) {
      console.error("Error fetching recurring appointments:", error)
      return { success: false, error: error.message }
    }

    const appointments: AppointmentData[] = (data || []).map((appointment: any) => ({
      id: appointment.id,
      date: appointment.date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      duration: appointment.duration,
      status: appointment.status,
      notes: appointment.notes,
      user_id: appointment.user_id,
      professional_id: appointment.professional_id,
      client_id: appointment.client_id,
      appointment_type_id: appointment.appointment_type_id,
      consultation_id: appointment.consultation_id,
      day_of_week: appointment.day_of_week,
      is_recurring: appointment.is_recurring,
      recurrence_type: appointment.recurrence_type,
      recurrence_interval: appointment.recurrence_interval,
      recurrence_end_date: appointment.recurrence_end_date,
      parent_appointment_id: appointment.parent_appointment_id,
      clients: appointment.clients,
      professional: appointment.professional,
      appointment_types: appointment.appointment_types,
    }))

    return {
      success: true,
      appointments,
      date: appointments[0]?.date || "",
      total: appointments.length,
    }
  } catch (error) {
    console.error("Error in getRecurringAppointmentsByParent:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

// 🆕 NUEVA FUNCIÓN: Eliminar serie completa de citas recurrentes
export async function deleteRecurringAppointmentSeries(
  organizationId: number,
  parentAppointmentId: string,
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  try {
    const supabase = createServerSupabaseClient()

    console.log("=== ELIMINAR SERIE DE CITAS RECURRENTES ===")
    console.log("Organization ID:", organizationId)
    console.log("Parent Appointment ID:", parentAppointmentId)

    // Eliminar todas las citas de la serie (incluyendo la padre)
    const { data, error } = await supabase
      .from("appointments")
      .delete()
      .eq("organization_id", organizationId)
      .or(`id.eq.${parentAppointmentId},parent_appointment_id.eq.${parentAppointmentId}`)
      .select("id")

    if (error) {
      console.error("Error deleting recurring appointment series:", error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      deletedCount: data?.length || 0,
    }
  } catch (error) {
    console.error("Error in deleteRecurringAppointmentSeries:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}

// 🆕 NUEVA FUNCIÓN: Actualizar serie completa de citas recurrentes
export async function updateRecurringAppointmentSeries(
  organizationId: number,
  parentAppointmentId: string,
  updates: Partial<AppointmentData>,
): Promise<{ success: boolean; error?: string; updatedCount?: number }> {
  try {
    const supabase = createServerSupabaseClient()

    console.log("=== ACTUALIZAR SERIE DE CITAS RECURRENTES ===")
    console.log("Organization ID:", organizationId)
    console.log("Parent Appointment ID:", parentAppointmentId)
    console.log("Updates:", updates)

    // Actualizar todas las citas de la serie (excluyendo campos específicos de recurrencia)
    const { recurrence_type, recurrence_interval, recurrence_end_date, parent_appointment_id, ...safeUpdates } = updates

    const { data, error } = await supabase
      .from("appointments")
      .update(safeUpdates)
      .eq("organization_id", organizationId)
      .or(`id.eq.${parentAppointmentId},parent_appointment_id.eq.${parentAppointmentId}`)
      .select("id")

    if (error) {
      console.error("Error updating recurring appointment series:", error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      updatedCount: data?.length || 0,
    }
  } catch (error) {
    console.error("Error in updateRecurringAppointmentSeries:", error)
    return { success: false, error: "Error interno del servidor" }
  }
}
