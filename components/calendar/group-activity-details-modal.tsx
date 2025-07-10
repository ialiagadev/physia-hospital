"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Users,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle,
  UserPlus,
  Edit,
  Trash2,
  MapPin,
  Briefcase,
  FileText,
  AlertTriangle,
  Info,
} from "lucide-react"
import type { Cita } from "@/types/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface GroupActivityDetailsModalProps {
  cita: Cita
  onClose: () => void
  onUpdate: (cita: Cita) => void
  onDelete: (citaId: number) => void
}

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "confirmada":
      return "bg-green-100 text-green-800 border-green-300"
    case "pendiente":
      return "bg-yellow-100 text-yellow-800 border-yellow-300"
    case "cancelada":
      return "bg-red-100 text-red-800 border-red-300"
    default:
      return "bg-gray-100 text-gray-800 border-gray-300"
  }
}

const getEstadoLabel = (estado: string) => {
  switch (estado) {
    case "confirmada":
      return "Confirmada"
    case "pendiente":
      return "Pendiente"
    case "cancelada":
      return "Cancelada"
    default:
      return "Desconocido"
  }
}

export function GroupActivityDetailsModal({ cita, onClose, onUpdate, onDelete }: GroupActivityDetailsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const fechaCita = cita.fecha instanceof Date ? cita.fecha : new Date(cita.fecha)
  const participantes = cita.participants || []
  const participantesExistentes = participantes.filter((p) => p.isExisting)
  const participantesNuevos = participantes.filter((p) => !p.isExisting)

  const handleDelete = () => {
    onDelete(Number(cita.id))
        onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-full max-w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Detalles de Actividad Grupal
            <Badge className={`ml-2 ${getEstadoColor(cita.estado)}`}>{getEstadoLabel(cita.estado)}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4">
          {/* Información básica */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Fecha:</span>
                  <span>{format(fechaCita, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Horario:</span>
                  <span>
                    {cita.hora} - {cita.horaFin || cita.horaInicio} ({cita.duracion} min)
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Participantes:</span>
                  <span>
                    {participantes.length}
                    {cita.maxParticipants && ` / ${cita.maxParticipants} max`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Profesional:</span>
                  <span>Dr. Profesional</span>
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas de participantes */}
          <div className="grid grid-cols-3 gap-4 flex-shrink-0">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{participantesExistentes.length}</div>
              <div className="text-sm text-green-600">Clientes existentes</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{participantesNuevos.length}</div>
              <div className="text-sm text-blue-600">Clientes nuevos</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-700">{participantes.length}</div>
              <div className="text-sm text-purple-600">Total participantes</div>
            </div>
          </div>

          {/* Lista de participantes */}
          <div className="space-y-2 flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lista de Participantes
              </h3>
              {cita.maxParticipants && participantes.length >= cita.maxParticipants && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  Aforo completo
                </Badge>
              )}
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <div className="space-y-2 p-4">
                {participantes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay participantes registrados</p>
                  </div>
                ) : (
                  participantes.map((participante, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {participante.isExisting ? (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <UserPlus className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{participante.name}</div>
                          {participante.phone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {participante.phone}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            {participante.isExisting ? "Cliente existente" : "Cliente nuevo"}
                            {participante.id && ` • ID: ${participante.id}`}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={participante.isExisting ? "default" : "secondary"}
                        className={
                          participante.isExisting ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        }
                      >
                        {participante.isExisting ? "Existente" : "Nuevo"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Información adicional */}
          <div className="space-y-3 flex-shrink-0">
            <Separator />

            {/* Servicio y consulta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cita.service_id && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">Servicio:</span>
                  <span>Servicio ID: {cita.service_id}</span>
                </div>
              )}
              {cita.consultationId && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <span className="font-medium">Consulta:</span>
                  <span>Consulta ID: {cita.consultationId}</span>
                </div>
              )}
            </div>

            {/* Notas */}
            {cita.notas && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-gray-600" />
                  Notas adicionales:
                </div>
                <div className="bg-gray-50 border rounded-md p-3 text-sm">{cita.notas}</div>
              </div>
            )}

            {/* Información del sistema */}
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Información del sistema:</strong>
                  </p>
                  <p>• ID de cita: {cita.id}</p>
                  <p>• Tipo: Actividad grupal</p>
                  <p>• Creada: {format(fechaCita, "dd/MM/yyyy 'a las' HH:mm")}</p>
                  {cita.clienteId && <p>• Cliente principal ID: {cita.clienteId}</p>}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between items-center px-6 py-4 border-t flex-shrink-0">
          <div className="text-sm text-gray-600">
            Actividad grupal • {participantes.length} participante{participantes.length !== 1 ? "s" : ""}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // TODO: Implementar edición
                console.log("Editar actividad grupal:", cita)
              }}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>

        {/* Confirmación de eliminación */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold">Confirmar eliminación</h3>
              </div>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro de que quieres eliminar esta actividad grupal? Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
