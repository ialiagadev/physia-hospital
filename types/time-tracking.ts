export interface Employee {
    id: number
    user_id: string
    organization_id: number
    employee_code: string
    name: string
    email: string
    department?: string
    position?: string
    contract_type: "indefinido" | "temporal" | "practicas"
    work_schedule?: any
    hourly_rate?: number
    active: boolean
    hire_date?: string
    termination_date?: string
    created_at: string
    updated_at: string
    data_processing_consent: boolean
    geolocation_consent: boolean
    last_consent_date?: string
  }
  
  export interface TimeEntry {
    id: number
    user_id: string
    organization_id: number
    entry_type: "entrada" | "salida"
    entry_timestamp: string
    created_at: string
  }
  
  export interface WorkDay {
    id: number
    user_id: string
    organization_id: number
    work_date: string
    entry_time: string | null
    exit_time: string | null
    total_hours: number
    created_at: string
  }
  
  export interface TimeEntryWithUser extends TimeEntry {
    user_name: string
    user_email: string
  }
  
  export interface WorkDayWithUser extends WorkDay {
    user_name: string
    user_email: string
  }
  
  export interface User {
    id: string
    name: string
    email: string
    organization_id: number
  }
  
  export interface TimeTrackingSettings {
    id: number
    organization_id: number
    standard_work_hours: number
    max_daily_hours: number
    overtime_threshold: number
    mandatory_break_duration: number
    mandatory_break_after_hours: number
    require_geolocation: boolean
    allowed_locations?: any
    location_tolerance_meters: number
    data_retention_years: number
    require_manual_approval: boolean
    notify_overtime: boolean
    notify_missing_entries: boolean
    created_at: string
    updated_at: string
  }
  
  export interface Absence {
    id: number
    employee_id: number
    organization_id: number
    absence_type: string
    start_date: string
    end_date: string
    total_days: number
    reason?: string
    documentation_path?: string
    status: "pendiente" | "aprobado" | "rechazado"
    approved_by?: number
    approved_at?: string
    created_at: string
    updated_at: string
  }
  
  export interface TimeTrackingAudit {
    id: number
    organization_id: number
    table_name: string
    record_id: number
    action: "INSERT" | "UPDATE" | "DELETE"
    old_values?: any
    new_values?: any
    changed_by?: number
    changed_at: string
    ip_address?: string
    user_agent?: string
    retention_until: string
  }
  