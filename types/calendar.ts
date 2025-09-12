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
  service_id?: number
  modalidad?: "presencial" | "virtual"
  virtual_link?: string | null
  // 🆕 CAMPOS DE GOOGLE CALENDAR
  google_calendar_event_id?: string | null
  synced_with_google?: boolean | null
  last_synced_at?: string | null
  // 🆕 CAMPOS DE RECURRENCIA - ACTUALIZADO CON "daily"
  is_recurring?: boolean
  recurrence_type?: "daily" | "weekly" | "monthly" | null
  recurrence_interval?: number | null
  recurrence_end_date?: string | null
  parent_appointment_id?: string | null
}

// 🆕 TIPOS PARA RECURRENCIA - ACTUALIZADO CON "daily"
export interface RecurrenceConfig {
  type: "daily" | "weekly" | "monthly"
  interval: number // cada cuánto (1, 2, 3...)
  endDate: Date
}

export interface RecurrencePreview {
  dates: Date[]
  count: number
  conflicts: Date[]
}

// 🆕 TIPO PARA DATOS DE CLIENTE NUEVO
export interface NewClientData {
  phone: string            // 👈 solo el número (ej. "612345678")
  phone_prefix: string     // 👈 debe coincidir con el campo en la DB
  organization_id: number
  taxId?: string
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
          service_id: number | null
          modalidad: "presencial" | "virtual"
          virtual_link: string | null
          // 🆕 CAMPOS DE GOOGLE CALENDAR
          google_calendar_event_id: string | null
          synced_with_google: boolean | null
          last_synced_at: string | null
          // 🆕 CAMPOS DE RECURRENCIA - ACTUALIZADO CON "daily"
          is_recurring: boolean
          recurrence_type: "daily" | "weekly" | "monthly" | null
          recurrence_interval: number | null
          recurrence_end_date: string | null
          parent_appointment_id: string | null
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
          service_id?: number | null
          modalidad?: "presencial" | "virtual"
          virtual_link?: string | null
          // 🆕 CAMPOS DE GOOGLE CALENDAR
          google_calendar_event_id?: string | null
          synced_with_google?: boolean | null
          last_synced_at?: string | null
          // 🆕 CAMPOS DE RECURRENCIA - ACTUALIZADO CON "daily"
          is_recurring?: boolean
          recurrence_type?: "daily" | "weekly" | "monthly" | null
          recurrence_interval?: number | null
          recurrence_end_date?: string | null
          parent_appointment_id?: string | null
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
          service_id?: number | null
          modalidad?: "presencial" | "virtual"
          virtual_link?: string | null
          // 🆕 CAMPOS DE GOOGLE CALENDAR
          google_calendar_event_id?: string | null
          synced_with_google?: boolean | null
          last_synced_at?: string | null
          // 🆕 CAMPOS DE RECURRENCIA - ACTUALIZADO CON "daily"
          is_recurring?: boolean
          recurrence_type?: "daily" | "weekly" | "monthly" | null
          recurrence_interval?: number | null
          recurrence_end_date?: string | null
          parent_appointment_id?: string | null
        }
      }
      services: {
        Row: {
          id: number
          name: string
          description: string | null
          price: number
          duration: number
          color: string
          category: string | null
          active: boolean
          organization_id: number
          created_at: string
          updated_at: string
          vat_rate: number
          irpf_rate: number
          retention_rate: number
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          price: number
          duration: number
          color?: string
          category?: string | null
          active?: boolean
          organization_id: number
          created_at?: string
          updated_at?: string
          vat_rate: number
          irpf_rate: number
          retention_rate: number
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          price?: number
          duration?: number
          color?: string
          category?: string | null
          active?: boolean
          organization_id?: number
          created_at?: string
          updated_at?: string
          vat_rate?: number
          irpf_rate?: number
          retention_rate?: number
        }
      }
    }
  }
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
  service_id: number | null
  modalidad: "presencial" | "virtual"
  virtual_link: string | null
  // 🆕 CAMPOS DE GOOGLE CALENDAR
  google_calendar_event_id: string | null
  synced_with_google: boolean | null
  last_synced_at: string | null
  // 🆕 NUEVOS CAMPOS DEL HISTORIAL MÉDICO
  motivo_consulta?: string | null
  diagnostico?: string | null
  // 🆕 CAMPOS DE RECURRENCIA - ACTUALIZADO CON "daily"
  is_recurring: boolean
  recurrence_type: "daily" | "weekly" | "monthly" | null
  recurrence_interval: number | null
  recurrence_end_date: string | null
  parent_appointment_id: string | null
  // Relaciones
  client: Client
  professional: User
  appointment_type: AppointmentType
  consultation: Consultation
  created_by_user: User
  service?: Service
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
  service_id?: number | null
  modalidad?: "presencial" | "virtual"
  virtual_link?: string | null
  // 🆕 CAMPOS DE GOOGLE CALENDAR
  google_calendar_event_id?: string | null
  synced_with_google?: boolean | null
  last_synced_at?: string | null
  // 🆕 CAMPOS DE RECURRENCIA - ACTUALIZADO CON "daily"
  is_recurring?: boolean
  recurrence_type?: "daily" | "weekly" | "monthly" | null
  recurrence_interval?: number | null
  recurrence_end_date?: string | null
  parent_appointment_id?: string | null
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

