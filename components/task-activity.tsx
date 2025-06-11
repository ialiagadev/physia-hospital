"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, User, Edit, CheckCircle2, MessageCircle, Paperclip, Tag, Calendar } from "lucide-react"

export type ActividadTarea = {
  id: number
  tipo: "creacion" | "edicion" | "estado" | "asignacion" | "comentario" | "adjunto" | "etiqueta" | "fecha"
  descripcion: string
  usuario: string
  fecha: Date
  detalles?: any
}

interface TaskActivityProps {
  actividades: ActividadTarea[]
}

export function TaskActivity({ actividades }: TaskActivityProps) {
  const getActivityIcon = (tipo: ActividadTarea["tipo"]) => {
    switch (tipo) {
      case "creacion":
        return Clock
      case "edicion":
        return Edit
      case "estado":
        return CheckCircle2
      case "asignacion":
        return User
      case "comentario":
        return MessageCircle
      case "adjunto":
        return Paperclip
      case "etiqueta":
        return Tag
      case "fecha":
        return Calendar
      default:
        return Clock
    }
  }

  const getActivityColor = (tipo: ActividadTarea["tipo"]) => {
    switch (tipo) {
      case "creacion":
        return "text-green-600"
      case "edicion":
        return "text-blue-600"
      case "estado":
        return "text-purple-600"
      case "asignacion":
        return "text-orange-600"
      case "comentario":
        return "text-gray-600"
      case "adjunto":
        return "text-indigo-600"
      case "etiqueta":
        return "text-pink-600"
      case "fecha":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <h4 className="font-medium">Actividad</h4>
        <Badge variant="secondary">{actividades.length}</Badge>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {actividades.map((actividad) => {
          const IconoActividad = getActivityIcon(actividad.tipo)
          const colorIcono = getActivityColor(actividad.tipo)

          return (
            <Card key={actividad.id} className="p-3">
              <CardContent className="p-0">
                <div className="flex gap-3">
                  <div className={`mt-1 ${colorIcono}`}>
                    <IconoActividad className="h-4 w-4" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {actividad.usuario
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{actividad.usuario}</span>
                      </div>

                      <span className="text-xs text-gray-500">
                        {actividad.fecha.toLocaleDateString("es-ES")}{" "}
                        {actividad.fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mt-1">{actividad.descripcion}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {actividades.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">No hay actividad registrada</div>
        )}
      </div>
    </div>
  )
}
