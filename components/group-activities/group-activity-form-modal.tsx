"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useConsultations } from "@/hooks/use-consultations"
import type { GroupActivity } from "@/hooks/use-group-activities"
import { useServices } from "@/hooks/use-services"
import { useUsers } from "@/hooks/use-users"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Clock, Users, Palette } from "lucide-react"
import { toast } from "sonner"
import { useAppointmentConflicts } from "@/hooks/use-appointment-conflicts"
import { RecurrenceConfigComponent } from "@/components/recurrence-config"

interface GroupActivityFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  organizationId: number
  activity?: GroupActivity
  users: any[]
}

// ✅ FUNCIÓN AUXILIAR PARA CALCULAR DURACIÓN
function calculateDurationInMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(":").map(Number)
  const [endHours, endMinutes] = endTime.split(":").map(Number)

  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes

  return endTotalMinutes - startTotalMinutes
}

const colorOptions = [
  { value: "#3B82F6", label: "Azul", color: "#3B82F6" },
  { value: "#10B981", label: "Verde", color: "#10B981" },
  { value: "#F59E0B", label: "Amarillo", color: "#F59E0B" },
  { value: "#EF4444", label: "Rojo", color: "#EF4444" },
  { value: "#8B5CF6", label: "Púrpura", color: "#8B5CF6" },
  { value: "#06B6D4", label: "Cian", color: "#06B6D4" },
  { value: "#84CC16", label: "Lima", color: "#84CC16" },
  { value: "#F97316", label: "Naranja", color: "#F97316" },
]

