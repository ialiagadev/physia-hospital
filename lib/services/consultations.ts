import { supabase } from "@/lib/supabase/client"
import type { Consultation } from "@/types/calendar"

export class ConsultationService {
  static async getConsultations(): Promise<Consultation[]> {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        console.log("No authenticated user found")
        return []
      }

      // Obtener el organization_id del usuario
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.user.id)
        .single()

      if (userError) {
        console.error("Error fetching user data:", userError)
        return []
      }

      if (!userData?.organization_id) {
        console.log("User has no organization_id")
        return []
      }

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
    try {
      if (!userProfile?.organization_id) {
        throw new Error("Usuario sin organización asignada")
      }

      console.log("✅ Creating consultation for organization:", userProfile.organization_id)

      const { data, error } = await supabase
        .from("consultations")
        .insert({
          ...consultationData,
          organization_id: userProfile.organization_id,
        })
        .select()
        .single()

      if (error) {
        console.error("Error inserting consultation:", error)
        throw error
      }

      console.log("✅ Consultation created:", data)
      return data
    } catch (error) {
      console.error("Error creating consultation:", error)
      throw error
    }
  }

  static async updateConsultation(id: string, consultationData: Partial<Consultation>): Promise<Consultation> {
    try {
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
    } catch (error) {
      console.error("Error updating consultation:", error)
      throw error
    }
  }

  static async deleteConsultation(id: string): Promise<void> {
    try {
      // Verificar si hay citas programadas en esta consulta
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("id")
        .eq("consultation_id", id)
        .neq("status", "cancelled")
        .limit(1)

      if (appointmentsError) throw appointmentsError

      if (appointments && appointments.length > 0) {
        throw new Error("No se puede eliminar la consulta porque tiene citas programadas")
      }

      const { error } = await supabase.from("consultations").delete().eq("id", id)

      if (error) throw error
    } catch (error) {
      console.error("Error deleting consultation:", error)
      throw error
    }
  }

  static async getAvailableConsultations(
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<Consultation[]> {
    try {
      console.log("Checking availability for:", { date, startTime, endTime, excludeAppointmentId })

      // Primero obtener todas las consultas activas
      const allConsultations = await this.getConsultations()
      console.log("All consultations:", allConsultations)

      // Construir la consulta para citas ocupadas
      let query = supabase
        .from("appointments")
        .select("consultation_id")
        .eq("date", date)
        .neq("status", "cancelled")
        .lt("start_time", endTime)
        .gt("end_time", startTime)

      // Excluir la cita actual si se está editando
      if (excludeAppointmentId) {
        query = query.neq("id", excludeAppointmentId)
      }

      const { data: occupiedAppointments, error } = await query

      if (error) {
        console.error("Error querying occupied appointments:", error)
        throw error
      }

      console.log("Occupied appointments:", occupiedAppointments)

      const occupiedConsultationIds = occupiedAppointments?.map((apt) => apt.consultation_id) || []
      console.log("Occupied consultation IDs:", occupiedConsultationIds)

      // Filtrar consultas disponibles
      const availableConsultations = allConsultations.filter(
        (consultation) => !occupiedConsultationIds.includes(consultation.id),
      )

      console.log("Available consultations:", availableConsultations)
      return availableConsultations
    } catch (error) {
      console.error("Error getting available consultations:", error)
      return []
    }
  }

  static async isConsultationAvailable(
    consultationId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    try {
      const availableConsultations = await this.getAvailableConsultations(
        date,
        startTime,
        endTime,
        excludeAppointmentId,
      )
      return availableConsultations.some((consultation) => consultation.id === consultationId)
    } catch (error) {
      console.error("Error checking consultation availability:", error)
      return false
    }
  }
}
