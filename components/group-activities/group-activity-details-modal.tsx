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
import type { GroupActivity } from "@/app/contexts/group-activities-context"
import { GroupActivityBillingButton } from "../group-activity-billing-button"

interface GroupActivityDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  activity: GroupActivity
  onUpdate: (id: string, updates: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddParticipant?: (activityId: string, clientId: number, notes?: string) => Promise<void>
  onRemoveParticipant?: (participantId: string) => Promise<void>
  organizationId: number
  users: any[]
  services?: any[]
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
  services = [],
}: GroupActivityDetailsModalProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [participantToRemove, setParticipantToRemove] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ✅ ESTADO SIMPLIFICADO - Solo para UI local
  const [currentActivity, setCurrentActivity] = useState<GroupActivity>(activity)

  // ✅ EFECTO SIMPLIFICADO - Solo actualiza cuando cambia la actividad externa
  useEffect(() => {
    if (activity && activity.id) {
      setCurrentActivity(activity)
    }
  }, [activity])

  // ✅ FUNCIÓN DE CIERRE MEJORADA - Sin timeouts problemáticos
  const handleClose = () => {
    // Resetear todos los estados inmediatamente
    setShowEditModal(false)
    setShowAddParticipantModal(false)
    setShowDeleteConfirm(false)
    setParticipantToRemove(null)
    setLoading(false)
    setDeleting(false)
    // Cerrar modal principal
    onClose()
  }

  const handleUpdateActivity = async (formData: any) => {
    try {
      setLoading(true)
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
      // ✅ YA NO NECESITA TOAST - EL CONTEXTO LO MANEJA

      // ✅ CERRAR MODALES INMEDIATAMENTE
      setShowEditModal(false)
      handleClose()
    } catch (error) {
      console.error("Error updating activity:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // ✅ FUNCIÓN DE ELIMINACIÓN OPTIMIZADA
  const handleDelete = async () => {
    if (!currentActivity?.id) {
      toast.error("No se puede eliminar: ID de actividad no válido")
      return
    }

    try {
      setDeleting(true)
      // ✅ LLAMAR A LA FUNCIÓN DE ELIMINACIÓN (ya optimizada en el contexto)
      await onDelete(currentActivity.id)
      // ✅ YA NO NECESITA TOAST - EL CONTEXTO LO MANEJA

      // ✅ CERRAR MODALES INMEDIATAMENTE
      setShowDeleteConfirm(false)
      handleClose()
    } catch (error) {
      console.error("Error deleting activity:", error)
    } finally {
      setDeleting(false)
    }
  }

  const handleAddParticipant = async (clientId: number, notes?: string) => {
    if (!onAddParticipant) return

    try {
      setLoading(true)
      await onAddParticipant(currentActivity.id, clientId, notes)
      // ✅ YA NO NECESITA TOAST - EL CONTEXTO LO MANEJA
      setShowAddParticipantModal(false)
      handleClose()
    } catch (error) {
      console.error("Error adding participant:", error)
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
      // ✅ YA NO NECESITA TOAST - EL CONTEXTO LO MANEJA
      setParticipantToRemove(null)
      handleClose()
    } catch (error) {
      console.error("Error removing participant:", error)
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

  // ✅ VALIDACIÓN MEJORADA PARA EVITAR ERRORES
  if (!currentActivity || !currentActivity.id) {
    return null
  }

  return (
    <>
      {/* ✅ MODAL PRINCIPAL - TAMAÑO AUMENTADO */}
      <Dialog
        open={isOpen && !showEditModal && !showAddParticipantModal && !showDeleteConfirm}
        onOpenChange={handleClose}
      >
<DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
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

              {currentActivity.service_id && (
                <div>
                  <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: services.find((s) => s.id === currentActivity.service_id)?.color || "#3B82F6",
                      }}
                    />
                    Servicio
                  </h4>
                  <p className="text-sm">
                    {services.find((s) => s.id === currentActivity.service_id)?.name || "Servicio no encontrado"}
                  </p>
                  {services.find((s) => s.id === currentActivity.service_id)?.duration && (
                    <p className="text-xs text-gray-500">
                      Duración: {services.find((s) => s.id === currentActivity.service_id).duration} minutos
                    </p>
                  )}
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
                  <MapPin className="h-4 w-4" />
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddParticipantModal(true)}
                    disabled={loading || deleting}
                  >
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
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
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

                        {/* Confirmación de eliminación de participante */}
                        {onRemoveParticipant &&
                          (participantToRemove === participant.id ? (
                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded border border-red-200">
                              <AlertTriangle className="h-3 w-3 text-red-600" />
                              <span className="text-xs text-red-700 font-medium">¿Eliminar?</span>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveParticipant(participant.id)}
                                disabled={loading || deleting}
                                className="h-6 px-2 text-xs"
                              >
                                Sí
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setParticipantToRemove(null)}
                                disabled={loading || deleting}
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
                              disabled={loading || deleting}
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
                    <Button
                      size="sm"
                      onClick={() => setShowAddParticipantModal(true)}
                      className="mt-2"
                      disabled={loading || deleting}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Añadir Primer Participante
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <GroupActivityBillingButton
              activity={currentActivity}
              organizationId={organizationId}
              services={services}
              onBillingComplete={() => {
                // Opcional: actualizar datos si es necesario
                console.log("Facturación completada para la actividad")
              }}
            />
            <Button variant="outline" onClick={handleClose} disabled={loading || deleting}>
              Cerrar
            </Button>
            <Button variant="outline" onClick={() => setShowEditModal(true)} disabled={loading || deleting}>
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} disabled={loading || deleting}>
              <Trash2 className="h-4 w-4 mr-1" />
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ MODAL DE EDICIÓN */}
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

      {/* ✅ MODAL DE AÑADIR PARTICIPANTE */}
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

      {/* ✅ CONFIRMACIÓN DE ELIMINACIÓN DE ACTIVIDAD */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad grupal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la actividad "{currentActivity.name}" y todos sus participantes
              registrados.
              <br />
              <br />
              <strong>Esta acción no se puede deshacer.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Actividad
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
