"use client"

import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Clock, User, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Appointment, Doctor, Patient } from "@/types/calendar"

interface AgendaViewProps {
  appointments: Appointment[]
  doctors: Doctor[]
  patients: Patient[]
  onAppointmentClick: (appointment: Appointment) => void
}

const statusLabels = {
  confirmed: "Confirmada",
  pending: "Pendiente",
  cancelled: "Cancelada",
  completed: "Completada",
}

const statusColors = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
}

const appointmentTypeLabels = {
  consultation: "Consulta",
  surgery: "Cirugía",
  emergency: "Emergencia",
  followup: "Seguimiento",
  checkup: "Revisión",
}

export function AgendaView({ appointments, doctors, patients, onAppointmentClick }: AgendaViewProps) {
  // Sort appointments by date and time
  const sortedAppointments = [...appointments].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // Group appointments by date
  const groupedAppointments = sortedAppointments.reduce(
    (groups, appointment) => {
      const dateKey = format(appointment.startTime, "yyyy-MM-dd")
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(appointment)
      return groups
    },
    {} as Record<string, Appointment[]>,
  )

  const getDoctorInfo = (doctorId: string) => {
    return doctors.find((d) => d.id === doctorId)
  }

  const getPatientInfo = (patientId: string) => {
    return patients.find((p) => p.id === patientId)
  }

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) return "Hoy"
    if (isTomorrow(date)) return "Mañana"
    if (isYesterday(date)) return "Ayer"
    return format(date, "EEEE, d MMMM yyyy", { locale: es })
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {Object.entries(groupedAppointments).map(([dateKey, dayAppointments]) => (
          <div key={dateKey} className="space-y-3">
            <h2 className="text-lg font-semibold capitalize sticky top-0 bg-background py-2 border-b">
              {getDateLabel(dateKey)}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({dayAppointments.length} cita{dayAppointments.length !== 1 ? "s" : ""})
              </span>
            </h2>

            <div className="space-y-2">
              {dayAppointments.map((appointment) => {
                const doctor = getDoctorInfo(appointment.doctorId)
                const patient = getPatientInfo(appointment.patientId)

                return (
                  <Card
                    key={appointment.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onAppointmentClick(appointment)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: doctor?.color || "#6B7280" }}
                          />
                          <div>
                            <h3 className="font-semibold">{appointment.title}</h3>
                            <p className="text-sm text-muted-foreground">{appointmentTypeLabels[appointment.type]}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Badge className={statusColors[appointment.status]}>{statusLabels[appointment.status]}</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(appointment.startTime, "HH:mm")} - {format(appointment.endTime, "HH:mm")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>
                              {doctor?.name} - {doctor?.specialty}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Paciente: {patient?.name}</span>
                          </div>

                          {appointment.room && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{appointment.room}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {appointment.description && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground">{appointment.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}

        {Object.keys(groupedAppointments).length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay citas programadas</h3>
            <p className="text-muted-foreground">Las citas aparecerán aquí cuando se programen.</p>
          </div>
        )}
      </div>
    </div>
  )
}
