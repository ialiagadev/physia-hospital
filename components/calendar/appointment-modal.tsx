"use client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Clock, User, MapPin, FileText, Phone, Mail } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Appointment, Doctor, Patient } from "@/types/calendar"

interface AppointmentModalProps {
  appointment: Appointment | null
  doctor: Doctor | null
  patient: Patient | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (appointment: Appointment) => void
  onDelete?: (appointmentId: string) => void
}

const appointmentTypeLabels = {
  consultation: "Consulta",
  surgery: "Cirugía",
  emergency: "Emergencia",
  followup: "Seguimiento",
  checkup: "Revisión",
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

export function AppointmentModal({
  appointment,
  doctor,
  patient,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: AppointmentModalProps) {
  if (!appointment || !doctor || !patient) return null

  // Función para verificar si se puede cancelar la cita
  const canCancelAppointment = (status: string) => {
    return status !== "completed" && status !== "cancelled"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {appointment.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Type */}
          <div className="flex gap-2">
            <Badge className={statusColors[appointment.status as keyof typeof statusColors]}>
              {statusLabels[appointment.status as keyof typeof statusLabels]}
            </Badge>
            <Badge variant="outline">{appointmentTypeLabels[appointment.type]}</Badge>
          </div>

          {/* Date and Time */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(appointment.startTime, "EEEE, d MMMM yyyy", { locale: es })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(appointment.startTime, "HH:mm")} - {format(appointment.endTime, "HH:mm")}
              </span>
            </div>
          </div>

          <Separator />

          {/* Doctor Information */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Doctor
            </h3>
            <div className="ml-6 space-y-1">
              <p className="font-medium">{doctor.name}</p>
              <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
            </div>
          </div>

          <Separator />

          {/* Patient Information */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Paciente
            </h3>
            <div className="ml-6 space-y-2">
              <p className="font-medium">{patient.name}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {patient.phone}
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {patient.email}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Fecha de nacimiento: {format(new Date(patient.birthDate), "d/MM/yyyy")}
              </p>
            </div>
          </div>

          {/* Room */}
          {appointment.room && (
            <>
              <Separator />
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Sala:</span>
                <span>{appointment.room}</span>
              </div>
            </>
          )}

          {/* Description */}
          {appointment.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Descripción</h3>
                <p className="text-sm text-muted-foreground">{appointment.description}</p>
              </div>
            </>
          )}

          {/* Notes */}
          {appointment.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notas
                </h3>
                <p className="text-sm text-muted-foreground ml-6">{appointment.notes}</p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(appointment)}>
                Editar
              </Button>
            )}
            {onDelete && canCancelAppointment(appointment.status) && (
              <Button variant="destructive" onClick={() => onDelete(appointment.id)}>
                Cancelar Cita
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
