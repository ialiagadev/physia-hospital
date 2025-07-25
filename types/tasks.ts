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
  | "nota" // Añadir tipo para notas

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

// Nueva interfaz para las notas de tareas
export interface NotaTarea {
  id: number
  task_id: number
  organization_id: number
  created_by: string // UUID del usuario
  content: string
  created_at: Date
  updated_at: Date
}

export interface Tarea {
  id: number
  titulo: string
  descripcion: string
  estado: EstadoTarea
  prioridad: PrioridadTarea
  asignadosA?: string[] // Array de UUIDs de usuarios asignados
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
  notas: NotaTarea[] // Cambiar a array de notas
  orden: number
  centro_id?: number
}

export interface PlantillaTarea {
  id: number
  nombre: string
  descripcion: string
  prioridad: PrioridadTarea
  asignadosA?: string[]
  fechaVencimiento?: Date
  etiquetas: string[]
  categoria: string
}

// Interfaz actualizada para usuarios
export interface Usuario {
  id: string // UUID del usuario
  created_at?: Date
  email?: string
  organization_id?: number
  role?: "admin" | "user" | "viewer"
  name: string // Nombre del usuario
  avatar_url?: string
  is_physia_admin?: boolean
  type: 1 | 2 // Tipo de usuario: 1 o 2
  prompt?: string
}

// Mantener Profesional para compatibilidad, pero extendiendo Usuario
export interface Profesional extends Usuario {
  nombre: string // Alias para 'name' para compatibilidad
  especialidad?: string // Campo adicional si es necesario
}

// Tipos para filtros y búsquedas
export interface FiltrosTareas {
  estado?: EstadoTarea | "todas"
  prioridad?: PrioridadTarea | "todas"
  asignadoA?: string | "todos"
  busqueda?: string
  fechaDesde?: Date
  fechaHasta?: Date
  etiquetas?: string[]
}

// Tipos para estadísticas
export interface EstadisticasTareas {
  total: number
  pendientes: number
  enProgreso: number
  completadas: number
  archivadas: number
  vencidas: number
  porVencer: number
}

// Tipos para la respuesta de la API
export interface RespuestaAPI<T> {
  data: T
  success: boolean
  message?: string
  error?: string
}

// Tipos para paginación
export interface PaginacionTareas {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
  tareas: Tarea[]
}
