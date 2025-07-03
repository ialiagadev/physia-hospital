"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"

interface Doctor {
  id: string
  name: string
  color: string
}

interface Appointment {
  id: string
  doctorId: string
  startTime: Date
  endTime: Date
  title: string
}

interface DayViewProps {
  currentDate: Date
  doctors: Doctor[]
  appointments: Appointment[]
  onAppointmentClick: (appointment: Appointment) => void
}

const DayView: React.FC<DayViewProps> = ({ currentDate, doctors, appointments, onAppointmentClick }) => {
  const [vacationEvents, setVacationEvents] = useState<any[]>([])
  const [unavailableProfessionals, setUnavailableProfessionals] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadVacationData = async () => {
      if (!doctors.length) return

      try {
        const dateStr = format(currentDate, "yyyy-MM-dd")

        // Assuming we can get organization_id from doctors or context
        const organizationId = 1 // You'll need to get this from your context/props

        const { data: vacationData, error } = await supabase
          .from("vacation_calendar_events")
          .select(`
          *,
          vacation_requests!inner(status, type, reason),
          users!inner(name, email)
        `)
          .eq("organization_id", organizationId)
          .lte("start_date", dateStr)
          .gte("end_date", dateStr)
          .eq("vacation_requests.status", "approved")

        if (error) {
          console.error("Error loading vacation data:", error)
          return
        }

        setVacationEvents(vacationData || [])
        const unavailableIds = new Set((vacationData || []).map((event: any) => event.user_id))
        setUnavailableProfessionals(unavailableIds)
      } catch (error) {
        console.error("Error loading vacation data:", error)
      }
    }

    loadVacationData()
  }, [currentDate, doctors])

  return (
    <div className="flex h-full">
      {doctors.map((doctor) => {
        const isOnVacation = unavailableProfessionals.has(doctor.id)
        const vacationEvent = vacationEvents.find((v) => v.user_id === doctor.id)

        return (
          <div key={doctor.id} className="flex-1 min-w-0">
            <div
              className={`p-2 text-center font-medium text-sm border-b sticky top-0 z-10 ${
                isOnVacation ? "bg-orange-50 border-orange-200" : "bg-gray-50"
              }`}
              style={{ backgroundColor: isOnVacation ? "#fef3c7" : doctor.color + "20" }}
            >
              <div className="flex items-center justify-center gap-2">
                <span>{doctor.name}</span>
                {isOnVacation && (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                    {vacationEvent?.vacation_requests?.type === "vacation"
                      ? "🏖️"
                      : vacationEvent?.vacation_requests?.type === "sick_leave"
                        ? "🏥"
                        : "📅"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="relative h-full">
              {isOnVacation && (
                <div className="absolute inset-0 bg-orange-50 opacity-80 z-10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl mb-2">
                      {vacationEvent?.vacation_requests?.type === "vacation"
                        ? "🏖️"
                        : vacationEvent?.vacation_requests?.type === "sick_leave"
                          ? "🏥"
                          : vacationEvent?.vacation_requests?.type === "personal"
                            ? "👤"
                            : "📅"}
                    </div>
                    <div className="text-sm font-medium text-orange-700">
                      {vacationEvent?.vacation_requests?.type === "vacation"
                        ? "Vacaciones"
                        : vacationEvent?.vacation_requests?.type === "sick_leave"
                          ? "Baja médica"
                          : vacationEvent?.vacation_requests?.type === "personal"
                            ? "Asunto personal"
                            : "No disponible"}
                    </div>
                    {vacationEvent?.vacation_requests?.reason && (
                      <div className="text-xs text-orange-600 mt-1">{vacationEvent.vacation_requests.reason}</div>
                    )}
                  </div>
                </div>
              )}

              {appointments
                .filter((apt) => apt.doctorId === doctor.id)
                .map((appointment) => (
                  <div
                    key={appointment.id}
                    className="absolute bg-blue-100 border border-blue-200 rounded p-1 cursor-pointer hover:bg-blue-200 z-20"
                    style={{
                      top: `${((appointment.startTime.getHours() - 8) * 60 + appointment.startTime.getMinutes()) * (100 / (12 * 60))}%`,
                      height: `${((appointment.endTime.getTime() - appointment.startTime.getTime()) / (1000 * 60)) * (100 / (12 * 60))}%`,
                      left: "2px",
                      right: "2px",
                    }}
                    onClick={() => onAppointmentClick(appointment)}
                  >
                    <div className="text-xs font-medium truncate">{appointment.title}</div>
                    <div className="text-xs text-gray-600">
                      {format(appointment.startTime, "HH:mm")} - {format(appointment.endTime, "HH:mm")}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DayView
