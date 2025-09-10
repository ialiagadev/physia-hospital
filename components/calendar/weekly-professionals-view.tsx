"use client"
import { useState, useEffect } from "react"
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, User, Calendar } from "lucide-react"
import type { Cita, Profesional, IntervaloTiempo } from "@/types/calendar"
import { useAuth } from "@/app/contexts/auth-context"
import { toast } from "sonner"

interface AvailableSlot {
  start_time: string
  end_time: string
  available: boolean
  professional_id?: string
  professional_name?: string
}

interface WeeklyProfessionalsViewProps {
  date: Date
  citas: Cita[]
  profesionales: Profesional[]
  onSelectCita: (cita: Cita) => void
  profesionalesSeleccionados: number[]
  intervaloTiempo: IntervaloTiempo
  onUpdateCita: (cita: Cita) => void
  onAddCita: (cita: Partial<Cita>) => void
  onDateSelect?: (date: Date) => void
  organizationId?: number
}

const getColorProfesional = (profesional: Profesional) => {
  const color = profesional.color || "#3B82F6"
  return {
    backgroundColor: `${color}15`,
    borderColor: color,
    textColor: color,
  }
}

// Función helper para convertir UUID a número
const uuidToNumber = (uuid: string): number => {
  try {
    return Number.parseInt(uuid.slice(-8), 16)
  } catch {
    return 0
  }
}

