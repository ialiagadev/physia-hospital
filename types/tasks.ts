// Tipos para las tareas
export type PrioridadTarea = "alta" | "media" | "baja"
export type EstadoTarea = "pendiente" | "en_progreso" | "completada" | "archivada"

export type TipoActividad =
  | "creacion"
  | "cambio_estado"
  | "eliminacion"
  | "restauracion"
  | "edicion"
  | "fecha"
  | "asignacion"
  | "comentario"
  | "adjunto"
  | "etiqueta"

export interface ActividadTarea {
  id: number
  tipo: TipoActividad
  descripcion: string
  usuario: string
  fecha: Date
}

export interface Comentario {
  id: number
  texto: string
  autor: string
  fecha: Date
  editado?: boolean
}

export interface Adjunto {
  id: number
  nombre: string
  url: string
  tipo: string
  tamaño: number
  fechaSubida: Date
  subidoPor: string
}

export interface Tarea {
  id: number
  titulo: string
  descripcion: string
  estado: EstadoTarea
  prioridad: PrioridadTarea
  asignadoA?: string // Cambiado a string para UUID
  fechaVencimiento?: Date
  fechaCreacion: Date
  fechaCompletada?: Date
  fechaArchivada?: Date
  fechaEliminada?: Date
  creadoPor: string
  etiquetas: string[]
  comentarios: Comentario[]
  adjuntos: Adjunto[]
  actividad: ActividadTarea[]
  orden: number
  centro_id?: number
}

export interface PlantillaTarea {
  id: number
  nombre: string
  descripcion: string
  prioridad: PrioridadTarea
  asignadoA?: string
  fechaVencimiento?: Date
  etiquetas: string[]
  categoria: string
}

export interface Profesional {
  id: string // Cambiado a string para UUID
  nombre: string
  especialidad: string
}
