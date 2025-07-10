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
    service_id: number | null // 🆕 Añadido - Referencia al servicio asociado
    max_participants: number
    current_participants: number
    status: "active" | "completed" | "cancelled"
    color: string
    created_at: string
    updated_at: string
    // Relaciones pobladas
    professional?: {
      id: string
      name: string
    }
    consultation?: {
      id: string
      name: string
    }
    service?: { // 🆕 Añadido - Datos del servicio asociado
      id: number
      name: string
      color: string
      duration: number
      price: number
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
    service_id?: number | null // 🆕 Añadido - Servicio asociado opcional
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
    service_id?: number | null // 🆕 Añadido - Actualizar servicio asociado
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
    service_id: number | null // 🆕 Añadido - Servicio en formulario
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
    // 🆕 Añadido - Estadísticas por servicio
    stats_by_service?: {
      service_id: number
      service_name: string
      activity_count: number
      participant_count: number
    }[]
  }
  
  // Tipos para filtros de actividades grupales
  export interface GroupActivityFilters {
    status?: ("active" | "completed" | "cancelled")[]
    professional_ids?: string[]
    consultation_ids?: string[]
    service_ids?: number[] // 🆕 Añadido - Filtrar por servicios
    date_from?: string
    date_to?: string
  }
  
  // 🆕 Tipos adicionales para mejor funcionalidad
  
  // Tipo para participante con información extendida
  export interface GroupActivityParticipantExtended extends GroupActivityParticipant {
    activity_name: string
    activity_date: string
    activity_start_time: string
    professional_name?: string
    consultation_name?: string
    service_name?: string // 🆕 Nombre del servicio
  }
  
  // Tipo para vista de calendario de actividades grupales
  export interface GroupActivityCalendarEvent {
    id: string
    title: string
    start: Date
    end: Date
    color: string
    professional_name: string
    current_participants: number
    max_participants: number
    status: "active" | "completed" | "cancelled"
    service_name?: string // 🆕 Nombre del servicio para mostrar
  }
  
  // Tipo para reportes de actividades grupales
  export interface GroupActivityReport {
    activity_id: string
    activity_name: string
    date: string
    professional_name: string
    service_name?: string // 🆕 Servicio asociado
    max_participants: number
    registered_count: number
    attended_count: number
    no_show_count: number
    cancelled_count: number
    attendance_rate: number
    revenue?: number // 🆕 Ingresos si está asociado a un servicio
  }
  
  // Tipo para configuración de actividades grupales
  export interface GroupActivityConfig {
    default_duration: number
    default_max_participants: number
    default_color: string
    allow_overbooking: boolean
    reminder_hours_before: number[]
    require_service_association: boolean // 🆕 Si es obligatorio asociar un servicio
  }
  
  // Tipo para notificaciones de actividades grupales
  export interface GroupActivityNotification {
    id: string
    activity_id: string
    participant_id: string
    type: "reminder" | "cancellation" | "update"
    message: string
    sent_at: string
    status: "pending" | "sent" | "failed"
  }
  
  // 🆕 Tipo para validación de horarios de actividades grupales
  export interface GroupActivityTimeSlot {
    date: string
    start_time: string
    end_time: string
    professional_id: string
    consultation_id?: string
    is_available: boolean
    conflicting_activities?: string[] // IDs de actividades en conflicto
  }
  
  // 🆕 Tipo para plantillas de actividades grupales
  export interface GroupActivityTemplate {
    id: string
    name: string
    description: string
    service_id: number
    default_duration: number
    default_max_participants: number
    default_color: string
    organization_id: number
    is_active: boolean
    created_at: string
    updated_at: string
  }