export function GroupActivityFormModal({
  isOpen,
  onClose,
  onSubmit,
  organizationId,
  activity,
  users,
}: GroupActivityFormModalProps) {
  const { consultations } = useConsultations(organizationId)
  const { services, loading: servicesLoading } = useServices(organizationId)
  const { getUsersByService } = useUsers(organizationId)

  const [formData, setFormData] = useState({
    name: "",
    service_id: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "10:00",
    professional_id: "",
    consultation_id: "",
    max_participants: 10,
    color: "#3B82F6",
    recurrence: null as any,
  })

  const [filteredProfessionals, setFilteredProfessionals] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const isEditing = !!activity

  // Hook para detectar conflictos
  const { conflicts, checkConflicts, loading: conflictsLoading } = useAppointmentConflicts(organizationId)

  // Initialize form data when editing
  useEffect(() => {
    if (activity) {
      setFormData({
        name: activity.name || "",
        service_id: activity.service_id?.toString() || "",
        description: activity.description || "",
        date: new Date(activity.date).toISOString().split("T")[0],
        start_time: activity.start_time,
        end_time: activity.end_time,
        professional_id: activity.professional_id,
        consultation_id: activity.consultation_id || "",
        max_participants: activity.max_participants,
        color: activity.color,
        recurrence: null,
      })
      setRecurrenceEnabled(false)
    } else {
      // Reset form for new activity
      setFormData({
        name: "",
        service_id: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        start_time: "09:00",
        end_time: "10:00",
        professional_id: "",
        consultation_id: "",
        max_participants: 10,
        color: "#3B82F6",
        recurrence: null,
      })
      setRecurrenceEnabled(false)
    }
  }, [activity])

  useEffect(() => {
    const updateProfessionals = async () => {
      if (formData.service_id) {
        const serviceUsers = await getUsersByService(Number(formData.service_id))
        setFilteredProfessionals(serviceUsers)
      } else {
        // Si no hay servicio seleccionado, mostrar todos los profesionales
        const allProfessionals = users.filter((user) => user.type === 1)
        setFilteredProfessionals(allProfessionals)
      }
    }

    updateProfessionals()
  }, [formData.service_id, getUsersByService, users])

  // ✅ VERIFICACIÓN DE CONFLICTOS SIMPLIFICADA
  useEffect(() => {
    if (formData.date && formData.start_time && formData.end_time && formData.professional_id) {
      const timeoutId = setTimeout(() => {
        // Calcular duración usando la función auxiliar
        const duration = calculateDurationInMinutes(formData.start_time, formData.end_time)

        // Solo verificar conflictos si la duración es válida
        if (duration > 0) {
          checkConflicts(
            formData.date, // string
            formData.start_time, // string
            duration, // number (minutos)
            formData.professional_id, // string
            isEditing ? activity?.id : undefined, // string | undefined
          )
        }
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [
    formData.date,
    formData.start_time,
    formData.end_time,
    formData.professional_id,
    checkConflicts,
    isEditing,
    activity?.id,
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones mejoradas
    if (!formData.name.trim()) {
      toast.error("El nombre de la actividad es obligatorio")
      return
    }

    if (!formData.service_id) {
      toast.error("Debe seleccionar un servicio")
      return
    }

    if (!formData.professional_id) {
      toast.error("Debe seleccionar un profesional")
      return
    }

    if (formData.start_time >= formData.end_time) {
      toast.error("La hora de fin debe ser posterior a la hora de inicio")
      return
    }

    if (formData.max_participants < 1) {
      toast.error("El número máximo de participantes debe ser al menos 1")
      return
    }

    // Verificar conflictos antes de enviar
    if (conflicts.length > 0) {
      toast.error("Hay conflictos de horario. Por favor, revise las citas existentes.")
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        service_id: Number(formData.service_id),
        date: formData.date, // Mantener como string
        consultation_id: formData.consultation_id === "none" ? null : formData.consultation_id || null,
        recurrence: recurrenceEnabled && formData.recurrence ? formData.recurrence : null,
      }

      await onSubmit(submitData)
      toast.success(isEditing ? "Actividad actualizada correctamente" : "Actividad creada correctamente")
      onClose()
    } catch (error) {
      console.error("Error submitting form:", error)
      toast.error("Error al guardar la actividad")
    } finally {
      setLoading(false)
    }
  }

  const handleTimeChange = (field: "start_time" | "end_time", value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }

      // Auto-adjust end time if start time changes
      if (field === "start_time") {
        const [hours, minutes] = value.split(":").map(Number)
        const endHours = hours + 1
        const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
        newData.end_time = endTime
      }

      return newData
    })
  }

  const handleRecurrenceChange = (config: any) => {
    setFormData((prev) => ({
      ...prev,
      recurrence: config,
    }))
  }

  // Filtrar solo profesionales médicos (type === 1)
  const professionals = users.filter((user) => user.type === 1)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity ? "Editar Actividad Grupal" : "Nueva Actividad Grupal"}</DialogTitle>
          <DialogDescription>
            {activity
              ? "Modifica los detalles de la actividad grupal"
              : "Crea una nueva actividad grupal para tus pacientes"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre de la actividad */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la actividad *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Terapia grupal de ansiedad"
              required
            />
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Servicio *</Label>
            <Select
              value={formData.service_id}
              onValueChange={(value) => {
                setFormData((prev) => ({
                  ...prev,
                  service_id: value,
                  professional_id: "", // Reset professional when service changes
                }))
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                      <span>{service.name}</span>
                      <span className="text-xs text-gray-500">({service.duration}min)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe la actividad y sus objetivos..."
              rows={3}
            />
          </div>

          {/* Date - Simple date input */}
          <div className="space-y-2">
            <Label htmlFor="date">Fecha *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              min={new Date().toISOString().split("T")[0]}
              required
            />
          </div>

          {/* Time - Improved with icons */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Hora de inicio *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleTimeChange("start_time", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Hora de fin *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleTimeChange("end_time", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          {/* Professional */}
          <div className="space-y-2">
            <Label>Profesional responsable *</Label>
            <Select
              value={formData.professional_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, professional_id: value }))}
              disabled={filteredProfessionals.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    filteredProfessionals.length === 0 ? "No hay profesionales disponibles" : "Seleccionar profesional"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredProfessionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.service_id && filteredProfessionals.length === 0 && (
              <p className="text-sm text-amber-600">No hay profesionales asignados a este servicio</p>
            )}
            {formData.service_id && filteredProfessionals.length > 0 && (
              <p className="text-sm text-blue-600">
                {filteredProfessionals.length} profesional(es) disponible(s) para este servicio
              </p>
            )}
          </div>

          {/* Alertas de conflictos - MOVIDO AQUÍ */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium mb-2">⚠️ Conflictos de horario detectados:</p>
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded border-l-4 border-red-400">
                      • <strong>{conflict.client_name}</strong> - {conflict.start_time} a {conflict.end_time}
                      {conflict.professional_name && (
                        <span className="text-gray-600"> (Prof: {conflict.professional_name})</span>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-red-700 mt-2">
                    💡 Cambie la fecha, horario o profesional para resolver los conflictos
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Consultation */}
          <div className="space-y-2">
            <Label>Consulta (opcional)</Label>
            <Select
              value={formData.consultation_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, consultation_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar consulta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin consulta específica</SelectItem>
                {consultations.map((consultation) => (
                  <SelectItem key={consultation.id} value={consultation.id.toString()}>
                    {consultation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Participants - Improved with icon */}
          <div className="space-y-2">
            <Label htmlFor="max_participants">Máximo de participantes *</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="max_participants"
                type="number"
                min="1"
                max="50"
                value={formData.max_participants}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, max_participants: Number.parseInt(e.target.value) || 1 }))
                }
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Color - Improved design */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color de la actividad
            </Label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    formData.color === option.value ? "border-gray-900 scale-110" : "border-gray-300 hover:scale-105",
                  )}
                  style={{ backgroundColor: option.color }}
                  title={option.label}
                  onClick={() => setFormData((prev) => ({ ...prev, color: option.value }))}
                />
              ))}
            </div>
          </div>

          {/* Recurrencia - Solo para nuevas actividades */}
          {!isEditing && (
            <div>
              <RecurrenceConfigComponent
                isEnabled={recurrenceEnabled}
                onEnabledChange={setRecurrenceEnabled}
                config={formData.recurrence}
                onConfigChange={handleRecurrenceChange}
                startDate={new Date(formData.date)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || conflictsLoading || conflicts.length > 0}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? "Actualizando..." : "Creando..."}
                </>
              ) : isEditing ? (
                "Actualizar Actividad"
              ) : (
                "Crear Actividad"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
