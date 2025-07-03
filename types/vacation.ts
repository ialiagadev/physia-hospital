export type VacationType = "vacation" | "sick_leave" | "personal" | "maternity" | "training" | "other"
export type VacationStatus = "pending" | "approved" | "rejected"

export interface VacationRequest {
  id: string
  user_id: string
  organization_id: string
  type: VacationType
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: VacationStatus
  created_at: string
  updated_at: string
}

export interface VacationRequestInsert {
  user_id: string
  organization_id: string
  type: VacationType
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: VacationStatus
}

export interface VacationCalendarEvent {
  id: string
  vacation_request_id: string
  user_id: string
  organization_id: string
  title: string
  start_date: string
  end_date: string
  event_type: VacationType
  color: string
  created_at: string
  updated_at: string
}

export interface VacationStats {
  total_requests: number
  pending_requests: number
  approved_requests: number
  rejected_requests: number
  total_days: number
  avg_days_per_request: number
}

export interface AvailabilityStats {
  total_professionals: number
  available_professionals: number
  unavailable_professionals: number
  availability_percentage: number
}

export const VACATION_TYPES = {
  vacation: { label: "Vacaciones", color: "bg-blue-500" },
  sick_leave: { label: "Baja médica", color: "bg-red-500" },
  personal: { label: "Asunto personal", color: "bg-yellow-500" },
  maternity: { label: "Maternidad/Paternidad", color: "bg-pink-500" },
  training: { label: "Formación", color: "bg-green-500" },
  other: { label: "Otros", color: "bg-gray-500" },
} as const

export const VACATION_STATUS = {
  pending: { label: "Pendiente", color: "bg-yellow-500" },
  approved: { label: "Aprobado", color: "bg-green-500" },
  rejected: { label: "Rechazado", color: "bg-red-500" },
} as const
