"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Clock, User, Phone, FileText, Edit2, Trash2, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PatientHistoryModal } from "./patient-history-modal"
import type { AppointmentWithDetails } from "@/types/calendar"
import { IndividualBillingButton } from "./individual-billing-button"

interface AppointmentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: AppointmentWithDetails
  onUpdate: (appointment: AppointmentWithDetails) => Promise<void>
  onDelete: (appointmentId: string) => Promise<void>
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  onUpdate,
  onDelete,
}: AppointmentDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Form states
  const [editedAppointment, setEditedAppointment] = useState<AppointmentWithDetails>(appointment)

  useEffect(() => {
    setEditedAppointment(appointment)
    setIsEditing(false)
  }, [appointment])

  // Funciones helper para manejar tiempos
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  const calculateEndTime = (startTime: string, duration: number): string => {
    const startMinutes = timeToMinutes(startTime)
    const endMinutes = startMinutes + duration
    return minutesToTime(endMinutes)
  }

  const calculateDuration = (startTime: string, endTime: string): number => {
    const startMinutes = timeToMinutes(startTime)
    const endMinutes = timeToMinutes(endTime)
    return Math.max(0, endMinutes - startMinutes)
  }

  // Handlers para sincronizar tiempos
  const handleStartTimeChange = (newStartTime: string) => {
    const newEndTime = calculateEndTime(newStartTime, editedAppointment.duration)
    setEditedAppointment({
      ...editedAppointment,
      start_time: newStartTime,
      end_time: newEndTime,
    })
  }

  const handleEndTimeChange = (newEndTime: string) => {
    const newDuration = calculateDuration(editedAppointment.start_time, newEndTime)
    setEditedAppointment({
      ...editedAppointment,
      end_time: newEndTime,
      duration: newDuration,
    })
  }

  const handleDurationChange = (newDuration: number) => {
    const newEndTime = calculateEndTime(editedAppointment.start_time, newDuration)
    setEditedAppointment({
      ...editedAppointment,
      duration: newDuration,
      end_time: newEndTime,
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate(editedAppointment)
      setIsEditing(false)
      console.log("Cita actualizada correctamente")
      onClose()
    } catch (error) {
      console.error("Error al actualizar la cita:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(appointment.id)
      setShowDeleteDialog(false)
      console.log("Cita eliminada correctamente")
    } catch (error) {
      console.error("Error al eliminar la cita:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setEditedAppointment(appointment)
    setIsEditing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "no_show":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmada"
      case "pending":
        return "Pendiente"
      case "cancelled":
        return "Cancelada"
      case "completed":
        return "Completada"
      case "no_show":
        return "No asistió"
      default:
        return status
    }
  }

  // Función para verificar si realmente hay una consulta seleccionada
  const hasValidConsultation = () => {
    return (
      appointment.consultation &&
      appointment.consultation_id &&
      appointment.consultation_id !== "none" &&
      appointment.consultation_id !== "" &&
      appointment.consultation_id !== null &&
      appointment.consultation_id !== undefined &&
      appointment.consultation.name && // Verificar que la consulta tenga nombre
      appointment.consultation.name.trim() !== "" // Y que no esté vacío
    )
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 py-8 px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        {/* Contenedor principal que se ajusta al contenido - CENTRADO VERTICALMENTE */}
        <div className="flex w-full max-w-7xl gap-2 max-h-[calc(100vh-4rem)] my-auto">
          {/* Modal de detalles de la cita - Lado izquierdo - SE AJUSTA AL CONTENIDO */}
          <div className="w-1/2 bg-white shadow-2xl rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-1.5 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Detalles de la Cita</h2>
                    <p className="text-sm text-gray-600">
                      {format(new Date(appointment.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <IndividualBillingButton
                        appointment={appointment}
                        onBillingComplete={() => {
                          // Opcional: actualizar datos si es necesario
                          console.log("Factura generada para la cita")
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsEditing(true)
                        }}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDeleteDialog(true)
                        }}
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onClose()
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content - SE AJUSTA AL CONTENIDO */}
            <div className="p-4">
              <div className="space-y-4">
                {/* SECCIÓN 1: PACIENTE - Información en una sola línea */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Paciente:</span>
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{appointment.client.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{appointment.client.phone || "Sin teléfono"}</span>
                  </div>
                </div>

                {/* SECCIÓN 2: HORARIO Y DURACIÓN - Todo en una línea */}
                <div className="flex items-center gap-6 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Horario:</span>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={format(new Date(editedAppointment.date), "yyyy-MM-dd")}
                          onChange={(e) =>
                            setEditedAppointment({
                              ...editedAppointment,
                              date: e.target.value,
                            })
                          }
                          className="h-8 text-sm w-36"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="time"
                          value={editedAppointment.start_time}
                          onChange={(e) => handleStartTimeChange(e.target.value)}
                          className="h-8 text-sm w-20"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-gray-500">-</span>
                        <Input
                          type="time"
                          value={editedAppointment.end_time}
                          onChange={(e) => handleEndTimeChange(e.target.value)}
                          className="h-8 text-sm w-20"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">Duración:</span>
                        <Input
                          type="number"
                          value={editedAppointment.duration}
                          onChange={(e) => handleDurationChange(Number.parseInt(e.target.value) || 30)}
                          className="h-8 text-sm w-16"
                          min="15"
                          step="15"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm text-gray-600">min</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 flex-1">
                      <span className="font-medium text-gray-900">
                        {appointment.start_time} - {appointment.end_time}
                      </span>
                      <span className="text-sm text-gray-600">({appointment.duration} minutos)</span>
                    </div>
                  )}
                </div>

                {/* SECCIÓN 3: ESTADO, TIPO Y CONSULTA - Todo en una línea */}
                <div className="flex items-center gap-6 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Estado:</span>
                    {isEditing ? (
                      <Select
                        value={editedAppointment.status}
                        onValueChange={(value) =>
                          setEditedAppointment({
                            ...editedAppointment,
                            status: value as any,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmada</SelectItem>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                          <SelectItem value="completed">Completada</SelectItem>
                          <SelectItem value="no_show">No asistió</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getStatusColor(appointment.status)}>{getStatusLabel(appointment.status)}</Badge>
                    )}
                  </div>

                  {/* MOTIVO DE CONSULTA - Solo mostrar si existe */}
                  {appointment.motivo_consulta && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Motivo:</span>
                      <span className="text-sm text-gray-900 max-w-48 truncate" title={appointment.motivo_consulta}>
                        {appointment.motivo_consulta}
                      </span>
                    </div>
                  )}

                  {/* DIAGNÓSTICO - Solo mostrar si existe */}
                  {appointment.diagnostico && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Diagnóstico:</span>
                      <span className="text-sm text-gray-900 max-w-48 truncate" title={appointment.diagnostico}>
                        {appointment.diagnostico}
                      </span>
                    </div>
                  )}

                  {/* CONSULTA - Solo mostrar si realmente hay una consulta válida seleccionada */}
                  {hasValidConsultation() && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Consulta:</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: appointment.consultation.color || "#3B82F6" }}
                        />
                        <span className="text-sm text-gray-900">{appointment.consultation.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECCIÓN 4: NOTAS - Solo si hay notas o está editando */}
                {(appointment.notes || isEditing) && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Notas:</span>
                        {isEditing ? (
                          <Textarea
                            value={editedAppointment.notes || ""}
                            onChange={(e) =>
                              setEditedAppointment({
                                ...editedAppointment,
                                notes: e.target.value,
                              })
                            }
                            placeholder="Agregar notas sobre la cita..."
                            className="mt-2 text-sm min-h-[80px] resize-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                            {appointment.notes || "Sin notas adicionales"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Solo aparece cuando está editando */}
            {isEditing && (
              <div className="border-t bg-gray-50 px-4 py-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancel()
                  }}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSave()
                  }}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            )}
          </div>

          {/* Modal de historial del paciente - Lado derecho - SE AJUSTA AL CONTENIDO */}
          <div
            className="w-1/2 bg-white shadow-2xl border-l border-gray-200 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <PatientHistoryModal client={appointment.client} isOpen={true} onClose={() => {}} isEmbedded={true} />
          </div>
        </div>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Eliminar Cita
            </DialogTitle>
            <DialogDescription className="text-left">
              ¿Estás seguro de que quieres eliminar esta cita?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{appointment.client.name}</p>
            <p className="text-sm text-gray-600">
              {format(new Date(appointment.date), "d 'de' MMMM 'de' yyyy", { locale: es })} a las{" "}
              {appointment.start_time}
            </p>
          </div>
          <p className="mt-3 text-sm text-red-600">Esta acción no se puede deshacer.</p>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Eliminando..." : "Eliminar Cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AppointmentDetailsModal
