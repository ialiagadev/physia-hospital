// Tipos específicos para actividades grupales
export interface GroupActivity {
    id: string
    organization_id: number
    name: string
    description: string | null
    date: string
    start_time: string
    end_time: string
    professional_id: string
    consultation_id: string | null
    max_participants: number
    current_participants: number
    status: "active" | "completed" | "cancelled"
    color: string
    created_at: string
    updated_at: string
    professional?: {
      id: string
      name: string
    }
    consultation?: {
      id: string
      name: string
    }
    participants?: GroupActivityParticipant[]
  }
  
  export interface GroupActivityParticipant {
    id: string
    group_activity_id: string
    client_id: number
    status: "registered" | "attended" | "no_show" | "cancelled"
    registration_date: string
    notes: string | null
    client?: {
      id: number
      name: string
      phone: string | null
      email: string | null
    }
  }
  
  export interface GroupActivityInsert {
    organization_id: number
    name: string
    description?: string | null
    date: string
    start_time: string
    end_time: string
    professional_id: string
    consultation_id?: string | null
    max_participants: number
    color?: string
  }
  
  export interface GroupActivityUpdate {
    name?: string
    description?: string | null
    date?: string
    start_time?: string
    end_time?: string
    professional_id?: string
    consultation_id?: string | null
    max_participants?: number
    status?: "active" | "completed" | "cancelled"
    color?: string
  }
  
  export interface GroupActivityFormData {
    name: string
    description: string
    date: Date
    start_time: string
    end_time: string
    professional_id: string
    consultation_id: string
    max_participants: number
    color: string
  }
  
  // Tipos para estadísticas de actividades grupales
  export interface GroupActivityStats {
    total_activities: number
    active_activities: number
    completed_activities: number
    cancelled_activities: number
    total_participants: number
    average_attendance_rate: number
  }
  
  // Tipos para filtros de actividades grupales
  export interface GroupActivityFilters {
    status?: ("active" | "completed" | "cancelled")[]
    professional_ids?: string[]
    consultation_ids?: string[]
    date_from?: string
    date_to?: string
  }
  