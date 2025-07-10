// Tipos para actividades grupales
export interface GroupAppointmentParticipant {
    id: string
    appointment_id: string
    client_id: number
    enrollment_status: "confirmed" | "pending" | "cancelled" | "waiting_list"
    enrolled_at: string
    notes: string | null
    created_at: string
    updated_at: string
    // Relación con cliente
    client?: {
      id: number
      name: string
      phone: string | null
      email: string | null
    }
  }
  
  export interface GroupAppointmentParticipantInsert {
    appointment_id: string
    client_id: number
    enrollment_status?: "confirmed" | "pending" | "cancelled" | "waiting_list"
    notes?: string | null
  }
  
  export interface GroupAppointmentParticipantUpdate {
    enrollment_status?: "confirmed" | "pending" | "cancelled" | "waiting_list"
    notes?: string | null
  }
  
  // Importar AppointmentWithDetails, AppointmentInsert y AppointmentUpdate
  import type { AppointmentWithDetails, AppointmentInsert, AppointmentUpdate } from "./calendar"
  
  // Extender el tipo AppointmentWithDetails existente
  export interface GroupAppointmentWithDetails extends AppointmentWithDetails {
    is_group_activity: boolean
    max_participants: number
    additional_participants?: GroupAppointmentParticipant[]
    current_participants_count?: number
    available_spots?: number
  }
  
  // Extender AppointmentInsert y AppointmentUpdate
  export interface GroupAppointmentInsert extends AppointmentInsert {
    is_group_activity?: boolean
    max_participants?: number
  }
  
  export interface GroupAppointmentUpdate extends AppointmentUpdate {
    is_group_activity?: boolean
    max_participants?: number
  }
  
  // Tipo para estadísticas de participación
  export interface GroupActivityStats {
    total_participants: number
    confirmed_participants: number
    pending_participants: number
    waiting_list_participants: number
    available_spots: number
    is_full: boolean
    has_waiting_list: boolean
  }
  