// Tipos para actividades grupales
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
  service_id: number | null
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
  service?: {
    id: number
    name: string
    color: string
    vat_rate: number
    irpf_rate: number
    retention_rate: number
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
  service_id?: number | null
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
  service_id?: number | null
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
  service_id: number | null
  max_participants: number
  color: string
}

export interface ClientMatch {
  id: number
  name: string
  phone: string
  matchType: "phone" | "name"
}

// Actualizar el tipo Cita para incluir actividades grupales
export interface Cita {
  nombreServicio: ReactNode
  servicio: React.JSX.Element
  id: string | number
  fecha: Date | string
  horaInicio: string
  horaFin?: string
  hora: string // Alias para horaInicio para compatibilidad
  telefono?: string // Para compatibilidad con week-view
  telefonoPaciente?: string
  nombrePaciente: string
  apellidosPaciente?: string
  profesionalId: string | number
  clienteId: number
  consultationId?: string
  duracion: number
  estado: EstadoCita // Usar el tipo EstadoCita en español
  notas?: string
  tipo: string
  tipoId?: string
  emoticonos?: string[] // Cambiado de number[] a string[] para almacenar emojis
  citaRecurrenteId?: string
  service_id?: number | null
  consultation?: Consultation // Incluir datos completos de consulta
  // NUEVOS CAMPOS PARA ACTIVIDADES GRUPALES
  isGroupActivity?: boolean
  groupActivityData?: GroupActivity
  // 🆕 CAMPOS DE RECURRENCIA - ACTUALIZADO CON "daily"
  isRecurring?: boolean
  recurrenceType?: "daily" | "weekly" | "monthly"
  recurrenceInterval?: number
  recurrenceEndDate?: Date
  parentAppointmentId?: string
  clienteEncontrado?: ClientMatch // Añadir esta línea
  // 🆕 DATOS DE CLIENTE NUEVO
  newClientData?: NewClientData
  modalidad?: "presencial" | "virtual"
  virtual_link?: string | null
}

