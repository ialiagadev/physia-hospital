"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Building2, Edit } from "lucide-react"
import { useGroupActivities, type GroupActivity } from "@/hooks/use-group-activities"
import { GroupActivityFormModal } from "./group-activity-form-modal"
import { GroupActivityDetailsModal } from "./group-activity-details-modal"
import { ParticipantsModal } from "./participants-modal"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

interface GroupActivitiesViewProps {
  organizationId: number
  users: any[]
}

export function GroupActivitiesView({ organizationId, users }: GroupActivitiesViewProps) {
  const {
    activities,
    loading,
    error,
    createActivity,
    updateActivity,
    deleteActivity,
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
    refetch,
  } = useGroupActivities(organizationId, users)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<GroupActivity | null>(null)

  const handleCreateActivity = async (activityData: any) => {
    try {
      await createActivity({
        organization_id: organizationId,
        name: activityData.name,
        description: activityData.description,
        date: format(activityData.date, "yyyy-MM-dd"),
        start_time: activityData.start_time,
        end_time: activityData.end_time,
        professional_id: activityData.professional_id,
        consultation_id: activityData.consultation_id || undefined,
        max_participants: activityData.max_participants,
        color: activityData.color || "#3B82F6",
      })
      setShowCreateModal(false)
    } catch (err) {
      console.error("Error creating activity:", err)
    }
  }

  const handleEditActivity = (activity: GroupActivity) => {
    setSelectedActivity(activity)
    setShowDetailsModal(true)
  }

  const handleViewParticipants = (activity: GroupActivity) => {
    setSelectedActivity(activity)
    setShowParticipantsModal(true)
  }

  // ✅ HANDLERS CON CIERRE AUTOMÁTICO DEL MODAL
  const handleAddParticipant = async (activityId: string, clientId: number, notes?: string) => {
    try {
      await addParticipant(activityId, clientId, notes)
      await refetch() // Refrescar datos
      toast.success("Participante añadido correctamente")

      // ✅ CERRAR MODAL AUTOMÁTICAMENTE
      setShowParticipantsModal(false)
      setSelectedActivity(null)
    } catch (error) {
      console.error("Error adding participant:", error)
      toast.error("Error al añadir participante")
      throw error
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      await removeParticipant(participantId)
      await refetch() // Refrescar datos
      toast.success("Participante eliminado correctamente")

      // ✅ CERRAR MODAL AUTOMÁTICAMENTE
      setShowParticipantsModal(false)
      setSelectedActivity(null)
    } catch (error) {
      console.error("Error removing participant:", error)
      toast.error("Error al eliminar participante")
      throw error
    }
  }

  const handleUpdateParticipantStatus = async (
    participantId: string,
    status: "registered" | "attended" | "no_show" | "cancelled",
  ) => {
    try {
      await updateParticipantStatus(participantId, status)
      await refetch() // Refrescar datos
      toast.success("Estado actualizado correctamente")

      // ✅ CERRAR MODAL AUTOMÁTICAMENTE
      setShowParticipantsModal(false)
      setSelectedActivity(null)
    } catch (error) {
      console.error("Error updating participant status:", error)
      toast.error("Error al actualizar estado")
      throw error
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Activa", variant: "default" as const },
      completed: { label: "Completada", variant: "secondary" as const },
      cancelled: { label: "Cancelada", variant: "destructive" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getParticipationStatus = (activity: GroupActivity) => {
    const percentage = (activity.current_participants / activity.max_participants) * 100
    let variant: "default" | "secondary" | "destructive" = "default"

    if (percentage >= 90) variant = "destructive"
    else if (percentage >= 70) variant = "secondary"

    return { percentage, variant }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Cargando actividades...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error al cargar las actividades</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Actividades Grupales</h2>
          <p className="text-gray-600">Gestiona las actividades grupales de tu organización</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Actividad
        </Button>
      </div>

      {/* Activities Content */}
      {activities.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay actividades</h3>
          <p className="text-gray-600 mb-4">Comienza creando tu primera actividad grupal</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Actividad
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Actividad</TableHead>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Profesional</TableHead>
                <TableHead>Participantes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => {
                const participationStatus = getParticipationStatus(activity)

                return (
                  <TableRow key={activity.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: activity.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{activity.name}</div>
                          {activity.description && (
                            <div className="text-xs text-gray-500 truncate">{activity.description}</div>
                          )}
                          {activity.consultation && (
                            <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                              <Building2 className="h-3 w-3" />
                              {activity.consultation.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {format(new Date(activity.date), "dd/MM/yyyy", { locale: es })}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {activity.start_time} - {activity.end_time}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        {activity.professional?.name || <span className="text-gray-400 italic">Sin asignar</span>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={participationStatus.variant} className="text-xs">
                          {activity.current_participants}/{activity.max_participants}
                        </Badge>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(participationStatus.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{participationStatus.percentage.toFixed(0)}%</span>
                      </div>
                    </TableCell>

                    <TableCell>{getStatusBadge(activity.status)}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewParticipants(activity)}
                          className="h-8 px-2"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditActivity(activity)}
                          className="h-8 px-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <GroupActivityFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateActivity}
          organizationId={organizationId}
          users={users}
        />
      )}

      {showDetailsModal && selectedActivity && (
        <GroupActivityDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedActivity(null)
          }}
          activity={selectedActivity}
          onUpdate={updateActivity}
          onDelete={deleteActivity}
          onAddParticipant={handleAddParticipant}
          onRemoveParticipant={handleRemoveParticipant}
          organizationId={organizationId}
          users={users}
        />
      )}

      {showParticipantsModal && selectedActivity && (
        <ParticipantsModal
          isOpen={showParticipantsModal}
          onClose={() => {
            setShowParticipantsModal(false)
            setSelectedActivity(null)
          }}
          activity={selectedActivity}
          onAddParticipant={handleAddParticipant}
          onRemoveParticipant={handleRemoveParticipant}
          onUpdateParticipantStatus={handleUpdateParticipantStatus}
          organizationId={organizationId}
        />
      )}
    </div>
  )
}
