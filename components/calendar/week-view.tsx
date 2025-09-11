"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { AppointmentFormModal } from "@/components/calendar/appointment-form-modal"
import { HoraPreviewTooltip } from "@/components/calendar/hora-preview-tooltip"
import { calcularHoraFin } from "@/utils/calendar-utils"
import {
  timeToMinutes,
  minutesToTime,
  getWorkingHoursForDay,
  getCalendarTimeRange,
  generateTimeSlots,
  isUserWorkingAt,
} from "@/utils/schedule-utils"
import type { Cita, Profesional, IntervaloTiempo } from "@/types/calendar"
import type { User } from "@/types/calendar"
import { toast } from "sonner"
import { format, addDays, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import type { WorkSchedule } from "@/types/calendar"
import type { JSX } from "react"

// Add this CSS-in-JS style for the floating animation
const floatingAnimation = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
`

// Inject the styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style")
  styleSheet.textContent = floatingAnimation
  document.head.appendChild(styleSheet)
}

interface HorarioViewWeeklyProps {
  date?: Date // Fecha base para calcular la semana
  citas?: Cita[]
  profesionales?: Profesional[]
  users?: User[]
  onSelectCita?: (cita: Cita) => void
  profesionalSeleccionado?: number | "todos"
  profesionalesSeleccionados?: number[]
  intervaloTiempo?: IntervaloTiempo
  onUpdateCita?: (cita: Cita) => void
  onAddCita?: (cita: Partial<Cita>) => void
  vacationRequests?: any[]
  isUserOnVacationDate?: (userId: string, date: Date | string) => boolean
  getUserVacationOnDate?: (userId: string, date: Date | string) => any
  workSchedules?: WorkSchedule[]
  onDayClick?: (date: Date) => void
  excludeWeekends?: boolean
  onToggleWeekends?: (excludeWeekends: boolean) => void
}

const getProfessionalColor = (profesional: any) => {
  // Use the professional's calendar color from settings, otherwise fallback to default blue
  const baseColor = profesional.settings?.calendar_color || "#3B82F6"

  // Convert hex to RGB for lighter background
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : { r: 59, g: 130, b: 246 }
  }

  const rgb = hexToRgb(baseColor)
  const lightBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`

  return {
    bg: lightBg,
    border: baseColor,
    text: baseColor,
  }
}

const getColorEstado = (estado: string) => {
  switch (estado) {
    case "confirmada":
    case "confirmed":
      return "bg-green-500"
    case "pendiente":
    case "pending":
      return "bg-amber-400"
    case "cancelada":
    case "cancelled":
      return "bg-red-500"
    default:
      return "bg-gray-300"
  }
}

const extraerTituloProfesional = (nombre: string | null | undefined) => {
  if (!nombre) {
    return { titulo: "", nombre: "Usuario sin nombre" }
  }
  const match = nombre.match(/^(Dr\.|Dra\.) (.+)$/)
  if (match) {
    return { titulo: match[1], nombre: match[2] }
  }
  return { titulo: "", nombre: nombre }
}

const normalizeTimeFormat = (time: string): string => {
  if (!time) return "00:00"
  if (time.includes(":") && time.split(":").length === 3) {
    const [hours, minutes] = time.split(":")
    return `${hours}:${minutes}`
  }
  return time
}

// FUNCIÓN SIMPLIFICADA - SOLO SISTEMA NUEVO
const getUserWorkSchedulesForDay = (userId: string, dayOfWeek: number, workSchedules: WorkSchedule[]) => {
  return workSchedules.filter(
    (schedule) => schedule.user_id === userId && schedule.day_of_week === dayOfWeek && schedule.is_active,
  )
}

// FUNCIÓN SIMPLIFICADA - SOLO SISTEMA NUEVO
const isTimeInBreak = (timeInMinutes: number, userSchedules: WorkSchedule[]) => {
  return userSchedules.some((schedule) => {
    return schedule.breaks?.some((breakItem) => {
      if (!breakItem.is_active) return false
      const breakStart = timeToMinutes(breakItem.start_time)
      const breakEnd = timeToMinutes(breakItem.end_time)
      return timeInMinutes >= breakStart && timeInMinutes < breakEnd
    })
  })
}

// 🚀 NUEVA FUNCIÓN: Generar timeSlots por defecto cuando no hay horarios
const generateDefaultTimeSlots = (intervaloTiempo: IntervaloTiempo): string[] => {
  const slots: string[] = []
  const startHour = 8 // 8:00 AM
  const endHour = 18 // 6:00 PM

  let currentMinutes = startHour * 60
  const endMinutes = endHour * 60

  while (currentMinutes < endMinutes) {
    const timeString = minutesToTime(currentMinutes)
    slots.push(timeString)
    currentMinutes += intervaloTiempo
  }

  return slots
}

