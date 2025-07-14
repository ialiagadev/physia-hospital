// types/citas.ts

// Tipos básicos para citas
export type TipoCita = "consulta" | "seguimiento" | "urgencia" | "revision"

export type EstadoCita = "programada" | "confirmada" | "en-curso" | "completada" | "cancelada" | "no-asistio"

export type PrioridadCita = "baja" | "normal" | "alta" | "urgente"

// Tipos para la base de datos (en inglés)
export type DatabaseStatus = "scheduled" | "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show"

// Interfaz principal de la cita
export interface Cita {
  id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  tipo: TipoCita
  estado: EstadoCita
  prioridad?: PrioridadCita
  titulo?: string
  descripcion?: string
  notas?: string

  // Relaciones
  client_id: string
  professional_id: string
  organization_id: string
  service_id?: string

  // Información del cliente (para joins)
  client?: {
    id: string
    name: string
    email: string
    phone: string
  }

  // Información del profesional (para joins)
  professional?: {
    id: string
    name: string
    specialty: string
  }

  // Información del servicio (para joins)
  service?: {
    id: string
    name: string
    duration: number
    price: number
  }

  // Metadatos
  created_at: string
  updated_at: string
  created_by?: string
}

// Interfaz para crear una nueva cita
export interface NuevaCita {
  fecha: string
  hora_inicio: string
  hora_fin: string
  tipo: TipoCita
  estado?: EstadoCita
  prioridad?: PrioridadCita
  titulo?: string
  descripcion?: string
  notas?: string
  client_id: string
  professional_id: string
  organization_id: string
  service_id?: string
}

// Interfaz para actualizar una cita
export interface ActualizarCita {
  fecha?: string
  hora_inicio?: string
  hora_fin?: string
  tipo?: TipoCita
  estado?: EstadoCita
  prioridad?: PrioridadCita
  titulo?: string
  descripcion?: string
  notas?: string
  client_id?: string
  professional_id?: string
  service_id?: string
}

// Interfaz para filtros de búsqueda
export interface FiltrosCitas {
  fecha_inicio?: string
  fecha_fin?: string
  professional_id?: string
  client_id?: string
  tipo?: TipoCita[]
  estado?: EstadoCita[]
  organization_id: string
}

// Interfaz para horarios disponibles
export interface HorarioDisponible {
  fecha: string
  hora_inicio: string
  hora_fin: string
  professional_id: string
  disponible: boolean
}

// Constantes útiles
export const TIPOS_CITA: TipoCita[] = ["consulta", "seguimiento", "urgencia", "revision"]

export const ESTADOS_CITA: EstadoCita[] = [
  "programada",
  "confirmada",
  "en-curso",
  "completada",
  "cancelada",
  "no-asistio",
]

export const PRIORIDADES_CITA: PrioridadCita[] = ["baja", "normal", "alta", "urgente"]

// Funciones de conversión entre español e inglés
export const estadoToDatabase = (estado: EstadoCita): DatabaseStatus => {
  const mapping: Record<EstadoCita, DatabaseStatus> = {
    programada: "scheduled",
    confirmada: "confirmed",
    "en-curso": "in-progress",
    completada: "completed",
    cancelada: "cancelled",
    "no-asistio": "no-show",
  }
  return mapping[estado]
}

export const estadoFromDatabase = (status: DatabaseStatus): EstadoCita => {
  const mapping: Record<DatabaseStatus, EstadoCita> = {
    scheduled: "programada",
    confirmed: "confirmada",
    "in-progress": "en-curso",
    completed: "completada",
    cancelled: "cancelada",
    "no-show": "no-asistio",
  }
  return mapping[status]
}

// Función para verificar si una cita está completada (acepta ambos formatos)
export const isCompletedAppointment = (estado: EstadoCita | DatabaseStatus | string): boolean => {
  return estado === "completada" || estado === "completed"
}

// Funciones de utilidad
export const getEstadoColor = (estado: EstadoCita): string => {
  const colores = {
    programada: "bg-blue-100 text-blue-800",
    confirmada: "bg-green-100 text-green-800",
    "en-curso": "bg-yellow-100 text-yellow-800",
    completada: "bg-emerald-100 text-emerald-800",
    cancelada: "bg-red-100 text-red-800",
    "no-asistio": "bg-gray-100 text-gray-800",
  }
  return colores[estado] || "bg-gray-100 text-gray-800"
}

export const getTipoColor = (tipo: TipoCita): string => {
  const colores = {
    consulta: "bg-blue-100 text-blue-800",
    seguimiento: "bg-purple-100 text-purple-800",
    urgencia: "bg-red-100 text-red-800",
    revision: "bg-amber-100 text-amber-800",
  }
  return colores[tipo] || "bg-gray-100 text-gray-800"
}

export const getPrioridadColor = (prioridad: PrioridadCita): string => {
  const colores = {
    baja: "bg-gray-100 text-gray-800",
    normal: "bg-blue-100 text-blue-800",
    alta: "bg-orange-100 text-orange-800",
    urgente: "bg-red-100 text-red-800",
  }
  return colores[prioridad] || "bg-gray-100 text-gray-800"
}
