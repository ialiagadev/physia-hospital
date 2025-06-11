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
import { Calendar, User, MessageSquare, Paperclip, Activity } from "lucide-react"
import type { Tarea, PrioridadTarea, Profesional } from "@/types/tasks"

interface TaskEditModalProps {
  tarea: Tarea | null
  isOpen: boolean
  onClose: () => void
  onSave: (tarea: Tarea) => void
  profesionales: Profesional[]
  modo: "editar" | "ver"
}

export function TaskEditModal({ tarea, isOpen, onClose, onSave, profesionales, modo }: TaskEditModalProps) {
  const [tareaEditada, setTareaEditada] = useState<Tarea | null>(null)

  useEffect(() => {
    if (tarea) {
      setTareaEditada({ ...tarea })
    }
  }, [tarea])

  if (!tarea || !tareaEditada) return null

  const handleSave = () => {
    if (tareaEditada) {
      onSave(tareaEditada)
    }
  }

  const getNombreProfesional = (id?: number) => {
    if (!id) return "Sin asignar"
    const profesional = profesionales.find((p) => p.id === id)
    return profesional ? profesional.nombre : "Desconocido"
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
            <TabsTrigger value="comentarios">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comentarios ({tarea.comentarios?.length || 0})
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
                <Label>Asignado a</Label>
                <Select
                  value={tareaEditada.asignadoA?.toString() || "0"}
                  onValueChange={(value) =>
                    setTareaEditada({ ...tareaEditada, asignadoA: value === "0" ? undefined : Number(value) })
                  }
                  disabled={modo === "ver"}
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
              <Label>Etiquetas</Label>
              <div className="flex flex-wrap gap-2">
                {tareaEditada.etiquetas.map((etiqueta, index) => (
                  <Badge key={index} variant="secondary">
                    {etiqueta}
                  </Badge>
                ))}
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
                <span>Creada por: {tarea.creadoPor}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comentarios">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Los comentarios aparecerán aquí</p>
            </div>
          </TabsContent>

          <TabsContent value="adjuntos">
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Los adjuntos aparecerán aquí</p>
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
                          <span className="font-medium">{actividad.usuario}</span> {actividad.descripcion}
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
