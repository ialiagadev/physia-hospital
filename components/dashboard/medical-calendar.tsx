"use client"

import { useState } from "react"
import { CalendarHeader } from "@/components/calendar/calendar-header"
import { CalendarFilters } from "@/components/calendar/calendar-filters"
import { MonthView } from "@/components/calendar/month-view"
import { WeekView } from "@/components/calendar/week-view"
import { DayView } from "@/components/calendar/day-view"
import { AgendaView } from "@/components/calendar/agenda-view"
import { AppointmentModal } from "@/components/calendar/appointment-modal"
import type { CalendarView, AppointmentWithDetails, User, Client, Doctor, Patient, Appointment } from "@/types/calendar"

interface MedicalCalendarProps {
  appointments?: AppointmentWithDetails[]
  users?: User[]
  clients?: Client[]
}

export default function MedicalCalendar({ appointments = [], users = [], clients = [] }: MedicalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>("month")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)

  // Filter states
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>(users.map((u) => u.id))
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "consultation",
    "surgery",
    "emergency",
    "followup",
    "checkup",
  ])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["confirmed", "pending", "cancelled", "completed"])

  // Convert User to Doctor for legacy components
  const convertUserToDoctor = (user: User): Doctor => ({
    id: user.id,
    name: user.name || "Sin nombre",
    specialty: user.settings?.specialty || "Medicina General",
    color: user.settings?.calendar_color || "#3B82F6",
  })

  // Convert Client to Patient for legacy components
  const convertClientToPatient = (client: Client): Patient => ({
    id: client.id.toString(),
    name: client.name,
    phone: client.phone || "",
    email: client.email || "",
    birthDate: client.birth_date || "",
  })

  // Convert AppointmentWithDetails to Appointment for legacy components
  const convertAppointmentToLegacy = (apt: AppointmentWithDetails): Appointment => ({
    id: apt.id,
    title: `${apt.client.name} - ${apt.appointment_type?.name || "Consulta"}`,
    description: apt.notes || "",
    startTime: new Date(`${apt.date}T${apt.start_time}`),
    endTime: new Date(`${apt.date}T${apt.end_time}`),
    doctorId: apt.professional_id,
    patientId: apt.client_id.toString(),
    type: "consultation", // Default type
    status: apt.status === "confirmed" ? "confirmed" : apt.status === "pending" ? "pending" : "cancelled",
    room: undefined,
    notes: apt.notes || undefined,
  })

  // Filter appointments based on selected filters
  const filteredAppointments = appointments.filter(
    (appointment) =>
      selectedDoctors.includes(appointment.professional_id) && selectedStatuses.includes(appointment.status),
  )

  // Convert data for legacy components
  const legacyDoctors = users.map(convertUserToDoctor)
  const legacyPatients = clients.map(convertClientToPatient)
  const legacyAppointments = filteredAppointments.map(convertAppointmentToLegacy)

  const handleAppointmentClick = (appointment: Appointment) => {
    // Find the original AppointmentWithDetails
    const originalAppointment = appointments.find((apt) => apt.id === appointment.id)
    if (originalAppointment) {
      setSelectedAppointment(originalAppointment)
      setShowAppointmentModal(true)
    }
  }

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date)
    setView("day")
  }

  const handleNewAppointment = () => {
    console.log("Nueva cita")
  }

  const handleDoctorToggle = (doctorId: string) => {
    setSelectedDoctors((prev) => (prev.includes(doctorId) ? prev.filter((id) => id !== doctorId) : [...prev, doctorId]))
  }

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]))
  }

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]))
  }

  const getSelectedAppointmentDetails = () => {
    if (!selectedAppointment) return { doctor: null, patient: null }

    const user = users.find((u) => u.id === selectedAppointment.professional_id)
    const client = clients.find((c) => c.id === selectedAppointment.client_id)

    const doctor = user ? convertUserToDoctor(user) : null
    const patient = client ? convertClientToPatient(client) : null

    return { doctor, patient }
  }

  const { doctor: selectedDoctor, patient: selectedPatient } = getSelectedAppointmentDetails()

  const renderCalendarView = () => {
    switch (view) {
      case "month":
        return (
          <MonthView
            date={currentDate}
            citas={[]} // You'll need to convert appointments to the expected format
            profesionales={[]} // You'll need to convert users to the expected format
            onSelectCita={() => {}}
            profesionalesSeleccionados={[]}
            onUpdateCita={() => {}}
            onAddCita={() => {}}
            onDateSelect={handleDateSelect}
          />
        )
      case "week":
        return (
          <WeekView
            date={currentDate}
            citas={[]} // You'll need to convert appointments to the expected format
            profesionales={[]} // You'll need to convert users to the expected format
            onSelectCita={() => {}}
            profesionalesSeleccionados={[]}
            intervaloTiempo={30}
            onUpdateCita={() => {}}
            onAddCita={() => {}}
            onDateSelect={handleDateSelect}
          />
        )
      case "day":
        return (
          <DayView
            currentDate={currentDate}
            appointments={legacyAppointments}
            doctors={legacyDoctors}
            patients={legacyPatients}
            onAppointmentClick={handleAppointmentClick}
          />
        )
      case "agenda":
        return (
          <AgendaView
            appointments={legacyAppointments}
            doctors={legacyDoctors}
            patients={legacyPatients}
            onAppointmentClick={handleAppointmentClick}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onDateChange={setCurrentDate}
        onViewChange={setView}
        onNewAppointment={handleNewAppointment}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      <div className="flex flex-1 overflow-hidden">
        {renderCalendarView()}

        {showFilters && (
          <div className="border-l p-4">
            <CalendarFilters
              doctors={legacyDoctors}
              selectedDoctors={selectedDoctors}
              selectedTypes={selectedTypes}
              selectedStatuses={selectedStatuses}
              onDoctorToggle={handleDoctorToggle}
              onTypeToggle={handleTypeToggle}
              onStatusToggle={handleStatusToggle}
              onClose={() => setShowFilters(false)}
            />
          </div>
        )}
      </div>

      <AppointmentModal
        appointment={selectedAppointment ? convertAppointmentToLegacy(selectedAppointment) : null}
        doctor={selectedDoctor}
        patient={selectedPatient}
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false)
          setSelectedAppointment(null)
        }}
        onEdit={(appointment: Appointment) => {
          console.log("Editar cita:", appointment)
        }}
        onDelete={(appointmentId: string) => {
          console.log("Eliminar cita:", appointmentId)
          setShowAppointmentModal(false)
          setSelectedAppointment(null)
        }}
      />
    </div>
  )
}
