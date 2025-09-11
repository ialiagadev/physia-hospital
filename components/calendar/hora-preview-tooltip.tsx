import type { Cita } from "@/types/calendar"

interface HoraPreviewTooltipProps {
  cita?: Cita
  hora?: string
  position?: { x: number; y: number }
  citaOriginal?: {
    hora: string
    fecha: Date
    profesionalId: number
  }
  profesionales?: Array<{
    id: number
    nombre: string
    settings?: {
      calendar_color?: string
    }
  }>
}

export function HoraPreviewTooltip({ cita, hora, position, citaOriginal, profesionales }: HoraPreviewTooltipProps) {
  // If it's a regular cita tooltip
  if (cita) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-3 min-w-[280px] max-w-[320px]">
        <div className="font-semibold text-base text-gray-900 border-b border-gray-100 pb-2">{cita.nombrePaciente}</div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Hora:</span>
            <span className="text-sm font-semibold text-gray-900">{cita.hora}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Duración:</span>
            <span className="text-sm text-gray-900">{cita.duracion} min</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Servicio:</span>
            <span className="text-sm text-gray-900 text-right flex-1 ml-2">{cita.nombreServicio}</span>
          </div>
          {cita.telefono && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Teléfono:</span>
              <span className="text-sm text-gray-900">{cita.telefono}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-600">Estado:</span>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getColorEstado(cita.estado)}`} />
            <span className="text-sm font-medium capitalize text-gray-900">{cita.estado}</span>
          </div>
        </div>
      </div>
    )
  }

  // If it's a drag preview tooltip
  if (hora && position) {
    const style = {
      position: "fixed" as const,
      left: position.x,
      top: position.y,
      zIndex: 50,
    }

    return (
      <div style={style} className="bg-white border-2 border-blue-200 rounded-lg shadow-xl p-3 pointer-events-none">
        <div className="font-semibold text-sm text-gray-900">Nueva hora: {hora}</div>
        {citaOriginal && <div className="text-sm text-gray-600 mt-1">Hora original: {citaOriginal.hora}</div>}
      </div>
    )
  }

  return null
}

function getColorEstado(estado: string) {
  switch (estado?.toLowerCase()) {
    case "confirmada":
      return "bg-green-500"
    case "pendiente":
      return "bg-yellow-500"
    case "cancelada":
      return "bg-red-500"
    case "completada":
      return "bg-blue-500"
    default:
      return "bg-gray-500"
  }
}
