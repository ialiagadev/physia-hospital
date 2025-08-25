"use client"

import type React from "react"
import { Textarea } from "@/components/ui/textarea"
import { useState, useRef, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
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
  Loader2,
  Users,
  X,
  MessageSquare,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useTasks } from "@/hooks/tasks/use-tasks"
import { useProfessionals } from "@/hooks/tasks/use-professionals"
import type { PrioridadTarea, EstadoTarea, Tarea, Usuario } from "@/types/tasks"
import { TaskNotes } from "@/components/tasks/tareas-notes"
import { useGuidedTour } from "@/hooks/useGuidedTour"
import InteractiveTourOverlay from "@/components/tour/InteractiveTourOverlay"

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
  usuarios,
  getNombreUsuario,
}: {
  tarea: Tarea
  onEdit: (tarea: Tarea) => void
  onDelete: (id: number) => void
  onArchive: (id: number) => void
  usuarios: Usuario[]
  getNombreUsuario: (id?: string) => string
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

  const estaVencida = (tarea: Tarea) => {
    return tarea.fechaVencimiento && tarea.estado !== "completada" && new Date() > tarea.fechaVencimiento
  }

  const venceProto = (tarea: Tarea) => {
    if (!tarea.fechaVencimiento || tarea.estado === "completada") return false
    const ahora = new Date()
    const diferencia = tarea.fechaVencimiento.getTime() - ahora.getTime()
    return diferencia > 0 && diferencia <= 24 * 60 * 60 * 1000
  }

  // Función para obtener nombres de múltiples usuarios asignados
  const getNombresAsignados = () => {
    if (!tarea.asignadosA || tarea.asignadosA.length === 0) {
      return "Sin asignar"
    }

    if (tarea.asignadosA.length === 1) {
      return getNombreUsuario(tarea.asignadosA[0])
    }

    if (tarea.asignadosA.length <= 2) {
      return tarea.asignadosA.map((id) => getNombreUsuario(id)).join(", ")
    }

    return `${getNombreUsuario(tarea.asignadosA[0])} +${tarea.asignadosA.length - 1} más`
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header de la tarea */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div className="mt-1 touch-none" {...listeners}>
                <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
              </div>
              <h4 className="font-medium text-sm leading-tight flex-1 break-words">{tarea.titulo}</h4>
            </div>
            {/* Botones de acción - Mejorados para móvil */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-blue-100 touch-manipulation"
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
                className="h-7 w-7 p-0 hover:bg-orange-100 touch-manipulation"
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
                className="h-7 w-7 p-0 hover:bg-red-100 touch-manipulation"
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
            <p className="text-xs text-gray-600 line-clamp-2 ml-6 break-words">{tarea.descripcion}</p>
          )}

          {/* Notas - mostrar solo el número */}
          {tarea.notas && tarea.notas.length > 0 && (
            <div className="ml-6 flex items-center gap-1 text-xs text-gray-600">
              <MessageSquare className="h-3 w-3" />
              <span>
                {tarea.notas.length} nota{tarea.notas.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Badges de estado */}
          <div className="flex flex-wrap gap-1 ml-6">
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
          <div className="flex flex-col gap-1 text-xs text-gray-500 pt-2 border-t ml-6">
            <div className="flex items-center gap-1">
              {tarea.asignadosA && tarea.asignadosA.length > 1 ? (
                <Users className="h-3 w-3 flex-shrink-0" />
              ) : (
                <User className="h-3 w-3 flex-shrink-0" />
              )}
              <span className="truncate">{getNombresAsignados()}</span>
            </div>
            {tarea.fechaVencimiento && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span>{tarea.fechaVencimiento.toLocaleDateString("es-ES")}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">Creado por: {getNombreUsuario(tarea.creadoPor)}</span>
            </div>
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
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Header de la columna */}
      <div className={`${config.colorHeader} rounded-t-lg p-3 border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconoEstado className={`h-4 w-4 ${config.colorIcono}`} />
            <h3 className="font-semibold text-sm text-gray-900">{config.titulo}</h3>
            <Badge variant="secondary" className="ml-1 text-xs">
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
        className={`${config.color} flex-1 p-3 rounded-b-lg overflow-y-auto space-y-2`}
      >
        {children}
        {tareas.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <Circle className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Arrastra tareas aquí</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente para selector múltiple de usuarios - VERSIÓN MEJORADA
function MultiUserSelector({
  selectedUsers,
  onSelectionChange,
  usuarios,
  placeholder = "Seleccionar usuarios",
}: {
  selectedUsers: string[]
  onSelectionChange: (users: string[]) => void
  usuarios: Usuario[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onSelectionChange(selectedUsers.filter((id) => id !== userId))
    } else {
      onSelectionChange([...selectedUsers, userId])
    }
  }

  const removeUser = (userId: string) => {
    onSelectionChange(selectedUsers.filter((id) => id !== userId))
  }

  const clearAll = () => {
    onSelectionChange([])
  }

  const getSelectedUserNames = () => {
    return selectedUsers.map((id) => {
      const user = usuarios.find((u) => u.id === id)
      return user?.name || "Usuario desconocido"
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between bg-transparent h-12"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="truncate text-left">
            {selectedUsers.length === 0
              ? placeholder
              : selectedUsers.length === 1
                ? getSelectedUserNames()[0]
                : `${selectedUsers.length} usuarios seleccionados`}
          </span>
          <div className="flex items-center gap-2">
            {selectedUsers.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedUsers.length}
              </Badge>
            )}
            <Users className="h-4 w-4 opacity-50" />
          </div>
        </Button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-80 overflow-hidden">
            {/* Header del dropdown */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm text-gray-700">
                  Seleccionar usuarios ({usuarios.length} disponibles)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedUsers.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="text-xs h-6 px-2">
                    Limpiar todo
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Lista de usuarios */}
            <div className="max-h-60 overflow-y-auto">
              {usuarios.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No hay usuarios disponibles</div>
              ) : (
                <div className="p-2">
                  {usuarios.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                      onClick={() => toggleUser(user.id)}
                    >
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-blue-700">
                              {user.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase() || "U"}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-gray-900 truncate">{user.name || "Sin nombre"}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      {selectedUsers.includes(user.id) && (
                        <div className="flex-shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            Seleccionado
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mostrar usuarios seleccionados como badges mejorados */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700">Usuarios asignados ({selectedUsers.length})</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700"
            >
              Quitar todos
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((userId) => {
              const user = usuarios.find((u) => u.id === userId)
              return (
                <Badge key={userId} variant="secondary" className="flex items-center gap-2 py-1 px-3 text-sm">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-blue-700">
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </span>
                  </div>
                  <span className="truncate max-w-32">{user?.name || "Usuario"}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-gray-300 ml-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeUser(userId)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TareasPage() {
  const router = useRouter()

  const { isActive, tourSteps, nextStep, previousStep, endTour, skipTour } = useGuidedTour()

  // Hooks principales
  const {
    tareas,
    loading: tareasLoading,
    error,
    crearTarea,
    actualizarEstadoTarea,
    eliminarTarea,
    actualizarTarea,
    reordenarTareas,
    restaurarTarea,
    añadirNota,
    eliminarNota,
  } = useTasks()
  const { usuarios, usuariosTipo1, loading: profesionalesLoading, getNombreUsuario } = useProfessionals()

  // Estados locales
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [filtroAsignado, setFiltroAsignado] = useState<string | "todos">("todos")
  const [filtroPrioridad, setFiltroPrioridad] = useState<PrioridadTarea | "todas">("todas")
  const [busqueda, setBusqueda] = useState("")
  const [mostrarFiltros, setMostrarFiltros] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeColumn, setActiveColumn] = useState<keyof typeof ESTADOS_CONFIG | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<"creadas" | "archivadas" | "eliminadas">("creadas")
  const [tareaEnEdicionId, setTareaEnEdicionId] = useState<number | null>(null)

  // Estados para formularios
  const [nuevaTarea, setNuevaTarea] = useState({
    titulo: "",
    descripcion: "",
    notas: "", // Añadir este campo
    prioridad: "media" as PrioridadTarea,
    asignadosA: [] as string[],
    fechaVencimiento: "",
    etiquetas: [] as string[],
  })
  const [tareaEnEdicion, setTareaEnEdicion] = useState<Tarea | null>(null)
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false)

  // Referencia para drag and drop
  const overColumnRef = useRef<keyof typeof ESTADOS_CONFIG | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  )

  // Sincronizar tarea en edición con datos actualizados
  useEffect(() => {
    if (tareaEnEdicionId) {
      const tareaActualizada = tareas.find((t) => t.id === tareaEnEdicionId)
      if (tareaActualizada) {
        setTareaEnEdicion(tareaActualizada)
      } else {
        setTareaEnEdicion(null)
      }
    }
  }, [tareas, tareaEnEdicionId])

  // Función para encontrar la columna que contiene un elemento
  const findColumnForElement = (element: HTMLElement | null): keyof typeof ESTADOS_CONFIG | null => {
    if (!element) return null
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
    const tarea = tareas.find((t) => t.id.toString() === active.id)
    if (tarea && tarea.estado in ESTADOS_CONFIG) {
      setActiveColumn(tarea.estado as keyof typeof ESTADOS_CONFIG)
    }
  }

  // Manejar evento de arrastre sobre elementos
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) return

    let columnId: keyof typeof ESTADOS_CONFIG | null = null
    if (typeof over.id === "string" && over.id in ESTADOS_CONFIG) {
      columnId = over.id as keyof typeof ESTADOS_CONFIG
    } else {
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
    const activeIndex = tareas.findIndex((t) => t.id.toString() === activeId)

    if (activeIndex === -1) return

    const activeTarea = tareas[activeIndex]
    let estadoDestino: keyof typeof ESTADOS_CONFIG | null = null

    if (overId && overId in ESTADOS_CONFIG) {
      estadoDestino = overId as keyof typeof ESTADOS_CONFIG
    } else if (overId) {
      const overIndex = tareas.findIndex((t) => t.id.toString() === overId)
      if (overIndex !== -1) {
        const overTarea = tareas[overIndex]
        if (overTarea.estado in ESTADOS_CONFIG) {
          estadoDestino = overTarea.estado as keyof typeof ESTADOS_CONFIG
        }
      } else if (overColumnRef.current) {
        estadoDestino = overColumnRef.current
      }
    }

    if (!estadoDestino && overColumnRef.current) {
      estadoDestino = overColumnRef.current
    }

    if (!estadoDestino) {
      console.error("No se pudo determinar el estado de destino")
      return
    }

    overColumnRef.current = null

    if (activeTarea.estado !== estadoDestino) {
      actualizarEstadoTarea(Number.parseInt(activeId), estadoDestino)
      return
    }

    if (overId && activeId !== overId && !(overId in ESTADOS_CONFIG)) {
      const overIndex = tareas.findIndex((t) => t.id.toString() === overId)
      if (overIndex !== -1) {
        const reordenadas = arrayMove(tareas, activeIndex, overIndex)
        const tareasEnColumna = reordenadas.filter((t) => t.estado === estadoDestino)
        const indexEnColumna = tareasEnColumna.findIndex((t) => t.id === activeTarea.id)
        reordenarTareas(activeTarea.id, indexEnColumna)
      }
    }
  }

  // Crear nueva tarea
  const handleCrearTarea = async () => {
    if (!nuevaTarea.titulo.trim()) {
      toast.error("El título es obligatorio")
      return
    }

    try {
      await crearTarea(nuevaTarea)
      setNuevaTarea({
        titulo: "",
        descripcion: "",
        notas: "", // Añadir este campo
        prioridad: "media",
        asignadosA: [],
        fechaVencimiento: "",
        etiquetas: [],
      })
      setMostrarFormulario(false)
    } catch (error) {
      // Error ya manejado en el hook
    }
  }

  const editarTarea = (tarea: Tarea) => {
    setTareaEnEdicionId(tarea.id)
    setMostrarModalEdicion(true)
  }

  const guardarTareaEditada = async (tareaEditada: Tarea) => {
    try {
      await actualizarTarea(tareaEditada)
      // No cerrar el modal aquí, dejar que el usuario lo cierre manualmente
      // setMostrarModalEdicion(false)
      // setTareaEnEdicion(null)
    } catch (error) {
      // Error ya manejado en el hook
    }
  }

  const archivarTarea = (id: number) => {
    actualizarEstadoTarea(id, "archivada")
  }

  // Filtrar tareas según el estado seleccionado
  const tareasFiltradas = tareas.filter((tarea) => {
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

    // Filtro por asignado - ahora maneja múltiples asignados
    const cumpleFiltroAsignado =
      filtroAsignado === "todos" ||
      (tarea.asignadosA && tarea.asignadosA.includes(filtroAsignado)) ||
      (!tarea.asignadosA && filtroAsignado === "sin_asignar")

    const cumpleFiltroPrioridad = filtroPrioridad === "todas" || tarea.prioridad === filtroPrioridad

    const cumpleBusqueda =
      !busqueda ||
      tarea.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      tarea.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      (tarea.notas && tarea.notas.some((nota) => nota.content.toLowerCase().includes(busqueda.toLowerCase()))) ||
      (tarea.asignadosA &&
        tarea.asignadosA.some((id) => getNombreUsuario(id).toLowerCase().includes(busqueda.toLowerCase())))

    return cumpleFiltroAsignado && cumpleFiltroPrioridad && cumpleBusqueda
  })

  // Obtener tareas por estado y ordenarlas
  const getTareasPorEstado = (estado: keyof typeof ESTADOS_CONFIG) => {
    return tareasFiltradas.filter((tarea) => tarea.estado === estado).sort((a, b) => a.orden - b.orden)
  }

  // Obtener tarea activa para el overlay
  const tareaActiva = activeId ? tareas.find((t) => t.id.toString() === activeId) : null

  // Loading state
  if (tareasLoading || profesionalesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando tareas...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar las tareas: {error}</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header - Mejorado para móvil */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3">
          <div className="flex flex-col gap-3">
            {/* Primera fila: Título y botón volver */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-2 p-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Volver</span>
                </Button>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                  <span className="hidden sm:inline">Gestión de Tareas</span>
                  <span className="sm:hidden">Tareas</span>
                </h1>
              </div>
              {/* Botón nueva tarea - Siempre visible */}
              <Button
                onClick={() => setMostrarFormulario(true)}
                size="sm"
                className="flex items-center gap-2"
                data-tour="new-task-btn"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva Tarea</span>
                <span className="sm:hidden">Nueva</span>
              </Button>
            </div>

            {/* Segunda fila: Búsqueda y filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Barra de búsqueda */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar tareas..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                  data-tour="tasks-search-input"
                />
              </div>
              {/* Botón filtros */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center gap-2 whitespace-nowrap"
                data-tour="filters-btn"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          {/* Panel de filtros */}
          {mostrarFiltros && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border" data-tour="filters-panel">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={filtroEstado} onValueChange={(value: any) => setFiltroEstado(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creadas">Creadas</SelectItem>
                      <SelectItem value="archivadas">Archivadas</SelectItem>
                      <SelectItem value="eliminadas">Eliminadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Asignado a</Label>
                  <Select
                    value={filtroAsignado.toString()}
                    onValueChange={(value) => setFiltroAsignado(value === "todos" ? "todos" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                      {usuariosTipo1.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
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
                      <SelectItem value="todas">Todas</SelectItem>
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
                    Limpiar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contenido principal */}
        <div className="p-3 sm:p-6">
          {filtroEstado === "creadas" ? (
            // Tablero Kanban - Mejorado para móvil
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[calc(100vh-250px)]" data-tour="kanban-board">
              {(Object.keys(ESTADOS_CONFIG) as (keyof typeof ESTADOS_CONFIG)[]).map((estado) => {
                const tareasEstado = getTareasPorEstado(estado)
                return (
                  <div key={estado} data-tour={`${estado}-column`}>
                    <TaskColumn estado={estado} tareas={tareasEstado}>
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
                            usuarios={usuariosTipo1}
                            getNombreUsuario={getNombreUsuario}
                          />
                        ))}
                      </SortableContext>
                    </TaskColumn>
                  </div>
                )
              })}
            </div>
          ) : (
            // Vista de lista para archivadas/eliminadas
            <div className="space-y-4">
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {filtroEstado === "archivadas" ? (
                    <>
                      <Archive className="h-5 w-5 text-orange-600" />
                      Archivadas ({tareasFiltradas.length})
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5 text-red-600" />
                      Eliminadas ({tareasFiltradas.length})
                    </>
                  )}
                </h3>

                {tareasFiltradas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="mb-2">
                      {filtroEstado === "archivadas" ? (
                        <Archive className="h-12 w-12 mx-auto opacity-50" />
                      ) : (
                        <Trash2 className="h-12 w-12 mx-auto opacity-50" />
                      )}
                    </div>
                    <p>No hay tareas {filtroEstado === "archivadas" ? "archivadas" : "eliminadas"}</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {tareasFiltradas.map((tarea) => (
                      <Card key={tarea.id} className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium mb-2 break-words">{tarea.titulo}</h4>
                            {tarea.descripcion && (
                              <p className="text-sm text-gray-600 mb-3 break-words">{tarea.descripcion}</p>
                            )}
                            {tarea.notas && tarea.notas.length > 0 && (
                              <div className="mb-3 p-2 bg-yellow-50 border-l-2 border-yellow-200 rounded-r">
                                <div className="flex items-center gap-1 mb-2">
                                  <MessageSquare className="h-3 w-3 text-gray-600" />
                                  <span className="text-xs font-medium text-gray-600">
                                    {tarea.notas.length} nota{tarea.notas.length !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {tarea.notas.slice(0, 2).map((nota) => (
                                    <p key={nota.id} className="text-sm text-gray-700 break-words">
                                      📝 {nota.content}
                                    </p>
                                  ))}
                                  {tarea.notas.length > 2 && (
                                    <p className="text-xs text-gray-500 italic">
                                      ... y {tarea.notas.length - 2} nota{tarea.notas.length - 2 !== 1 ? "s" : ""} más
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 mb-3">
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
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                {tarea.asignadosA && tarea.asignadosA.length > 1 ? (
                                  <Users className="h-3 w-3" />
                                ) : (
                                  <User className="h-3 w-3" />
                                )}
                                <span>
                                  {tarea.asignadosA && tarea.asignadosA.length > 0
                                    ? tarea.asignadosA.length === 1
                                      ? getNombreUsuario(tarea.asignadosA[0])
                                      : `${tarea.asignadosA.length} usuarios`
                                    : "Sin asignar"}
                                </span>
                              </div>
                              {tarea.fechaVencimiento && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{tarea.fechaVencimiento.toLocaleDateString("es-ES")}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>Creado por: {getNombreUsuario(tarea.creadoPor)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => editarTarea(tarea)} title="Ver detalles">
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            {filtroEstado === "archivadas" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => restaurarTarea(tarea.id)}
                                title="Restaurar"
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

        {/* Estadísticas - Mejoradas para móvil */}
        <div className="px-3 sm:px-6 pb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{tareasFiltradas.length}</div>
                <div className="text-xs text-gray-600">
                  {filtroEstado === "creadas" ? "Activas" : filtroEstado === "archivadas" ? "Archivadas" : "Eliminadas"}
                </div>
              </CardContent>
            </Card>
            {filtroEstado === "creadas" && (
              <>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-blue-600">{getTareasPorEstado("en_progreso").length}</div>
                    <div className="text-xs text-gray-600">En progreso</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-green-600">{getTareasPorEstado("completada").length}</div>
                    <div className="text-xs text-gray-600">Completadas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold text-gray-600">{getTareasPorEstado("pendiente").length}</div>
                    <div className="text-xs text-gray-600">Pendientes</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Modal de nueva tarea */}
        <Dialog open={mostrarFormulario} onOpenChange={setMostrarFormulario}>
          <DialogContent className="w-full max-w-7xl mx-auto max-h-[95vh] overflow-y-auto">
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

              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={nuevaTarea.notas}
                  onChange={(e) => setNuevaTarea({ ...nuevaTarea, notas: e.target.value })}
                  placeholder="Notas adicionales o comentarios"
                  rows={2}
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
                  <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
                  <Input
                    id="fechaVencimiento"
                    type="date"
                    value={nuevaTarea.fechaVencimiento}
                    onChange={(e) => setNuevaTarea({ ...nuevaTarea, fechaVencimiento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Asignar a</Label>
                <MultiUserSelector
                  selectedUsers={nuevaTarea.asignadosA}
                  onSelectionChange={(users) => setNuevaTarea({ ...nuevaTarea, asignadosA: users })}
                  usuarios={usuariosTipo1}
                  placeholder="Seleccionar usuarios"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setMostrarFormulario(false)} className="w-full sm:w-auto">
                  Cancelar
                </Button>
                <Button onClick={handleCrearTarea} className="w-full sm:w-auto">
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
            setTareaEnEdicionId(null)
          }}
        >
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto mx-4">
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

                  <div className="space-y-2 md:col-span-2">
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
                  <Label>Asignar a</Label>
                  <MultiUserSelector
                    selectedUsers={tareaEnEdicion.asignadosA || []}
                    onSelectionChange={(users) => setTareaEnEdicion({ ...tareaEnEdicion, asignadosA: users })}
                    usuarios={usuariosTipo1}
                    placeholder="Seleccionar usuarios"
                  />
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
                  <TaskNotes
                    notas={tareaEnEdicion.notas}
                    taskId={tareaEnEdicion.id}
                    onAddNote={añadirNota}
                    onDeleteNote={eliminarNota}
                    getNombreUsuario={getNombreUsuario}
                    usuarios={usuariosTipo1}
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
                    <span>Creada por: {getNombreUsuario(tareaEnEdicion.creadoPor)}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMostrarModalEdicion(false)
                      setTareaEnEdicionId(null)
                    }}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button onClick={() => guardarTareaEditada(tareaEnEdicion)} className="w-full sm:w-auto">
                    Guardar Cambios
                  </Button>
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

        <InteractiveTourOverlay steps={tourSteps} onClose={endTour} onFinish={endTour} isActive={isActive} />
      </div>
    </DndContext>
  )
}
