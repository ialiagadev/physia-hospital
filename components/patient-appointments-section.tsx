"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock, User, MapPin, FileText, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

interface Appointment {
  id: string
  date: string
  start_time: string
  end_time: string
  duration: number
  status: "confirmed" | "pending" | "cancelled" | "completed" | "no_show"
  notes?: string
  professional_name?: string
  appointment_type_name?: string
  consultation_title?: string
  consultation_location?: string
}

interface PatientAppointmentsSectionProps {
  clientId: string
  clientName: string
}

export function PatientAppointmentsSection({ clientId, clientName }: PatientAppointmentsSectionProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadAppointments()
  }, [clientId])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: simpleData, error: simpleError } = await supabase
        .from("appointments")
        .select("*")
        .eq("client_id", clientId)
        .gte("date", new Date().toISOString().split("T")[0])
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(10)

      if (simpleError) {
        throw simpleError
      }

      if (simpleData && simpleData.length > 0) {
        const enrichedAppointments = await Promise.all(
          simpleData.map(async (appointment) => {
            let professionalName = "Profesional no asignado"
            let appointmentTypeName = "Tipo no especificado"
            let consultationTitle = ""
            let consultationLocation = ""

            if (appointment.professional_id) {
              const { data: professionalData } = await supabase
                .from("users")
                .select("full_name, name, email")
                .eq("id", appointment.professional_id)
                .single()

              if (professionalData) {
                professionalName = professionalData.full_name || professionalData.name || "Profesional"
              }
            }

            if (appointment.appointment_type_id) {
              const { data: typeData } = await supabase
                .from("appointment_types")
                .select("name")
                .eq("id", appointment.appointment_type_id)
                .single()

              if (typeData) {
                appointmentTypeName = typeData.name
              }
            }

            if (appointment.consultation_id) {
              const { data: consultationData } = await supabase
                .from("consultations")
                .select("title, location")
                .eq("id", appointment.consultation_id)
                .single()

              if (consultationData) {
                consultationTitle = consultationData.title || ""
                consultationLocation = consultationData.location || ""
              }
            }

            return {
              id: appointment.id,
              date: appointment.date,
              start_time: appointment.start_time,
              end_time: appointment.end_time,
              duration: appointment.duration,
              status: appointment.status,
              notes: appointment.notes,
              professional_name: professionalName,
              appointment_type_name: appointmentTypeName,
              consultation_title: consultationTitle,
              consultation_location: consultationLocation,
            }
          }),
        )

        setAppointments(enrichedAppointments)
      } else {
        setAppointments([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar las citas")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: "Confirmada", variant: "default" as const },
      pending: { label: "Pendiente", variant: "secondary" as const },
      cancelled: { label: "Cancelada", variant: "destructive" as const },
      completed: { label: "Completada", variant: "outline" as const },
      no_show: { label: "No presentado", variant: "destructive" as const },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    } catch (error) {
      return "Fecha no válida"
    }
  }

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":")
      return `${hours}:${minutes}`
    } catch (error) {
      return "--:--"
    }
  }

  const handleGoToCalendar = () => {
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2 bg-transparent" onClick={loadAppointments}>
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Próximas Citas</h2>
          <p className="text-gray-500 mt-1">Citas programadas para {clientName}</p>
        </div>
        <Button onClick={handleGoToCalendar}>
          <Calendar className="h-4 w-4 mr-2" />
          Ver Calendario
        </Button>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No hay citas programadas</h3>
            <p className="text-gray-500 mt-2">Este paciente no tiene citas futuras programadas</p>
            <Button className="mt-4" onClick={handleGoToCalendar}>
              <Calendar className="h-4 w-4 mr-2" />
              Ir al Calendario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const formattedDate = formatDate(appointment.date)
            const startTime = formatTime(appointment.start_time)
            const endTime = formatTime(appointment.end_time)
            const title = appointment.consultation_title || appointment.appointment_type_name || "Consulta"

            return (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          <span className="capitalize">{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {startTime} - {endTime}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">({appointment.duration} min)</div>
                      </div>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {appointment.professional_name && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Profesional
                        </h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>{appointment.professional_name}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {appointment.appointment_type_name && (
                        <div>
                          <h4 className="font-medium text-gray-900">Tipo de Cita</h4>
                          <p className="text-sm text-gray-600">{appointment.appointment_type_name}</p>
                        </div>
                      )}

                      {appointment.consultation_location && (
                        <div>
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Ubicación
                          </h4>
                          <p className="text-sm text-gray-600">{appointment.consultation_location}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notas
                      </h4>
                      <p className="text-sm text-gray-600">{appointment.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
