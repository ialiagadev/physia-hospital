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
  usuario: string
  fecha: Date
}

export interface Adjunto {
  id: number
  nombre: string
  url: string
  tipo: string
  tamaño: number
  fecha: Date
}

export interface Tarea {
  id: number
  titulo: string
  descripcion: string
  estado: EstadoTarea
  prioridad: PrioridadTarea
  asignadoA?: number
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
}

export interface PlantillaTarea {
  id: number
  nombre: string
  descripcion: string
  prioridad: PrioridadTarea
  asignadoA?: number
  fechaVencimiento?: Date
  etiquetas: string[]
  categoria: string
}

export interface Profesional {
  id: number
  nombre: string
  especialidad: string
}
