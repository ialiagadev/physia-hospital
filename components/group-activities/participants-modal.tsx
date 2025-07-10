"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Plus, Trash2, Phone, Mail, AlertTriangle } from "lucide-react"
import { AddParticipantModal } from "./add-participant-modal"
import type { GroupActivity } from "@/hooks/use-group-activities"

interface ParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  activity: GroupActivity
  onAddParticipant: (activityId: string, clientId: number, notes?: string) => Promise<void>
  onRemoveParticipant: (participantId: string) => Promise<void>
  onUpdateParticipantStatus: (
    participantId: string,
    status: "registered" | "attended" | "no_show" | "cancelled",
  ) => Promise<void>
  organizationId: number
}

export function ParticipantsModal({
  isOpen,
  onClose,
  activity: initialActivity,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipantStatus,
  organizationId,
}: ParticipantsModalProps) {
  // ✅ SIMPLIFICADO - Solo estado local mínimo
  const [currentActivity, setCurrentActivity] = useState<GroupActivity>(initialActivity)
  const [loading, setLoading] = useState(false)
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false)
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null)

  // Actualizar cuando cambie la actividad externa
  useEffect(() => {
    setCurrentActivity(initialActivity)
  }, [initialActivity])

  const handleAddParticipant = async (clientId: number, notes?: string) => {
    try {
      setLoading(true)
      await onAddParticipant(currentActivity.id, clientId, notes)
      setShowAddParticipantModal(false)
      // ✅ NO actualizar estado local - se actualiza desde el padre
    } catch (error) {
      console.error("Error adding participant:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      setLoading(true)
      await onRemoveParticipant(participantId)
      setParticipantToDelete(null)
      // ✅ NO actualizar estado local - se actualiza desde el padre
    } catch (error) {
      console.error("Error removing participant:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (
    participantId: string,
    status: "registered" | "attended" | "no_show" | "cancelled",
  ) => {
    try {
      setLoading(true)
      await onUpdateParticipantStatus(participantId, status)
      // ✅ NO actualizar estado local - se actualiza desde el padre
    } catch (error) {
      console.error("Error updating participant status:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      registered: { label: "Registrado", variant: "outline" as const },
      attended: { label: "Asistió", variant: "default" as const },
      no_show: { label: "No asistió", variant: "destructive" as const },
      cancelled: { label: "Cancelado", variant: "secondary" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.registered
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const canAddMoreParticipants = currentActivity.current_participants < currentActivity.max_participants
  const currentParticipantIds = currentActivity.participants?.map((p) => p.client_id) || []

  return (
    <>
      <Dialog open={isOpen && !showAddParticipantModal} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participantes - {currentActivity.name}
            </DialogTitle>
            <DialogDescription>
              Gestiona los participantes de esta actividad grupal ({currentActivity.current_participants}/
              {currentActivity.max_participants})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Botón para añadir participante */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Lista de Participantes</h3>
              <Button
                onClick={() => setShowAddParticipantModal(true)}
                disabled={!canAddMoreParticipants || loading}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Añadir Participante
              </Button>
            </div>

            {!canAddMoreParticipants && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-orange-800 text-center">
                    La actividad ha alcanzado el máximo de participantes ({currentActivity.max_participants})
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Lista de participantes actuales */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Participantes Actuales ({currentActivity.participants?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!currentActivity.participants || currentActivity.participants.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No hay participantes registrados</p>
                ) : (
                  <div className="space-y-3">
                    {currentActivity.participants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium">{participant.client?.name}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
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
                          </div>
                          {participant.notes && <p className="text-xs text-gray-600 mt-1">{participant.notes}</p>}
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={participant.status}
                            onValueChange={(value) => handleUpdateStatus(participant.id, value as any)}
                            disabled={loading}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="registered">Registrado</SelectItem>
                              <SelectItem value="attended">Asistió</SelectItem>
                              <SelectItem value="no_show">No asistió</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>

                          {/* ✅ CONFIRMACIÓN MEJORADA - Más clara */}
                          {participantToDelete === participant.id ? (
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
                                onClick={() => setParticipantToDelete(null)}
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
                              onClick={() => setParticipantToDelete(participant.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estadísticas */}
            {currentActivity.participants && currentActivity.participants.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Estadísticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {currentActivity.participants.filter((p) => p.status === "registered").length}
                      </p>
                      <p className="text-xs text-gray-600">Registrados</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {currentActivity.participants.filter((p) => p.status === "attended").length}
                      </p>
                      <p className="text-xs text-gray-600">Asistieron</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {currentActivity.participants.filter((p) => p.status === "no_show").length}
                      </p>
                      <p className="text-xs text-gray-600">No asistieron</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600">
                        {currentActivity.participants.filter((p) => p.status === "cancelled").length}
                      </p>
                      <p className="text-xs text-gray-600">Cancelados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para añadir participante */}
      <AddParticipantModal
        isOpen={showAddParticipantModal}
        onClose={() => setShowAddParticipantModal(false)}
        onAddParticipant={handleAddParticipant}
        organizationId={organizationId}
        currentParticipants={currentParticipantIds}
        maxParticipants={currentActivity.max_participants}
        activityName={currentActivity.name}
      />
    </>
  )
}