export function WeeklyProfessionalsView({
  date,
  citas,
  profesionales,
  onSelectCita,
  profesionalesSeleccionados,
  intervaloTiempo,
  onUpdateCita,
  onAddCita,
  onDateSelect,
  organizationId,
}: WeeklyProfessionalsViewProps) {
  const { user, userProfile } = useAuth()
  const [availableSlots, setAvailableSlots] = useState<Record<string, AvailableSlot[]>>({})
  const [loadingSlots, setLoadingSlots] = useState<Record<string, boolean>>({})

  // Generar días de la semana
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Verificar si el usuario actual tiene rol 'user'
  const isUserRole = userProfile?.role === "user"

  // Filtrar profesionales según el rol
  const filteredProfesionales = isUserRole
    ? profesionales.filter((prof) => {
        if (typeof prof.id === "number" && typeof userProfile?.id === "string") {
          const userIdAsNumber = uuidToNumber(userProfile.id)
          return prof.id === userIdAsNumber
        }
        return prof.id === userProfile?.id
      })
    : profesionales.filter((prof) => {
        if (typeof prof.id === "number") {
          return profesionalesSeleccionados.includes(prof.id)
        }
        const profIdAsNumber = uuidToNumber(prof.id as string)
        return profesionalesSeleccionados.includes(profIdAsNumber)
      })

  const fetchAvailableSlotsForProfessional = async (professionalId: string | number, targetDate: Date) => {
    if (!organizationId) return []

    const dateStr = format(targetDate, "yyyy-MM-dd")
    const slotKey = `${professionalId}-${dateStr}`

    setLoadingSlots((prev) => ({ ...prev, [slotKey]: true }))

    try {
      // Usar un servicio genérico (duración 60 min) para calcular huecos
      const response = await fetch(
        `/api/available-slots?professionalId=${professionalId}&serviceId=1&date=${dateStr}&organizationId=${organizationId}`,
      )

      if (!response.ok) {
        console.error("Error fetching slots:", response.statusText)
        return []
      }

      const data = await response.json()
      return data.slots || []
    } catch (error) {
      console.error("Error fetching available slots:", error)
      return []
    } finally {
      setLoadingSlots((prev) => ({ ...prev, [slotKey]: false }))
    }
  }

  useEffect(() => {
    const loadAllSlots = async () => {
      const newSlots: Record<string, AvailableSlot[]> = {}

      for (const profesional of filteredProfesionales) {
        for (const day of weekDays) {
          const dateStr = format(day, "yyyy-MM-dd")
          const slotKey = `${profesional.id}-${dateStr}`

          const slots = await fetchAvailableSlotsForProfessional(profesional.id, day)
          newSlots[slotKey] = slots
        }
      }

      setAvailableSlots(newSlots)
    }

    if (filteredProfesionales.length > 0 && organizationId) {
      loadAllSlots()
    }
  }, [filteredProfesionales, weekDays, organizationId])

  const handleSlotClick = (profesional: Profesional, targetDate: Date, slot: AvailableSlot) => {
    const newCitaData: Partial<Cita> = {
      fecha: targetDate,
      hora: slot.start_time,
      profesionalId: profesional.id,
      duracion: 60, // Duración por defecto
    }

    onAddCita(newCitaData)
    toast.success(
      `Creando nueva cita para ${profesional.name || profesional.nombre} el ${format(targetDate, "d 'de' MMMM", { locale: es })} a las ${slot.start_time}`,
    )
  }

  const getCitasForProfessionalAndDay = (profesionalId: string | number, targetDate: Date) => {
    return citas
      .filter((cita) => {
        const citaFecha = new Date(cita.fecha)
        const isSameDate = isSameDay(citaFecha, targetDate)

        // Manejar diferentes tipos de ID
        let matches = false
        if (typeof profesionalId === "number" && typeof cita.profesionalId === "string") {
          const citaIdAsNumber = uuidToNumber(cita.profesionalId)
          matches = profesionalId === citaIdAsNumber
        } else if (typeof profesionalId === "string" && typeof cita.profesionalId === "number") {
          const profIdAsNumber = uuidToNumber(profesionalId)
          matches = profIdAsNumber === cita.profesionalId
        } else {
          matches = profesionalId === cita.profesionalId
        }

        return isSameDate && matches
      })
      .sort((a, b) => a.hora.localeCompare(b.hora))
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header con días de la semana */}
      <div className="grid grid-cols-8 gap-px bg-gray-200 border-b">
        {/* Columna de profesionales */}
        <div className="bg-gray-50 p-4 font-semibold text-gray-700 border-r">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profesionales
          </div>
        </div>

        {/* Días de la semana */}
        {weekDays.map((day) => {
          const isDayToday = isToday(day)
          const isWeekend = day.getDay() >= 6

          return (
            <div
              key={day.toISOString()}
              className={`p-4 text-center cursor-pointer hover:bg-blue-50 transition-colors ${
                isDayToday
                  ? "bg-blue-100 text-blue-700"
                  : isWeekend
                    ? "bg-gray-100 text-gray-600"
                    : "bg-white text-gray-700"
              }`}
              onClick={() => onDateSelect?.(day)}
              title={`Ir a vista diaria: ${format(day, "EEEE d 'de' MMMM", { locale: es })}`}
            >
              <div className="text-sm font-medium">{format(day, "EEE", { locale: es })}</div>
              <div
                className={`text-lg font-bold mt-1 ${
                  isDayToday
                    ? "bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                    : ""
                }`}
              >
                {format(day, "d")}
              </div>
            </div>
          )
        })}
      </div>

      {/* Grid de profesionales y sus huecos */}
      <div className="flex-1 overflow-auto">
        {filteredProfesionales.map((profesional) => {
          const colorStyles = getColorProfesional(profesional)

          return (
            <div key={profesional.id} className="grid grid-cols-8 gap-px bg-gray-200 border-b">
              {/* Información del profesional */}
              <div
                className="bg-white p-4 border-r flex items-center gap-3"
                style={{ borderLeftColor: colorStyles.borderColor, borderLeftWidth: "4px" }}
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{profesional.name || profesional.nombre}</div>
                  {profesional.especialidad && (
                    <div className="text-xs text-gray-500 mt-1">{profesional.especialidad}</div>
                  )}
                </div>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorStyles.borderColor }} />
              </div>

              {/* Huecos por día */}
              {weekDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd")
                const slotKey = `${profesional.id}-${dateStr}`
                const daySlots = availableSlots[slotKey] || []
                const isLoading = loadingSlots[slotKey]
                const citasDelDia = getCitasForProfessionalAndDay(profesional.id, day)
                const isWeekend = day.getDay() >= 6

                return (
                  <div
                    key={`${profesional.id}-${day.toISOString()}`}
                    className={`bg-white p-3 min-h-[120px] ${isWeekend ? "bg-gray-50" : ""}`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Citas existentes */}
                        {citasDelDia.map((cita) => (
                          <TooltipProvider key={cita.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className="p-2 rounded border-l-2 cursor-pointer hover:shadow-sm transition-shadow"
                                  style={{
                                    backgroundColor: colorStyles.backgroundColor,
                                    borderLeftColor: colorStyles.borderColor,
                                  }}
                                  onClick={() => onSelectCita(cita)}
                                >
                                  <div className="text-xs font-medium text-gray-900">
                                    {cita.nombrePaciente} {cita.apellidosPaciente}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">{cita.hora}</div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-medium">
                                    {cita.nombrePaciente} {cita.apellidosPaciente}
                                  </p>
                                  <p className="text-sm">
                                    {cita.hora} ({cita.duracion} min)
                                  </p>
                                  <p className="text-sm">{cita.servicio}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}

                        {/* Huecos disponibles */}
                        <div className="space-y-1">
                          {daySlots.slice(0, 4).map((slot, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="w-full h-6 text-xs p-1 hover:bg-green-50 hover:border-green-300 bg-transparent"
                              onClick={() => handleSlotClick(profesional, day, slot)}
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              {slot.start_time}
                            </Button>
                          ))}

                          {daySlots.length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{daySlots.length - 4} más
                            </Badge>
                          )}

                          {daySlots.length === 0 && citasDelDia.length === 0 && (
                            <div className="text-center text-gray-400 text-xs py-2">Sin disponibilidad</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Footer con información */}
      <div className="bg-gray-50 p-3 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Huecos disponibles</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Citas programadas</span>
            </div>
          </div>
          <div className="text-xs">Mostrando {filteredProfesionales.length} profesional(es)</div>
        </div>
      </div>
    </div>
  )
}
