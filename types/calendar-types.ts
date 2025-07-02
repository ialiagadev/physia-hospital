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
    emoticonos?: number[]
    citaRecurrenteId?: string
    consultationId?: string // Agregado para compatibilidad
  }
  
  export interface Profesional {
    id: number
    nombre: string
    especialidad: string
    color?: string
    name?: string // Para compatibilidad
    settings?: {
      specialty?: string
      calendar_color?: string
    }
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
  