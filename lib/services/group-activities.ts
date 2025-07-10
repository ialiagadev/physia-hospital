import { supabase } from "@/lib/supabase/client"
import type {
  GroupAppointmentParticipant,
  GroupAppointmentParticipantInsert,
  GroupAppointmentParticipantUpdate,
  GroupAppointmentWithDetails,
  GroupActivityStats,
} from "@/types/group-activities"

export class GroupActivityService {
  // Obtener participantes de una actividad grupal
  static async getParticipants(appointmentId: string): Promise<GroupAppointmentParticipant[]> {
    const { data, error } = await supabase
      .from("group_appointment_participants")
      .select(`
        *,
        client:clients(id, name, phone, email)
      `)
      .eq("appointment_id", appointmentId)
      .order("enrolled_at", { ascending: true })

    if (error) {
      console.error("Error fetching group participants:", error)
      throw error
    }

    return data as GroupAppointmentParticipant[]
  }

  // Añadir participante a actividad grupal
  static async addParticipant(participant: GroupAppointmentParticipantInsert): Promise<GroupAppointmentParticipant> {
    // Primero verificar si hay espacio disponible
    const stats = await this.getActivityStats(participant.appointment_id)

    if (stats.is_full && participant.enrollment_status !== "waiting_list") {
      throw new Error("La actividad está completa. El participante se añadirá a la lista de espera.")
    }

    const { data, error } = await supabase
      .from("group_appointment_participants")
      .insert({
        ...participant,
        enrollment_status: stats.is_full ? "waiting_list" : participant.enrollment_status || "confirmed",
      })
      .select(`
        *,
        client:clients(id, name, phone, email)
      `)
      .single()

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        throw new Error("Este cliente ya está inscrito en la actividad")
      }
      console.error("Error adding participant:", error)
      throw error
    }

    return data as GroupAppointmentParticipant
  }

  // Actualizar participante
  static async updateParticipant(
    id: string,
    updates: GroupAppointmentParticipantUpdate,
  ): Promise<GroupAppointmentParticipant> {
    const { data, error } = await supabase
      .from("group_appointment_participants")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(`
        *,
        client:clients(id, name, phone, email)
      `)
      .single()

    if (error) {
      console.error("Error updating participant:", error)
      throw error
    }

    return data as GroupAppointmentParticipant
  }

  // Eliminar participante
  static async removeParticipant(id: string): Promise<void> {
    const { error } = await supabase.from("group_appointment_participants").delete().eq("id", id)

    if (error) {
      console.error("Error removing participant:", error)
      throw error
    }

    // TODO: Mover automáticamente a alguien de la lista de espera si hay espacio
  }

  // Obtener estadísticas de una actividad grupal
  static async getActivityStats(appointmentId: string): Promise<GroupActivityStats> {
    // Obtener información de la cita
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("max_participants, client_id")
      .eq("id", appointmentId)
      .single()

    if (appointmentError) {
      throw appointmentError
    }

    // Obtener participantes adicionales
    const { data: participants, error: participantsError } = await supabase
      .from("group_appointment_participants")
      .select("enrollment_status")
      .eq("appointment_id", appointmentId)

    if (participantsError) {
      throw participantsError
    }

    // Calcular estadísticas (incluir el participante principal)
    const confirmed = participants.filter((p) => p.enrollment_status === "confirmed").length + 1 // +1 por el participante principal
    const pending = participants.filter((p) => p.enrollment_status === "pending").length
    const waitingList = participants.filter((p) => p.enrollment_status === "waiting_list").length
    const total = confirmed + pending + waitingList
    const maxParticipants = appointment.max_participants || 1
    const available = Math.max(0, maxParticipants - confirmed)

    return {
      total_participants: total,
      confirmed_participants: confirmed,
      pending_participants: pending,
      waiting_list_participants: waitingList,
      available_spots: available,
      is_full: available === 0,
      has_waiting_list: waitingList > 0,
    }
  }

  // Obtener actividad grupal completa con participantes
  static async getGroupActivityWithParticipants(appointmentId: string): Promise<GroupAppointmentWithDetails | null> {
    // Obtener la cita base
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        *,
        client:clients(*),
        professional:users!appointments_professional_id_fkey(*),
        appointment_type:appointment_types(*),
        consultation:consultations(*),
        created_by_user:users!appointments_created_by_fkey(*)
      `)
      .eq("id", appointmentId)
      .single()

    if (appointmentError) {
      console.error("Error fetching group appointment:", appointmentError)
      throw appointmentError
    }

    // Si no es actividad grupal, devolver como cita normal
    if (!appointment.is_group_activity) {
      return appointment as GroupAppointmentWithDetails
    }

    // Obtener participantes adicionales y estadísticas
    const [participants, stats] = await Promise.all([
      this.getParticipants(appointmentId),
      this.getActivityStats(appointmentId),
    ])

    return {
      ...appointment,
      additional_participants: participants,
      current_participants_count: stats.confirmed_participants,
      available_spots: stats.available_spots,
    } as GroupAppointmentWithDetails
  }

  // Promover participante de lista de espera
  static async promoteFromWaitingList(appointmentId: string): Promise<void> {
    // Buscar el primer participante en lista de espera
    const { data: waitingParticipant, error } = await supabase
      .from("group_appointment_participants")
      .select("id")
      .eq("appointment_id", appointmentId)
      .eq("enrollment_status", "waiting_list")
      .order("enrolled_at", { ascending: true })
      .limit(1)
      .single()

    if (error || !waitingParticipant) {
      return // No hay nadie en lista de espera
    }

    // Verificar si hay espacio disponible
    const stats = await this.getActivityStats(appointmentId)
    if (stats.available_spots > 0) {
      await this.updateParticipant(waitingParticipant.id, {
        enrollment_status: "confirmed",
      })
    }
  }
}
