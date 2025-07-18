"use client"

import type React from "react"

import { useState } from "react"
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { calcularHoraFin } from "@/utils/calendar-utils"
import type { Cita, Profesional, IntervaloTiempo } from "@/types/calendar"
import { Phone } from "lucide-react"
import { toast } from "sonner"

interface WeekViewProps {
  date: Date
  citas: Cita[]
  profesionales: Profesional[]
  onSelectCita: (cita: Cita) => void
  profesionalesSeleccionados: number[]
  intervaloTiempo: IntervaloTiempo
  onUpdateCita: (cita: Cita) => void
  onAddCita: (cita: Partial<Cita>) => void
  onDateSelect?: (date: Date) => void
  // Agregar props de vacaciones
  vacationRequests?: any[]
  isUserOnVacationDate?: (userId: string, date: Date | string) => boolean
  getUserVacationOnDate?: (userId: string, date: Date | string) => any
}

const getColorProfesional = (profesional: Profesional) => {
  const color = profesional.color || "#3B82F6"
  return {
    backgroundColor: `${color}15`,
    borderColor: color,
    dotColor: color,
  }
}

const getColorEstado = (estado: string) => {
  switch (estado) {
    case "confirmada":
      return "bg-green-500"
    case "pendiente":
      return "bg-amber-400"
    case "cancelada":
      return "bg-red-500"
    default:
      return "bg-gray-300"
  }
}

const ensureDate = (fecha: Date | string): Date => {
  if (fecha instanceof Date) {
    return fecha
  }
  const parsedDate = new Date(fecha)
  if (isNaN(parsedDate.getTime())) {
    return new Date()
  }
  return parsedDate
}

