"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, User, Users, MapPin } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface GroupActivity {
  id: string
  name: string
  description: string
  date: string
  start_time: string
  end_time: string
  professional_name: string
  consultation_name: string
  max_participants: number
  current_participants: number
  service_name?: string
  color: string
}

interface GroupActivitiesListProps {
  organizationId: string
  onSelect: (activityId: string) => void
}

export function GroupActivitiesList({ organizationId, onSelect }: GroupActivitiesListProps) {
  const [activities, setActivities] = useState<GroupActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGroupActivities()
  }, [organizationId])

  const fetchGroupActivities = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/public/${organizationId}/group-activities`)

      if (!response.ok) {
        throw new Error("Error al cargar las actividades grupales")
      }

      const data = await response.json()
      setActivities(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const getAvailableSpots = (activity: GroupActivity) => {
    return activity.max_participants - activity.current_participants
  }

  const isActivityFull = (activity: GroupActivity) => {
    return getAvailableSpots(activity) <= 0
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando actividades grupales...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay actividades grupales disponibles</h3>
        <p className="text-gray-500">Vuelve más tarde o contacta con nosotros para más información</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Actividades Grupales</h2>
        <p className="text-gray-600 mt-2">Selecciona la actividad en la que te gustaría participar</p>
      </div>

      <div className="grid gap-4">
        {activities.map((activity) => (
          <Card key={activity.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{activity.name}</CardTitle>
                  {activity.description && <p className="text-gray-600 mt-1 text-sm">{activity.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={isActivityFull(activity) ? "destructive" : "secondary"} className="whitespace-nowrap">
                    {isActivityFull(activity) ? "Completo" : `${getAvailableSpots(activity)} plazas disponibles`}
                  </Badge>
                  {activity.service_name && (
                    <Badge variant="outline" className="text-xs">
                      {activity.service_name}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(activity.date), "EEEE, d 'de' MMMM", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {activity.start_time} - {activity.end_time}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{activity.professional_name}</span>
                  </div>
                  {activity.consultation_name && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{activity.consultation_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>
                    {activity.current_participants} / {activity.max_participants} participantes
                  </span>
                </div>
                <Button
                  onClick={() => onSelect(activity.id)}
                  disabled={isActivityFull(activity)}
                  className="min-w-[120px]"
                >
                  {isActivityFull(activity) ? "Completo" : "Inscribirse"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
