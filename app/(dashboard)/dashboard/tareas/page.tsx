"use client"

import type React from "react"

import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useRef } from "react"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragOverEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useDroppable } from "@dnd-kit/core"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  PlayCircle,
  ArrowLeft,
  Filter,
  Search,
  Edit,
  Archive,
  GripVertical,
} from "lucide-react"
import { useRouter } from "next/navigation"

// Tipos para las tareas
type PrioridadTarea = "alta" | "media" | "baja"
type EstadoTarea = "pendiente" | "en_progreso" | "completada" | "archivada"

type Tarea = {
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
  comentarios: any[]
  adjuntos: any[]
  actividad: any[]
  orden: number
  centro_id?: number
}

// Datos de ejemplo para profesionales
const profesionales = [
  { id: 1, nombre: "Dra. Ana García", especialidad: "Medicina General" },
  { id: 2, nombre: "Dr. Carlos Rodríguez", especialidad: "Cardiología" },
  { id: 3, nombre: "Dra. Laura Martínez", especialidad: "Pediatría" },
  { id: 4, nombre: "Dr. Miguel Fernández", especialidad: "Dermatología" },
]

// Configuración de estados (sin incluir archivada en el tablero principal)
const ESTADOS_CONFIG = {
  pendiente: {
    titulo: "Por Hacer",
    color: "bg-gray-50 border-gray-200",
    icono: Circle,
    colorIcono: "text-gray-500",
    colorHeader: "bg-gray-100",
  },
  en_progreso: {
    titulo: "En Progreso",
    color: "bg-blue-50 border-blue-200",
    icono: PlayCircle,
    colorIcono: "text-blue-500",
    colorHeader: "bg-blue-100",
  },
  completada: {
    titulo: "Completadas",
    color: "bg-green-50 border-green-200",
    icono: CheckCircle2,
    colorIcono: "text-green-500",
    colorHeader: "bg-green-100",
  },
}

// Configuración de prioridades
const PRIORIDADES_CONFIG = {
  alta: { color: "bg-red-100 text-red-800 border-red-300", texto: "Alta" },
  media: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", texto: "Media" },
  baja: { color: "bg-green-100 text-green-800 border-green-300", texto: "Baja" },
}

