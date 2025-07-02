import { supabase } from "@/lib/supabase/client"
import type { Professional, ProfessionalSettings, AppointmentType } from "@/types/calendar"

export class UserService {
  // Obtener usuarios profesionales de la misma organización
  static async getProfessionalsInOrganization(): Promise<Professional[]> {
    // Primero obtener el usuario actual para saber su organización
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("No authenticated user")

    const { data: currentUser } = await supabase.from("users").select("organization_id").eq("id", user.id).single()

    if (!currentUser) throw new Error("Current user not found")

    // Obtener todos los profesionales de la misma organización
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        settings:professional_settings(*),
        appointment_types(*),
        work_schedules(*)
      `)
      .eq("role", "professional")
      .eq("organization_id", currentUser.organization_id)
      .order("name")

    if (error) {
      console.error("Error fetching professionals:", error)
      throw error
    }

    return data as Professional[]
  }

  // Obtener usuario actual con detalles
  static async getCurrentUser(): Promise<Professional | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        settings:professional_settings(*),
        appointment_types(*),
        work_schedules(*)
      `)
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Error fetching current user:", error)
      return null
    }

    return data as Professional
  }

  // Obtener todos los usuarios de la organización (admins + profesionales)
  static async getUsersInOrganization(): Promise<Professional[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("No authenticated user")

    const { data: currentUser } = await supabase.from("users").select("organization_id").eq("id", user.id).single()

    if (!currentUser) throw new Error("Current user not found")

    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        settings:professional_settings(*),
        appointment_types(*),
        work_schedules(*)
      `)
      .eq("organization_id", currentUser.organization_id)
      .order("name")

    if (error) {
      console.error("Error fetching users:", error)
      throw error
    }

    return data as Professional[]
  }

  // Actualizar configuración profesional
  static async updateProfessionalSettings(
    userId: string,
    settings: Partial<ProfessionalSettings>,
  ): Promise<ProfessionalSettings> {
    const { data, error } = await supabase
      .from("professional_settings")
      .upsert({ user_id: userId, ...settings })
      .select()
      .single()

    if (error) {
      console.error("Error updating professional settings:", error)
      throw error
    }

    return data
  }

  // Obtener tipos de cita del usuario
  static async getAppointmentTypes(userId: string): Promise<AppointmentType[]> {
    const { data, error } = await supabase
      .from("appointment_types")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("sort_order")

    if (error) {
      console.error("Error fetching appointment types:", error)
      throw error
    }

    return data
  }
}
