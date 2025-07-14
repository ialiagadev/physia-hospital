"use client"

import React from "react"
import { useState, useEffect } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppointmentFormModal } from "./appointment-form-modal"
import { HoraPreviewTooltip } from "./hora-preview-tooltip"
import { horaAMinutos, calcularHoraFin } from "@/utils/calendar-utils"
import type { Cita, Profesional, IntervaloTiempo } from "@/types/calendar"
import { toast } from "sonner"
import { useVacationRequests } from "@/hooks/use-vacation-requests"
import { Plane, AlertTriangle, Clock, User } from "lucide-react"

interface HorarioViewProps {
  date: Date
  citas: Cita[]
  profesionales: Profesional[]
  onSelectCita: (cita: Cita) => void
  profesionalSeleccionado: number | "todos"
  profesionalesSeleccionados?: number[]
  intervaloTiempo: IntervaloTiempo
  onUpdateCita: (cita: Cita) => void
  onAddCita: (cita: Partial<Cita>) => void
  onOpenDailyBilling?: () => void // Nueva prop para abrir facturación diaria
}

interface VacationRequest {
  id: string
  user_id: string
  type: string
  start_date: string
  end_date: string
  reason: string
  status: string
}

// Colores para los profesionales
const COLORES_PROFESIONALES = {
  teal: "bg-teal-100 border-teal-500 text-teal-800",
  blue: "bg-blue-100 border-blue-500 text-blue-800",
  purple: "bg-purple-100 border-purple-500 text-purple-800",
  amber: "bg-amber-100 border-amber-500 text-amber-800",
  rose: "bg-rose-100 border-rose-500 text-rose-800",
  emerald: "bg-emerald-100 border-emerald-500 text-emerald-800",
}

// Colores para tipos de vacaciones
const VACATION_COLORS = {
  vacation: "bg-blue-100 border-blue-400 text-blue-800",
  sick_leave: "bg-red-100 border-red-400 text-red-800",
  personal: "bg-purple-100 border-purple-400 text-purple-800",
  maternity: "bg-pink-100 border-pink-400 text-pink-800",
  training: "bg-green-100 border-green-400 text-green-800",
  other: "bg-gray-100 border-gray-400 text-gray-800",
}

const VACATION_ICONS = {
  vacation: Plane,
  sick_leave: AlertTriangle,
  personal: User,
  maternity: User,
  training: Clock,
  other: Clock,
}

const VACATION_LABELS = {
  vacation: "Vacaciones",
  sick_leave: "Baja Médica",
  personal: "Asunto Personal",
  maternity: "Maternidad/Paternidad",
  training: "Formación",
  other: "Otros",
}

