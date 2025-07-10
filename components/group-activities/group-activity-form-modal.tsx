"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { format } from "date-fns"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useConsultations } from "@/hooks/use-consultations"
import type { GroupActivity } from "@/hooks/use-group-activities"
import { es } from "date-fns/locale"

interface GroupActivityFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  organizationId: number
  activity?: GroupActivity
  users: any[]
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

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: new Date(),
    start_time: "09:00",
    end_time: "10:00",
    professional_id: "",
    consultation_id: "",
    max_participants: 10,
    color: "#3B82F6",
  })

  const [loading, setLoading] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)

  // Initialize form data when editing
  useEffect(() => {
    if (activity) {
      setFormData({
        name: activity.name,
        description: activity.description || "",
        date: new Date(activity.date),
        start_time: activity.start_time,
        end_time: activity.end_time,
        professional_id: activity.professional_id,
        consultation_id: activity.consultation_id || "",
        max_participants: activity.max_participants,
        color: activity.color,
      })
    }
  }, [activity])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert("El nombre es requerido")
      return
    }

    if (!formData.professional_id) {
      alert("Debe seleccionar un profesional")
      return
    }

    try {
      setLoading(true)
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("Error al guardar la actividad")
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
          {/* Name */}
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
            <Label>Fecha *</Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => {
                    if (date) {
                      setFormData((prev) => ({ ...prev, date }))
                      setShowCalendar(false)
                    }
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Hora de inicio *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => handleTimeChange("start_time", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Hora de fin *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => handleTimeChange("end_time", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Professional */}
          <div className="space-y-2">
            <Label>Profesional responsable *</Label>
            <Select
              value={formData.professional_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, professional_id: value }))}
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
            <Input
              id="max_participants"
              type="number"
              min="1"
              max="50"
              value={formData.max_participants}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, max_participants: Number.parseInt(e.target.value) || 1 }))
              }
              required
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md border text-sm hover:bg-gray-50",
                    formData.color === option.value && "ring-2 ring-blue-500",
                  )}
                  onClick={() => setFormData((prev) => ({ ...prev, color: option.value }))}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: option.color }} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : activity ? "Actualizar" : "Crear Actividad"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}