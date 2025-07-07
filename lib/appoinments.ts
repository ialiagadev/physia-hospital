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
      .select("id, date, status, organization_id")
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
      .select("id, date, status, organization_id")
      .eq("date", tomorrowDate)

    console.log("1. Todas las citas para", tomorrowDate, ":", allDateAppointments)

    // 2. Filtrar por organización
    const { data: orgAppointments, error: orgError } = await supabase
      .from("appointments")
      .select("id, date, status, organization_id")
      .eq("date", tomorrowDate)
      .eq("organization_id", organizationId)

    console.log("2. Citas para", tomorrowDate, "en org", organizationId, ":", orgAppointments)

    // 3. Consulta completa
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
      .eq("date", tomorrowDate)

    // Comentar temporalmente el filtro de status para ver si es el problema
    // .in("status", ["confirmed", "pending"])

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
      clients: appointment.clients,
      professional: appointment.professional,
      appointment_types: appointment.appointment_types,
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
      .eq("date", date)
    // Comentar temporalmente el filtro de status
    // .in("status", ["confirmed", "pending"])

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
      clients: appointment.clients,
      professional: appointment.professional,
      appointment_types: appointment.appointment_types,
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
