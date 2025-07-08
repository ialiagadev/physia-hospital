"use client"

import { useState, useEffect } from "react"
import { Clock, Plus, Trash2, Save, Coffee, Utensils, Timer } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { User, WorkSchedule, WorkScheduleBreak } from "@/types/calendar"
import { useWorkSchedules } from "@/hooks/use-work-schedules"

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
  buffer_time_minutes: number
  break_start?: string // Mantener para compatibilidad
  break_end?: string // Mantener para compatibilidad
  breaks: WorkScheduleBreak[]
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

const BREAK_PRESETS = [
  { name: "Descanso Mañana", start: "11:00", end: "11:15", icon: Coffee },
  { name: "Comida", start: "14:00", end: "15:00", icon: Utensils },
  { name: "Descanso Tarde", start: "17:00", end: "17:15", icon: Coffee },
]

const DEFAULT_SCHEDULE: ScheduleSlot = {
  day_of_week: 1,
  start_time: "09:00",
  end_time: "17:00",
  is_active: true,
  buffer_time_minutes: 5,
  breaks: [],
}

export function ScheduleConfigModal({ isOpen, onClose, user, onSave }: ScheduleConfigModalProps) {
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([])
  const [activeTab, setActiveTab] = useState("weekly")
  const [isLoading, setIsLoading] = useState(false)

  // Use the hook to get fresh data
  const { schedules: freshSchedules, loading: schedulesLoading } = useWorkSchedules(user.id)

  // Inicializar horarios desde el hook (datos frescos) o desde el usuario
  useEffect(() => {
    const sourceSchedules = freshSchedules.length > 0 ? freshSchedules : user.work_schedules

    if (sourceSchedules && sourceSchedules.length > 0) {
      const processedSchedules = sourceSchedules
        .filter((schedule) => schedule.day_of_week !== null)
        .map((schedule) => {
          return {
            id: schedule.id,
            day_of_week: schedule.day_of_week as number,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_active: schedule.is_active,
            buffer_time_minutes: schedule.buffer_time_minutes || 5,
            break_start: schedule.break_start || undefined,
            break_end: schedule.break_end || undefined,
            breaks: schedule.breaks || [],
          }
        })
      setSchedules(processedSchedules)
    } else {
      // Crear horario por defecto para días laborables
      const defaultSchedules = [1, 2, 3, 4, 5].map((day) => ({
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:00",
        is_active: true,
        buffer_time_minutes: 5,
        breaks: [],
      }))
      setSchedules(defaultSchedules)
    }
  }, [user, freshSchedules])

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
          buffer_time_minutes: 5,
          breaks: [],
        },
      ])
    }
  }

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedules.find((s) => s.day_of_week === dayOfWeek)
  }

  // Funciones para manejar descansos
  const addBreakToSchedule = (scheduleIndex: number, preset?: (typeof BREAK_PRESETS)[0]) => {
    const newBreak: WorkScheduleBreak = {
      id: `temp-${Date.now()}`,
      work_schedule_id: schedules[scheduleIndex].id || "",
      break_name: preset?.name || "Nuevo Descanso",
      start_time: preset?.start || "12:00",
      end_time: preset?.end || "12:30",
      is_active: true,
      sort_order: schedules[scheduleIndex].breaks.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const updatedSchedules = [...schedules]
    updatedSchedules[scheduleIndex].breaks.push(newBreak)
    setSchedules(updatedSchedules)
  }

  const removeBreakFromSchedule = (scheduleIndex: number, breakIndex: number) => {
    const updatedSchedules = [...schedules]
    updatedSchedules[scheduleIndex].breaks.splice(breakIndex, 1)
    // Reordenar sort_order
    updatedSchedules[scheduleIndex].breaks.forEach((breakItem, index) => {
      breakItem.sort_order = index
    })
    setSchedules(updatedSchedules)
  }

  const updateBreakInSchedule = (
    scheduleIndex: number,
    breakIndex: number,
    field: keyof WorkScheduleBreak,
    value: any,
  ) => {
    const updatedSchedules = [...schedules]
    updatedSchedules[scheduleIndex].breaks[breakIndex] = {
      ...updatedSchedules[scheduleIndex].breaks[breakIndex],
      [field]: value,
    }
    setSchedules(updatedSchedules)
  }

  const applyToAllDays = () => {
    if (schedules.length === 0) return

    const template = schedules[0]
    const newSchedules = DAYS_OF_WEEK.map((day) => ({
      day_of_week: day.value,
      start_time: template.start_time,
      end_time: template.end_time,
      is_active: true,
      buffer_time_minutes: template.buffer_time_minutes,
      breaks: [...template.breaks.map((b) => ({ ...b, id: `temp-${Date.now()}-${Math.random()}` }))],
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

        // Validar descansos
        for (const breakItem of schedule.breaks) {
          if (breakItem.start_time >= breakItem.end_time) {
            toast.error(`Descanso inválido en ${DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week)?.label}`)
            return
          }

          // Verificar que el descanso esté dentro del horario de trabajo
          if (breakItem.start_time < schedule.start_time || breakItem.end_time > schedule.end_time) {
            toast.error(`El descanso "${breakItem.break_name}" está fuera del horario de trabajo`)
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
        buffer_time_minutes: schedule.buffer_time_minutes,
        break_start: schedule.break_start || null,
        break_end: schedule.break_end || null,
        date_exception: null,
        is_exception: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        breaks: schedule.breaks.map((breakItem, index) => ({
          id: breakItem.id || `temp-${Date.now()}-${index}`,
          work_schedule_id: schedule.id || "",
          break_name: breakItem.break_name || `Descanso ${index + 1}`,
          start_time: breakItem.start_time,
          end_time: breakItem.end_time,
          is_active: breakItem.is_active ?? true,
          sort_order: breakItem.sort_order ?? index,
          created_at: breakItem.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
      }))

      await onSave(workSchedules)
      toast.success("Horarios guardados correctamente")
      onClose()
    } catch (error) {
      toast.error("Error al guardar horarios")
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

      // Restar todos los descansos activos
      schedule.breaks.forEach((breakItem) => {
        if (breakItem.is_active) {
          const breakStart = breakItem.start_time.split(":").map(Number)
          const breakEnd = breakItem.end_time.split(":").map(Number)
          const breakStartMinutes = breakStart[0] * 60 + breakStart[1]
          const breakEndMinutes = breakEnd[0] * 60 + breakEnd[1]
          dayMinutes -= breakEndMinutes - breakStartMinutes
        }
      })

      return total + Math.max(0, dayMinutes)
    }, 0)

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes > 0 ? `${minutes}m` : ""} semanales`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Días activos: {schedules.filter((s) => s.is_active).length}</p>
                  <p className="text-sm text-gray-600">Horas de trabajo: {getWorkingHours()}</p>
                  <p className="text-sm text-gray-600">
                    Total descansos: {schedules.reduce((total, s) => total + s.breaks.length, 0)}
                  </p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {DAYS_OF_WEEK.map((day) => {
                  const schedule = getScheduleForDay(day.value)
                  const isActive = schedule?.is_active || false
                  const scheduleIndex = schedules.findIndex((s) => s.day_of_week === day.value)

                  return (
                    <Card key={day.value} className={`${isActive ? "border-blue-200 bg-blue-50" : "border-gray-200"}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{day.label}</CardTitle>
                          <Switch checked={isActive} onCheckedChange={() => toggleDayActive(day.value)} />
                        </div>
                      </CardHeader>
                      {isActive && schedule && scheduleIndex >= 0 && (
                        <CardContent className="space-y-4">
                          {/* Horario principal */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Inicio</Label>
                              <Input
                                type="time"
                                value={schedule.start_time}
                                onChange={(e) => updateScheduleSlot(scheduleIndex, "start_time", e.target.value)}
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Fin</Label>
                              <Input
                                type="time"
                                value={schedule.end_time}
                                onChange={(e) => updateScheduleSlot(scheduleIndex, "end_time", e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          </div>

                          {/* Buffer time */}
                          <div>
                            <Label className="text-xs flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              Tiempo entre citas (min)
                            </Label>
                            <Select
                              value={schedule.buffer_time_minutes.toString()}
                              onValueChange={(value) =>
                                updateScheduleSlot(scheduleIndex, "buffer_time_minutes", Number.parseInt(value))
                              }
                            >
                              <SelectTrigger className="text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Sin buffer</SelectItem>
                                <SelectItem value="5">5 minutos</SelectItem>
                                <SelectItem value="10">10 minutos</SelectItem>
                                <SelectItem value="15">15 minutos</SelectItem>
                                <SelectItem value="30">30 minutos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Separator />

                          {/* Descansos */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">Descansos</Label>
                              <div className="flex gap-1">
                                {BREAK_PRESETS.map((preset, index) => (
                                  <Button
                                    key={index}
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => addBreakToSchedule(scheduleIndex, preset)}
                                    title={`Añadir ${preset.name}`}
                                  >
                                    <preset.icon className="h-3 w-3" />
                                  </Button>
                                ))}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => addBreakToSchedule(scheduleIndex)}
                                  title="Añadir descanso personalizado"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {schedule.breaks.length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-2">Sin descansos</p>
                            ) : (
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {schedule.breaks.map((breakItem, breakIndex) => (
                                  <div key={breakIndex} className="bg-white rounded border p-2 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Input
                                        value={breakItem.break_name}
                                        onChange={(e) =>
                                          updateBreakInSchedule(scheduleIndex, breakIndex, "break_name", e.target.value)
                                        }
                                        className="text-xs h-6 flex-1 mr-2"
                                        placeholder="Nombre del descanso"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-red-500"
                                        onClick={() => removeBreakFromSchedule(scheduleIndex, breakIndex)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <Input
                                        type="time"
                                        value={breakItem.start_time}
                                        onChange={(e) =>
                                          updateBreakInSchedule(scheduleIndex, breakIndex, "start_time", e.target.value)
                                        }
                                        className="text-xs h-6"
                                      />
                                      <Input
                                        type="time"
                                        value={breakItem.end_time}
                                        onChange={(e) =>
                                          updateBreakInSchedule(scheduleIndex, breakIndex, "end_time", e.target.value)
                                        }
                                        className="text-xs h-6"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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

              <div className="space-y-4">
                {schedules.map((schedule, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Configuración básica */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                          <div>
                            <Label>Día</Label>
                            <Select
                              value={schedule.day_of_week.toString()}
                              onValueChange={(value) =>
                                updateScheduleSlot(index, "day_of_week", Number.parseInt(value))
                              }
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
                            <Label>Buffer (min)</Label>
                            <Select
                              value={schedule.buffer_time_minutes.toString()}
                              onValueChange={(value) =>
                                updateScheduleSlot(index, "buffer_time_minutes", Number.parseInt(value))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Sin buffer</SelectItem>
                                <SelectItem value="5">5 min</SelectItem>
                                <SelectItem value="10">10 min</SelectItem>
                                <SelectItem value="15">15 min</SelectItem>
                                <SelectItem value="30">30 min</SelectItem>
                              </SelectContent>
                            </Select>
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

                        {/* Descansos detallados */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="font-medium">Descansos</Label>
                            <div className="flex gap-2">
                              {BREAK_PRESETS.map((preset, presetIndex) => (
                                <Button
                                  key={presetIndex}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addBreakToSchedule(index, preset)}
                                  className="gap-1"
                                >
                                  <preset.icon className="h-3 w-3" />
                                  {preset.name}
                                </Button>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addBreakToSchedule(index)}
                                className="gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Personalizado
                              </Button>
                            </div>
                          </div>

                          {schedule.breaks.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 border-2 border-dashed rounded">
                              Sin descansos configurados
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              {schedule.breaks.map((breakItem, breakIndex) => (
                                <div key={breakIndex} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                  <Input
                                    value={breakItem.break_name}
                                    onChange={(e) =>
                                      updateBreakInSchedule(index, breakIndex, "break_name", e.target.value)
                                    }
                                    className="flex-1"
                                    placeholder="Nombre del descanso"
                                  />
                                  <Input
                                    type="time"
                                    value={breakItem.start_time}
                                    onChange={(e) =>
                                      updateBreakInSchedule(index, breakIndex, "start_time", e.target.value)
                                    }
                                    className="w-24"
                                  />
                                  <span className="text-gray-500">-</span>
                                  <Input
                                    type="time"
                                    value={breakItem.end_time}
                                    onChange={(e) =>
                                      updateBreakInSchedule(index, breakIndex, "end_time", e.target.value)
                                    }
                                    className="w-24"
                                  />
                                  <Switch
                                    checked={breakItem.is_active}
                                    onCheckedChange={(checked) =>
                                      updateBreakInSchedule(index, breakIndex, "is_active", checked)
                                    }
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeBreakFromSchedule(index, breakIndex)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
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
