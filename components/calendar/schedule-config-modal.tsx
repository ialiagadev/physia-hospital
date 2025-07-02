"use client"

import { useState, useEffect } from "react"
import { Clock, Plus, Trash2, Save } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type { User, WorkSchedule } from "@/types/calendar"

interface ScheduleConfigModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onSave: (schedules: WorkSchedule[]) => void
}

interface ScheduleSlot {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  break_start?: string
  break_end?: string
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes", short: "L" },
  { value: 2, label: "Martes", short: "M" },
  { value: 3, label: "Miércoles", short: "X" },
  { value: 4, label: "Jueves", short: "J" },
  { value: 5, label: "Viernes", short: "V" },
  { value: 6, label: "Sábado", short: "S" },
  { value: 0, label: "Domingo", short: "D" },
]

const DEFAULT_SCHEDULE: ScheduleSlot = {
  day_of_week: 1,
  start_time: "09:00",
  end_time: "17:00",
  is_active: true,
}

export function ScheduleConfigModal({ isOpen, onClose, user, onSave }: ScheduleConfigModalProps) {
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([])
  const [activeTab, setActiveTab] = useState("weekly")
  const [isLoading, setIsLoading] = useState(false)

  // Inicializar horarios desde el usuario
  useEffect(() => {
    if (user.work_schedules && user.work_schedules.length > 0) {
      setSchedules(
        user.work_schedules
          .filter((schedule) => schedule.day_of_week !== null) // Filtrar schedules con day_of_week null
          .map((schedule) => ({
            id: schedule.id,
            day_of_week: schedule.day_of_week as number, // Type assertion ya que filtramos los null
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_active: schedule.is_active,
            break_start: schedule.break_start || undefined,
            break_end: schedule.break_end || undefined,
          })),
      )
    } else {
      // Crear horario por defecto para días laborables
      const defaultSchedules = [1, 2, 3, 4, 5].map((day) => ({
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:00",
        is_active: true,
      }))
      setSchedules(defaultSchedules)
    }
  }, [user])

  const addScheduleSlot = () => {
    setSchedules([...schedules, { ...DEFAULT_SCHEDULE }])
  }

  const removeScheduleSlot = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index))
  }

  const updateScheduleSlot = (index: number, field: keyof ScheduleSlot, value: any) => {
    const updated = schedules.map((schedule, i) => (i === index ? { ...schedule, [field]: value } : schedule))
    setSchedules(updated)
  }

  const toggleDayActive = (dayOfWeek: number) => {
    const existingIndex = schedules.findIndex((s) => s.day_of_week === dayOfWeek)

    if (existingIndex >= 0) {
      updateScheduleSlot(existingIndex, "is_active", !schedules[existingIndex].is_active)
    } else {
      // Crear nuevo horario para este día
      setSchedules([
        ...schedules,
        {
          day_of_week: dayOfWeek,
          start_time: "09:00",
          end_time: "17:00",
          is_active: true,
        },
      ])
    }
  }

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedules.find((s) => s.day_of_week === dayOfWeek)
  }

  const applyToAllDays = () => {
    if (schedules.length === 0) return

    const template = schedules[0]
    const newSchedules = DAYS_OF_WEEK.map((day) => ({
      day_of_week: day.value,
      start_time: template.start_time,
      end_time: template.end_time,
      is_active: true,
      break_start: template.break_start,
      break_end: template.break_end,
    }))

    setSchedules(newSchedules)
    toast.success("Horario aplicado a todos los días")
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Validar horarios
      const validSchedules = schedules.filter((s) => s.is_active && s.start_time && s.end_time)

      for (const schedule of validSchedules) {
        if (schedule.start_time >= schedule.end_time) {
          toast.error(`Horario inválido para ${DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week)?.label}`)
          return
        }

        if (schedule.break_start && schedule.break_end) {
          if (schedule.break_start >= schedule.break_end) {
            toast.error(
              `Horario de descanso inválido para ${DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week)?.label}`,
            )
            return
          }
        }
      }

      // Convertir ScheduleSlot[] a WorkSchedule[] para el callback
      const workSchedules: WorkSchedule[] = validSchedules.map((schedule) => ({
        id: schedule.id || "",
        user_id: user.id,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        is_active: schedule.is_active,
        break_start: schedule.break_start || null,
        break_end: schedule.break_end || null,
        date_exception: null,
        is_exception: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }))

      await onSave(workSchedules)
      toast.success("Horarios guardados correctamente")
      onClose()
    } catch (error) {
      toast.error("Error al guardar horarios")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const getWorkingHours = () => {
    const activeSchedules = schedules.filter((s) => s.is_active)
    if (activeSchedules.length === 0) return "Sin horarios configurados"

    const totalMinutes = activeSchedules.reduce((total, schedule) => {
      const start = schedule.start_time.split(":").map(Number)
      const end = schedule.end_time.split(":").map(Number)
      const startMinutes = start[0] * 60 + start[1]
      const endMinutes = end[0] * 60 + end[1]

      let dayMinutes = endMinutes - startMinutes

      // Restar descanso si existe
      if (schedule.break_start && schedule.break_end) {
        const breakStart = schedule.break_start.split(":").map(Number)
        const breakEnd = schedule.break_end.split(":").map(Number)
        const breakStartMinutes = breakStart[0] * 60 + breakStart[1]
        const breakEndMinutes = breakEnd[0] * 60 + breakEnd[1]
        dayMinutes -= breakEndMinutes - breakStartMinutes
      }

      return total + dayMinutes
    }, 0)

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return `${hours}h ${minutes > 0 ? `${minutes}m` : ""} semanales`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Configuración de Horarios - {user.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Días activos: {schedules.filter((s) => s.is_active).length}</p>
                  <p className="text-sm text-gray-600">Horas de trabajo: {getWorkingHours()}</p>
                </div>
                <Button variant="outline" onClick={applyToAllDays} size="sm">
                  Aplicar a todos los días
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="weekly">Vista Semanal</TabsTrigger>
              <TabsTrigger value="detailed">Vista Detallada</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DAYS_OF_WEEK.map((day) => {
                  const schedule = getScheduleForDay(day.value)
                  const isActive = schedule?.is_active || false

                  return (
                    <Card key={day.value} className={`${isActive ? "border-blue-200 bg-blue-50" : "border-gray-200"}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{day.label}</CardTitle>
                          <Switch checked={isActive} onCheckedChange={() => toggleDayActive(day.value)} />
                        </div>
                      </CardHeader>

                      {isActive && schedule && (
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Inicio</Label>
                              <Input
                                type="time"
                                value={schedule.start_time}
                                onChange={(e) => {
                                  const index = schedules.findIndex((s) => s.day_of_week === day.value)
                                  if (index >= 0) {
                                    updateScheduleSlot(index, "start_time", e.target.value)
                                  }
                                }}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Fin</Label>
                              <Input
                                type="time"
                                value={schedule.end_time}
                                onChange={(e) => {
                                  const index = schedules.findIndex((s) => s.day_of_week === day.value)
                                  if (index >= 0) {
                                    updateScheduleSlot(index, "end_time", e.target.value)
                                  }
                                }}
                                className="text-sm"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Descanso inicio</Label>
                              <Input
                                type="time"
                                value={schedule.break_start || ""}
                                onChange={(e) => {
                                  const index = schedules.findIndex((s) => s.day_of_week === day.value)
                                  if (index >= 0) {
                                    updateScheduleSlot(index, "break_start", e.target.value || undefined)
                                  }
                                }}
                                className="text-sm"
                                placeholder="Opcional"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Descanso fin</Label>
                              <Input
                                type="time"
                                value={schedule.break_end || ""}
                                onChange={(e) => {
                                  const index = schedules.findIndex((s) => s.day_of_week === day.value)
                                  if (index >= 0) {
                                    updateScheduleSlot(index, "break_end", e.target.value || undefined)
                                  }
                                }}
                                className="text-sm"
                                placeholder="Opcional"
                              />
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="detailed" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Horarios Detallados</h3>
                <Button onClick={addScheduleSlot} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Horario
                </Button>
              </div>

              <div className="space-y-3">
                {schedules.map((schedule, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <div>
                          <Label>Día</Label>
                          <Select
                            value={schedule.day_of_week.toString()}
                            onValueChange={(value) => updateScheduleSlot(index, "day_of_week", Number.parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Inicio</Label>
                          <Input
                            type="time"
                            value={schedule.start_time}
                            onChange={(e) => updateScheduleSlot(index, "start_time", e.target.value)}
                          />
                        </div>

                        <div>
                          <Label>Fin</Label>
                          <Input
                            type="time"
                            value={schedule.end_time}
                            onChange={(e) => updateScheduleSlot(index, "end_time", e.target.value)}
                          />
                        </div>

                        <div>
                          <Label>Descanso inicio</Label>
                          <Input
                            type="time"
                            value={schedule.break_start || ""}
                            onChange={(e) => updateScheduleSlot(index, "break_start", e.target.value || undefined)}
                            placeholder="Opcional"
                          />
                        </div>

                        <div>
                          <Label>Descanso fin</Label>
                          <Input
                            type="time"
                            value={schedule.break_end || ""}
                            onChange={(e) => updateScheduleSlot(index, "break_end", e.target.value || undefined)}
                            placeholder="Opcional"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={schedule.is_active}
                              onCheckedChange={(checked) => updateScheduleSlot(index, "is_active", checked)}
                            />
                            <Label className="text-sm">Activo</Label>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeScheduleSlot(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Botones de acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="gap-2">
              <Save className="h-4 w-4" />
              {isLoading ? "Guardando..." : "Guardar Horarios"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
