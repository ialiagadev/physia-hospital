"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, MessageSquare, Paperclip, Activity, Users } from "lucide-react"
import type { Tarea, PrioridadTarea, Usuario } from "@/types/tasks"
import { TaskNotes } from "./tasks/tareas-notes"

interface TaskEditModalProps {
  tarea: Tarea | null
  isOpen: boolean
  onClose: () => void
  onSave: (tarea: Tarea) => void
  usuarios: Usuario[]
  getNombreUsuario: (id?: string) => string
  onAddNote: (taskId: number, content: string) => Promise<void>
  onDeleteNote: (noteId: number) => Promise<void>
  modo: "editar" | "ver"
}

export function TaskEditModal({
  tarea,
  isOpen,
  onClose,
  onSave,
  usuarios,
  getNombreUsuario,
  onAddNote,
  onDeleteNote,
  modo,
}: TaskEditModalProps) {
  const [tareaEditada, setTareaEditada] = useState<Tarea | null>(null)

  useEffect(() => {
    if (tarea) {
      setTareaEditada({ ...tarea })
    }
  }, [tarea])

  if (!tarea || !tareaEditada) return null

  const handleSave = async () => {
    if (tareaEditada) {
      try {
        await onSave(tareaEditada)
        // El estado se actualizará automáticamente cuando el hook principal recargue los datos
      } catch (error) {
        // Manejar error si es necesario
      }
    }
  }

  // Función para obtener nombres de múltiples usuarios asignados
  const getNombresAsignados = () => {
    if (!tareaEditada.asignadosA || tareaEditada.asignadosA.length === 0) {
      return "Sin asignar"
    }

    if (tareaEditada.asignadosA.length === 1) {
      return getNombreUsuario(tareaEditada.asignadosA[0])
    }

    if (tareaEditada.asignadosA.length <= 2) {
      return tareaEditada.asignadosA.map((id) => getNombreUsuario(id)).join(", ")
    }

    return `${getNombreUsuario(tareaEditada.asignadosA[0])} +${tareaEditada.asignadosA.length - 1} más`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modo === "editar" ? "Editar Tarea" : "Detalles de la Tarea"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notas">
              <MessageSquare className="h-4 w-4 mr-2" />
              Notas ({tarea.notas?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="adjuntos">
              <Paperclip className="h-4 w-4 mr-2" />
              Adjuntos ({tarea.adjuntos?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="actividad">
              <Activity className="h-4 w-4 mr-2" />
              Actividad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={tareaEditada.titulo}
                  onChange={(e) => setTareaEditada({ ...tareaEditada, titulo: e.target.value })}
                  disabled={modo === "ver"}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={tareaEditada.estado}
                  onValueChange={(value) => setTareaEditada({ ...tareaEditada, estado: value as any })}
                  disabled={modo === "ver"}
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
                  value={tareaEditada.prioridad}
                  onValueChange={(value: PrioridadTarea) => setTareaEditada({ ...tareaEditada, prioridad: value })}
                  disabled={modo === "ver"}
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
                  value={tareaEditada.fechaVencimiento?.toISOString().split("T")[0] || ""}
                  onChange={(e) =>
                    setTareaEditada({
                      ...tareaEditada,
                      fechaVencimiento: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }
                  disabled={modo === "ver"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={tareaEditada.descripcion}
                onChange={(e) => setTareaEditada({ ...tareaEditada, descripcion: e.target.value })}
                rows={4}
                disabled={modo === "ver"}
              />
            </div>

            <div className="space-y-2">
              <Label>Usuarios Asignados</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {tareaEditada.asignadosA && tareaEditada.asignadosA.length > 1 ? (
                    <Users className="h-4 w-4 text-gray-600" />
                  ) : (
                    <User className="h-4 w-4 text-gray-600" />
                  )}
                  <span className="text-sm font-medium">{getNombresAsignados()}</span>
                </div>
                {tareaEditada.asignadosA && tareaEditada.asignadosA.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tareaEditada.asignadosA.map((userId) => {
                      const user = usuarios.find((u) => u.id === userId)
                      return (
                        <Badge key={userId} variant="secondary" className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-700">
                              {user?.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase() || "U"}
                            </span>
                          </div>
                          <span>{user?.name || "Usuario desconocido"}</span>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex flex-wrap gap-2">
                {tareaEditada.etiquetas.map((etiqueta, index) => (
                  <Badge key={index} variant="secondary">
                    {etiqueta}
                  </Badge>
                ))}
                {tareaEditada.etiquetas.length === 0 && <span className="text-sm text-gray-500">Sin etiquetas</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Creada: {tarea.fechaCreacion.toLocaleDateString("es-ES")}</span>
              </div>
              {tarea.fechaCompletada && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Completada: {tarea.fechaCompletada.toLocaleDateString("es-ES")}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Creada por: {getNombreUsuario(tarea.creadoPor)}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notas">
            <div className="space-y-4">
              <TaskNotes
                notas={tareaEditada.notas}
                taskId={tareaEditada.id}
                onAddNote={onAddNote}
                onDeleteNote={onDeleteNote}
                getNombreUsuario={getNombreUsuario}
                usuarios={usuarios}
              />
            </div>
          </TabsContent>

          <TabsContent value="adjuntos">
            <div className="space-y-4">
              {tarea.adjuntos && tarea.adjuntos.length > 0 ? (
                <div className="space-y-3">
                  {tarea.adjuntos.map((adjunto) => (
                    <div key={adjunto.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <Paperclip className="h-4 w-4 mt-1 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{adjunto.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {adjunto.tipo} • {(adjunto.tamaño / 1024).toFixed(1)} KB
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Subido por {adjunto.subidoPor} el {adjunto.fechaSubida.toLocaleDateString("es-ES")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No hay adjuntos</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="actividad">
            <div className="space-y-4">
              {tarea.actividad && tarea.actividad.length > 0 ? (
                <div className="space-y-3">
                  {tarea.actividad.map((actividad) => (
                    <div key={actividad.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <Activity className="h-4 w-4 mt-1 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{getNombreUsuario(actividad.usuario)}</span>{" "}
                          {actividad.descripcion}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {actividad.fecha.toLocaleDateString("es-ES")} a las{" "}
                          {actividad.fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No hay actividad registrada</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {modo === "editar" ? "Cancelar" : "Cerrar"}
          </Button>
          {modo === "editar" && <Button onClick={handleSave}>Guardar Cambios</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
