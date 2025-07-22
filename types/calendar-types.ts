export interface Cita {
  id: number
  nombrePaciente: string
  apellidosPaciente?: string
  telefonoPaciente?: string
  telefono?: string // Agregado para compatibilidad con week-view
  hora: string
  horaFin?: string
  duracion: number
  tipo: string
  notas: string
  fecha: Date | string // Puede llegar como string desde la BD
  profesionalId: number
  estado: "confirmada" | "pendiente" | "cancelada" | "completada" | "no_show"
  emoticonos?: string[] // Cambiado de number[] a string[] para almacenar emojis
  citaRecurrenteId?: string
  consultationId?: string // Agregado para compatibilidad
}

export interface Profesional {
  id: number
  nombre: string
  especialidad: string
  color?: string
  name?: string // Para compatibilidad
  type: number // ✅ AÑADIDO: 1 = profesional, 2 = otro tipo
  settings?: {
    specialty?: string
    specialty_other?: string // ✅ AÑADIDO
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

export type IntervaloTiempo = 15 | 30 | 60

export type VistaCalendario = "dia" | "semana" | "mes"
export type SubVistaCalendario = "lista" | "horario" | "profesionales"
export type TabPrincipal = "calendario" | "lista-espera" | "actividades-grupales"

// Props para componentes
export interface AppointmentFormModalProps {
  fecha: Date
  hora: string
  profesionalId?: number
  position?: { x: number; y: number }
  citaExistente?: Cita
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

// Horarios de trabajo
export interface HorarioTrabajo {
  id: string
  profesionalId: number
  diaSemana: number
  horaInicio: string
  horaFin: string
  activo: boolean
}

// Tipos adicionales específicos para el calendario que no están en calendar.ts
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource?: any
}

export interface CalendarResource {
  id: string
  title: string
  color?: string
}

export interface CalendarSlot {
  start: Date
  end: Date
  resource?: CalendarResource
}

export interface CalendarViewProps {
  events: CalendarEvent[]
  resources?: CalendarResource[]
  onSelectEvent?: (event: CalendarEvent) => void
  onSelectSlot?: (slot: CalendarSlot) => void
}

export interface ProfessionalSettings {
  id: string
  user_id: string
  specialty: string | null
  specialty_other?: string | null  // ✅ Opcional
  calendar_color: string | null
  created_at: string
  updated_at: string
}

// Tipos modernos para la base de datos - ACTUALIZADO CON type y specialty
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
  work_schedules?: any[] // Declared as any[] to avoid undeclared variable error
  settings?: ProfessionalSettings
  // ✅ CAMPOS DE ESPECIALIDAD AÑADIDOS
  specialty?: string | null
  specialty_other?: string | null
}

// Import WorkSchedule interface
export type WorkSchedule = {}
