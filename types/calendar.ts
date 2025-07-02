import type React from "react"
export interface AppointmentUpdate {
  date?: string
  start_time?: string
  end_time?: string
  duration?: number
  status?: "confirmed" | "pending" | "cancelled" | "completed" | "no_show"
  notes?: string
  professional_id?: string
  client_id?: number
  appointment_type_id?: number
  consultation_id?: string
}

export interface Database {
  public: {
    Tables: {
      consultations: {
        Row: {
          id: string
          organization_id: number
          name: string
          description: string | null
          color: string
          equipment: any[] | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: number
          name: string
          description?: string | null
          color?: string
          equipment?: any[] | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: number
          name?: string
          description?: string | null
          color?: string
          equipment?: any[] | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          user_id: string
          organization_id: number
          professional_id: string
          client_id: number
          appointment_type_id: string
          consultation_id: string
          date: string
          start_time: string
          end_time: string
          duration: number
          status: "confirmed" | "pending" | "cancelled" | "completed" | "no_show"
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: number
          professional_id: string
          client_id: number
          appointment_type_id: string
          consultation_id: string
          date: string
          start_time: string
          end_time: string
          duration?: number
          status?: "confirmed" | "pending" | "cancelled" | "completed" | "no_show"
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: number
          professional_id?: string
          client_id?: number
          appointment_type_id?: string
          consultation_id?: string
          date?: string
          start_time?: string
          end_time?: string
          duration?: number
          status?: "confirmed" | "pending" | "cancelled" | "completed" | "no_show"
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
    }
  }
}

// Tipos legacy para compatibilidad con mock data
export interface Doctor {
  id: string
  name: string
  specialty: string
  color: string
}

export interface Patient {
  id: string
  name: string
  phone: string
  email: string
  birthDate: string
}

export interface Appointment {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  doctorId: string
  patientId: string
  type: "consultation" | "surgery" | "checkup" | "emergency" | "followup"
  status: "confirmed" | "pending" | "cancelled"
  room?: string
  notes?: string
}

// Tipo para citas (usado en algunos componentes)
export interface Cita {
  id: string
  fecha: Date | string
  horaInicio: string
  horaFin: string
  profesionalId: string | number
  clienteId: number
  consultationId?: string
  duracion: number
  estado: "confirmed" | "pending" | "cancelled" | "completed" | "no_show"
  notas?: string
  tipoId: string
}

// Tipos para horarios de trabajo
export interface WorkSchedule {
  id: string
  user_id: string
  day_of_week: number | null
  start_time: string
  end_time: string
  break_start: string | null
  break_end: string | null
  is_active: boolean
  date_exception: string | null
  is_exception: boolean
  created_at: string
  updated_at: string
}

export interface ProfessionalSettings {
  id: string
  user_id: string
  specialty: string | null
  calendar_color: string | null
  created_at: string
  updated_at: string
}

// Tipo Organization que faltaba
export interface Organization {
  id: number
  name: string
  created_at: string
  updated_at: string
}

// Tipos modernos para la base de datos
export interface User {
  id: string
  name: string | null
  email: string
  role: "admin" | "professional" | "staff"
  organization_id: number
  is_active: boolean
  created_at: string
  updated_at: string
  work_schedules?: WorkSchedule[]
  settings?: ProfessionalSettings
}

// Tipo Professional que extiende User con propiedades adicionales
export interface Professional extends User {
  name: string // Hacer name requerido para Professional
  settings: ProfessionalSettings // Hacer settings requerido
  appointment_types?: AppointmentType[]
}

export interface Client {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  birth_date: string | null
  notes: string | null
  organization_id: number
  created_at: string
  updated_at: string
}

export interface ClientInsert {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  birth_date?: string | null
  notes?: string | null
  organization_id: number
}

export interface ClientUpdate {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  birth_date?: string | null
  notes?: string | null
}

// Tipo para el hook de clientes
export interface UseClientsReturn {
  clients: Client[]
  loading: boolean
  error: string | null
  searchClients: (query: string) => Client[]
  addClient: (client: ClientInsert) => Promise<Client>
  updateClient: (id: number, client: ClientUpdate) => Promise<Client>
  deleteClient: (id: number) => Promise<void>
  refreshClients: () => Promise<void>
}

export interface Consultation {
  id: string
  organization_id: number
  name: string
  description: string | null
  color: string
  equipment: any[] | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AppointmentType {
  id: string
  user_id: string
  name: string
  duration: number
  color: string
  icon: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AppointmentWithDetails {
  id: string
  user_id: string
  organization_id: number
  professional_id: string
  client_id: number
  appointment_type_id: string
  consultation_id: string
  date: string
  start_time: string
  end_time: string
  duration: number
  status: "confirmed" | "pending" | "cancelled" | "completed" | "no_show"
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string
  // Relaciones
  client: Client
  professional: User
  appointment_type: AppointmentType
  consultation: Consultation
  created_by_user: User
}

export interface AppointmentInsert {
  user_id: string
  organization_id: number
  professional_id: string
  client_id: number
  appointment_type_id: string
  consultation_id: string
  date: string
  start_time: string
  end_time: string
  duration?: number
  status?: "confirmed" | "pending" | "cancelled" | "completed" | "no_show"
  notes?: string | null
  created_by: string
}

// Tipos para las vistas del calendario
export type CalendarView = "day" | "week" | "month" | "agenda"
export type CalendarSubView = "list" | "schedule" | "professionals" | "consultations"
export type MainTab = "calendar" | "waiting-list" | "group-activities"
export type TimeInterval = 15 | 30 | 60

// Tipos en español para compatibilidad con el sistema existente
export type IntervaloTiempo = 15 | 30 | 60
export type VistaCalendario = "dia" | "semana" | "mes"
export type SubVistaCalendario = "lista" | "horario" | "profesionales" | "consultas"
export type TabPrincipal = "calendario" | "lista-espera" | "actividades-grupales"

// Tipos de estado en español para la UI
export type EstadoCita = "confirmada" | "pendiente" | "cancelada" | "completada" | "no_show"

// Tipos para filtros
export interface CalendarFilters {
  professionals: string[]
  consultations: string[]
  appointmentTypes: string[]
  statuses: string[]
}

// Tipos para configuración
export interface CalendarConfig {
  timeInterval: TimeInterval
  startHour: number
  endHour: number
  showWeekends: boolean
  defaultView: CalendarView
}

// Tipos para props de componentes
export interface HoraPreviewTooltipProps {
  citaOriginal: any
  children: React.ReactNode
}