// Componente de tarea arrastrable
function DraggableTaskCard({
  tarea,
  onEdit,
  onDelete,
  onArchive,
}: {
  tarea: Tarea
  onEdit: (tarea: Tarea) => void
  onDelete: (id: number) => void
  onArchive: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarea.id.toString(),
    data: {
      type: "task",
      task: tarea,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getNombreProfesional = (id?: number) => {
    if (!id) return "Sin asignar"
    const profesional = profesionales.find((p) => p.id === id)
    return profesional ? profesional.nombre : "Desconocido"
  }

  const estaVencida = (tarea: Tarea) => {
    return tarea.fechaVencimiento && tarea.estado !== "completada" && new Date() > tarea.fechaVencimiento
  }

  const venceProto = (tarea: Tarea) => {
    if (!tarea.fechaVencimiento || tarea.estado === "completada") return false
    const ahora = new Date()
    const diferencia = tarea.fechaVencimiento.getTime() - ahora.getTime()
    return diferencia > 0 && diferencia <= 24 * 60 * 60 * 1000
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-2 sm:space-y-3">
          {/* Header de la tarea */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div className="mt-1 hidden sm:block" {...listeners}>
                <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
              </div>
              <h4 className="font-medium text-sm leading-tight flex-1 break-words">{tarea.titulo}</h4>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(tarea)
                }}
                title="Editar tarea"
              >
                <Edit className="h-3 w-3 text-blue-600" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-orange-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive(tarea.id)
                }}
                title="Archivar tarea"
              >
                <Archive className="h-3 w-3 text-orange-600" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-red-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(tarea.id)
                }}
                title="Eliminar tarea"
              >
                <Trash2 className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          </div>

          {/* Descripción */}
          {tarea.descripcion && (
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 sm:line-clamp-3 ml-0 sm:ml-6">
              {tarea.descripcion}
            </p>
          )}

          {/* Badges de estado */}
          <div className="flex flex-wrap gap-1 ml-0 sm:ml-6">
            <Badge variant="outline" className={`text-xs ${PRIORIDADES_CONFIG[tarea.prioridad].color}`}>
              {PRIORIDADES_CONFIG[tarea.prioridad].texto}
            </Badge>
            {estaVencida(tarea) && (
              <Badge variant="destructive" className="text-xs">
                Vencida
              </Badge>
            )}
            {venceProto(tarea) && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Vence pronto
              </Badge>
            )}
          </div>

          {/* Footer de la tarea */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs text-gray-500 pt-2 border-t ml-0 sm:ml-6">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">{getNombreProfesional(tarea.asignadoA)}</span>
            </div>
            {tarea.fechaVencimiento && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{tarea.fechaVencimiento.toLocaleDateString("es-ES")}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente para la columna de tareas
function TaskColumn({
  estado,
  tareas,
  children,
}: {
  estado: keyof typeof ESTADOS_CONFIG
  tareas: Tarea[]
  children: React.ReactNode
}) {
  const config = ESTADOS_CONFIG[estado]
  const IconoEstado = config.icono

  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: estado })

  return (
    <div className="flex flex-col h-full min-h-[400px] lg:min-h-[500px]">
      {/* Header de la columna */}
      <div className={`${config.colorHeader} rounded-t-lg p-3 sm:p-4 border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconoEstado className={`h-4 w-4 sm:h-5 sm:w-5 ${config.colorIcono}`} />
            <h3 className="font-semibold text-sm sm:text-base text-gray-900">{config.titulo}</h3>
            <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">
              {tareas.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Contenido de la columna */}
      <div
        ref={setDroppableNodeRef}
        id={estado}
        data-column-id={estado}
        className={`${config.color} flex-1 p-3 sm:p-4 rounded-b-lg overflow-y-auto space-y-2 sm:space-y-3`}
      >
        {children}

        {tareas.length === 0 && (
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <Circle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">Arrastra tareas aquí o no hay tareas en este estado</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TareasPage() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroAsignado, setFiltroAsignado] = useState<number | "todos">("todos")
  const [filtroPrioridad, setFiltroPrioridad] = useState<PrioridadTarea | "todas">("todas")
  const [busqueda, setBusqueda] = useState("")
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeColumn, setActiveColumn] = useState<keyof typeof ESTADOS_CONFIG | null>(null)
  const router = useRouter()

  // Referencia para almacenar el estado de la columna sobre la que se está arrastrando
  const overColumnRef = useRef<keyof typeof ESTADOS_CONFIG | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  )

  // Formulario para nueva tarea
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: "",
    descripcion: "",
    prioridad: "media" as PrioridadTarea,
    asignadoA: undefined as number | undefined,
    fechaVencimiento: "",
    etiquetas: [] as string[],
  })

  // Estado para la tarea en edición
  const [tareaEnEdicion, setTareaEnEdicion] = useState<Tarea | null>(null)
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<"creadas" | "archivadas" | "eliminadas">("creadas")

  // Cargar tareas desde localStorage
  useEffect(() => {
    try {
      const savedTareas = localStorage.getItem("tareas_centro")
      if (savedTareas) {
        const parsedTareas = JSON.parse(savedTareas)
        const tareasConFechas = parsedTareas.map((tarea: any) => {
          return {
            ...tarea,
            fechaCreacion: new Date(tarea.fechaCreacion),
            fechaVencimiento: tarea.fechaVencimiento ? new Date(tarea.fechaVencimiento) : undefined,
            fechaCompletada: tarea.fechaCompletada ? new Date(tarea.fechaCompletada) : undefined,
            fechaArchivada: tarea.fechaArchivada ? new Date(tarea.fechaArchivada) : undefined,
            fechaEliminada: tarea.fechaEliminada ? new Date(tarea.fechaEliminada) : undefined,
            comentarios: tarea.comentarios || [],
            adjuntos: tarea.adjuntos || [],
            actividad: tarea.actividad || [],
            etiquetas: tarea.etiquetas || [],
            orden: tarea.orden || 0,
          }
        })
        setTareas(tareasConFechas)
      } else {
        // Crear tareas de ejemplo si no hay ninguna
        const tareasEjemplo: Tarea[] = [
          {
            id: 1,
            titulo: "Revisar inventario médico",
            descripcion: "Verificar stock de medicamentos y material médico",
            estado: "pendiente",
            prioridad: "alta",
            asignadoA: 1,
            fechaVencimiento: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            fechaCreacion: new Date(),
            creadoPor: "Administrador",
            etiquetas: ["inventario", "urgente"],
            comentarios: [],
            adjuntos: [],
            actividad: [
              {
                id: 1,
                tipo: "creacion",
                descripcion: "creó la tarea",
                usuario: "Administrador",
                fecha: new Date(),
              },
            ],
            orden: 0,
          },
          {
            id: 2,
            titulo: "Actualizar protocolos COVID",
            descripcion: "Revisar y actualizar los protocolos de seguridad",
            estado: "en_progreso",
            prioridad: "media",
            asignadoA: 2,
            fechaCreacion: new Date(Date.now() - 24 * 60 * 60 * 1000),
            creadoPor: "Dr. García",
            etiquetas: ["protocolos", "covid"],
            comentarios: [],
            adjuntos: [],
            actividad: [
              {
                id: 1,
                tipo: "creacion",
                descripcion: "creó la tarea",
                usuario: "Dr. García",
                fecha: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            ],
            orden: 0,
          },
          {
            id: 3,
            titulo: "Mantenimiento equipos",
            descripcion: "Programar mantenimiento preventivo de equipos médicos",
            estado: "completada",
            prioridad: "baja",
            fechaCreacion: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            fechaCompletada: new Date(Date.now() - 24 * 60 * 60 * 1000),
            creadoPor: "Técnico",
            etiquetas: ["mantenimiento"],
            comentarios: [],
            adjuntos: [],
            actividad: [
              {
                id: 1,
                tipo: "creacion",
                descripcion: "creó la tarea",
                usuario: "Técnico",
                fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              },
              {
                id: 2,
                tipo: "cambio_estado",
                descripcion: "marcó la tarea como completada",
                usuario: "Técnico",
                fecha: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            ],
            orden: 0,
          },
        ]
        setTareas(tareasEjemplo)
      }
    } catch (error) {
      console.error("Error al cargar tareas:", error)
    }
  }, [])

  // Guardar tareas en localStorage
  useEffect(() => {
    localStorage.setItem("tareas_centro", JSON.stringify(tareas))
  }, [tareas])

  // Función para encontrar la columna que contiene un elemento
  const findColumnForElement = (element: HTMLElement | null): keyof typeof ESTADOS_CONFIG | null => {
    if (!element) return null

    // Buscar el elemento de columna más cercano
    const column = element.closest("[data-column-id]")
    if (column) {
      const columnId = column.getAttribute("data-column-id")
      if (columnId && columnId in ESTADOS_CONFIG) {
        return columnId as keyof typeof ESTADOS_CONFIG
      }
    }

    return null
  }

  // Manejar inicio de arrastre
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveId(active.id as string)

    // Encontrar la tarea que se está arrastrando
    const tarea = tareas.find((t) => t.id.toString() === active.id)
    if (tarea && tarea.estado in ESTADOS_CONFIG) {
      setActiveColumn(tarea.estado as keyof typeof ESTADOS_CONFIG)
    }
  }

  // Manejar evento de arrastre sobre elementos
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) return

    // Intentar determinar la columna sobre la que se está arrastrando
    let columnId: keyof typeof ESTADOS_CONFIG | null = null

    // Si el over.id es una columna directamente
    if (typeof over.id === "string" && over.id in ESTADOS_CONFIG) {
      columnId = over.id as keyof typeof ESTADOS_CONFIG
    }
    // Si el over.id es una tarea, buscar su columna
    else {
      const overElement = document.getElementById(over.id.toString())
      columnId = findColumnForElement(overElement)
    }

    if (columnId) {
      overColumnRef.current = columnId
    }
  }

  // Manejar fin de arrastre
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setActiveColumn(null)

    if (!over && !overColumnRef.current) return

    const activeId = active.id as string
    const overId = over?.id as string

    // Encontrar la tarea que se está moviendo
    const activeIndex = tareas.findIndex((t) => t.id.toString() === activeId)
    if (activeIndex === -1) return

    const activeTarea = tareas[activeIndex]

    // Determinar el estado de destino
    let estadoDestino: keyof typeof ESTADOS_CONFIG | null = null

    // Si el over.id es una columna directamente
    if (overId && overId in ESTADOS_CONFIG) {
      estadoDestino = overId as keyof typeof ESTADOS_CONFIG
    }
    // Si el over.id es una tarea, usar su estado
    else if (overId) {
      const overIndex = tareas.findIndex((t) => t.id.toString() === overId)
      if (overIndex !== -1) {
        const overTarea = tareas[overIndex]
        if (overTarea.estado in ESTADOS_CONFIG) {
          estadoDestino = overTarea.estado as keyof typeof ESTADOS_CONFIG
        }
      }
      // Si no se encontró la tarea, usar la columna detectada durante el dragOver
      else if (overColumnRef.current) {
        estadoDestino = overColumnRef.current
      }
    }

    // Si no se pudo determinar el estado de destino, intentar usar la referencia
    if (!estadoDestino && overColumnRef.current) {
      estadoDestino = overColumnRef.current
    }

    // Si aún no se pudo determinar el estado de destino, salir
    if (!estadoDestino) {
      console.error("No se pudo determinar el estado de destino")
      return
    }

    // Limpiar la referencia
    overColumnRef.current = null

    // Si se está moviendo a una columna diferente
    if (activeTarea.estado !== estadoDestino) {
      actualizarEstadoTarea(Number.parseInt(activeId), estadoDestino)
      return
    }

    // Si se está reordenando dentro de la misma columna
    if (overId && activeId !== overId && !(overId in ESTADOS_CONFIG)) {
      const overIndex = tareas.findIndex((t) => t.id.toString() === overId)
      if (overIndex !== -1) {
        const reordenadas = arrayMove(tareas, activeIndex, overIndex)

        // Actualizar el orden solo para las tareas de esa columna
        const tareasActualizadas = reordenadas.map((tarea) => {
          if (tarea.estado === estadoDestino) {
            const tareasEnColumna = reordenadas.filter((t) => t.estado === estadoDestino)
            const indexEnColumna = tareasEnColumna.findIndex((t) => t.id === tarea.id)
            return { ...tarea, orden: indexEnColumna }
          }
          return tarea
        })

        setTareas(tareasActualizadas)
        toast.success("Tarea reordenada")
      }
    }
  }

  // Crear nueva tarea
  const crearTarea = () => {
    if (!nuevaTarea.titulo.trim()) {
      toast.error("El título es obligatorio")
      return
    }

    // Encontrar el orden máximo para el estado "pendiente"
    const maxOrden = Math.max(0, ...tareas.filter((t) => t.estado === "pendiente").map((t) => t.orden))

    const tarea: Tarea = {
      id: Math.max(0, ...tareas.map((t) => t.id)) + 1,
      titulo: nuevaTarea.titulo,
      descripcion: nuevaTarea.descripcion,
      estado: "pendiente",
      prioridad: nuevaTarea.prioridad,
      asignadoA: nuevaTarea.asignadoA,
      fechaVencimiento: nuevaTarea.fechaVencimiento ? new Date(nuevaTarea.fechaVencimiento) : undefined,
      fechaCreacion: new Date(),
      creadoPor: "Usuario Actual",
      etiquetas: nuevaTarea.etiquetas,
      comentarios: [],
      adjuntos: [],
      actividad: [
        {
          id: 1,
          tipo: "creacion",
          descripcion: "creó la tarea",
          usuario: "Usuario Actual",
          fecha: new Date(),
        },
      ],
      orden: maxOrden + 1,
    }

    setTareas((prev) => [...prev, tarea])
    setNuevaTarea({
      titulo: "",
      descripcion: "",
      prioridad: "media",
      asignadoA: undefined,
      fechaVencimiento: "",
      etiquetas: [],
    })
    setMostrarFormulario(false)
    toast.success("Tarea creada correctamente")
  }

  const editarTarea = (tarea: Tarea) => {
    setTareaEnEdicion(tarea)
    setMostrarModalEdicion(true)
  }

  const guardarTareaEditada = (tareaEditada: Tarea) => {
    setTareas(tareas.map((t) => (t.id === tareaEditada.id ? tareaEditada : t)))
    setMostrarModalEdicion(false)
    setTareaEnEdicion(null)
    toast.success("Tarea actualizada correctamente")
  }

  // Actualizar estado de tarea
  const actualizarEstadoTarea = (id: number, nuevoEstado: EstadoTarea) => {
    setTareas((prevTareas) => {
      // Encontrar el orden máximo para el nuevo estado
      const tareasEnNuevoEstado = prevTareas.filter((t) => t.estado === nuevoEstado && t.id !== id)
      const maxOrden = tareasEnNuevoEstado.length > 0 ? Math.max(...tareasEnNuevoEstado.map((t) => t.orden)) : -1

      return prevTareas.map((tarea) => {
        if (tarea.id === id) {
          const tareaActualizada = {
            ...tarea,
            estado: nuevoEstado,
            orden: maxOrden + 1,
          }

          if (nuevoEstado === "completada") {
            tareaActualizada.fechaCompletada = new Date()
          } else if (tarea.estado === "completada") {
            tareaActualizada.fechaCompletada = undefined
          }

          if (nuevoEstado === "archivada") {
            tareaActualizada.fechaArchivada = new Date()
          }

          // Añadir nueva actividad
          const actividadActual = Array.isArray(tarea.actividad) ? tarea.actividad : []
          const maxActividadId = actividadActual.length > 0 ? Math.max(...actividadActual.map((a) => a.id)) : 0

          const nuevaActividad = {
            id: maxActividadId + 1,
            tipo: "cambio_estado",
            descripcion:
              nuevoEstado === "completada"
                ? "marcó la tarea como completada"
                : nuevoEstado === "archivada"
                  ? "archivó la tarea"
                  : `cambió el estado a ${ESTADOS_CONFIG[nuevoEstado]?.titulo || nuevoEstado}`,
            usuario: "Usuario Actual",
            fecha: new Date(),
          }

          tareaActualizada.actividad = [...actividadActual, nuevaActividad]

          return tareaActualizada
        }
        return tarea
      })
    })

    const mensaje = nuevoEstado === "archivada" ? "Tarea archivada" : "Estado actualizado"
    toast.success(mensaje)
  }

  // Archivar tarea
  const archivarTarea = (id: number) => {
    actualizarEstadoTarea(id, "archivada")
  }

  // Eliminar tarea (marcar como eliminada)
  const eliminarTarea = (id: number) => {
    setTareas((prevTareas) =>
      prevTareas.map((tarea) => {
        if (tarea.id === id) {
          const actividadActual = Array.isArray(tarea.actividad) ? tarea.actividad : []
          const maxActividadId = actividadActual.length > 0 ? Math.max(...actividadActual.map((a) => a.id)) : 0

          const nuevaActividad = {
            id: maxActividadId + 1,
            tipo: "eliminacion",
            descripcion: "eliminó la tarea",
            usuario: "Usuario Actual",
            fecha: new Date(),
          }

          return {
            ...tarea,
            fechaEliminada: new Date(),
            actividad: [...actividadActual, nuevaActividad],
          }
        }
        return tarea
      }),
    )
    toast.success("Tarea eliminada")
  }

  // Filtrar tareas según el estado seleccionado
  const tareasFiltradas = tareas.filter((tarea) => {
    // Filtro por estado de la tarea (creadas, archivadas, eliminadas)
    let cumpleFiltroEstado = false
    switch (filtroEstado) {
      case "creadas":
        cumpleFiltroEstado = !tarea.fechaArchivada && !tarea.fechaEliminada
        break
      case "archivadas":
        cumpleFiltroEstado = !!tarea.fechaArchivada && !tarea.fechaEliminada
        break
      case "eliminadas":
        cumpleFiltroEstado = !!tarea.fechaEliminada
        break
    }

    if (!cumpleFiltroEstado) return false

    const cumpleFiltroAsignado = filtroAsignado === "todos" || tarea.asignadoA === filtroAsignado
    const cumpleFiltroPrioridad = filtroPrioridad === "todas" || tarea.prioridad === filtroPrioridad
    const cumpleBusqueda =
      !busqueda ||
      tarea.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      tarea.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      getNombreProfesional(tarea.asignadoA).toLowerCase().includes(busqueda.toLowerCase())

    return cumpleFiltroAsignado && cumpleFiltroPrioridad && cumpleBusqueda
  })

  // Obtener tareas por estado y ordenarlas
  const getTareasPorEstado = (estado: keyof typeof ESTADOS_CONFIG) => {
    return tareasFiltradas.filter((tarea) => tarea.estado === estado).sort((a, b) => a.orden - b.orden)
  }

  // Obtener nombre del profesional
  const getNombreProfesional = (id?: number) => {
    if (!id) return "Sin asignar"
    const profesional = profesionales.find((p) => p.id === id)
    return profesional ? profesional.nombre : "Desconocido"
  }

  // Restaurar tarea archivada
  const restaurarTarea = (id: number) => {
    setTareas((prevTareas) =>
      prevTareas.map((tarea) => {
        if (tarea.id === id) {
          const actividadActual = Array.isArray(tarea.actividad) ? tarea.actividad : []
          const maxActividadId = actividadActual.length > 0 ? Math.max(...actividadActual.map((a) => a.id)) : 0

          const nuevaActividad = {
            id: maxActividadId + 1,
            tipo: "restauracion",
            descripcion: "restauró la tarea desde archivo",
            usuario: "Usuario Actual",
            fecha: new Date(),
          }

          return {
            ...tarea,
            fechaArchivada: undefined,
            actividad: [...actividadActual, nuevaActividad],
          }
        }
        return tarea
      }),
    )
    toast.success("Tarea restaurada")
  }

  // Obtener tarea activa para el overlay
  const tareaActiva = activeId ? tareas.find((t) => t.id.toString() === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Volver al Dashboard</span>
                <span className="sm:hidden">Volver</span>
              </Button>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                <span className="hidden sm:inline">Gestión de Tareas del Centro</span>
                <span className="sm:hidden">Tareas</span>
              </h1>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              {/* Barra de búsqueda */}
              <div className="relative order-1 sm:order-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar tareas..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2 order-2 sm:order-none">
                {/* Filtros */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>

                {/* Botón nueva tarea */}
                <Button
                  type="button"
                  onClick={() => setMostrarFormulario(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Nueva Tarea</span>
                  <span className="sm:hidden">Nueva</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Panel de filtros desktop */}
          {mostrarFiltros && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Estado de la tarea</Label>
                  <Select value={filtroEstado} onValueChange={(value: any) => setFiltroEstado(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creadas">Tareas Creadas</SelectItem>
                      <SelectItem value="archivadas">Tareas Archivadas</SelectItem>
                      <SelectItem value="eliminadas">Tareas Eliminadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Asignado a</Label>
                  <Select
                    value={filtroAsignado.toString()}
                    onValueChange={(value) => setFiltroAsignado(value === "todos" ? "todos" : Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los profesionales</SelectItem>
                      {profesionales.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id.toString()}>
                          {prof.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={filtroPrioridad} onValueChange={(value: any) => setFiltroPrioridad(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas las prioridades</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFiltroEstado("creadas")
                      setFiltroAsignado("todos")
                      setFiltroPrioridad("todas")
                      setBusqueda("")
                    }}
                    className="w-full"
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard estilo Trello con Drag and Drop */}
        <div className="p-4 sm:p-6">
          {filtroEstado === "creadas" ? (
            // Vista normal del tablero para tareas creadas
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-h-[calc(100vh-300px)]">
              {(Object.keys(ESTADOS_CONFIG) as (keyof typeof ESTADOS_CONFIG)[]).map((estado) => {
                const tareasEstado = getTareasPorEstado(estado)

                return (
                  <TaskColumn key={estado} estado={estado} tareas={tareasEstado}>
                    <SortableContext
                      items={tareasEstado.map((t) => t.id.toString())}
                      strategy={verticalListSortingStrategy}
                    >
                      {tareasEstado.map((tarea) => (
                        <DraggableTaskCard
                          key={tarea.id}
                          tarea={tarea}
                          onEdit={editarTarea}
                          onDelete={eliminarTarea}
                          onArchive={archivarTarea}
                        />
                      ))}
                    </SortableContext>
                  </TaskColumn>
                )
              })}
            </div>
          ) : (
            // Vista de lista para tareas archivadas y eliminadas
            <div className="space-y-4">
              <div className="bg-white rounded-lg border p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
                  {filtroEstado === "archivadas" ? (
                    <>
                      <Archive className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                      Tareas Archivadas ({tareasFiltradas.length})
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      Tareas Eliminadas ({tareasFiltradas.length})
                    </>
                  )}
                </h3>

                {tareasFiltradas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-2">
                      {filtroEstado === "archivadas" ? (
                        <Archive className="h-8 w-8 sm:h-12 sm:w-12 mx-auto opacity-50" />
                      ) : (
                        <Trash2 className="h-8 w-8 sm:h-12 sm:w-12 mx-auto opacity-50" />
                      )}
                    </div>
                    <p className="text-sm sm:text-base">
                      No hay tareas {filtroEstado === "archivadas" ? "archivadas" : "eliminadas"}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4">
                    {tareasFiltradas.map((tarea) => (
                      <Card key={tarea.id} className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm sm:text-base mb-2 break-words">{tarea.titulo}</h4>
                            {tarea.descripcion && (
                              <p className="text-xs sm:text-sm text-gray-600 mb-3 break-words">{tarea.descripcion}</p>
                            )}

                            <div className="flex flex-wrap gap-1 sm:gap-2 mb-3">
                              <Badge
                                variant="outline"
                                className={`text-xs ${PRIORIDADES_CONFIG[tarea.prioridad].color}`}
                              >
                                {PRIORIDADES_CONFIG[tarea.prioridad].texto}
                              </Badge>
                              {filtroEstado === "archivadas" && (
                                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                  Archivada
                                </Badge>
                              )}
                              {filtroEstado === "eliminadas" && (
                                <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                  Eliminada
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-500">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span className="truncate">{getNombreProfesional(tarea.asignadoA)}</span>
                                </div>
                                {tarea.fechaVencimiento && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{tarea.fechaVencimiento.toLocaleDateString("es-ES")}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-left sm:text-right">
                                {filtroEstado === "archivadas" && tarea.fechaArchivada && (
                                  <div>Archivada: {tarea.fechaArchivada.toLocaleDateString("es-ES")}</div>
                                )}
                                {filtroEstado === "eliminadas" && tarea.fechaEliminada && (
                                  <div>Eliminada: {tarea.fechaEliminada.toLocaleDateString("es-ES")}</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-blue-100"
                              onClick={() => editarTarea(tarea)}
                              title="Ver detalles"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>

                            {filtroEstado === "archivadas" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-green-100"
                                onClick={() => restaurarTarea(tarea.id)}
                                title="Restaurar tarea"
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Estadísticas */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-gray-900">{tareasFiltradas.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">
                  {filtroEstado === "creadas"
                    ? "Tareas activas"
                    : filtroEstado === "archivadas"
                      ? "Tareas archivadas"
                      : "Tareas eliminadas"}
                </div>
              </CardContent>
            </Card>

            {filtroEstado === "creadas" && (
              <>
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-blue-600">
                      {getTareasPorEstado("en_progreso").length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">En progreso</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-green-600">
                      {getTareasPorEstado("completada").length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Completadas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-gray-600">
                      {getTareasPorEstado("pendiente").length}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600">Pendientes</div>
                  </CardContent>
                </Card>
              </>
            )}

            {filtroEstado === "archivadas" && (
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">
                    {tareas.filter((t) => t.fechaArchivada && !t.fechaEliminada).length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Total archivadas</div>
                </CardContent>
              </Card>
            )}

            {filtroEstado === "eliminadas" && (
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="text-lg sm:text-2xl font-bold text-red-600">
                    {tareas.filter((t) => t.fechaEliminada).length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">Total eliminadas</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modal de nueva tarea */}
        <Dialog open={mostrarFormulario} onOpenChange={setMostrarFormulario}>
          <DialogContent className="max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>Nueva Tarea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={nuevaTarea.titulo}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, titulo: e.target.value })}
                  placeholder="Título de la tarea"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={nuevaTarea.descripcion}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, descripcion: e.target.value })}
                  placeholder="Descripción detallada"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select
                    value={nuevaTarea.prioridad}
                    onValueChange={(value: PrioridadTarea) => setNuevaTarea({ ...nuevaTarea, prioridad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Asignar a</Label>
                  <Select
                    value={nuevaTarea.asignadoA?.toString() || "0"}
                    onValueChange={(value) =>
                      setNuevaTarea({ ...nuevaTarea, asignadoA: value ? Number(value) : undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin asignar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sin asignar</SelectItem>
                      {profesionales.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id.toString()}>
                          {prof.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
                <Input
                  id="fechaVencimiento"
                  type="date"
                  value={nuevaTarea.fechaVencimiento}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, fechaVencimiento: e.target.value })}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setMostrarFormulario(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button onClick={crearTarea} className="w-full sm:w-auto">
                  Crear Tarea
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de edición de tarea */}
        <Dialog
          open={mostrarModalEdicion}
          onOpenChange={() => {
            setMostrarModalEdicion(false)
            setTareaEnEdicion(null)
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Tarea</DialogTitle>
            </DialogHeader>

            {tareaEnEdicion && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título</Label>
                    <Input
                      id="titulo"
                      value={tareaEnEdicion.titulo}
                      onChange={(e) => setTareaEnEdicion({ ...tareaEnEdicion, titulo: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={tareaEnEdicion.estado}
                      onValueChange={(value) => setTareaEnEdicion({ ...tareaEnEdicion, estado: value as EstadoTarea })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="en_progreso">En Progreso</SelectItem>
                        <SelectItem value="completada">Completada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Select
                      value={tareaEnEdicion.prioridad}
                      onValueChange={(value: PrioridadTarea) =>
                        setTareaEnEdicion({ ...tareaEnEdicion, prioridad: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Asignado a</Label>
                    <Select
                      value={tareaEnEdicion.asignadoA?.toString() || "0"}
                      onValueChange={(value) =>
                        setTareaEnEdicion({ ...tareaEnEdicion, asignadoA: value === "0" ? undefined : Number(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sin asignar</SelectItem>
                        {profesionales.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id.toString()}>
                            {prof.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
                    <Input
                      id="fechaVencimiento"
                      type="date"
                      value={tareaEnEdicion.fechaVencimiento?.toISOString().split("T")[0] || ""}
                      onChange={(e) =>
                        setTareaEnEdicion({
                          ...tareaEnEdicion,
                          fechaVencimiento: e.target.value ? new Date(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={tareaEnEdicion.descripcion}
                    onChange={(e) => setTareaEnEdicion({ ...tareaEnEdicion, descripcion: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Etiquetas</Label>
                  <div className="flex flex-wrap gap-2">
                    {tareaEnEdicion.etiquetas.map((etiqueta, index) => (
                      <Badge key={index} variant="secondary">
                        {etiqueta}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Creada: {tareaEnEdicion.fechaCreacion.toLocaleDateString("es-ES")}</span>
                  </div>
                  {tareaEnEdicion.fechaCompletada && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Completada: {tareaEnEdicion.fechaCompletada.toLocaleDateString("es-ES")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Creada por: {tareaEnEdicion.creadoPor}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMostrarModalEdicion(false)
                      setTareaEnEdicion(null)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => guardarTareaEditada(tareaEnEdicion)}>Guardar Cambios</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Overlay para mostrar la tarea siendo arrastrada */}
        <DragOverlay>
          {tareaActiva ? (
            <Card className="bg-white shadow-lg rotate-3 opacity-90">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-sm">{tareaActiva.titulo}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