export function WeekView({
  date,
  citas,
  profesionales,
  onSelectCita,
  profesionalesSeleccionados,
  intervaloTiempo,
  onUpdateCita,
  onAddCita,
  onDateSelect,
  vacationRequests,
  isUserOnVacationDate,
  getUserVacationOnDate,
}: WeekViewProps) {
  // Estados para drag and drop
  const [draggedCita, setDraggedCita] = useState<Cita | null>(null)
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null)

  // Generar días de la semana
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // 🆕 NUEVA FUNCIÓN: Manejar clic en el día (área vacía)
  const handleDayClick = (targetDate: Date, event: React.MouseEvent) => {
    // Solo proceder si el clic fue en el contenedor del día, no en una cita
    if (event.target === event.currentTarget) {
      if (onDateSelect) {
        onDateSelect(targetDate)
        toast.success(`Cambiando a vista diaria: ${format(targetDate, "EEEE d 'de' MMMM", { locale: es })}`)
      }
    }
  }

  // Handlers para drag and drop
  const handleDragStart = (e: React.DragEvent, cita: Cita) => {
    setDraggedCita(cita)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragEnd = () => {
    setDraggedCita(null)
    setDragOverDay(null)
  }

  const handleDragOver = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverDay(targetDate)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Solo quitar el highlight si realmente salimos del contenedor
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDay(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault()
    setDragOverDay(null)

    if (!draggedCita) return

    // No hacer nada si se suelta en el mismo día
    const citaFecha = ensureDate(draggedCita.fecha)
    if (isSameDay(citaFecha, targetDate)) {
      setDraggedCita(null)
      return
    }

    // Crear la cita actualizada con la nueva fecha
    const citaActualizada = {
      ...draggedCita,
      fecha: targetDate,
      profesionalId:
        typeof draggedCita.profesionalId === "string"
          ? Number.parseInt(draggedCita.profesionalId)
          : draggedCita.profesionalId,
    }

    // Actualizar la cita
    onUpdateCita(citaActualizada)

    // Mostrar notificación
    toast.success(
      `Cita de ${draggedCita.nombrePaciente} ${draggedCita.apellidosPaciente} movida a ${format(targetDate, "EEEE d 'de' MMMM", { locale: es })}`,
    )

    setDraggedCita(null)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Grid de días */}
      <div className="flex-1 grid grid-cols-7 gap-px bg-gray-200">
        {weekDays.map((day, dayIndex) => {
          const citasDelDia = citas
            .filter((cita) => {
              const citaFecha = ensureDate(cita.fecha)
              const profesionalIdNum =
                typeof cita.profesionalId === "string" ? Number.parseInt(cita.profesionalId) : cita.profesionalId
              return isSameDay(citaFecha, day) && profesionalesSeleccionados.includes(profesionalIdNum)
            })
            .sort((a, b) => a.hora.localeCompare(b.hora))

          const isWeekend = dayIndex >= 5
          const isDayToday = isToday(day)
          const isDragOver = dragOverDay && isSameDay(dragOverDay, day)

          return (
            <div
              key={day.toISOString()}
              className={`bg-white flex flex-col cursor-pointer hover:bg-gray-50/50 transition-colors ${
                isDayToday ? "bg-blue-50/30" : isWeekend ? "bg-gray-50/50" : "bg-white"
              } ${isDragOver ? "bg-blue-100/50 ring-2 ring-blue-300" : ""}`}
              // 🆕 MODIFICADO: Usar la nueva función handleDayClick
              onClick={(e) => handleDayClick(day, e)}
              onDragOver={(e) => handleDragOver(e, day)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Header del día */}
              <div
                className={`p-4 border-b border-gray-200 text-center ${isDayToday ? "bg-blue-100/50" : "bg-gray-50"}`}
                // 🆕 AÑADIDO: Permitir clic en el header también
                onClick={(e) => {
                  e.stopPropagation()
                  handleDayClick(day, e)
                }}
              >
                <div className={`text-sm font-medium ${isDayToday ? "text-blue-600" : "text-gray-600"}`}>
                  {format(day, "EEE", { locale: es })}
                </div>
                <div
                  className={`text-xl font-bold mt-1 ${
                    isDayToday
                      ? "bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                      : "text-gray-900"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>

              {/* Contenido del día */}
              <div className="flex-1 p-3 space-y-2 min-h-[500px]">
                {citasDelDia.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center h-32 text-gray-400"
                    // 🆕 AÑADIDO: Permitir clic en área vacía
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDayClick(day, e)
                    }}
                  >
                    <p className="text-sm">Sin citas</p>
                    <p className="text-xs mt-1 opacity-75">Haz clic para ver detalles</p>
                    {isDragOver && draggedCita && <p className="text-xs text-blue-600 mt-2">Soltar aquí para mover</p>}
                  </div>
                ) : (
                  <>
                    {citasDelDia.map((cita) => {
                      const profesional = profesionales.find((p) => {
                        const citaProfesionalId =
                          typeof cita.profesionalId === "string"
                            ? Number.parseInt(cita.profesionalId)
                            : cita.profesionalId
                        return p.id === citaProfesionalId
                      })
                      if (!profesional) return null

                      const colorStyles = getColorProfesional(profesional)
                      const isBeingDragged = draggedCita?.id === cita.id

                      return (
                        <TooltipProvider key={cita.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                draggable
                                className={`p-3 rounded-lg border-l-4 cursor-move hover:shadow-md transition-all ${
                                  isBeingDragged ? "opacity-50 scale-95" : ""
                                }`}
                                style={{
                                  backgroundColor: colorStyles.backgroundColor,
                                  borderLeftColor: colorStyles.borderColor,
                                }}
                                onDragStart={(e) => handleDragStart(e, cita)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSelectCita(cita)
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <span className="font-semibold text-gray-900 text-sm">
                                    {cita.nombrePaciente} {cita.apellidosPaciente}
                                  </span>
                                  <div className={`w-2 h-2 rounded-full ${getColorEstado(cita.estado)}`} />
                                </div>

                                <div className="text-sm font-medium text-gray-700 mb-1">
                                  {cita.hora} - {calcularHoraFin(cita.hora, cita.duracion)}
                                </div>

                                {cita.telefonoPaciente && (
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <Phone className="w-3 h-3" />
                                    {cita.telefonoPaciente}
                                  </div>
                                )}

                                <div className="text-xs text-gray-500 mt-1">{cita.tipo}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {cita.nombrePaciente} {cita.apellidosPaciente}
                                </p>
                                <p className="text-sm">
                                  {cita.hora} - {calcularHoraFin(cita.hora, cita.duracion)} ({cita.duracion} min)
                                </p>
                                <p className="text-sm">{profesional?.name}</p>
                                <p className="text-sm">{cita.tipo}</p>
                                {cita.telefonoPaciente && <p className="text-sm">📞 {cita.telefonoPaciente}</p>}
                                <p className="text-xs text-gray-500 mt-2">🖱️ Arrastra para mover a otro día</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    })}
                    {isDragOver && draggedCita && (
                      <div className="text-center py-2">
                        <p className="text-xs text-blue-600">Soltar aquí para mover</p>
                      </div>
                    )}
                    {/* 🆕 AÑADIDO: Área clickeable al final para días con citas */}
                    <div
                      className="flex-1 min-h-[100px] flex items-end justify-center pb-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDayClick(day, e)
                      }}
                    >
                      <p className="text-xs opacity-75">Haz clic para vista diaria</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
