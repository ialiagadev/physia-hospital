"use client"

import type React from "react"

import { useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AppointmentFormModal } from "./appointment-form-modal"
import { HoraPreviewTooltip } from "./hora-preview-tooltip"
import { horaAMinutos, calcularHoraFin, formatearFecha } from "@/utils/calendar-utils"
import type { Cita, Profesional, IntervaloTiempo } from "@/types/calendar-types"
import { toast } from "sonner"

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

  // Configuración de horarios
  const horaInicio = 8 * 60 // 8:00 AM en minutos
  const horaFin = 20 * 60 // 8:00 PM en minutos
  const duracionDia = horaFin - horaInicio

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

    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    const y = e.clientY - rect.top

    const nuevaHora = calcularHoraDesdePosicion(y, rect.height)

    // Limpiar indicadores
    const indicadores = container.querySelectorAll(".drop-indicator")
    indicadores.forEach((ind) => ind.remove())

    const citaActualizada = {
      ...draggedCita,
      hora: nuevaHora,
      profesionalId: profesionalId,
      horaFin: calcularHoraFin(nuevaHora, draggedCita.duracion),
    }

    onUpdateCita(citaActualizada)
    toast.success(`Cita movida a las ${nuevaHora}`)

    setDraggedCita(null)
    setDragOverProfesional(null)
    setIsDragging(false)
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

    setNewAppointmentData({
      fecha: date,
      hora,
      profesionalId,
    })
    setShowNewAppointmentModal(true)
  }

  // Renderizar huecos libres
  const renderHuecosLibres = (profesionalId: number) => {
    const citasProfesional = citas.filter((cita) => cita.profesionalId === profesionalId)
    const duracionSesion = 60
    const huecos = []

    for (let minutos = horaInicio; minutos < horaFin; minutos += duracionSesion) {
      const horaInicio = `${Math.floor(minutos / 60)
        .toString()
        .padStart(2, "0")}:${(minutos % 60).toString().padStart(2, "0")}`
      const horaFin = `${Math.floor((minutos + duracionSesion) / 60)
        .toString()
        .padStart(2, "0")}:${((minutos + duracionSesion) % 60).toString().padStart(2, "0")}`

      const ocupado = citasProfesional.some((cita) => {
        const horaInicioCita = horaAMinutos(cita.hora)
        const horaFinCita = horaInicioCita + cita.duracion
        return horaInicioCita < minutos + duracionSesion && horaFinCita > minutos
      })

      if (!ocupado) {
        huecos.push({
          inicio: horaInicio,
          fin: horaFin,
          posicionTop: calcularPosicionCita(horaInicio),
          altura: calcularAlturaCita(duracionSesion),
        })
      }
    }

    return huecos
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium">{formatearFecha(date)} - Vista de Horario</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {profesionalesFiltrados.map((profesional) => {
          const citasProfesional = citas.filter((cita) => cita.profesionalId === profesional.id)
          const { titulo, nombre } = extraerTituloProfesional(profesional?.name)
          const huecosLibres = renderHuecosLibres(profesional.id)

          return (
            <div key={profesional.id} className="relative">
              {/* Cabecera del profesional */}
              <div
                className={`sticky top-0 z-10 rounded-t-md ${getColorProfesional(profesional)} border-b-2 text-center`}
              >
                <div className="flex flex-col items-center justify-center py-2 px-2" style={{ height: 56 }}>
                  <span className="font-medium text-sm leading-tight">
                    {titulo} {nombre}
                  </span>
                </div>
              </div>

              {/* Contenedor de citas */}
              <div
                className={`relative h-[600px] border rounded-b-md transition-all duration-200 ${
                  dragOverProfesional === profesional.id ? "bg-blue-50 border-blue-300 shadow-lg" : "bg-gray-50"
                }`}
                onDragOver={(e) => handleDragOver(e, profesional.id)}
                onDrop={(e) => handleDrop(e, profesional.id)}
                onClick={(e) => handleContainerClick(e, profesional.id)}
              >
                {/* Líneas de hora */}
                {horas.map((hora, index) => (
                  <div
                    key={hora}
                    className="absolute w-full border-t border-gray-200"
                    style={{ top: `${(index / (horas.length - 1)) * 100}%` }}
                  />
                ))}

                {/* Huecos libres */}
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
                      setNewAppointmentData({
                        fecha: date,
                        hora: hueco.inicio,
                        profesionalId: profesional.id,
                      })
                      setShowNewAppointmentModal(true)
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
                    const posicionTop = calcularPosicionCita(cita.hora)
                    const altura = calcularAlturaCita(cita.duracion)
                    const horaFin = cita.horaFin || calcularHoraFin(cita.hora, cita.duracion)

                    return (
                      <Tooltip key={cita.id}>
                        <TooltipTrigger asChild>
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, cita)}
                            onDragEnd={handleDragEnd}
                            className={`absolute rounded-md cursor-move shadow-sm border transition-all duration-200 hover:shadow-lg ${
                              draggedCita?.id === cita.id ? "opacity-50 scale-95 z-50" : "hover:brightness-95"
                            } ${getColorProfesional(profesional)}`}
                            style={{
                              top: `${posicionTop}%`,
                              left: 0,
                              right: 0,
                              width: "100%",
                              height: `${Math.max(altura, 2.5)}%`,
                              padding: "4px",
                              overflow: "hidden",
                              zIndex: 10 + index,
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
                                  {cita.hora}-{horaFin}
                                </span>
                              </div>
                              <div className="font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                                {cita.nombrePaciente} {cita.apellidosPaciente || ""}
                              </div>
                              {cita.telefonoPaciente && (
                                <div className="text-xs whitespace-nowrap overflow-hidden text-ellipsis text-gray-600">
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
                              {cita.hora}-{horaFin} ({cita.duracion} min)
                            </p>
                            {cita.telefonoPaciente && <p className="text-xs">Tel: {cita.telefonoPaciente}</p>}
                            <p className="text-xs">{cita.tipo}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </TooltipProvider>
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
                  profesionalId: draggedCita.profesionalId,
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
