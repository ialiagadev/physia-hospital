"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, Users, MapPin, Edit, Trash2, UserPlus, Phone, Mail, X, AlertTriangle } from "lucide-react"
import { GroupActivityFormModal } from "./group-activity-form-modal"
import { AddParticipantModal } from "./add-participant-modal"
import { toast } from "sonner"
import type { GroupActivity, GroupActivityUpdate } from "@/hooks/use-group-activities"

interface GroupActivityDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  activity: GroupActivity
  onUpdate: (id: string, updates: GroupActivityUpdate) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddParticipant?: (activityId: string, clientId: number, notes?: string) => Promise<void>
  onRemoveParticipant?: (participantId: string) => Promise<void>
  organizationId: number
  users: any[]
}

export function GroupActivityDetailsModal({
  isOpen,
  onClose,
  activity,
  onUpdate,
  onDelete,
  onAddParticipant,
  onRemoveParticipant,
  organizationId,
  users,
}: GroupActivityDetailsModalProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [participantToRemove, setParticipantToRemove] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ✅ SIMPLIFICADO - Solo estado local mínimo
  const [currentActivity, setCurrentActivity] = useState<GroupActivity>(activity)

  // Actualizar cuando cambie la actividad externa
  useEffect(() => {
    setCurrentActivity(activity)
  }, [activity])

  const handleUpdateActivity = async (formData: any) => {
    try {
      const updates = {
        name: formData.name,
        description: formData.description,
        date: format(formData.date, "yyyy-MM-dd"),
        start_time: formData.start_time,
        end_time: formData.end_time,
        professional_id: formData.professional_id,
        consultation_id: formData.consultation_id || undefined,
        max_participants: formData.max_participants,
        color: formData.color,
      }

      await onUpdate(currentActivity.id, updates)
      setShowEditModal(false)
      toast.success("Actividad actualizada")

      // ✅ CERRAR MODAL AUTOMÁTICAMENTE DESPUÉS DE EDITAR
      onClose()
    } catch (error) {
      toast.error("Error al actualizar")
      throw error
    }
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      await onDelete(currentActivity.id)
      toast.success("Actividad eliminada")
      onClose()
    } catch (error) {
      toast.error("Error al eliminar")
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleAddParticipant = async (clientId: number, notes?: string) => {
    if (!onAddParticipant) return
    try {
      setLoading(true)
      await onAddParticipant(currentActivity.id, clientId, notes)
      setShowAddParticipantModal(false)
      toast.success("Participante añadido")

      // ✅ CERRAR MODAL AUTOMÁTICAMENTE
      onClose()
    } catch (error) {
      toast.error("Error al añadir participante")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    if (!onRemoveParticipant) return
    try {
      setLoading(true)
      await onRemoveParticipant(participantId)
      setParticipantToRemove(null)
      toast.success("Participante eliminado")

      // ✅ CERRAR MODAL AUTOMÁTICAMENTE
      onClose()
    } catch (error) {
      toast.error("Error al eliminar participante")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: "Activa", variant: "default" as const },
      completed: { label: "Completada", variant: "secondary" as const },
      cancelled: { label: "Cancelada", variant: "destructive" as const },
    }
    const statusConfig = config[status as keyof typeof config] || config.active
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
  }

  const participationPercentage = (currentActivity.current_participants / currentActivity.max_participants) * 100
  const canAddMoreParticipants = currentActivity.current_participants < currentActivity.max_participants
  const currentParticipantIds = currentActivity.participants?.map((p) => p.client_id) || []

  return (
    <>
      <Dialog open={isOpen && !showEditModal && !showAddParticipantModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl">{currentActivity.name}</DialogTitle>
                <DialogDescription>Detalles de la actividad grupal</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(currentActivity.status)}
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: currentActivity.color }}
                />
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Información básica */}
            <div className="space-y-3">
              {currentActivity.description && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Descripción</h4>
                  <p className="text-sm text-gray-600">{currentActivity.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Fecha
                  </h4>
                  <p className="text-sm">{format(new Date(currentActivity.date), "dd/MM/yyyy", { locale: es })}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Horario
                  </h4>
                  <p className="text-sm">
                    {currentActivity.start_time} - {currentActivity.end_time}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Profesional
                </h4>
                <p className="text-sm">{currentActivity.professional?.name || "Sin asignar"}</p>
                {currentActivity.consultation && (
                  <p className="text-xs text-gray-500">Consulta: {currentActivity.consultation.name}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Participantes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Participantes ({currentActivity.current_participants}/{currentActivity.max_participants})
                </h4>
                {onAddParticipant && canAddMoreParticipants && (
                  <Button size="sm" variant="outline" onClick={() => setShowAddParticipantModal(true)}>
                    <UserPlus className="h-3 w-3 mr-1" />
                    Añadir
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Ocupación</span>
                  <Badge variant={participationPercentage >= 90 ? "destructive" : "default"}>
                    {participationPercentage.toFixed(0)}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(participationPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Lista de participantes */}
              {currentActivity.participants && currentActivity.participants.length > 0 ? (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  {currentActivity.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{participant.client?.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {participant.client?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {participant.client.phone}
                            </span>
                          )}
                          {participant.client?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {participant.client.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            participant.status === "attended"
                              ? "default"
                              : participant.status === "no_show"
                                ? "destructive"
                                : participant.status === "cancelled"
                                  ? "secondary"
                                  : "outline"
                          }
                          className="text-xs"
                        >
                          {participant.status === "registered" && "Registrado"}
                          {participant.status === "attended" && "Asistió"}
                          {participant.status === "no_show" && "No asistió"}
                          {participant.status === "cancelled" && "Cancelado"}
                        </Badge>

                        {/* ✅ CONFIRMACIÓN MEJORADA - Igual que ParticipantsModal */}
                        {onRemoveParticipant &&
                          (participantToRemove === participant.id ? (
                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded border border-red-200">
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                              <span className="text-xs text-red-700 font-medium">¿Eliminar?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveParticipant(participant.id)}
                                disabled={loading}
                                className="h-6 px-2 text-xs"
                              >
                                Sí
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setParticipantToRemove(null)}
                                disabled={loading}
                                className="h-6 px-2 text-xs"
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setParticipantToRemove(participant.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No hay participantes registrados</p>
                  {onAddParticipant && canAddMoreParticipants && (
                    <Button size="sm" onClick={() => setShowAddParticipantModal(true)} className="mt-2">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Añadir Primer Participante
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="outline" onClick={() => setShowEditModal(true)}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={loading}>
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modales secundarios */}
      {showEditModal && (
        <GroupActivityFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateActivity}
          organizationId={organizationId}
          activity={currentActivity}
          users={users}
        />
      )}

      {showAddParticipantModal && onAddParticipant && (
        <AddParticipantModal
          isOpen={showAddParticipantModal}
          onClose={() => setShowAddParticipantModal(false)}
          onAddParticipant={handleAddParticipant}
          organizationId={organizationId}
          currentParticipants={currentParticipantIds}
          maxParticipants={currentActivity.max_participants}
          activityName={currentActivity.name}
        />
      )}

      {/* Confirmación de eliminación de actividad */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente "{currentActivity.name}" y todos sus participantes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
