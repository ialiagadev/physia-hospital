"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Users, UserPlus, Trash2, User, Phone, Mail, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { AddParticipantModal } from "./add-participant-modal"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import type { GroupActivity } from "@/app/contexts/group-activities-context"

interface Participant {
  id: string
  client_id: number
  status: "registered" | "attended" | "no_show" | "cancelled"
  notes?: string | null
  registration_date: string
  client: {
    id: number
    name: string
    phone?: string | null
    email?: string | null
  }
}

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
  activity,
  onAddParticipant,
  onRemoveParticipant,
  onUpdateParticipantStatus,
  organizationId,
}: ParticipantsModalProps) {
  const { user, userProfile } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null)

  // Cargar participantes
  const loadParticipants = async () => {
    if (!activity?.id || !user || !userProfile) return

    setLoading(true)
    try {
      console.log("Loading participants for activity:", activity.id)

      const { data, error } = await supabase
        .from("group_activity_participants")
        .select(`
          id,
          client_id,
          status,
          notes,
          registration_date,
          clients!inner (
            id,
            name,
            phone,
            email
          )
        `)
        .eq("group_activity_id", activity.id)
        .order("registration_date", { ascending: true })

      if (error) {
        console.error("Error loading participants:", error)
        return
      }

      console.log("Raw participants data:", data)

      // Transformar los datos para que coincidan con la interfaz Participant
      const transformedData: Participant[] = (data || []).map((item: any) => ({
        id: item.id,
        client_id: item.client_id,
        status: item.status,
        notes: item.notes,
        registration_date: item.registration_date,
        client: {
          id: item.clients.id,
          name: item.clients.name,
          phone: item.clients.phone,
          email: item.clients.email,
        },
      }))

      console.log("Transformed participants data:", transformedData)
      setParticipants(transformedData)
    } catch (error) {
      console.error("Error loading participants:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && activity?.id) {
      loadParticipants()
    }
  }, [isOpen, activity?.id, user, userProfile])

  const handleAddParticipant = async (clientId: number, notes?: string) => {
    try {
      await onAddParticipant(activity.id, clientId, notes)
      await loadParticipants() // Recargar participantes
      setShowAddModal(false)
    } catch (error) {
      console.error("Error adding participant:", error)
      throw error
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    setRemovingParticipant(participantId)
    try {
      await onRemoveParticipant(participantId)
      await loadParticipants() // Recargar participantes
    } catch (error) {
      console.error("Error removing participant:", error)
    } finally {
      setRemovingParticipant(null)
    }
  }

  const handleStatusChange = async (
    participantId: string,
    status: "registered" | "attended" | "no_show" | "cancelled",
  ) => {
    setUpdatingStatus(participantId)
    try {
      await onUpdateParticipantStatus(participantId, status)
      await loadParticipants() // Recargar participantes
    } catch (error) {
      console.error("Error updating participant status:", error)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      registered: { label: "Registrado", variant: "default" as const, color: "bg-blue-100 text-blue-800" },
      attended: { label: "Asistió", variant: "default" as const, color: "bg-green-100 text-green-800" },
      no_show: { label: "No asistió", variant: "destructive" as const, color: "bg-red-100 text-red-800" },
      cancelled: { label: "Cancelado", variant: "secondary" as const, color: "bg-gray-100 text-gray-800" },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.registered
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getStatistics = () => {
    const stats = {
      registered: participants.filter((p) => p.status === "registered").length,
      attended: participants.filter((p) => p.status === "attended").length,
      no_show: participants.filter((p) => p.status === "no_show").length,
      cancelled: participants.filter((p) => p.status === "cancelled").length,
    }
    return stats
  }

  const stats = getStatistics()
  const currentParticipantIds = participants.map((p) => p.client_id)

  if (!user || !userProfile) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participantes - {activity.name}
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Gestiona los participantes de esta actividad grupal ({participants.length}/{activity.max_participants})
            </p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header con botón añadir */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Lista de Participantes</h3>
              <Button
                onClick={() => setShowAddModal(true)}
                disabled={participants.length >= activity.max_participants}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Añadir Participante
              </Button>
            </div>

            {/* Lista de participantes */}
            <div className="space-y-4">
              <h4 className="font-medium">Participantes Actuales ({participants.length})</h4>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No hay participantes registrados</p>
                  <p className="text-sm">Añade el primer participante para comenzar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <Card key={participant.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{participant.client.name}</div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {participant.client.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {participant.client.phone}
                                </div>
                              )}
                              {participant.client.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {participant.client.email}
                                </div>
                              )}
                            </div>
                            {participant.notes && (
                              <div className="text-sm text-gray-600 mt-1">
                                <strong>Notas:</strong> {participant.notes}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              Registrado:{" "}
                              {format(new Date(participant.registration_date), "dd/MM/yyyy HH:mm", { locale: es })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Selector de estado */}
                          <Select
                            value={participant.status}
                            onValueChange={(value: "registered" | "attended" | "no_show" | "cancelled") =>
                              handleStatusChange(participant.id, value)
                            }
                            disabled={updatingStatus === participant.id}
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

                          {/* Botón eliminar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveParticipant(participant.id)}
                            disabled={removingParticipant === participant.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {removingParticipant === participant.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Estadísticas */}
            <div className="space-y-4">
              <h4 className="font-medium">Estadísticas</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.registered}</div>
                  <div className="text-sm text-gray-600">Registrados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.attended}</div>
                  <div className="text-sm text-gray-600">Asistieron</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.no_show}</div>
                  <div className="text-sm text-gray-600">No asistieron</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.cancelled}</div>
                  <div className="text-sm text-gray-600">Cancelados</div>
                </div>
              </div>
            </div>

            {/* Información de la actividad */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(activity.date), "dd/MM/yyyy", { locale: es })}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {activity.start_time} - {activity.end_time}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Capacidad: {activity.max_participants} participantes
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para añadir participante */}
      {showAddModal && (
        <AddParticipantModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddParticipant={handleAddParticipant}
          organizationId={organizationId}
          currentParticipants={currentParticipantIds}
          maxParticipants={activity.max_participants}
          activityName={activity.name}
        />
      )}
    </>
  )
}