export default function HorarioViewWeekly({
  date = new Date(),
  citas = [],
  profesionales = [],
  users = [],
  onSelectCita = () => {},
  profesionalSeleccionado = "todos",
  profesionalesSeleccionados = [],
  intervaloTiempo = 30,
  onUpdateCita = () => {},
  onAddCita = () => {},
  vacationRequests = [],
  isUserOnVacationDate = () => false,
  getUserVacationOnDate = () => null,
  workSchedules = [],
  onDayClick = () => {},
  excludeWeekends = false,
  onToggleWeekends = () => {},
}: HorarioViewWeeklyProps) {
  const [draggedCita, setDraggedCita] = useState<Cita | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ profesionalId: number; dayIndex: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false)
  const [newAppointmentData, setNewAppointmentData] = useState<{
    fecha: Date
    hora: string
    profesionalId?: number
  } | null>(null)
  const [previewHora, setPreviewHora] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [hideWeekends, setHideWeekends] = useState<boolean>(() => {
    // Leer del localStorage al iniciar
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hideWeekends")
      return stored ? JSON.parse(stored) : excludeWeekends
    }
    return excludeWeekends
  })
  
  const weekDays = useMemo(() => {
    const startDate = startOfWeek(date, { weekStartsOn: 1 }) // Lunes como primer día
    const daysToShow = hideWeekends ? 5 : 7
    return Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i))
  }, [date, hideWeekends])

  // OPTIMIZADO: Usar useMemo con dependencias más específicas
  const professionalUsers = useMemo(() => {
    return users.filter((user) => user.type === 1)
  }, [users])

  const filteredProfesionales = useMemo(() => {
    return profesionales.filter((profesional) => {
      const correspondingUser = professionalUsers.find(
        (user) => Number.parseInt(user.id.slice(-8), 16) === profesional.id,
      )
      return correspondingUser !== undefined
    })
  }, [profesionales, professionalUsers])

  const profesionalesFiltrados = useMemo(() => {
    return profesionalSeleccionado === "todos"
      ? filteredProfesionales
      : filteredProfesionales.filter((prof) => prof.id === profesionalSeleccionado)
  }, [profesionalSeleccionado, filteredProfesionales])

  const usuariosActivos = useMemo(() => {
    return professionalUsers.filter((user) =>
      profesionalesFiltrados.some((prof) => Number.parseInt(user.id.slice(-8), 16) === prof.id),
    )
  }, [professionalUsers, profesionalesFiltrados])

  // 🚀 OPTIMIZADO: timeSlots con dependencias más específicas para toda la semana
  const weekTimeSlots = useMemo(() => {
    const weekSlots: Record<number, string[]> = {}

    weekDays.forEach((dayDate, dayIndex) => {
      const dayOfWeek = dayDate.getDay()

      if (usuariosActivos.length === 0) {
        weekSlots[dayIndex] = generateDefaultTimeSlots(intervaloTiempo)
        return
      }
      if (workSchedules.length === 0) {
        weekSlots[dayIndex] = generateDefaultTimeSlots(intervaloTiempo)
        return
      }

      const generatedSlots = generateTimeSlots(usuariosActivos, dayOfWeek, intervaloTiempo)
      // Si no se generaron slots (sin horarios configurados), usar por defecto
      if (generatedSlots.length === 0) {
        weekSlots[dayIndex] = generateDefaultTimeSlots(intervaloTiempo)
      } else {
        weekSlots[dayIndex] = generatedSlots
      }
    })

    return weekSlots
  }, [weekDays, usuariosActivos, intervaloTiempo, workSchedules])

  // 🚀 OPTIMIZADO: Calcular rango con dependencias más específicas para toda la semana
  const weekTimeRanges = useMemo(() => {
    const ranges: Record<number, { start: number; end: number }> = {}

    weekDays.forEach((dayDate, dayIndex) => {
      const dayOfWeek = dayDate.getDay()

      if (usuariosActivos.length === 0 || workSchedules.length === 0) {
        ranges[dayIndex] = { start: timeToMinutes("08:00"), end: timeToMinutes("18:00") }
        return
      }

      const range = getCalendarTimeRange(usuariosActivos, dayOfWeek)
      // Si no hay rango válido, usar por defecto
      if (range.start >= range.end) {
        ranges[dayIndex] = { start: timeToMinutes("08:00"), end: timeToMinutes("18:00") }
      } else {
        ranges[dayIndex] = range
      }
    })

    return ranges
  }, [weekDays, usuariosActivos, workSchedules])

  // Funciones de vacaciones
  const isProfessionalOnVacation = (profesionalId: number | string, dayDate: Date) => {
    if (!isUserOnVacationDate) return false
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return false
    return isUserOnVacationDate(user.id, dayDate)
  }

  const getProfessionalVacationInfo = (profesionalId: number | string, dayDate: Date) => {
    if (!getUserVacationOnDate) return null
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return null
    return getUserVacationOnDate(user.id, dayDate)
  }

  const getVacationIcon = (type: string) => {
    switch (type) {
      case "vacation":
        return "🏖️"
      case "sick_leave":
        return "🏥"
      case "personal":
        return "👤"
      case "maternity":
        return "👶"
      case "training":
        return "📚"
      default:
        return "😴"
    }
  }

  const getVacationLabel = (type: string) => {
    switch (type) {
      case "vacation":
        return "Vacaciones"
      case "sick_leave":
        return "Baja médica"
      case "personal":
        return "Asunto personal"
      case "maternity":
        return "Baja maternal"
      case "training":
        return "Formación"
      default:
        return "Día libre"
    }
  }

  // NUEVA FUNCIÓN: Verificar si el profesional tiene horarios configurados
  const hasAnyScheduleConfigured = (profesionalId: number) => {
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return false
    // Verificar si tiene horarios en cualquier día de la semana
    const userSchedules = workSchedules.filter((schedule) => schedule.user_id === user.id && schedule.is_active)
    return userSchedules.length > 0
  }

  const calcularPosicionCita = (hora: string, dayIndex: number) => {
    const normalizedTime = normalizeTimeFormat(hora)
    const minutosCita = timeToMinutes(normalizedTime)
    const { start: startMinutes, end: endMinutes } = weekTimeRanges[dayIndex]
    const duracionDia = endMinutes - startMinutes
    const posicionPixeles = ((minutosCita - startMinutes) / duracionDia) * 800 // 800px is container height
    return Math.max(0, Math.min(posicionPixeles, 800))
  }

  const calcularAlturaCita = (duracion: number, dayIndex: number) => {
    const { start: startMinutes, end: endMinutes } = weekTimeRanges[dayIndex]
    const duracionDia = endMinutes - startMinutes
    const alturaPixeles = (duracion / duracionDia) * 800
    return Math.max(alturaPixeles, 30) // Minimum 30px height
  }

  const calcularHoraDesdePosicion = (posY: number, contenedorHeight: number, dayIndex: number) => {
    const { start: startMinutes, end: endMinutes } = weekTimeRanges[dayIndex]
    const duracionDia = endMinutes - startMinutes
    const porcentaje = (posY / contenedorHeight) * 100
    const minutos = Math.floor((porcentaje / 100) * duracionDia + startMinutes)
    const minutosAjustados = Math.round(minutos / intervaloTiempo) * intervaloTiempo
    return minutesToTime(minutosAjustados)
  }

  // FUNCIÓN SIMPLIFICADA - SOLO SISTEMA NUEVO
  const puedeCrearCitaEnHora = (profesionalId: number, hora: string, dayDate: Date): boolean => {
    // Verificar vacaciones primero
    if (isProfessionalOnVacation(profesionalId, dayDate)) {
      return false
    }
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return false
    const normalizedTime = normalizeTimeFormat(hora)
    const timeInMinutes = timeToMinutes(normalizedTime)
    const dayOfWeek = dayDate.getDay()

    // 🚀 MODIFICADO: Si no hay horarios configurados, permitir crear citas en horario por defecto
    if (!hasAnyScheduleConfigured(profesionalId)) {
      const defaultStart = timeToMinutes("08:00")
      const defaultEnd = timeToMinutes("18:00")
      return timeInMinutes >= defaultStart && timeInMinutes < defaultEnd
    }

    // Verificar si está en horario de trabajo básico
    if (!isUserWorkingAt(user, dayOfWeek, timeInMinutes)) {
      return false
    }

    // Obtener horarios del usuario para este día - SOLO SISTEMA NUEVO
    const userSchedules = getUserWorkSchedulesForDay(user.id, dayOfWeek, workSchedules)

    // Verificar si está en algún descanso - SOLO SISTEMA NUEVO
    if (isTimeInBreak(timeInMinutes, userSchedules)) {
      return false
    }

    return true
  }

  const handleDragStart = (e: React.DragEvent, cita: Cita) => {
    setDraggedCita(cita)
    setIsDragging(true)
    e.dataTransfer.setData("text/plain", cita.id.toString())
  }

  const handleDragOver = (e: React.DragEvent, profesionalId: number, dayIndex: number) => {
    e.preventDefault()
    if (!draggedCita) return

    const dayDate = weekDays[dayIndex]
    setDragOverCell({ profesionalId, dayIndex })

    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top
    const nuevaHora = calcularHoraDesdePosicion(y, rect.height, dayIndex)
    setPreviewHora(nuevaHora)
    setPreviewPosition({ x: 0, y: e.clientY })

    const indicadores = container.querySelectorAll(".drop-indicator")
    indicadores.forEach((ind) => ind.remove())

    const puedeCrear = puedeCrearCitaEnHora(profesionalId, nuevaHora, dayDate)
    const indicador = document.createElement("div")
    indicador.className = `drop-indicator absolute w-full h-1 rounded-full z-50 pointer-events-none ${
      puedeCrear ? "bg-blue-400" : "bg-red-400"
    }`
    indicador.style.top = `${(y / rect.height) * 100}%`
    container.appendChild(indicador)
  }

  const handleDrop = async (e: React.DragEvent, profesionalId: number, dayIndex: number) => {
    e.preventDefault()
    if (!draggedCita) return

    const dayDate = weekDays[dayIndex]
    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top
    const nuevaHora = calcularHoraDesdePosicion(y, rect.height, dayIndex)

    const indicadores = container.querySelectorAll(".drop-indicator")
    indicadores.forEach((ind) => ind.remove())

    if (!puedeCrearCitaEnHora(profesionalId, nuevaHora, dayDate)) {
      const isOnVacation = isProfessionalOnVacation(profesionalId, dayDate)
      const message = isOnVacation
        ? "No se puede mover la cita: el profesional está de vacaciones"
        : "No se puede mover la cita: fuera del horario de trabajo o en período de descanso"
      toast.error(message)
      setDraggedCita(null)
      setDragOverCell(null)
      setIsDragging(false)
      return
    }

    try {
      const citaActualizada = {
        ...draggedCita,
        hora: nuevaHora,
        profesionalId: profesionalId,
        fecha: dayDate,
        horaFin: calcularHoraFin(nuevaHora, draggedCita.duracion),
      }
      await onUpdateCita(citaActualizada)
      setDraggedCita(null)
      setDragOverCell(null)
      setIsDragging(false)
    } catch (error) {
      toast.error("Error al mover la cita")
      setDraggedCita(null)
      setDragOverCell(null)
      setIsDragging(false)
    }
  }

  const handleDragEnd = () => {
    setDraggedCita(null)
    setDragOverCell(null)
    setIsDragging(false)
    setPreviewHora(null)
    document.querySelectorAll(".drop-indicator").forEach((ind) => ind.remove())
  }

  const handleContainerClick = (e: React.MouseEvent, profesionalId: number, dayIndex: number) => {
    if (e.target !== e.currentTarget) return

    const dayDate = weekDays[dayIndex]
    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top
    const hora = calcularHoraDesdePosicion(y, rect.height, dayIndex)

    if (!puedeCrearCitaEnHora(profesionalId, hora, dayDate)) {
      const isOnVacation = isProfessionalOnVacation(profesionalId, dayDate)
      const vacationInfo = getProfessionalVacationInfo(profesionalId, dayDate)
      const message = isOnVacation
        ? `No disponible: ${getVacationLabel(vacationInfo?.type) || "Ausencia"}`
        : "No se puede crear cita: fuera del horario de trabajo o en período de descanso"
      toast.error(message)
      return
    }

    setNewAppointmentData({
      fecha: dayDate,
      hora,
      profesionalId,
    })
    setShowNewAppointmentModal(true)
  }

  const renderHuecosLibres = (profesionalId: number, dayIndex: number): JSX.Element[] => {
    const dayDate = weekDays[dayIndex]
    const dayOfWeek = dayDate.getDay()

    if (isProfessionalOnVacation(profesionalId, dayDate)) {
      return []
    }

    const citasProfesional = citas.filter((cita) => {
      const citaDate = typeof cita.fecha === "string" ? new Date(cita.fecha) : cita.fecha
      return cita.profesionalId === profesionalId && citaDate.toDateString() === dayDate.toDateString()
    })

    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return []

    // 🚀 MODIFICADO: Si no tiene horarios configurados, usar horario por defecto
    let workingHours
    if (!hasAnyScheduleConfigured(profesionalId)) {
      workingHours = [{ start: timeToMinutes("08:00"), end: timeToMinutes("18:00") }]
    } else {
      workingHours = getWorkingHoursForDay(user, dayOfWeek)
    }

    const userSchedules = getUserWorkSchedulesForDay(user.id, dayOfWeek, workSchedules)
    const huecos: JSX.Element[] = []

    for (const hours of workingHours) {
      // Obtener todos los descansos para este horario de trabajo
      const schedule = userSchedules.find(
        (s) => timeToMinutes(s.start_time) <= hours.start && timeToMinutes(s.end_time) >= hours.end,
      )
      const descansos = schedule?.breaks?.filter((b) => b.is_active) || []

      // Crear segmentos de tiempo entre descansos
      const segmentos: { start: number; end: number }[] = []
      if (descansos.length === 0) {
        // Sin descansos, todo el horario es un segmento
        segmentos.push({ start: hours.start, end: hours.end })
      } else {
        // Ordenar descansos por hora de inicio
        const descansosOrdenados = [...descansos].sort(
          (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time),
        )

        let inicioSegmento = hours.start
        for (const descanso of descansosOrdenados) {
          const inicioDescanso = timeToMinutes(descanso.start_time)
          const finDescanso = timeToMinutes(descanso.end_time)

          // Segmento antes del descanso
          if (inicioSegmento < inicioDescanso) {
            segmentos.push({
              start: inicioSegmento,
              end: Math.min(inicioDescanso, hours.end),
            })
          }

          // Actualizar inicio para el siguiente segmento
          inicioSegmento = Math.max(finDescanso, inicioSegmento)
        }

        // Segmento después del último descanso
        if (inicioSegmento < hours.end) {
          segmentos.push({ start: inicioSegmento, end: hours.end })
        }
      }

      // Generar slots dentro de cada segmento
      for (const segmento of segmentos) {
        let currentMinutes = segmento.start
        const slotsSet = new Set<string>()

        while (currentMinutes < segmento.end) {
          const finSlot = Math.min(currentMinutes + intervaloTiempo, segmento.end)

          // Solo crear slot si tiene la duración mínima
          if (finSlot - currentMinutes >= intervaloTiempo) {
            const horaInicio = minutesToTime(currentMinutes)
            const horaFin = minutesToTime(finSlot)

            // Verificar si hay cita en este slot
            const citaConflicto = citasProfesional.find((cita) => {
              const normalizedStartTime = normalizeTimeFormat(cita.hora)
              const citaStart = timeToMinutes(normalizedStartTime)
              const citaEnd = citaStart + (cita.duracion || 60)

              return (
                (currentMinutes >= citaStart && currentMinutes < citaEnd) ||
                (finSlot > citaStart && finSlot <= citaEnd) ||
                (currentMinutes <= citaStart && finSlot >= citaEnd)
              )
            })

            if (citaConflicto) {
              const normalizedStartTime = normalizeTimeFormat(citaConflicto.hora)
              const citaStart = timeToMinutes(normalizedStartTime)
              const citaEnd = citaStart + (citaConflicto.duracion || 60)
              currentMinutes = citaEnd
              continue
            }

            // Si no hay conflicto, agregar el slot
            if (!slotsSet.has(horaInicio)) {
              huecos.push(
                <div
                  key={`hueco-${horaInicio}-${profesionalId}-${dayIndex}`}
                  className="absolute rounded-md cursor-pointer border bg-white hover:brightness-95 transition-all"
                  style={{
                    top: `${calcularPosicionCita(horaInicio, dayIndex)}px`,
                    left: 0,
                    right: 0,
                    width: "100%",
                    height: `${calcularAlturaCita(finSlot - currentMinutes, dayIndex)}px`,
                    backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
                    backgroundSize: "8px 8px",
                    zIndex: 5,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (puedeCrearCitaEnHora(profesionalId, horaInicio, dayDate)) {
                      setNewAppointmentData({
                        fecha: dayDate,
                        hora: horaInicio,
                        profesionalId: profesionalId,
                      })
                      setShowNewAppointmentModal(true)
                    } else {
                      const isOnVacation = isProfessionalOnVacation(profesionalId, dayDate)
                      const message = isOnVacation
                        ? "No se puede crear cita: el profesional está de vacaciones"
                        : "No se puede crear cita: fuera del horario de trabajo o en período de descanso"
                      toast.error(message)
                    }
                  }}
                >
                  <div className="flex flex-col p-1">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full border border-gray-400 bg-white flex items-center justify-center text-xs mr-1">
                        <span>+</span>
                      </div>
                      <div className="text-xs font-medium text-gray-700">{horaInicio}</div>
                    </div>
                  </div>
                </div>,
              )
              slotsSet.add(horaInicio)
            }
          }

          currentMinutes += intervaloTiempo
        }
      }
    }

    return huecos
  }

  const renderDescansos = (profesionalId: number, dayIndex: number): JSX.Element[] => {
    const dayDate = weekDays[dayIndex]
    const dayOfWeek = dayDate.getDay()
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return []

    const userSchedules = getUserWorkSchedulesForDay(user.id, dayOfWeek, workSchedules)
    const descansos: JSX.Element[] = []
    const { start: startMinutes, end: endMinutes } = weekTimeRanges[dayIndex]
    const duracionDia = endMinutes - startMinutes

    userSchedules.forEach((schedule, scheduleIndex) => {
      schedule.breaks?.forEach((breakItem, breakIndex) => {
        if (!breakItem.is_active) return

        const breakStart = timeToMinutes(breakItem.start_time)
        const breakEnd = timeToMinutes(breakItem.end_time)
        const posicionTop = ((breakStart - startMinutes) / duracionDia) * 800
        const altura = ((breakEnd - breakStart) / duracionDia) * 800

        // Calcular duración para el tooltip
        const duracionMinutos = breakEnd - breakStart
        const duracionTexto =
          duracionMinutos >= 60
            ? `${Math.floor(duracionMinutos / 60)}h ${duracionMinutos % 60 > 0 ? `${duracionMinutos % 60}m` : ""}`
            : `${duracionMinutos}m`

        // Obtener emoji según el tipo de descanso
        const getBreakIcon = (name: string) => {
          const lowerName = name.toLowerCase()
          if (lowerName.includes("comida") || lowerName.includes("almuerzo")) return "🍽️"
          if (lowerName.includes("café") || lowerName.includes("mañana") || lowerName.includes("tarde")) return "☕"
          if (lowerName.includes("descanso")) return "⏸️"
          return "☕"
        }

        // Función para truncar texto
        const truncateText = (text: string, maxLength: number) => {
          return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
        }

        descansos.push(
          <TooltipProvider key={`break-${scheduleIndex}-${breakIndex}-${dayIndex}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute rounded-md border-2 border-dashed border-orange-300 bg-orange-50 flex items-center justify-center shadow-sm cursor-help"
                  style={{
                    top: `${Math.max(0, posicionTop)}px`,
                    left: 0,
                    right: 0,
                    width: "100%",
                    height: `${Math.max(1.5, altura)}px`,
                    zIndex: 3,
                    minHeight: duracionMinutos < 15 ? "16px" : duracionMinutos < 30 ? "24px" : "32px",
                  }}
                >
                  <div className="text-center p-1 w-full overflow-hidden">
                    {duracionMinutos < 15 ? (
                      // Para descansos muy cortos (< 15 min): solo emoji pequeño
                      <div className="flex items-center justify-center">
                        <span className="text-xs">{getBreakIcon(breakItem.break_name)}</span>
                      </div>
                    ) : duracionMinutos < 30 ? (
                      // Para descansos cortos (15-30 min): emoji arriba, texto abajo en columna
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="text-xs">{getBreakIcon(breakItem.break_name)}</span>
                        <span className="text-[9px] font-medium text-orange-700 leading-tight">
                          {truncateText(breakItem.break_name, 6)}
                        </span>
                      </div>
                    ) : (
                      // Para descansos medianos y largos: emoji + nombre pequeño horizontal
                      <div className="text-xs font-medium text-orange-700 flex items-center justify-center gap-1">
                        <span className="text-xs">{getBreakIcon(breakItem.break_name)}</span>
                        <span className="truncate text-[9px]">{truncateText(breakItem.break_name, 8)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    <span>{getBreakIcon(breakItem.break_name)}</span>
                    {breakItem.break_name}
                  </div>
                  <div className="text-sm">
                    {breakItem.start_time} - {breakItem.end_time}
                  </div>
                  <div className="text-sm text-gray-600">Duración: {duracionTexto}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>,
        )
      })
    })

    return descansos
  }

  // 🚀 OPTIMIZADO: Condición de carga más simple y eficiente
  if (users.length === 0 || profesionales.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative mb-6">
            <img src="/images/logo.jpeg" alt="Physia Logo" className="w-20 h-20 mx-auto animate-float opacity-80" />
            <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full bg-blue-200 animate-ping opacity-20"></div>
          </div>
          <h3 className="text-xl font-semibold mb-3 text-gray-800">Cargando horarios semanales...</h3>
          <p className="text-gray-600 max-w-sm">Preparando la vista semanal del calendario médico</p>
          <div className="mt-4 flex justify-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Vista semanal</span>
          <div className="flex items-center gap-2">
            <label htmlFor="weekend-toggle" className="text-sm font-medium">
              Solo días laborables
            </label>
            <Switch
  id="weekend-toggle"
  checked={hideWeekends}
  onCheckedChange={(checked) => {
    setHideWeekends(checked)
    localStorage.setItem("hideWeekends", JSON.stringify(checked)) // 👈 guardar
    onToggleWeekends?.(checked)
  }}
/>

          </div>
        </div>
      </div>

      <div className="bg-white border-b sticky top-0 z-20">
        <div className={`grid gap-0 ${hideWeekends ? "grid-cols-6" : "grid-cols-8"}`}>
          {/* Columna vacía para alinear con los nombres de profesionales */}
          <div className="p-3 border-r bg-gray-50">
            <div className="text-sm font-medium text-gray-600">Profesional</div>
          </div>

          {/* Columnas de días */}
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="p-3 bg-gray-50 border-r border-gray-200 text-center cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => onDayClick?.(day)}
            >
              <div className="font-semibold text-sm">{format(day, "EEEE", { locale: es })}</div>
              <div className="text-xs text-gray-600">{format(day, "dd/MM")}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="space-y-0">
          {profesionalesFiltrados.map((profesional) => {
            const { titulo, nombre } = extraerTituloProfesional(profesional?.name)
            const enhancedColors = getProfessionalColor(profesional)
            const hasSchedules = hasAnyScheduleConfigured(profesional.id)

            return (
              <div
                key={profesional.id}
                className={`grid gap-0 border-b-1 border-black ${hideWeekends ? "grid-cols-6" : "grid-cols-8"}`}
              >
                <div
                  className="p-3 border-r flex items-center"
                  style={{
                    height: "600px",
                    backgroundColor: `${profesional.settings?.calendar_color || "#3B82F6"}15`, // 15 = ~8% opacity
                    borderLeft: `4px solid ${profesional.settings?.calendar_color || "#3B82F6"}`,
                    borderBottom: `4px solid #000000`,
                  }}
                >
                  <div className="text-center w-full">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: profesional.settings?.calendar_color || "#3B82F6" }}
                      />
                      <div className="font-medium text-sm text-gray-900">{nombre}</div>
                    </div>
                    {!hasSchedules && <div className="text-xs text-red-500 mt-1">Sin horarios</div>}
                  </div>
                </div>

                {weekDays.map((dayDate, dayIndex) => {
                  const dayOfWeek = dayDate.getDay()
                  const citasProfesional = citas.filter((cita) => {
                    const citaDate = typeof cita.fecha === "string" ? new Date(cita.fecha) : cita.fecha
                    return cita.profesionalId === profesional.id && citaDate.toDateString() === dayDate.toDateString()
                  })

                  const huecosLibres = renderHuecosLibres(profesional.id, dayIndex)
                  const descansos = renderDescansos(profesional.id, dayIndex)

                  // Obtener usuario correspondiente
                  const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesional.id)

                  // 🚀 MODIFICADO: Calcular workingHours considerando horarios por defecto
                  let workingHours: { start: number; end: number }[]
                  let isWorkingToday: boolean

                  if (!hasSchedules) {
                    // Sin horarios configurados, usar horario por defecto
                    workingHours = [{ start: timeToMinutes("08:00"), end: timeToMinutes("18:00") }]
                    isWorkingToday = true
                  } else if (user) {
                    workingHours = getWorkingHoursForDay(user, dayOfWeek)
                    isWorkingToday = workingHours.length > 0
                  } else {
                    workingHours = []
                    isWorkingToday = false
                  }

                  // Verificar vacaciones
                  const isOnVacation = isProfessionalOnVacation(profesional.id, dayDate)
                  const vacationInfo = getProfessionalVacationInfo(profesional.id, dayDate)

                  return (
                    <div
                      key={dayIndex}
                      className="relative border-r transition-all duration-200"
                      style={{
                        height: "600px",
                        overflow: "hidden",
                        position: "relative",
                        backgroundColor: `${profesional.settings?.calendar_color || "#3B82F6"}08`, // 08 = ~3% opacity
                        borderBottom: `4px solid #000000`,
                      }}
                      onDragOver={(e) => handleDragOver(e, profesional.id, dayIndex)}
                      onDrop={(e) => handleDrop(e, profesional.id, dayIndex)}
                      onClick={
                        isWorkingToday && !isOnVacation
                          ? (e) => handleContainerClick(e, profesional.id, dayIndex)
                          : undefined
                      }
                    >
                      <div
                        className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                        style={{
                          height: "600px",
                          position: "relative",
                        }}
                      >
                        <div
                          className="relative"
                          style={{
                            height: "800px",
                            minHeight: "800px",
                          }}
                        >
                          {/* Líneas de hora - siempre se muestran */}
                          {weekTimeSlots[dayIndex]?.map((hora, index) => (
                            <div
                              key={hora}
                              className="absolute w-full border-t border-gray-200"
                              style={{
                                top: `${(index / (weekTimeSlots[dayIndex].length - 1)) * 100}%`,
                              }}
                            />
                          ))}

                          {/* Overlay de instrucciones cuando no hay horarios */}
                          {!hasSchedules && !isOnVacation && (
                            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-20">
                              <div className="text-center p-2">
                                <div className="text-2xl mb-2">⚙️</div>
                                <div className="text-xs font-semibold mb-2 text-gray-800">Sin horarios</div>
                                <div className="text-xs text-gray-600">
                                  Configura en <strong>Usuarios</strong>
                                </div>
                              </div>
                            </div>
                          )}

                          {!isWorkingToday && !isOnVacation && hasSchedules ? (
                            // Día libre (tiene horarios pero no trabaja hoy)
                            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-15">
                              <div className="text-center">
                                <div className="text-2xl mb-1">😴</div>
                                <div className="text-xs">Día libre</div>
                              </div>
                            </div>
                          ) : isOnVacation ? (
                            // De vacaciones
                            <div className="absolute inset-0 bg-orange-50 bg-opacity-95 flex items-center justify-center z-15">
                              <div className="text-center p-2">
                                <div className="text-2xl mb-2">{getVacationIcon(vacationInfo?.type)}</div>
                                <div className="text-xs font-semibold mb-1">{getVacationLabel(vacationInfo?.type)}</div>
                                <div className="text-xs">
                                  {format(new Date(vacationInfo?.start_date), "dd/MM")} -{" "}
                                  {format(new Date(vacationInfo?.end_date), "dd/MM")}
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Contenido normal cuando tiene horarios y trabaja
                            <>
                              {/* Períodos de descanso */}
                              {hasSchedules ? descansos : []}

                              {/* Huecos libres - solo cuando hay horarios configurados */}
                              {hasSchedules ? huecosLibres : []}

                              {/* Citas */}
                              <TooltipProvider>
                                {citasProfesional.map((cita, index) => {
                                  const normalizedStartTime = normalizeTimeFormat(cita.hora)
                                  const normalizedEndTime = normalizeTimeFormat(
                                    cita.horaFin || calcularHoraFin(cita.hora, cita.duracion),
                                  )
                                  const posicionTop = calcularPosicionCita(normalizedStartTime, dayIndex)
                                  const altura = calcularAlturaCita(cita.duracion, dayIndex)

                                  return (
                                    <Tooltip key={cita.id}>
                                      <TooltipTrigger asChild>
                                        <div
                                          draggable={!isOnVacation}
                                          onDragStart={(e) => !isOnVacation && handleDragStart(e, cita)}
                                          onDragEnd={handleDragEnd}
                                          className={`absolute rounded-lg cursor-move shadow-md border-l-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                                            draggedCita?.id === cita.id ? "opacity-50 scale-95 z-50" : ""
                                          }`}
                                          style={{
                                            top: `${posicionTop}px`,
                                            left: "4px",
                                            right: "4px",
                                            width: "calc(100% - 8px)",
                                            height: `${altura}px`,
                                            padding: "4px 6px",
                                            overflow: "hidden",
                                            zIndex: 10 + index,
                                            backgroundColor: enhancedColors.bg,
                                            borderLeftColor: enhancedColors.border,
                                            color: enhancedColors.text,
                                            minHeight: "30px",
                                            maxHeight: `${altura}px`,
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onSelectCita(cita)
                                          }}
                                        >
                                          <div className="space-y-0.5 h-full flex flex-col justify-center">
                                            <div className="flex items-center gap-1 text-xs">
                                              <div
                                                className={`w-1.5 h-1.5 rounded-full ${getColorEstado(cita.estado)}`}
                                              />
                                              <span className="font-semibold text-xs">{normalizedStartTime}</span>
                                              <span className="text-[10px] opacity-75">({cita.duracion}min)</span>
                                            </div>
                                            <div className="font-medium text-xs leading-tight truncate">
                                              {cita.nombrePaciente}
                                            </div>
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <HoraPreviewTooltip cita={cita} />
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                })}
                              </TooltipProvider>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal para nueva cita */}
      {showNewAppointmentModal && newAppointmentData && (
        <AppointmentFormModal
          fecha={newAppointmentData.fecha}
          hora={newAppointmentData.hora}
          profesionalId={newAppointmentData.profesionalId}
          onClose={() => {
            setShowNewAppointmentModal(false)
            setNewAppointmentData(null)
          }}
          onSubmit={onAddCita}
        />
      )}

      {/* Preview de hora durante drag */}
      {isDragging && previewHora && (
        <HoraPreviewTooltip
          hora={previewHora}
          position={previewPosition}
          citaOriginal={
            draggedCita
              ? {
                  hora: draggedCita.hora,
                  fecha: typeof draggedCita.fecha === "string" ? new Date(draggedCita.fecha) : draggedCita.fecha,
                  profesionalId:
                    typeof draggedCita.profesionalId === "string"
                      ? Number.parseInt(draggedCita.profesionalId)
                      : draggedCita.profesionalId,
                }
              : undefined
          }
          profesionales={profesionales}
        />
      )}

      {/* Overlay de arrastre */}
      {isDragging && (
        <div className="fixed inset-0 bg-black bg-opacity-10 z-40 pointer-events-none">
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 border-2 border-blue-400">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
              <span className="font-medium">Arrastrando cita</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">💡 Suelta en otro día/profesional para mover</div>
          </div>
        </div>
      )}
    </div>
  )
}
