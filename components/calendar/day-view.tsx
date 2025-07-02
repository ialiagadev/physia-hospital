"use client"

import { format, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import type { Appointment, Doctor, Patient } from "@/types/calendar"

interface DayViewProps {
  currentDate: Date
  appointments: Appointment[]
  doctors: Doctor[]
  patients: Patient[]
  onAppointmentClick: (appointment: Appointment) => void
}

export function DayView({ currentDate, appointments, doctors, patients, onAppointmentClick }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const dayAppointments = appointments
    .filter((appointment) => isSameDay(appointment.startTime, currentDate))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  const getAppointmentsForHour = (hour: number) => {
    return dayAppointments.filter((appointment) => {
      const appointmentHour = appointment.startTime.getHours()
      return appointmentHour === hour
    })
  }

  const getDoctorColor = (doctorId: string) => {
    const doctor = doctors.find((d) => d.id === doctorId)
    return doctor?.color || "#6B7280"
  }

  const getPatientName = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId)
    return patient?.name || "Paciente desconocido"
  }

  const getAppointmentDuration = (appointment: Appointment) => {
    const duration = (appointment.endTime.getTime() - appointment.startTime.getTime()) / (1000 * 60) // minutes
    return Math.max(30, duration) // minimum 30 minutes for display
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="max-w-4xl mx-auto">
        {/* Day header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold">{format(currentDate, "EEEE, d MMMM yyyy", { locale: es })}</h2>
          <p className="text-muted-foreground mt-1">
            {dayAppointments.length} cita{dayAppointments.length !== 1 ? "s" : ""} programada
            {dayAppointments.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Time slots */}
        <div className="space-y-0 border rounded-lg overflow-hidden">
          {hours.map((hour) => {
            const hourAppointments = getAppointmentsForHour(hour)

            return (
              <div key={hour} className="flex border-b last:border-b-0">
                {/* Hour label */}
                <div className="w-20 p-4 text-right text-sm text-muted-foreground border-r bg-muted/20">
                  {hour === 0 ? "00:00" : `${hour.toString().padStart(2, "0")}:00`}
                </div>

                {/* Appointments */}
                <div className="flex-1 min-h-[80px] p-2 relative">
                  {hourAppointments.map((appointment) => {
                    const duration = getAppointmentDuration(appointment)
                    const heightMultiplier = duration / 60 // 1 hour = 80px base height

                    return (
                      <div
                        key={appointment.id}
                        className="rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity mb-2 shadow-sm"
                        style={{
                          backgroundColor: getDoctorColor(appointment.doctorId) + "20",
                          borderLeft: `4px solid ${getDoctorColor(appointment.doctorId)}`,
                          minHeight: `${Math.max(60, 80 * heightMultiplier - 8)}px`,
                        }}
                        onClick={() => onAppointmentClick(appointment)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-sm">{appointment.title}</h3>
                          <span className="text-xs text-muted-foreground">
                            {format(appointment.startTime, "HH:mm")} - {format(appointment.endTime, "HH:mm")}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            <strong>Paciente:</strong> {getPatientName(appointment.patientId)}
                          </p>
                          {appointment.room && (
                            <p>
                              <strong>Sala:</strong> {appointment.room}
                            </p>
                          )}
                          {appointment.description && (
                            <p className="truncate">
                              <strong>Descripción:</strong> {appointment.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {hourAppointments.length === 0 && (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Sin citas programadas
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