// NUEVO: Tipo para múltiples descansos
export interface WorkScheduleBreak {
  id: string
  work_schedule_id: string
  break_name: string
  start_time: string
  end_time: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Tipos para horarios de trabajo - ACTUALIZADOS PARA SISTEMA NUEVO
export interface WorkSchedule {
  id: string
  user_id: string
  day_of_week: number | null
  start_time: string
  end_time: string
  buffer_time_minutes: number // Tiempo entre citas
  is_active: boolean
  date_exception: string | null
  is_exception: boolean
  created_at: string
  updated_at: string
  breaks: WorkScheduleBreak[] // SOLO sistema nuevo - array requerido
}

export interface ProfessionalSettings {
  id: string
  user_id: string
  specialty: string | null
  specialty_other?: string | null
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

// Tipos modernos para la base de datos - ACTUALIZADO CON type
export interface User {
  id: string
  name: string | null
  email: string
  role: "admin" | "professional" | "staff"
  organization_id: number
  type: number // AÑADIDO: 1 = profesional, 2 = otro tipo
  avatar_url?: string | null
  is_physia_admin?: boolean
  prompt?: string | null
  work_schedules?: WorkSchedule[]
  settings?: ProfessionalSettings
}

// Tipo Professional que extiende User con propiedades adicionales
export interface Professional extends User {
  name: string // Hacer name requerido para Professionals
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

// Tipo para servicios - ✅ ACTUALIZADO CON CAMPOS DE IMPUESTOS
export interface Service {
  id: number
  name: string
  description: string | null
  price: number
  duration: number
  color: string
  category: string | null
  active: boolean
  organization_id: number
  created_at: string
  updated_at: string
  // ✅ CAMPOS DE IMPUESTOS AÑADIDOS
  vat_rate: number
  irpf_rate: number
  retention_rate: number
}

export interface ServiceInsert {
  name: string
  description?: string | null
  price: number
  duration: number
  color?: string
  category?: string | null
  active?: boolean
  organization_id: number
  // ✅ CAMPOS DE IMPUESTOS AÑADIDOS
  vat_rate?: number
  irpf_rate?: number
  retention_rate?: number
}

export interface ServiceUpdate {
  name?: string
  description?: string | null
  price?: number
  duration?: number
  color?: string
  category?: string | null
  active?: boolean
  // ✅ CAMPOS DE IMPUESTOS AÑADIDOS
  vat_rate?: number
  irpf_rate?: number
  retention_rate?: number
}

// Tipos para las vistas del calendario - EXACTAMENTE como se usan en el código
export type CalendarView = "day" | "week" | "month" | "agenda"
export type CalendarSubView = "list" | "schedule" | "professionals" | "consultations"
export type MainTab = "calendar" | "waiting-list" | "group-activities"
export type TimeInterval = 15 | 30 | 60

// Tipos en español para compatibilidad con el sistema existente - EXACTAMENTE como se usan
export type IntervaloTiempo = 15 | 30 | 60
export type VistaCalendario = "dia" | "semana" | "mes"
export type SubVistaCalendario = "lista" | "horario" | "profesionales" | "consultas" | "servicios"
export type TabPrincipal = "calendario" | "lista-espera" | "actividades-grupales"

// Tipos de estado en ESPAÑOL para la UI - EXACTAMENTE como se usan
export type EstadoCita = "confirmada" | "pendiente" | "cancelada" | "completada" | "no_show"

// Tipos para filtros
export interface CalendarFilters {
  professionals: string[]
  consultations: string[]
  appointmentTypes: string[]
  statuses: string[]
  services: string[]
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

// Interfaz principal actualizada para citas - ACTUALIZADA CON type y specialty
export interface Profesional {
  id: number
  nombre: string
  name?: string // Para compatibilidad
  especialidad: string
  color?: string
  type: number // AÑADIDO: 1 = profesional médico, 2 = otro tipo
  settings?: {
    specialty?: string // Valor del enum specialty_type
    specialty_other?: string // Especialidad personalizada cuando specialty = 'otros'
    calendar_color?: string
  }
  // NUEVOS CAMPOS para especialidad
  specialty?: string // Valor directo del enum de la BD
  specialty_other?: string // Especialidad personalizada
}

export interface EmoticonoPersonalizado {
  id: number
  emoji: string
  descripcion: string
}

export interface DiaEspecial {
  id: number
  fecha: string
  tipo: "cerrado" | "horario_especial"
  motivo: string
  horarioEspecial?: {
    apertura: string
    cierre: string
  }
}

export interface HorarioApertura {
  id: number
  profesionalId: number
  diaSemana: number
  apertura: string
  cierre: string
  activo: boolean
}

// Props para componentes
export interface AppointmentFormModalProps {
  fecha: Date
  hora: string
  profesionalId?: number
  position?: { x: number; y: number }
  citaExistente?: Cita
  waitingListEntry?: any
  onClose: () => void
  onSubmit: (cita: Partial<Cita>) => void
}

export interface CalendarHeaderProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  view: "day" | "week" | "month"
  onViewChange: (view: "day" | "week" | "month") => void
}

export interface DayViewProps {
  date: Date
  citas: Cita[]
  profesionales: Profesional[]
  onCitaClick: (cita: Cita) => void
  onSlotClick: (fecha: Date, hora: string, profesionalId?: number) => void
}

export interface WeekViewProps {
  startDate: Date
  citas: Cita[]
  profesionales: Profesional[]
  onCitaClick: (cita: Cita) => void
  onSlotClick: (fecha: Date, hora: string, profesionalId?: number) => void
}

export interface MonthViewProps {
  date: Date
  citas: Cita[]
  onDateClick: (date: Date) => void
  onCitaClick: (cita: Cita) => void
}

export interface AppointmentModalProps {
  cita: Cita | null
  isOpen: boolean
  onClose: () => void
  onSave: (cita: Cita) => void
  onDelete?: (citaId: number | string) => void
}

// Tipos para filtros y configuración
export interface FiltrosCalendario {
  profesionales: number[]
  tipos: string[]
  estados: string[]
  servicios: string[]
}

export interface EstadisticasCalendario {
  totalCitas: number
  citasConfirmadas: number
  citasPendientes: number
  citasCanceladas: number
  ocupacionPorcentaje: number
}

// Tipos para horarios disponibles
export interface SlotDisponible {
  fecha: Date
  hora: string
  profesionalId: number
  disponible: boolean
}

export interface RangoHorario {
  inicio: string
  fin: string
  disponible: boolean
}

// Configuración del calendario
export interface ConfiguracionCalendario {
  intervaloTiempo: IntervaloTiempo
  horaInicio: number
  horaFin: number
  mostrarFinesSemana: boolean
}

// Horarios de trabajo - ACTUALIZADO PARA SISTEMA NUEVO
export interface HorarioTrabajo {
  id: string
  profesionalId: number
  diaSemana: number
  horaInicio: string
  horaFin: string
  activo: boolean
  breaks: WorkScheduleBreak[] // SOLO sistema nuevo
}
