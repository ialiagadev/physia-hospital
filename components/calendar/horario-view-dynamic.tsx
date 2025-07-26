"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AppointmentFormModal } from "./appointment-form-modal"
import { HoraPreviewTooltip } from "./hora-preview-tooltip"
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
import { format } from "date-fns"
import type { WorkSchedule } from "@/types/calendar"
import type { JSX } from "react"

interface HorarioViewDynamicProps {
  date: Date
  citas: Cita[]
  profesionales: Profesional[]
  users: User[]
  onSelectCita: (cita: Cita) => void
  profesionalSeleccionado: number | "todos"
  profesionalesSeleccionados?: number[]
  intervaloTiempo: IntervaloTiempo
  onUpdateCita: (cita: Cita) => void
  onAddCita: (cita: Partial<Cita>) => void
  vacationRequests?: any[]
  isUserOnVacationDate?: (userId: string, date: Date | string) => boolean
  getUserVacationOnDate?: (userId: string, date: Date | string) => any
  workSchedules?: WorkSchedule[] // DATOS DEL SISTEMA NUEVO
}

const getColorProfesional = (profesional: Profesional) => {
  const color = profesional.color || "#3B82F6"
  return {
    backgroundColor: `${color}20`,
    borderColor: color,
    color: color,
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
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervaloTiempo) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      slots.push(timeString)
    }
  }
  return slots
}

