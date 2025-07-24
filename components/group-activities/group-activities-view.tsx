"use client"

import { useState, useMemo } from "react"
import { format, differenceInDays, differenceInMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
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
import { Plus, Users, Building2, Edit, ChevronDown, ChevronRight, Trash2, AlertTriangle } from "lucide-react"
import { useGroupActivitiesContext, type GroupActivity } from "@/app/contexts/group-activities-context"
import { GroupActivityFormModal } from "./group-activity-form-modal"
import { GroupActivityDetailsModal } from "./group-activity-details-modal"
import { ParticipantsModal } from "./participants-modal"
import { useServices } from "@/hooks/use-services"
import { useToast } from "@/hooks/use-toast"

interface GroupActivitiesViewProps {
  organizationId: number
  users: any[]
}

// Tipo para series de actividades
interface ActivitySeries {
  id: string
  name: string
  professional_id: string
  start_time: string
  end_time: string
  description: string | null
  service_id: number | null
  max_participants: number
  color: string
  consultation_id: string | null
  activities: GroupActivity[]
  isRecurringSeries: boolean
  recurrencePattern?: "weekly" | "monthly"
}

export function GroupActivitiesView({ organizationId, users }: GroupActivitiesViewProps) {
  const { services } = useServices(organizationId)
  const { toast } = useToast()

  // ✅ USAR EL CONTEXTO EN LUGAR DEL HOOK DIRECTO
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
  } = useGroupActivitiesContext()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<GroupActivity | null>(null)
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  const [deletingSeries, setDeletingSeries] = useState<string | null>(null)

  // Estados para el modal de confirmación de eliminación de series
  const [showDeleteSeriesConfirm, setShowDeleteSeriesConfirm] = useState(false)
  const [seriesToDelete, setSeriesToDelete] = useState<ActivitySeries | null>(null)

  // Estados para el modal de confirmación de eliminación individual
  const [showDeleteSingleConfirm, setShowDeleteSingleConfirm] = useState(false)
  const [activityToDelete, setActivityToDelete] = useState<GroupActivity | null>(null)
  const [deletingSingle, setDeletingSingle] = useState<string | null>(null)

  // ✅ FUNCIÓN PARA DETECTAR PATRONES DE RECURRENCIA
  const detectRecurrencePattern = (activities: GroupActivity[]): "weekly" | "monthly" | null => {
    if (activities.length < 2) return null

    const sortedActivities = [...activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Verificar patrón semanal (diferencia de ~7 días)
    let isWeekly = true
    for (let i = 1; i < sortedActivities.length; i++) {
      const daysDiff = differenceInDays(new Date(sortedActivities[i].date), new Date(sortedActivities[i - 1].date))
      if (Math.abs(daysDiff - 7) > 1) {
        // Tolerancia de 1 día
        isWeekly = false
        break
      }
    }

    if (isWeekly) return "weekly"

    // Verificar patrón mensual (diferencia de ~30 días o mismo día del mes)
    let isMonthly = true
    for (let i = 1; i < sortedActivities.length; i++) {
      const monthsDiff = differenceInMonths(new Date(sortedActivities[i].date), new Date(sortedActivities[i - 1].date))
      if (monthsDiff !== 1) {
        isMonthly = false
        break
      }
    }

    return isMonthly ? "monthly" : null
  }

  // ✅ FUNCIÓN PARA AGRUPAR ACTIVIDADES EN SERIES
  const groupActivitiesIntoSeries = useMemo((): ActivitySeries[] => {
    const groups = new Map<string, GroupActivity[]>()

    // Agrupar por criterios similares
    activities.forEach((activity) => {
      const key = `${activity.name}-${activity.professional_id}-${activity.start_time}-${activity.end_time}-${activity.max_participants}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(activity)
    })

    const series: ActivitySeries[] = []

    groups.forEach((groupActivities, key) => {
      // Ordenar por fecha
      const sortedActivities = groupActivities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Detectar si es una serie recurrente
      const isRecurringSeries = sortedActivities.length > 1
      const recurrencePattern = detectRecurrencePattern(sortedActivities)

      const firstActivity = sortedActivities[0]

      series.push({
        id: key,
        name: firstActivity.name,
        professional_id: firstActivity.professional_id,
        start_time: firstActivity.start_time,
        end_time: firstActivity.end_time,
        description: firstActivity.description,
        service_id: firstActivity.service_id,
        max_participants: firstActivity.max_participants,
        color: firstActivity.color,
        consultation_id: firstActivity.consultation_id,
        activities: sortedActivities,
        isRecurringSeries,
        recurrencePattern: recurrencePattern || undefined,
      })
    })

    // Ordenar series por fecha de la primera actividad
    return series.sort((a, b) => new Date(a.activities[0].date).getTime() - new Date(b.activities[0].date).getTime())
  }, [activities])

  const handleCreateActivity = async (activityData: any) => {
    try {
      await createActivity({
        organization_id: organizationId,
        name: activityData.name,
        description: activityData.description,
        date: typeof activityData.date === "string" ? activityData.date : format(activityData.date, "yyyy-MM-dd"),
        start_time: activityData.start_time,
        end_time: activityData.end_time,
        professional_id: activityData.professional_id,
        consultation_id: activityData.consultation_id || undefined,
        max_participants: activityData.max_participants,
        color: activityData.color || "#3B82F6",
        service_id: activityData.service_id || undefined,
        recurrence: activityData.recurrence || null,
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

  // ✅ HANDLERS SIMPLIFICADOS - YA NO NECESITAN REFETCH
  const handleAddParticipant = async (activityId: string, clientId: number, notes?: string) => {
    try {
      await addParticipant(activityId, clientId, notes)
      setShowParticipantsModal(false)
      setSelectedActivity(null)
    } catch (error) {
      console.error("Error adding participant:", error)
      throw error
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      await removeParticipant(participantId)
      setShowParticipantsModal(false)
      setSelectedActivity(null)
    } catch (error) {
      console.error("Error removing participant:", error)
      throw error
    }
  }

  const handleUpdateParticipantStatus = async (
    participantId: string,
    status: "registered" | "attended" | "no_show" | "cancelled",
  ) => {
    try {
      await updateParticipantStatus(participantId, status)
      setShowParticipantsModal(false)
      setSelectedActivity(null)
    } catch (error) {
      console.error("Error updating participant status:", error)
      throw error
    }
  }

  // ✅ FUNCIÓN PARA MOSTRAR CONFIRMACIÓN DE ELIMINACIÓN DE SERIE
  const handleDeleteSeriesClick = (series: ActivitySeries) => {
    setSeriesToDelete(series)
    setShowDeleteSeriesConfirm(true)
  }

  // ✅ FUNCIÓN PARA ELIMINAR TODA UNA SERIE DE ACTIVIDADES
  const handleConfirmDeleteSeries = async () => {
    if (!seriesToDelete) return

    setShowDeleteSeriesConfirm(false)
    setDeletingSeries(seriesToDelete.id)

    try {
      // Eliminar todas las actividades de la serie en paralelo
      await Promise.all(seriesToDelete.activities.map((activity) => deleteActivity(activity.id)))

      // Cerrar el panel expandido si estaba abierto
      setExpandedSeries((prev) => {
        const newSet = new Set(prev)
        newSet.delete(seriesToDelete.id)
        return newSet
      })

      // Mostrar mensaje de éxito
      toast({
        title: "Serie eliminada",
        description: `Se eliminaron ${seriesToDelete.activities.length} sesiones de "${seriesToDelete.name}" exitosamente.`,
        variant: "default",
      })

      console.log(`Serie "${seriesToDelete.name}" eliminada exitosamente`)
    } catch (error) {
      console.error("Error eliminando la serie:", error)

      // Mostrar mensaje de error
      toast({
        title: "Error al eliminar serie",
        description: "No se pudo eliminar la serie completa. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setDeletingSeries(null)
      setSeriesToDelete(null)
    }
  }

  const handleCancelDeleteSeries = () => {
    setShowDeleteSeriesConfirm(false)
    setSeriesToDelete(null)
  }

  // ✅ NUEVAS FUNCIONES PARA ELIMINACIÓN INDIVIDUAL CON MODAL
  const handleDeleteSingleActivityClick = (activity: GroupActivity) => {
    setActivityToDelete(activity)
    setShowDeleteSingleConfirm(true)
  }

  const handleConfirmDeleteSingle = async () => {
    if (!activityToDelete) return

    setShowDeleteSingleConfirm(false)
    setDeletingSingle(activityToDelete.id)

    try {
      await deleteActivity(activityToDelete.id)
      toast({
        title: "Actividad eliminada",
        description: `La actividad "${activityToDelete.name}" se eliminó exitosamente.`,
        variant: "default",
      })
    } catch (error) {
      console.error("Error eliminando la actividad:", error)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar la actividad. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setDeletingSingle(null)
      setActivityToDelete(null)
    }
  }

  const handleCancelDeleteSingle = () => {
    setShowDeleteSingleConfirm(false)
    setActivityToDelete(null)
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

  const getRecurrenceLabel = (pattern: "weekly" | "monthly" | undefined, count: number) => {
    if (!pattern) return `${count} sesiones`

    switch (pattern) {
      case "weekly":
        return `${count} sesiones semanales`
      case "monthly":
        return `${count} sesiones mensuales`
      default:
        return `${count} sesiones`
    }
  }

  const toggleSeriesExpansion = (seriesId: string) => {
    setExpandedSeries((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(seriesId)) {
        newSet.delete(seriesId)
      } else {
        newSet.add(seriesId)
      }
      return newSet
    })
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
      {groupActivitiesIntoSeries.length === 0 ? (
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
        <div className="space-y-2">
          {groupActivitiesIntoSeries.map((series) => {
            const isExpanded = expandedSeries.has(series.id)
            const firstActivity = series.activities[0]
            const participationStatus = getParticipationStatus(firstActivity)
            const isDeleting = deletingSeries === series.id || deletingSingle === firstActivity.id

            return (
              <div key={series.id} className="border rounded-lg overflow-hidden">
                {/* Serie principal */}
                <div className="bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center p-4">
                    {/* Indicador de expansión */}
                    {series.isRecurringSeries && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSeriesExpansion(series.id)}
                        className="mr-2 p-1 h-8 w-8"
                        disabled={isDeleting}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    )}

                    {/* Información de la actividad */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: series.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-medium text-sm">{series.name}</div>
                          {series.isRecurringSeries && (
                            <Badge variant="outline" className="text-xs">
                              📅 {getRecurrenceLabel(series.recurrencePattern, series.activities.length)}
                            </Badge>
                          )}
                          {isDeleting && (
                            <Badge variant="destructive" className="text-xs animate-pulse">
                              Eliminando...
                            </Badge>
                          )}
                        </div>
                        {series.description && (
                          <div className="text-xs text-gray-500 truncate">{series.description}</div>
                        )}
                        {series.consultation_id && (
                          <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" />
                            {firstActivity.consultation?.name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fecha y hora */}
                    <div className="text-sm text-right mr-4">
                      <div className="font-medium">
                        {format(new Date(firstActivity.date), "dd/MM/yyyy", { locale: es })}
                        {series.isRecurringSeries && (
                          <span className="text-gray-500 ml-1">
                            -{" "}
                            {format(new Date(series.activities[series.activities.length - 1].date), "dd/MM/yyyy", {
                              locale: es,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {series.start_time} - {series.end_time}
                      </div>
                    </div>

                    {/* Profesional */}
                    <div className="text-sm mr-4 min-w-0">
                      {firstActivity.professional?.name || <span className="text-gray-400 italic">Sin asignar</span>}
                    </div>

                    {/* Participantes */}
                    <div className="flex items-center gap-2 mr-4">
                      <Badge variant={participationStatus.variant} className="text-xs">
                        {firstActivity.current_participants}/{firstActivity.max_participants}
                      </Badge>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(participationStatus.percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Estado */}
                    <div className="mr-4">{getStatusBadge(firstActivity.status)}</div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewParticipants(firstActivity)}
                        className="h-8 px-2"
                        disabled={isDeleting}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditActivity(firstActivity)}
                        className="h-8 px-2"
                        disabled={isDeleting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* Botón eliminar individual para actividades no recurrentes */}
                      {!series.isRecurringSeries && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSingleActivityClick(firstActivity)}
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Eliminar actividad"
                          disabled={isDeleting}
                        >
                          {deletingSingle === firstActivity.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      {/* Botón para eliminar toda la serie (solo para series recurrentes) */}
                      {series.isRecurringSeries && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSeriesClick(series)}
                          className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title={`Eliminar todas las ${series.activities.length} sesiones`}
                          disabled={isDeleting}
                        >
                          {deletingSeries === series.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actividades de la serie (colapsible) */}
                {series.isRecurringSeries && (
                  <Collapsible open={isExpanded}>
                    <CollapsibleContent>
                      <div className="border-t bg-gray-50">
                        {series.activities.slice(1).map((activity, index) => {
                          const activityParticipationStatus = getParticipationStatus(activity)

                          return (
                            <div
                              key={activity.id}
                              className={`flex items-center p-3 pl-12 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0 ${
                                isDeleting ? "opacity-50" : ""
                              }`}
                            >
                              {/* Indicador de sesión */}
                              <div className="flex items-center gap-2 mr-4">
                                <div className="w-2 h-2 rounded-full bg-gray-400" />
                                <span className="text-xs text-gray-600">Sesión {index + 2}</span>
                              </div>

                              {/* Fecha y hora */}
                              <div className="text-sm mr-4 min-w-0">
                                <div className="font-medium">
                                  {format(new Date(activity.date), "dd/MM/yyyy", { locale: es })}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {activity.start_time} - {activity.end_time}
                                </div>
                              </div>

                              {/* Participantes */}
                              <div className="flex items-center gap-2 mr-4">
                                <Badge variant={activityParticipationStatus.variant} className="text-xs">
                                  {activity.current_participants}/{activity.max_participants}
                                </Badge>
                                <div className="w-12 bg-gray-200 rounded-full h-1">
                                  <div
                                    className="bg-blue-600 h-1 rounded-full transition-all"
                                    style={{ width: `${Math.min(activityParticipationStatus.percentage, 100)}%` }}
                                  />
                                </div>
                              </div>

                              {/* Estado */}
                              <div className="mr-4">{getStatusBadge(activity.status)}</div>

                              {/* Acciones */}
                              <div className="flex items-center gap-1 ml-auto">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewParticipants(activity)}
                                  className="h-7 px-2"
                                  disabled={isDeleting}
                                >
                                  <Users className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditActivity(activity)}
                                  className="h-7 px-2"
                                  disabled={isDeleting}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de confirmación de eliminación de serie */}
      <AlertDialog open={showDeleteSeriesConfirm} onOpenChange={setShowDeleteSeriesConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Eliminar serie completa
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                ¿Estás seguro de que quieres eliminar toda la serie{" "}
                <span className="font-semibold">"{seriesToDelete?.name}"</span>?
              </p>
              <p className="text-red-600 font-medium">Se eliminarán {seriesToDelete?.activities.length} sesiones.</p>
              <p className="text-sm text-gray-600">
                Esta acción no se puede deshacer. Todos los participantes y datos asociados se perderán permanentemente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeleteSeries}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSeries}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Eliminar {seriesToDelete?.activities.length} sesiones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de confirmación de eliminación individual */}
      <AlertDialog open={showDeleteSingleConfirm} onOpenChange={setShowDeleteSingleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Eliminar actividad
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                ¿Estás seguro de que quieres eliminar la actividad{" "}
                <span className="font-semibold">"{activityToDelete?.name}"</span>?
              </p>
              <p className="text-sm text-gray-600">
                Esta acción no se puede deshacer. Todos los participantes y datos asociados se perderán permanentemente.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeleteSingle}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSingle}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Eliminar actividad
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          services={services}
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
