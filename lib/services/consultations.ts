import { supabase } from "@/lib/supabase/client"
import type { Consultation } from "@/types/calendar"

export class ConsultationService {
  static async getConsultations(): Promise<Consultation[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return []

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.user.id)
        .single()

      if (userError || !userData?.organization_id) return []

      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("organization_id", userData.organization_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching consultations:", error)
      return []
    }
  }

  static async createConsultation(
    consultationData: Omit<Consultation, "id" | "created_at" | "updated_at" | "organization_id">,
    userProfile: { organization_id: number } | null,
  ): Promise<Consultation> {
    if (!userProfile?.organization_id) {
      throw new Error("Usuario sin organización asignada")
    }

    const { data, error } = await supabase
      .from("consultations")
      .insert({
        ...consultationData,
        organization_id: userProfile.organization_id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async updateConsultation(id: string, consultationData: Partial<Consultation>): Promise<Consultation> {
    const { data, error } = await supabase
      .from("consultations")
      .update({
        ...consultationData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async deleteConsultation(id: string): Promise<void> {
    // Primero eliminar todas las citas asociadas a esta consulta
    const { error: appointmentsError } = await supabase.from("appointments").delete().eq("consultation_id", id)

    if (appointmentsError) {
      throw new Error(`Error al eliminar las citas asociadas: ${appointmentsError.message}`)
    }

    // Luego eliminar la consulta
    const { error: consultationError } = await supabase.from("consultations").delete().eq("id", id)

    if (consultationError) {
      throw new Error(`Error al eliminar la consulta: ${consultationError.message}`)
    }
  }
}
