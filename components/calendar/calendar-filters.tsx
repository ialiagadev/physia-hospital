"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { Doctor } from "@/types/calendar"

interface CalendarFiltersProps {
  doctors: Doctor[]
  selectedDoctors: string[]
  selectedTypes: string[]
  selectedStatuses: string[]
  onDoctorToggle: (doctorId: string) => void
  onTypeToggle: (type: string) => void
  onStatusToggle: (status: string) => void
  onClose: () => void
}

const appointmentTypes = [
  { value: "consultation", label: "Consulta" },
  { value: "surgery", label: "Cirugía" },
  { value: "emergency", label: "Emergencia" },
  { value: "followup", label: "Seguimiento" },
  { value: "checkup", label: "Revisión" },
]

const appointmentStatuses = [
  { value: "confirmed", label: "Confirmada" },
  { value: "pending", label: "Pendiente" },
  { value: "cancelled", label: "Cancelada" },
  { value: "completed", label: "Completada" },
]

export function CalendarFilters({
  doctors,
  selectedDoctors,
  selectedTypes,
  selectedStatuses,
  onDoctorToggle,
  onTypeToggle,
  onStatusToggle,
  onClose,
}: CalendarFiltersProps) {
  return (
    <Card className="w-80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Filtros</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Doctors Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Doctores</h4>
          <div className="space-y-2">
            {doctors.map((doctor) => (
              <div key={doctor.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`doctor-${doctor.id}`}
                  checked={selectedDoctors.includes(doctor.id)}
                  onCheckedChange={() => onDoctorToggle(doctor.id)}
                />
                <label
                  htmlFor={`doctor-${doctor.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: doctor.color }} />
                  {doctor.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Types Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Tipos de Cita</h4>
          <div className="space-y-2">
            {appointmentTypes.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type.value}`}
                  checked={selectedTypes.includes(type.value)}
                  onCheckedChange={() => onTypeToggle(type.value)}
                />
                <label
                  htmlFor={`type-${type.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {type.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Estados</h4>
          <div className="space-y-2">
            {appointmentStatuses.map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={selectedStatuses.includes(status.value)}
                  onCheckedChange={() => onStatusToggle(status.value)}
                />
                <label
                  htmlFor={`status-${status.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {status.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
