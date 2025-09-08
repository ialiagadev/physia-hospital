export interface GroupActivity {
    id: string
    name: string
    description?: string
    date: string
    start_time: string
    end_time: string
    max_participants: number
    current_participants: number
    professional_id: string
    service_id?: string
    location?: string
    color?: string
    status: "scheduled" | "in_progress" | "completed" | "cancelled"
    notes?: string
    created_at: string
    updated_at: string
    organization_id: string
  }
  
  export interface GroupActivityParticipant {
    id: string
    group_activity_id: string
    client_id: string
    status: "registered" | "attended" | "absent" | "cancelled"
    registration_date: string
    notes?: string
  }
  
  export interface GroupActivityWithDetails extends GroupActivity {
    professional: {
      id: string
      name: string
      email?: string
    }
    service?: {
      id: string
      name: string
      price?: number
    }
    participants: Array<{
      id: string
      client_id: string
      status: string
      client: {
        id: string
        name: string
        email?: string
        phone?: string
      }
    }>
  }
  
  export interface GroupActivityRecurrenceConfig {
    type: "weekly" | "monthly"
    interval: number
    endType: "date" | "count"
    endDate: Date
    count?: number
  }
  
  export interface GroupActivityRecurrencePreview {
    dates: Date[]
    count: number
    conflicts: Date[]
  }
  
  export interface GroupActivityInsert {
    name: string
    description?: string
    date: string
    start_time: string
    end_time: string
    duration: number
    max_participants: number
    professional_id: string
    service_id?: string
    location?: string
    color?: string
    status?: "scheduled" | "in_progress" | "completed" | "cancelled"
    notes?: string
    organization_id: string
  }
  
  export interface GroupActivityInsertRecurring extends GroupActivityInsert {
    recurrence_config: GroupActivityRecurrenceConfig
  }
  
  export interface GroupActivityFormData {
    name: string
    description: string
    date: Date
    start_time: string
    duration: number
    max_participants: number
    professional_id: string
    service_id: string
    location: string
    color: string
    notes: string
    is_recurring: boolean
    recurrence_config?: GroupActivityRecurrenceConfig
  }
