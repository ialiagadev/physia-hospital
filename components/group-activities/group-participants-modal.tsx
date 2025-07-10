"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Users,
  UserPlus,
  UserMinus,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Phone,
  Mail,
  Loader2,
} from "lucide-react"
import { useGroupActivity } from "@/hooks/use-group-activities"
import { useClients } from "@/hooks/use-clients"
import { useAuth } from "@/app/contexts/auth-context"
import type { GroupAppointmentWithDetails } from "@/types/group-activities"
import { toast } from "sonner"

interface GroupParticipantsModalProps {
  appointment: GroupAppointmentWithDetails
  isOpen: boolean
  onClose: () => void
  onUpdate?: () => void
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "confirmed":
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-600" />
    case "waiting_list":
      return <AlertCircle className="h-4 w-4 text-orange-600" />
    case "cancelled":
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return null
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "confirmed":
      return "Confirmado"
    case "pending":
      return "Pendiente"
    case "waiting_list":
      return "Lista de espera"
    case "cancelled":
      return "Cancelado"
    default:
      return status
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800"
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "waiting_list":
      return "bg-orange-100 text-orange-800"
    case "cancelled":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function GroupParticipantsModal({ appointment, isOpen, onClose, onUpdate }: GroupParticipantsModalProps) {
  const { userProfile } = useAuth()
  const organizationId = userProfile?.organization_id ? Number(userProfile.organization_id) : undefined

  const { clients } = useClients(organizationId)
  const { participants, stats, loading, addParticipant, updateParticipant, removeParticipant } = useGroupActivity(
    appointment.id,
  )

  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Filtrar clientes disponibles (que no estén ya inscritos)
  const enrolledClientIds = new Set([
    appointment.client_id, // Participante principal
    ...participants.map((p) => p.client_id),
  ])

  const availableClients = clients.filter(
    (client) =>
      !enrolledClientIds.has(client.id) &&
      (searchTerm === "" ||
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handleAddParticipant = async () => {
    if (!selectedClientId) {
      toast.error("Selecciona un cliente")
      return
    }

    try {
      setAddingParticipant(true)
      await addParticipant({
        appointment_id: appointment.id,
        client_id: Number.parseInt(selectedClientId),
        enrollment_status: stats?.is_full ? "waiting_list" : "confirmed",
      })

      setSelectedClientId("")
      setSearchTerm("")
      onUpdate?.()

      if (stats?.is_full) {
        toast.info("Participante añadido a la lista de espera")
      }
    } catch (error) {
      // El error ya se muestra en el hook
    } finally {
      setAddingParticipant(false)
    }
  }

  const handleUpdateParticipant = async (participantId: string, newStatus: string) => {
    try {
      await updateParticipant(participantId, {
        enrollment_status: newStatus as any,
      })
      onUpdate?.()
    } catch (error) {
      // El error ya se muestra en el hook
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      await removeParticipant(participantId)
      onUpdate?.()
    } catch (error) {
      // El error ya se muestra en el hook
    }
  }

  if (!appointment.is_group_activity) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participantes - {appointment.client?.name || "Actividad Grupal"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Estadísticas */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.confirmed_participants}</div>
                <div className="text-sm text-blue-600">Confirmados</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending_participants}</div>
                <div className="text-sm text-yellow-600">Pendientes</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.waiting_list_participants}</div>
                <div className="text-sm text-orange-600">Lista espera</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.available_spots}</div>
                <div className="text-sm text-green-600">Disponibles</div>
              </div>
            </div>
          )}

          {/* Alerta si está completo */}
          {stats?.is_full && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                La actividad está completa. Los nuevos participantes se añadirán a la lista de espera.
              </AlertDescription>
            </Alert>
          )}

          {/* Añadir participante */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <Label className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Añadir participante
            </Label>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Buscar cliente por nombre, teléfono o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{client.name}</span>
                          <span className="text-sm text-gray-500">
                            {client.phone && `📞 ${client.phone}`}
                            {client.phone && client.email && " • "}
                            {client.email && `✉️ ${client.email}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleAddParticipant}
                disabled={!selectedClientId || addingParticipant}
                className="shrink-0"
              >
                {addingParticipant && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Añadir
              </Button>
            </div>
          </div>

          <Separator />

          {/* Lista de participantes */}
          <div className="flex-1 overflow-hidden">
            <h3 className="font-medium mb-3">Participantes ({stats?.total_participants || 0})</h3>

            <ScrollArea className="h-full">
              <div className="space-y-3">
                {/* Participante principal */}
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{appointment.client?.name}</span>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {appointment.client?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {appointment.client.phone}
                          </span>
                        )}
                        {appointment.client?.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {appointment.client.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Organizador
                  </Badge>
                </div>

                {/* Participantes adicionales */}
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No hay participantes adicionales</div>
                ) : (
                  participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(participant.enrollment_status)}
                        <div className="flex flex-col">
                          <span className="font-medium">{participant.client?.name}</span>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
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

                      <div className="flex items-center gap-2">
                        <Select
                          value={participant.enrollment_status}
                          onValueChange={(value) => handleUpdateParticipant(participant.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Confirmado</SelectItem>
                            <SelectItem value="pending">Pendiente</SelectItem>
                            <SelectItem value="waiting_list">Lista espera</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
