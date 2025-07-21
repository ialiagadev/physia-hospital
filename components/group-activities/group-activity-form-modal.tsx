"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
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
import { useUserServices } from "../services/use-user-services"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Clock, Users, Palette, RotateCcw, Loader2 } from "lucide-react"
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

// Colores predefinidos para acceso rápido
const quickColorOptions = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Amarillo" },
  { value: "#EF4444", label: "Rojo" },
  { value: "#8B5CF6", label: "Púrpura" },
  { value: "#06B6D4", label: "Cian" },
  { value: "#84CC16", label: "Lima" },
  { value: "#F97316", label: "Naranja" },
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
  const { getServicesByUser, loading: userServicesLoading, error: userServicesError } = useUserServices(organizationId)

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

  const [filteredServices, setFilteredServices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
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

  // ✅ MEMOIZAR LA FUNCIÓN DE ACTUALIZACIÓN DE SERVICIOS
  const updateServices = useCallback(
    async (professionalId: string) => {
      if (!professionalId) {
        setFilteredServices([])
        return
      }

      try {
        const professionalServices = await getServicesByUser(professionalId)
        setFilteredServices(professionalServices)
      } catch (error) {
        console.error("Error fetching professional services:", error)
        setFilteredServices([])
        toast.error("Error al cargar los servicios del profesional")
      }
    },
    [getServicesByUser],
  )

  // ✅ OBTENER SERVICIOS DEL PROFESIONAL SELECCIONADO - ARREGLADO
  useEffect(() => {
    updateServices(formData.professional_id)
  }, [formData.professional_id, updateServices])

  // ✅ VERIFICACIÓN DE CONFLICTOS MEJORADA
  useEffect(() => {
    if (formData.date && formData.start_time && formData.end_time && formData.professional_id) {
      const timeoutId = setTimeout(() => {
        const duration = calculateDurationInMinutes(formData.start_time, formData.end_time)

        if (duration > 0) {
          checkConflicts(
            formData.date,
            formData.start_time,
            duration,
            formData.professional_id,
            undefined,
            isEditing ? activity?.id : undefined,
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

    // Validaciones
    if (!formData.name.trim()) {
      toast.error("El nombre de la actividad es obligatorio")
      return
    }

    if (!formData.professional_id) {
      toast.error("Debe seleccionar un profesional")
      return
    }

    if (!formData.service_id) {
      toast.error("Debe seleccionar un servicio")
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

    if (conflicts.length > 0) {
      toast.error("Hay conflictos de horario. Por favor, revise las citas existentes.")
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        service_id: Number(formData.service_id),
        date: formData.date,
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

  const resetToDefaultColor = () => {
    setFormData((prev) => ({ ...prev, color: "#3B82F6" }))
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

          {/* Professional - PRIMERO */}
          <div className="space-y-2">
            <Label>Profesional responsable *</Label>
            <Select
              value={formData.professional_id}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  professional_id: value,
                  service_id: "", // Reset service when professional changes
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar profesional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((professional) => (
                  <SelectItem key={professional.id} value={professional.id}>
                    {professional.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Selection - SEGUNDO */}
          <div className="space-y-2">
            <Label htmlFor="service">Servicio *</Label>
            <Select
              value={formData.service_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, service_id: value }))}
              disabled={!formData.professional_id || userServicesLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !formData.professional_id
                      ? "Primero seleccione un profesional"
                      : userServicesLoading
                        ? "Cargando servicios..."
                        : filteredServices.length === 0
                          ? "No hay servicios disponibles"
                          : "Seleccionar servicio"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredServices.map((service) => (
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

            {/* Loading indicator */}
            {userServicesLoading && formData.professional_id && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando servicios del profesional...
              </div>
            )}

            {/* Error message */}
            {userServicesError && <p className="text-sm text-red-600">{userServicesError}</p>}

            {/* Status messages */}
            {formData.professional_id && !userServicesLoading && filteredServices.length === 0 && (
              <p className="text-sm text-amber-600">Este profesional no tiene servicios asignados</p>
            )}
            {formData.professional_id && !userServicesLoading && filteredServices.length > 0 && (
              <p className="text-sm text-blue-600">
                {filteredServices.length} servicio(s) disponible(s) para este profesional
              </p>
            )}
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

          {/* Date */}
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

          {/* Time */}
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

          {/* Conflicts Alert */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium mb-2">⚠️ Conflictos de horario detectados:</p>
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded border-l-4 border-red-400">
                      {conflict.type === "group_activity" ? (
                        <>
                          • <strong>Actividad Grupal:</strong> {conflict.client_name}
                          <br />
                          <span className="text-gray-600 ml-2">
                            {conflict.start_time} a {conflict.end_time}
                            {conflict.professional_name && ` (Prof: ${conflict.professional_name})`}
                          </span>
                        </>
                      ) : (
                        <>
                          • <strong>Cita Individual:</strong> {conflict.client_name}
                          <br />
                          <span className="text-gray-600 ml-2">
                            {conflict.start_time} a {conflict.end_time}
                            {conflict.professional_name && ` (Prof: ${conflict.professional_name})`}
                          </span>
                        </>
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

          {/* Max Participants */}
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

          {/* Color Picker */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color de la actividad
            </Label>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-10 p-1 border rounded cursor-pointer"
                  title="Seleccionar color personalizado"
                />
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-gray-300"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-sm font-mono text-gray-600">{formData.color.toUpperCase()}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToDefaultColor}
                className="flex items-center gap-1 bg-transparent"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Colores rápidos:</Label>
              <div className="flex flex-wrap gap-2">
                {quickColorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                      formData.color === option.value
                        ? "border-gray-900 ring-2 ring-gray-400 ring-offset-1"
                        : "border-gray-300 hover:border-gray-500",
                    )}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                    onClick={() => setFormData((prev) => ({ ...prev, color: option.value }))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Recurrence */}
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