export function HorarioViewDynamic({
  date,
  citas,
  profesionales,
  users,
  onSelectCita,
  profesionalSeleccionado,
  profesionalesSeleccionados,
  intervaloTiempo,
  onUpdateCita,
  onAddCita,
  vacationRequests = [],
  isUserOnVacationDate = () => false,
  getUserVacationOnDate = () => null,
  workSchedules = [], // SOLO SISTEMA NUEVO
}: HorarioViewDynamicProps) {
  const [draggedCita, setDraggedCita] = useState<Cita | null>(null)
  const [dragOverProfesional, setDragOverProfesional] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false)
  const [newAppointmentData, setNewAppointmentData] = useState<{
    fecha: Date
    hora: string
    profesionalId?: number
  } | null>(null)
  const [previewHora, setPreviewHora] = useState<string | null>(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })

  const dayOfWeek = date.getDay()

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

  // 🚀 OPTIMIZADO: timeSlots con dependencias más específicas
  const timeSlots = useMemo(() => {
    if (usuariosActivos.length === 0) {
      return generateDefaultTimeSlots(intervaloTiempo)
    }
    if (workSchedules.length === 0) {
      return generateDefaultTimeSlots(intervaloTiempo)
    }
    const generatedSlots = generateTimeSlots(usuariosActivos, dayOfWeek, intervaloTiempo)
    // Si no se generaron slots (sin horarios configurados), usar por defecto
    if (generatedSlots.length === 0) {
      return generateDefaultTimeSlots(intervaloTiempo)
    }
    return generatedSlots
  }, [usuariosActivos, dayOfWeek, intervaloTiempo, workSchedules])

  // 🚀 OPTIMIZADO: Calcular rango con dependencias más específicas
  const { start: startMinutes, end: endMinutes } = useMemo(() => {
    if (usuariosActivos.length === 0 || workSchedules.length === 0) {
      return { start: timeToMinutes("08:00"), end: timeToMinutes("18:00") }
    }
    const range = getCalendarTimeRange(usuariosActivos, dayOfWeek)
    // Si no hay rango válido, usar por defecto
    if (range.start >= range.end) {
      return { start: timeToMinutes("08:00"), end: timeToMinutes("18:00") }
    }
    return range
  }, [usuariosActivos, dayOfWeek, workSchedules])

  const duracionDia = endMinutes - startMinutes

  // Funciones de vacaciones
  const isProfessionalOnVacation = (profesionalId: number | string) => {
    if (!isUserOnVacationDate) return false
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return false
    return isUserOnVacationDate(user.id, date)
  }

  const getProfessionalVacationInfo = (profesionalId: number | string) => {
    if (!getUserVacationOnDate) return null
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return null
    return getUserVacationOnDate(user.id, date)
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

  // Calcular posiciones
  const calcularPosicionCita = (hora: string) => {
    const normalizedTime = normalizeTimeFormat(hora)
    const minutosCita = timeToMinutes(normalizedTime)
    const posicion = ((minutosCita - startMinutes) / duracionDia) * 100
    return Math.max(0, Math.min(posicion, 100))
  }

  const calcularAlturaCita = (duracion: number) => {
    return (duracion / duracionDia) * 100
  }

  const calcularHoraDesdePosicion = (posY: number, contenedorHeight: number) => {
    const porcentaje = (posY / contenedorHeight) * 100
    const minutos = Math.floor((porcentaje / 100) * duracionDia + startMinutes)
    const minutosAjustados = Math.round(minutos / intervaloTiempo) * intervaloTiempo
    return minutesToTime(minutosAjustados)
  }

  // FUNCIÓN SIMPLIFICADA - SOLO SISTEMA NUEVO
  const puedeCrearCitaEnHora = (profesionalId: number, hora: string): boolean => {
    // Verificar vacaciones primero
    if (isProfessionalOnVacation(profesionalId)) {
      return false
    }
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return false
    const normalizedTime = normalizeTimeFormat(hora)
    const timeInMinutes = timeToMinutes(normalizedTime)

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

  // Handlers de drag & drop
  const handleDragStart = (e: React.DragEvent, cita: Cita) => {
    setDraggedCita(cita)
    setIsDragging(true)
    e.dataTransfer.setData("text/plain", cita.id.toString())
  }

  const handleDragOver = (e: React.DragEvent, profesionalId: number) => {
    e.preventDefault()
    if (!draggedCita) return
    setDragOverProfesional(profesionalId)
    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top
    const nuevaHora = calcularHoraDesdePosicion(y, rect.height)
    setPreviewHora(nuevaHora)
    setPreviewPosition({ x: 0, y: e.clientY })

    const indicadores = container.querySelectorAll(".drop-indicator")
    indicadores.forEach((ind) => ind.remove())

    const puedeCrear = puedeCrearCitaEnHora(profesionalId, nuevaHora)
    const indicador = document.createElement("div")
    indicador.className = `drop-indicator absolute w-full h-1 rounded-full z-50 pointer-events-none ${
      puedeCrear ? "bg-blue-400" : "bg-red-400"
    }`
    indicador.style.top = `${(y / rect.height) * 100}%`
    container.appendChild(indicador)
  }

  const handleDrop = async (e: React.DragEvent, profesionalId: number) => {
    e.preventDefault()
    if (!draggedCita) return

    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top
    const nuevaHora = calcularHoraDesdePosicion(y, rect.height)

    const indicadores = container.querySelectorAll(".drop-indicator")
    indicadores.forEach((ind) => ind.remove())

    if (!puedeCrearCitaEnHora(profesionalId, nuevaHora)) {
      const isOnVacation = isProfessionalOnVacation(profesionalId)
      const message = isOnVacation
        ? "No se puede mover la cita: el profesional está de vacaciones"
        : "No se puede mover la cita: fuera del horario de trabajo o en período de descanso"
      toast.error(message)
      setDraggedCita(null)
      setDragOverProfesional(null)
      setIsDragging(false)
      return
    }

    try {
      const citaActualizada = {
        ...draggedCita,
        hora: nuevaHora,
        profesionalId: profesionalId,
        horaFin: calcularHoraFin(nuevaHora, draggedCita.duracion),
      }
      await onUpdateCita(citaActualizada)
      setDraggedCita(null)
      setDragOverProfesional(null)
      setIsDragging(false)
    } catch (error) {
      toast.error("Error al mover la cita")
      setDraggedCita(null)
      setDragOverProfesional(null)
      setIsDragging(false)
    }
  }

  const handleDragEnd = () => {
    setDraggedCita(null)
    setDragOverProfesional(null)
    setIsDragging(false)
    setPreviewHora(null)
    document.querySelectorAll(".drop-indicator").forEach((ind) => ind.remove())
  }

  const handleContainerClick = (e: React.MouseEvent, profesionalId: number) => {
    if (e.target !== e.currentTarget) return
    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top
    const hora = calcularHoraDesdePosicion(y, rect.height)

    if (!puedeCrearCitaEnHora(profesionalId, hora)) {
      const isOnVacation = isProfessionalOnVacation(profesionalId)
      const vacationInfo = getProfessionalVacationInfo(profesionalId)
      const message = isOnVacation
        ? `No disponible: ${getVacationLabel(vacationInfo?.type) || "Ausencia"}`
        : "No se puede crear cita: fuera del horario de trabajo o en período de descanso"
      toast.error(message)
      return
    }

    setNewAppointmentData({
      fecha: date,
      hora,
      profesionalId,
    })
    setShowNewAppointmentModal(true)
  }

  // FUNCIÓN MEJORADA - FRAGMENTA SLOTS ALREDEDOR DE DESCANSOS
  const renderHuecosLibres = (profesionalId: number): JSX.Element[] => {
    if (isProfessionalOnVacation(profesionalId)) {
      return []
    }

    const citasProfesional = citas.filter((cita) => cita.profesionalId === profesionalId)
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
        for (let minutos = segmento.start; minutos < segmento.end; minutos += intervaloTiempo) {
          const finSlot = Math.min(minutos + intervaloTiempo, segmento.end)

          // Solo crear slot si tiene la duración mínima
          if (finSlot - minutos >= intervaloTiempo) {
            const horaInicio = minutesToTime(minutos)
            const horaFin = minutesToTime(finSlot)

            // Verificar si hay cita en este slot
            const ocupado = citasProfesional.some((cita) => {
              const normalizedStartTime = normalizeTimeFormat(cita.hora)
              const horaInicioCita = timeToMinutes(normalizedStartTime)
              const horaFinCita = horaInicioCita + cita.duracion
              return horaInicioCita < finSlot && horaFinCita > minutos
            })

            if (!ocupado) {
              huecos.push(
                <div
                  key={`hueco-${horaInicio}-${profesionalId}`}
                  className="absolute rounded-md cursor-pointer border bg-white hover:brightness-95 transition-all"
                  style={{
                    top: `${calcularPosicionCita(horaInicio)}%`,
                    left: 0,
                    right: 0,
                    width: "100%",
                    height: `${calcularAlturaCita(finSlot - minutos)}%`,
                    backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
                    backgroundSize: "8px 8px",
                    zIndex: 5,
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (puedeCrearCitaEnHora(profesionalId, horaInicio)) {
                      setNewAppointmentData({
                        fecha: date,
                        hora: horaInicio,
                        profesionalId: profesionalId,
                      })
                      setShowNewAppointmentModal(true)
                    } else {
                      const isOnVacation = isProfessionalOnVacation(profesionalId)
                      const message = isOnVacation
                        ? "No se puede crear cita: el profesional está de vacaciones"
                        : "No se puede crear cita: fuera del horario de trabajo o en período de descanso"
                      toast.error(message)
                    }
                  }}
                >
                  <div className="flex flex-col p-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 rounded-full border border-gray-400 bg-white flex items-center justify-center text-xs mr-1">
                        <span>+</span>
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        {horaInicio} - {horaFin}
                      </div>
                    </div>
                  </div>
                </div>,
              )
            }
          }
        }
      }
    }

    return huecos
  }

  // FUNCIÓN MEJORADA - MEJOR VISUALIZACIÓN PARA DESCANSOS PEQUEÑOS
  const renderDescansos = (profesionalId: number): JSX.Element[] => {
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return []

    const userSchedules = getUserWorkSchedulesForDay(user.id, dayOfWeek, workSchedules)
    const descansos: JSX.Element[] = []

    userSchedules.forEach((schedule, scheduleIndex) => {
      schedule.breaks?.forEach((breakItem, breakIndex) => {
        if (!breakItem.is_active) return

        const breakStart = timeToMinutes(breakItem.start_time)
        const breakEnd = timeToMinutes(breakItem.end_time)
        const posicionTop = ((breakStart - startMinutes) / duracionDia) * 100
        const altura = ((breakEnd - breakStart) / duracionDia) * 100

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
          <TooltipProvider key={`break-${scheduleIndex}-${breakIndex}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute rounded-md border-2 border-dashed border-orange-300 bg-orange-50 flex items-center justify-center shadow-sm cursor-help"
                  style={{
                    top: `${Math.max(0, posicionTop)}%`,
                    left: 0,
                    right: 0,
                    width: "100%",
                    height: `${Math.max(1.5, altura)}%`,
                    zIndex: 3,
                    minHeight: duracionMinutos < 15 ? "20px" : duracionMinutos < 30 ? "30px" : "40px",
                  }}
                >
                  <div className="text-center p-1 w-full overflow-hidden">
                    {duracionMinutos < 15 ? (
                      // Para descansos muy cortos (< 15 min): solo emoji pequeño
                      <div className="flex items-center justify-center">
                        <span className="text-sm">{getBreakIcon(breakItem.break_name)}</span>
                      </div>
                    ) : duracionMinutos < 30 ? (
                      // Para descansos cortos (15-30 min): emoji arriba, texto abajo en columna
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="text-sm">{getBreakIcon(breakItem.break_name)}</span>
                        <span className="text-[10px] font-medium text-orange-700 leading-tight">
                          {truncateText(breakItem.break_name, 8)}
                        </span>
                      </div>
                    ) : duracionMinutos < 60 ? (
                      // Para descansos medianos (30-60 min): emoji + nombre pequeño horizontal
                      <div className="text-xs font-medium text-orange-700 flex items-center justify-center gap-1">
                        <span className="text-sm">{getBreakIcon(breakItem.break_name)}</span>
                        <span className="truncate text-xs">{breakItem.break_name}</span>
                      </div>
                    ) : (
                      // Para descansos largos (> 60 min): emoji + nombre normal
                      <div className="text-sm font-medium text-orange-700 flex items-center justify-center gap-1">
                        <span className="text-base">{getBreakIcon(breakItem.break_name)}</span>
                        <span className="truncate">{breakItem.break_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
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
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Cargando horarios...</h3>
          <p className="text-gray-600">Preparando la vista del calendario</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Contenido principal del calendario */}
      <div className="flex-1 overflow-hidden">
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {profesionalesFiltrados.map((profesional) => {
              const citasProfesional = citas.filter((cita) => cita.profesionalId === profesional.id)
              const { titulo, nombre } = extraerTituloProfesional(profesional?.name)
              const huecosLibres = renderHuecosLibres(profesional.id)
              const descansos = renderDescansos(profesional.id)

              // Obtener usuario correspondiente
              const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesional.id)

              // 🚀 MODIFICADO: Calcular workingHours considerando horarios por defecto
              let workingHours: { start: number; end: number }[]
              let isWorkingToday: boolean

              if (!hasAnyScheduleConfigured(profesional.id)) {
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
              const isOnVacation = isProfessionalOnVacation(profesional.id)
              const vacationInfo = getProfessionalVacationInfo(profesional.id)

              // NUEVA LÓGICA: Verificar si tiene horarios configurados
              const hasSchedules = hasAnyScheduleConfigured(profesional.id)

              // Obtener estilos de color dinámicos
              const colorStyles = getColorProfesional(profesional)

              return (
                <div key={profesional.id} className="relative">
                  {/* Cabecera del profesional */}
                  <div
                    className={`sticky top-0 z-10 rounded-t-md border-b-2 text-center ${
                      !isWorkingToday || isOnVacation ? "opacity-50" : ""
                    }`}
                    style={{
                      backgroundColor: isOnVacation ? "#fef3c7" : colorStyles.backgroundColor,
                      borderColor: isOnVacation ? "#f59e0b" : colorStyles.borderColor,
                      color: isOnVacation ? "#92400e" : colorStyles.color,
                    }}
                  >
                    <div className="flex flex-col items-center justify-center py-2 px-2" style={{ height: 56 }}>
                      <span className="font-medium text-sm leading-tight">{nombre}</span>
                      {isOnVacation && (
                        <span className="text-xs text-orange-600 flex items-center gap-1">
                          {getVacationIcon(vacationInfo?.type)} {getVacationLabel(vacationInfo?.type)}
                        </span>
                      )}
                      {!isOnVacation && !hasSchedules && <span className="text-xs text-red-500">Sin horarios</span>}
                      {!isOnVacation && hasSchedules && !isWorkingToday && (
                        <span className="text-xs text-gray-500">No trabaja hoy</span>
                      )}
                      {!isOnVacation && isWorkingToday && workingHours.length > 0 && (
                        <span className="text-xs opacity-75">
                          {workingHours.map((h) => `${minutesToTime(h.start)}-${minutesToTime(h.end)}`).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contenedor de citas */}
                  <div
                    className={`relative border rounded-b-md transition-all duration-200 ${
                      dragOverProfesional === profesional.id
                        ? "bg-blue-50 border-blue-300 shadow-lg"
                        : !isWorkingToday || isOnVacation
                          ? "bg-gray-100"
                          : "bg-gray-50"
                    }`}
                    style={{ height: "1000px" }}
                    onDragOver={(e) => handleDragOver(e, profesional.id)}
                    onDrop={(e) => handleDrop(e, profesional.id)}
                    onClick={
                      isWorkingToday && !isOnVacation ? (e) => handleContainerClick(e, profesional.id) : undefined
                    }
                  >
                    {/* 🚀 MODIFICADO: Siempre mostrar el grid con las líneas de hora */}
                    {/* Líneas de hora - SIEMPRE SE MUESTRAN */}
                    {timeSlots.map((hora, index) => (
                      <div
                        key={hora}
                        className="absolute w-full border-t border-gray-200"
                        style={{ top: `${(index / (timeSlots.length - 1)) * 100}%` }}
                      />
                    ))}

                    {/* 🚀 NUEVO: Overlay de instrucciones SOBRE el grid cuando no hay horarios */}
                    {!hasSchedules && !isOnVacation && (
                      <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-20">
                        <div className="text-center max-w-sm p-6">
                          <div className="text-4xl mb-4">⚙️</div>
                          <div className="text-lg font-semibold mb-4 text-gray-800">Configura los horarios</div>
                          <div className="space-y-3 text-sm text-gray-600 mb-6">
                            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                1
                              </div>
                              <span>
                                Ve a la pestaña <strong>Usuarios</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                2
                              </div>
                              <span>
                                Haz clic en el icono del <strong>reloj ⏰</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                3
                              </div>
                              <span>
                                Configura los horarios y <strong>acepta</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                4
                              </div>
                              <span>
                                <strong>Recarga</strong> esta página
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            💡 <strong>Tip:</strong> Una vez configurados los horarios, podrás crear citas arrastrando y
                            haciendo clic en los espacios libres.
                          </div>
                        </div>
                      </div>
                    )}

                    {!isWorkingToday && !isOnVacation && hasSchedules ? (
                      // Día libre (tiene horarios pero no trabaja hoy) - SOBRE el grid
                      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-15">
                        <div className="text-center">
                          <div className="text-4xl mb-2">😴</div>
                          <div className="text-sm">Día libre</div>
                        </div>
                      </div>
                    ) : isOnVacation ? (
                      // De vacaciones - SOBRE el grid
                      <div className="absolute inset-0 bg-orange-50 bg-opacity-95 flex items-center justify-center z-15">
                        <div className="text-center p-4">
                          <div className="text-4xl mb-3">{getVacationIcon(vacationInfo?.type)}</div>
                          <div className="text-lg font-semibold mb-2">{getVacationLabel(vacationInfo?.type)}</div>
                          {vacationInfo?.reason && <div className="text-sm mb-2">{vacationInfo.reason}</div>}
                          <div className="text-xs">
                            {format(new Date(vacationInfo?.start_date), "dd/MM")} -{" "}
                            {format(new Date(vacationInfo?.end_date), "dd/MM")}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Contenido normal cuando tiene horarios y trabaja
                      <>
                        {/* Períodos de descanso - MEJORADOS PARA DESCANSOS PEQUEÑOS */}
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
                            const posicionTop = calcularPosicionCita(normalizedStartTime)
                            const altura = calcularAlturaCita(cita.duracion)

                            return (
                              <Tooltip key={cita.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    draggable={!isOnVacation}
                                    onDragStart={(e) => !isOnVacation && handleDragStart(e, cita)}
                                    onDragEnd={handleDragEnd}
                                    className={`absolute rounded-md cursor-move shadow-sm border transition-all duration-200 hover:shadow-lg ${
                                      draggedCita?.id === cita.id ? "opacity-50 scale-95 z-50" : "hover:brightness-95"
                                    }`}
                                    style={{
                                      top: `${posicionTop}%`,
                                      left: 0,
                                      right: 0,
                                      width: "100%",
                                      height: `${Math.max(altura, 2.5)}%`,
                                      padding: "4px",
                                      overflow: "hidden",
                                      zIndex: 10 + index,
                                      backgroundColor: colorStyles.backgroundColor,
                                      borderLeftColor: colorStyles.borderColor,
                                      borderLeftWidth: "4px",
                                      color: colorStyles.color,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onSelectCita(cita)
                                    }}
                                  >
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1 text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                                        <div className={`w-2 h-2 rounded-full ${getColorEstado(cita.estado)}`} />
                                        <span className="font-medium">
                                          {normalizedStartTime}-{normalizedEndTime}
                                        </span>
                                      </div>
                                      <div className="font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                                        {cita.nombrePaciente} {cita.apellidosPaciente || ""}
                                      </div>
                                      {cita.telefonoPaciente && (
                                        <div className="text-xs whitespace-nowrap overflow-hidden text-ellipsis opacity-75">
                                          📞 {cita.telefonoPaciente}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${getColorEstado(cita.estado)}`} />
                                      <p className="font-medium">
                                        {cita.nombrePaciente} {cita.apellidosPaciente || ""}
                                      </p>
                                    </div>
                                    <p>
                                      {normalizedStartTime}-{normalizedEndTime} ({cita.duracion} min)
                                    </p>
                                    {cita.telefonoPaciente && <p className="text-xs">Tel: {cita.telefonoPaciente}</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )
                          })}
                        </TooltipProvider>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
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
                <div className="text-xs text-gray-600 mt-1">💡 Suelta en otro profesional para cambiar asignación</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