const getColorProfesional = (profesional: Profesional) => {
  return COLORES_PROFESIONALES[profesional.color as keyof typeof COLORES_PROFESIONALES] || COLORES_PROFESIONALES.teal
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

export function HorarioView({
  date,
  citas,
  profesionales,
  onSelectCita,
  profesionalSeleccionado,
  profesionalesSeleccionados,
  intervaloTiempo,
  onUpdateCita,
  onAddCita,
  onOpenDailyBilling,
}: HorarioViewProps) {
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
  const [professionalVacations, setProfessionalVacations] = useState<Record<string, VacationRequest>>({})

  const { requests, loading: vacationsLoading } = useVacationRequests()

  // Configuración de horarios
  const horaInicio = 8 * 60 // 8:00 AM en minutos
  const horaFin = 20 * 60 // 8:00 PM en minutos
  const duracionDia = horaFin - horaInicio

  // Cargar vacaciones de profesionales
  useEffect(() => {
    if (!requests || requests.length === 0) return
    const dateStr = date.toISOString().split("T")[0]
    const vacationsMap: Record<string, VacationRequest> = {}
    requests.forEach((request) => {
      if (request.status === "approved" && request.start_date <= dateStr && request.end_date >= dateStr) {
        vacationsMap[request.user_id] = request
      }
    })
    setProfessionalVacations(vacationsMap)
  }, [requests, date])

  // Verificar si un profesional está de vacaciones
  const isProfessionalOnVacation = (profesionalId: number | string) => {
    return professionalVacations[profesionalId.toString()] !== undefined
  }

  // Obtener información de vacaciones de un profesional
  const getProfessionalVacationInfo = (profesionalId: number | string) => {
    return professionalVacations[profesionalId.toString()]
  }

  // Generar horas según intervalo
  const generarHoras = () => {
    const horas = []
    for (let minutos = horaInicio; minutos <= horaFin; minutos += intervaloTiempo) {
      const hora = Math.floor(minutos / 60)
      const min = minutos % 60
      horas.push(`${hora.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`)
    }
    return horas
  }

  const horas = generarHoras()

  // Filtrar profesionales
  const profesionalesFiltrados =
    profesionalSeleccionado === "todos"
      ? profesionales
      : profesionales.filter((prof) => prof.id === profesionalSeleccionado)

  // Calcular posiciones
  const calcularPosicionCita = (hora: string) => {
    const minutosCita = horaAMinutos(hora)
    const posicion = ((minutosCita - horaInicio) / duracionDia) * 100
    return Math.max(0, Math.min(posicion, 100))
  }

  const calcularAlturaCita = (duracion: number) => {
    return (duracion / duracionDia) * 100
  }

  const calcularHoraDesdePosicion = (posY: number, contenedorHeight: number) => {
    const porcentaje = (posY / contenedorHeight) * 100
    const minutos = Math.floor((porcentaje / 100) * duracionDia + horaInicio)
    const minutosAjustados = Math.round(minutos / intervaloTiempo) * intervaloTiempo
    const horas = Math.floor(minutosAjustados / 60)
    const mins = minutosAjustados % 60
    return `${horas.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
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

    // No permitir drop si el profesional está de vacaciones
    if (isProfessionalOnVacation(profesionalId)) {
      return
    }

    setDragOverProfesional(profesionalId)
    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top
    const nuevaHora = calcularHoraDesdePosicion(y, rect.height)
    setPreviewHora(nuevaHora)
    setPreviewPosition({ x: 0, y: e.clientY })

    // Mostrar indicador visual
    const indicadores = container.querySelectorAll(".drop-indicator")
    indicadores.forEach((ind) => ind.remove())
    const indicador = document.createElement("div")
    indicador.className = "drop-indicator absolute w-full h-1 bg-blue-400 rounded-full z-50 pointer-events-none"
    indicador.style.top = `${(y / rect.height) * 100}%`
    container.appendChild(indicador)
  }

  const handleDrop = (e: React.DragEvent, profesionalId: number) => {
    e.preventDefault()
    if (!draggedCita) return

    // No permitir drop si el profesional está de vacaciones
    if (isProfessionalOnVacation(profesionalId)) {
      toast.error("No se puede programar cita: el profesional está de vacaciones")
      return
    }

    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top
    const nuevaHora = calcularHoraDesdePosicion(y, rect.height)

    // Actualizar la cita
    const citaActualizada = {
      ...draggedCita,
      profesionalId,
      hora: nuevaHora,
      horaInicio: nuevaHora,
      horaFin: calcularHoraFin(nuevaHora, draggedCita.duracion),
    }

    onUpdateCita(citaActualizada)
    toast.success("Cita movida correctamente")

    // Limpiar estado
    setDraggedCita(null)
    setIsDragging(false)
    setDragOverProfesional(null)
    setPreviewHora(null)

    // Limpiar indicadores
    const indicadores = container.querySelectorAll(".drop-indicator")
    indicadores.forEach((ind) => ind.remove())
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const container = e.currentTarget as HTMLElement
    const indicadores = container.querySelectorAll(".drop-indicator")
    indicadores.forEach((ind) => ind.remove())
    setDragOverProfesional(null)
    setPreviewHora(null)
  }

  const handleDragEnd = () => {
    setDraggedCita(null)
    setIsDragging(false)
    setDragOverProfesional(null)
    setPreviewHora(null)
  }

  // Handler para crear nueva cita
  const handleSlotClick = (profesionalId: number, hora: string) => {
    // No permitir crear cita si el profesional está de vacaciones
    if (isProfessionalOnVacation(profesionalId)) {
      const vacationInfo = getProfessionalVacationInfo(profesionalId)
      const vacationType = vacationInfo?.type || "vacation"
      const vacationLabel = VACATION_LABELS[vacationType as keyof typeof VACATION_LABELS] || "Ausencia"
      toast.error(`No se puede programar cita: el profesional está en ${vacationLabel.toLowerCase()}`)
      return
    }

    setNewAppointmentData({
      fecha: date,
      hora,
      profesionalId,
    })
    setShowNewAppointmentModal(true)
  }

  const handleNewAppointmentSubmit = (cita: Partial<Cita>) => {
    onAddCita(cita)
    setShowNewAppointmentModal(false)
    setNewAppointmentData(null)
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-white">
        {/* Contenido principal del calendario */}
        <div className="flex flex-1 overflow-hidden">
          {/* Columna de horas */}
          <div className="w-16 border-r bg-gray-50 flex-shrink-0">
            <div className="h-12 border-b flex items-center justify-center text-xs font-medium text-gray-500">Hora</div>
            <div className="relative">
              {horas.map((hora, index) => (
                <div key={hora} className="h-16 border-b border-gray-100 flex items-start justify-center pt-1">
                  <span className="text-xs text-gray-600 font-mono">{hora}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Columnas de profesionales */}
          <div className="flex-1 flex overflow-x-auto">
            {profesionalesFiltrados.map((profesional) => {
              const { titulo, nombre } = extraerTituloProfesional(profesional.nombre || profesional.name)
              const citasProfesional = citas.filter((cita) => cita.profesionalId === profesional.id)
              const isOnVacation = isProfessionalOnVacation(profesional.id)
              const vacationInfo = getProfessionalVacationInfo(profesional.id)

              return (
                <div key={profesional.id} className="flex-1 min-w-48 border-r">
                  {/* Header del profesional */}
                  <div
                    className={`h-12 border-b flex items-center justify-center px-2 ${
                      isOnVacation ? "bg-red-50" : "bg-gray-50"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {titulo && <span className="text-blue-600">{titulo} </span>}
                        {nombre}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{profesional.especialidad}</div>
                      {isOnVacation && vacationInfo && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          {React.createElement(
                            VACATION_ICONS[vacationInfo.type as keyof typeof VACATION_ICONS] || Clock,
                            { className: "h-3 w-3 text-red-500" },
                          )}
                          <span className="text-xs text-red-600">
                            {VACATION_LABELS[vacationInfo.type as keyof typeof VACATION_LABELS] || "Ausencia"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Área de citas */}
                  <div
                    className={`relative h-full ${isOnVacation ? "bg-red-50 opacity-60" : "bg-white"} ${
                      dragOverProfesional === profesional.id ? "bg-blue-50" : ""
                    }`}
                    onDragOver={(e) => handleDragOver(e, profesional.id)}
                    onDrop={(e) => handleDrop(e, profesional.id)}
                    onDragLeave={handleDragLeave}
                  >
                    {/* Líneas de hora */}
                    {horas.map((hora, index) => (
                      <div
                        key={hora}
                        className={`h-16 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                          isOnVacation ? "cursor-not-allowed" : ""
                        }`}
                        onClick={() => !isOnVacation && handleSlotClick(profesional.id, hora)}
                      />
                    ))}

                    {/* Citas */}
                    {citasProfesional.map((cita) => {
                      const top = calcularPosicionCita(cita.hora)
                      const height = calcularAlturaCita(cita.duracion)
                      const colorProfesional = getColorProfesional(profesional)
                      const colorEstado = getColorEstado(cita.estado)

                      return (
                        <div
                          key={cita.id}
                          className={`absolute left-1 right-1 rounded-lg border-l-4 p-2 cursor-move shadow-sm hover:shadow-md transition-shadow ${colorProfesional} ${
                            isDragging && draggedCita?.id === cita.id ? "opacity-50" : ""
                          }`}
                          style={{
                            top: `${top}%`,
                            height: `${height}%`,
                            minHeight: "40px",
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, cita)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectCita(cita)}
                        >
                          <div className="flex items-start justify-between h-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-xs font-medium truncate">
                                  {cita.hora} - {cita.horaFin || calcularHoraFin(cita.hora, cita.duracion)}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${colorEstado}`} />
                              </div>
                              <div className="text-sm font-medium truncate">
                                {cita.nombrePaciente} {cita.apellidosPaciente}
                              </div>
                              <div className="text-xs text-gray-600 truncate">{cita.tipo}</div>
                              {cita.telefonoPaciente && (
                                <div className="text-xs text-gray-500 truncate">{cita.telefonoPaciente}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Preview de nueva cita durante drag */}
                    {dragOverProfesional === profesional.id && previewHora && draggedCita && (
                      <HoraPreviewTooltip
                        hora={previewHora}
                        position={previewPosition}
                        citaOriginal={{
                          hora: draggedCita.hora,
                          fecha:
                            typeof draggedCita.fecha === "string" ? new Date(draggedCita.fecha) : draggedCita.fecha,
                          profesionalId:
                            typeof draggedCita.profesionalId === "string"
                              ? Number.parseInt(draggedCita.profesionalId)
                              : draggedCita.profesionalId,
                        }}
                        profesionales={profesionales}
                      >
                        <div
                          className="absolute left-1 right-1 rounded-lg border-2 border-dashed border-blue-400 bg-blue-50 p-2 opacity-75"
                          style={{
                            top: `${calcularPosicionCita(previewHora)}%`,
                            height: `${calcularAlturaCita(draggedCita.duracion)}%`,
                            minHeight: "40px",
                          }}
                        >
                          <div className="text-xs text-blue-600 font-medium">
                            {previewHora} - {calcularHoraFin(previewHora, draggedCita.duracion)}
                          </div>
                          <div className="text-sm text-blue-800">
                            {draggedCita.nombrePaciente} {draggedCita.apellidosPaciente}
                          </div>
                        </div>
                      </HoraPreviewTooltip>
                    )}

                    {/* Overlay de vacaciones */}
                    {isOnVacation && vacationInfo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-75 pointer-events-none">
                        <div className="text-center">
                          {React.createElement(
                            VACATION_ICONS[vacationInfo.type as keyof typeof VACATION_ICONS] || Clock,
                            { className: "h-8 w-8 text-red-500 mx-auto mb-2" },
                          )}
                          <div className="text-sm font-medium text-red-700">
                            {VACATION_LABELS[vacationInfo.type as keyof typeof VACATION_LABELS] || "Ausencia"}
                          </div>
                          <div className="text-xs text-red-600">{vacationInfo.reason}</div>
                        </div>
                      </div>
                    )}
                  </div>
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
            onSubmit={handleNewAppointmentSubmit}
          />
        )}
      </div>
    </TooltipProvider>
  )
}
