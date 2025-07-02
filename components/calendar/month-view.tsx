"use client"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns"
import type { Cita, Profesional } from "@/types/calendar-types"

interface MonthViewProps {
  date: Date
  citas: Cita[]
  profesionales: Profesional[]
  onSelectCita: (cita: Cita) => void
  profesionalesSeleccionados: number[]
  onUpdateCita: (cita: Cita) => void
  onAddCita: (cita: Partial<Cita>) => void
  onDateSelect?: (date: Date) => void
}

const getColorProfesional = (profesional: Profesional) => {
  // Usar el color de la base de datos directamente
  const color = profesional.color || "#3B82F6"

  return {
    backgroundColor: `${color}20`, // 20% opacity
    borderLeftColor: color,
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

// Función para asegurar que tenemos un objeto Date válido
const ensureDate = (fecha: Date | string): Date => {
  if (fecha instanceof Date) {
    return fecha
  }
  const parsedDate = new Date(fecha)
  if (isNaN(parsedDate.getTime())) {
    return new Date() // Fallback a fecha actual
  }
  return parsedDate
}

export function MonthView({
  date,
  citas,
  profesionales,
  onSelectCita,
  profesionalesSeleccionados,
  onUpdateCita,
  onAddCita,
  onDateSelect,
}: MonthViewProps) {
  // Generar días del calendario (6 semanas)
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  // Obtener citas de un día específico
  const getCitasDelDia = (day: Date) => {
    return citas.filter((cita) => {
      const citaFecha = ensureDate(cita.fecha)
      return isSameDay(citaFecha, day) && profesionalesSeleccionados.includes(cita.profesionalId)
    })
  }

  const handleDayClick = (day: Date) => {
    if (onDateSelect) {
      onDateSelect(day)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header con días de la semana */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-700 border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Grid del calendario */}
      <div className="flex-1 grid grid-cols-7 gap-0">
        {calendarDays.map((day) => {
          const citasDelDia = getCitasDelDia(day)
          const isCurrentMonth = isSameMonth(day, date)
          const isDayToday = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-b last:border-r-0 min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                !isCurrentMonth ? "bg-gray-100 text-gray-400" : "bg-white"
              }`}
              onClick={() => handleDayClick(day)}
            >
              {/* Número del día */}
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-sm font-medium ${
                    isDayToday
                      ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      : isCurrentMonth
                        ? "text-gray-900"
                        : "text-gray-400"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {citasDelDia.length > 3 && (
                  <span className="text-xs text-gray-500 bg-gray-200 rounded-full px-2 py-1">
                    +{citasDelDia.length - 3}
                  </span>
                )}
              </div>

              {/* Citas del día */}
              <div className="space-y-1">
                {citasDelDia.slice(0, 3).map((cita) => {
                  const profesional = profesionales.find((p) => p.id === cita.profesionalId)
                  if (!profesional) return null

                  // Obtener estilos de color dinámicos
                  const colorStyles = getColorProfesional(profesional)

                  return (
                    <div
                      key={cita.id}
                      className="text-xs p-1 rounded border-l-2 cursor-pointer hover:shadow-sm transition-shadow"
                      style={{
                        backgroundColor: colorStyles.backgroundColor,
                        borderLeftColor: colorStyles.borderLeftColor,
                        color: colorStyles.color,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectCita(cita)
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`w-2 h-2 rounded-full ${getColorEstado(cita.estado)}`} />
                        <span className="font-medium truncate">
                          {cita.hora} {cita.nombrePaciente}
                        </span>
                      </div>
                      <div className="opacity-75 truncate">{cita.tipo}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
