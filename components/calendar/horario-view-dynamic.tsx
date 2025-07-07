"use client"

import type React from "react"
import { useState } from "react"
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

interface HorarioViewDynamicProps {
  date: Date
  citas: Cita[]
  profesionales: Profesional[]
  users: User[] // Usuarios reales con horarios
  onSelectCita: (cita: Cita) => void
  profesionalSeleccionado: number | "todos"
  profesionalesSeleccionados?: number[]
  intervaloTiempo: IntervaloTiempo
  onUpdateCita: (cita: Cita) => void
  onAddCita: (cita: Partial<Cita>) => void
  // Props de vacaciones
  vacationRequests?: any[]
  isUserOnVacationDate?: (userId: string, date: Date | string) => boolean
  getUserVacationOnDate?: (userId: string, date: Date | string) => any
}

const getColorProfesional = (profesional: Profesional) => {
  // Usar el color de la base de datos directamente
  const color = profesional.color || "#3B82F6"
  // Convertir color hex a clases de Tailwind dinámicamente
  return {
    backgroundColor: `${color}20`, // 20% opacity
    borderColor: color,
    color: color,
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

// Función para normalizar el formato de tiempo (eliminar segundos si existen)
const normalizeTimeFormat = (time: string): string => {
  if (!time) return "00:00"
  // Si el tiempo tiene segundos (HH:MM:SS), eliminarlos
  if (time.includes(":") && time.split(":").length === 3) {
    const [hours, minutes] = time.split(":")
    return `${hours}:${minutes}`
  }
  // Si ya está en formato HH:MM, devolverlo tal como está
  return time
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

  // Obtener día de la semana (0 = domingo, 1 = lunes, etc.)
  const dayOfWeek = date.getDay()

  // Filtrar solo usuarios profesionales (type = 1)
  const professionalUsers = users.filter((user) => user.type === 1)

  // Filtrar profesionales que tengan un usuario correspondiente de tipo 1
  const filteredProfesionales = profesionales.filter((profesional) => {
    const correspondingUser = professionalUsers.find(
      (user) => Number.parseInt(user.id.slice(-8), 16) === profesional.id,
    )
    return correspondingUser !== undefined
  })

  // Aplicar filtro de selección sobre los profesionales ya filtrados por tipo
  const profesionalesFiltrados =
    profesionalSeleccionado === "todos"
      ? filteredProfesionales
      : filteredProfesionales.filter((prof) => prof.id === profesionalSeleccionado)

  // Obtener usuarios correspondientes (solo profesionales)
  const usuariosActivos = professionalUsers.filter((user) =>
    profesionalesFiltrados.some((prof) => Number.parseInt(user.id.slice(-8), 16) === prof.id),
  )

  // Generar slots de tiempo basados en los horarios de los usuarios
  const timeSlots = generateTimeSlots(usuariosActivos, dayOfWeek, intervaloTiempo)

  // Obtener rango de tiempo para el calendario
  const { start: startMinutes, end: endMinutes } = getCalendarTimeRange(usuariosActivos, dayOfWeek)
  const duracionDia = endMinutes - startMinutes

  // Funciones de vacaciones
  const isProfessionalOnVacation = (profesionalId: number | string) => {
    if (!isUserOnVacationDate) return false

    // Encontrar el UUID del usuario correspondiente al profesional
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return false

    return isUserOnVacationDate(user.id, date)
  }

  const getProfessionalVacationInfo = (profesionalId: number | string) => {
    if (!getUserVacationOnDate) return null

    // Encontrar el UUID del usuario correspondiente al profesional
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

  // Validar si se puede crear cita en una hora específica
  const puedeCrearCitaEnHora = (profesionalId: number, hora: string): boolean => {
    // Verificar vacaciones primero
    if (isProfessionalOnVacation(profesionalId)) {
      return false
    }

    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return false

    const normalizedTime = normalizeTimeFormat(hora)
    const timeInMinutes = timeToMinutes(normalizedTime)

    return isUserWorkingAt(user, dayOfWeek, timeInMinutes)
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

    // Mostrar indicador visual solo si puede crear cita en esa hora
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

    // Limpiar indicadores
    const indicadores = container.querySelectorAll(".drop-indicator")
    indicadores.forEach((ind) => ind.remove())

    // Validar si puede crear cita en esa hora
    if (!puedeCrearCitaEnHora(profesionalId, nuevaHora)) {
      const isOnVacation = isProfessionalOnVacation(profesionalId)
      const message = isOnVacation
        ? "No se puede mover la cita: el profesional está de vacaciones"
        : "No se puede mover la cita fuera del horario de trabajo"

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

      // Llamar a la función de actualización y esperar a que termine
      await onUpdateCita(citaActualizada)
      setDraggedCita(null)
      setDragOverProfesional(null)
      setIsDragging(false)
    } catch (error) {
      console.error("Error updating appointment:", error)
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

    // Validar si puede crear cita en esa hora
    if (!puedeCrearCitaEnHora(profesionalId, hora)) {
      const isOnVacation = isProfessionalOnVacation(profesionalId)
      const vacationInfo = getProfessionalVacationInfo(profesionalId)

      const message = isOnVacation
        ? `No disponible: ${getVacationLabel(vacationInfo?.type) || "Ausencia"}`
        : "No se puede crear cita fuera del horario de trabajo"

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

  // Renderizar huecos libres para un profesional (solo en horario de trabajo y sin vacaciones)
  const renderHuecosLibres = (profesionalId: number) => {
    // No mostrar huecos si está de vacaciones
    if (isProfessionalOnVacation(profesionalId)) {
      return []
    }

    const citasProfesional = citas.filter((cita) => cita.profesionalId === profesionalId)
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)

    if (!user) return []

    const workingHours = getWorkingHoursForDay(user, dayOfWeek)
    const huecos = []

    for (const hours of workingHours) {
      // Generar slots dentro del horario de trabajo
      for (let minutos = hours.start; minutos < hours.end; minutos += intervaloTiempo) {
        // Verificar si está en horario de descanso
        if (hours.breakStart && hours.breakEnd && minutos >= hours.breakStart && minutos < hours.breakEnd) {
          continue
        }

        const horaInicio = minutesToTime(minutos)
        const horaFin = minutesToTime(minutos + intervaloTiempo)

        // Verificar si hay cita en este slot
        const ocupado = citasProfesional.some((cita) => {
          const normalizedStartTime = normalizeTimeFormat(cita.hora)
          const horaInicioCita = timeToMinutes(normalizedStartTime)
          const horaFinCita = horaInicioCita + cita.duracion
          return horaInicioCita < minutos + intervaloTiempo && horaFinCita > minutos
        })

        if (!ocupado) {
          huecos.push({
            inicio: horaInicio,
            fin: horaFin,
            posicionTop: calcularPosicionCita(horaInicio),
            altura: calcularAlturaCita(intervaloTiempo),
          })
        }
      }
    }

    return huecos
  }

  if (timeSlots.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Sin horarios configurados</h3>
          <p className="text-gray-600">
            Los profesionales seleccionados no tienen horarios configurados para{" "}
            {["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][dayOfWeek]}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {profesionalesFiltrados.map((profesional) => {
          const citasProfesional = citas.filter((cita) => cita.profesionalId === profesional.id)
          const { titulo, nombre } = extraerTituloProfesional(profesional?.name)
          const huecosLibres = renderHuecosLibres(profesional.id)

          // Obtener usuario correspondiente
          const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesional.id)
          const workingHours = user ? getWorkingHoursForDay(user, dayOfWeek) : []
          const isWorkingToday = workingHours.length > 0

          // Verificar vacaciones
          const isOnVacation = isProfessionalOnVacation(profesional.id)
          const vacationInfo = getProfessionalVacationInfo(profesional.id)

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
                  {!isOnVacation && !isWorkingToday && <span className="text-xs text-gray-500">No trabaja hoy</span>}
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
                style={{ height: "600px" }}
                onDragOver={(e) => handleDragOver(e, profesional.id)}
                onDrop={(e) => handleDrop(e, profesional.id)}
                onClick={isWorkingToday && !isOnVacation ? (e) => handleContainerClick(e, profesional.id) : undefined}
              >
                {!isWorkingToday && !isOnVacation ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">😴</div>
                      <div className="text-sm">Día libre</div>
                    </div>
                  </div>
                ) : isOnVacation ? (
                  <div className="flex items-center justify-center h-full text-orange-600">
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
                  <>
                    {/* Líneas de hora */}
                    {timeSlots.map((hora, index) => (
                      <div
                        key={hora}
                        className="absolute w-full border-t border-gray-200"
                        style={{ top: `${(index / (timeSlots.length - 1)) * 100}%` }}
                      />
                    ))}

                    {/* Huecos libres - solo en horario de trabajo y sin vacaciones */}
                    {huecosLibres.map((hueco, index) => (
                      <div
                        key={`hueco-${index}`}
                        className="absolute rounded-md cursor-pointer border bg-white hover:brightness-95 transition-all"
                        style={{
                          top: `${hueco.posicionTop}%`,
                          left: 0,
                          right: 0,
                          width: "100%",
                          height: `${hueco.altura}%`,
                          backgroundImage: "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
                          backgroundSize: "8px 8px",
                          zIndex: 5,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Validar nuevamente antes de abrir modal
                          if (puedeCrearCitaEnHora(profesional.id, hueco.inicio)) {
                            setNewAppointmentData({
                              fecha: date,
                              hora: hueco.inicio,
                              profesionalId: profesional.id,
                            })
                            setShowNewAppointmentModal(true)
                          } else {
                            const isOnVacation = isProfessionalOnVacation(profesional.id)
                            const message = isOnVacation
                              ? "No se puede crear cita: el profesional está de vacaciones"
                              : "No se puede crear cita fuera del horario de trabajo"
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
                              {hueco.inicio} - {hueco.fin}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Citas */}
                    <TooltipProvider>
                      {citasProfesional.map((cita, index) => {
                        // Normalizar los tiempos de la cita
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
                                <p className="text-xs">{cita.tipo}</p>
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
  )
}
