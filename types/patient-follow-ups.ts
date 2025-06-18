export interface PatientFollowUp {
    id: number
    created_at: string
    updated_at: string
    client_id: number
    professional_id?: number
    organization_id: number
    follow_up_date: string
    follow_up_type: string
    description: string
    recommendations?: string
    next_appointment_note?: string
    is_active: boolean
    professional_name?: string
  
    // Relaciones
    professional?: {
      name: string
    }
    client?: {
      name: string
    }
  }
  
  export interface PatientFollowUpFormData {
    followUpDate: string
    followUpType: string
    description: string
    recommendations: string
    nextAppointmentNote: string
  }
  
  export interface FollowUpStats {
    totalFollowUps: number
    lastFollowUp: string | null
    mostCommonType: string | null
    followUpsByMonth: Array<{
      month: string
      count: number
    }>
  }
  
  export const FOLLOW_UP_TYPES = [
    "Seguimiento general",
    "Control rutinario",
    "Seguimiento tratamiento",
    "Revisión postoperatorio",
    "Evaluación de pruebas",
    "Consulta urgente",
    "Control de medicación",
    "Revisión de síntomas",
    "Seguimiento rehabilitación",
    "Control preventivo",
  ] as const
  
  export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number]
  