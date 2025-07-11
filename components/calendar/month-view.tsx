"use client"

import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns"
import { Badge } from "@/components/ui/badge"

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}

interface MonthViewProps {
  date: Date
  citas: any[]
  profesionales: any[]
  onSelectCita: (cita: any) => void
  profesionalesSeleccionados: number[]
  onUpdateCita: (cita: any) => void
  onAddCita: (cita: any) => void
  vacationRequests?: any[]
  isUserOnVacationDate?: (userId: string, date: Date | string) => boolean
  getUserVacationOnDate?: (userId: string, date: Date | string) => any
}

export function MonthView({
  date,
  citas,
  profesionales,
  onSelectCita,
  profesionalesSeleccionados,
  onUpdateCita,
  onAddCita,
  vacationRequests = [],
  isUserOnVacationDate = () => false,
  getUserVacationOnDate = () => null,
}: MonthViewProps) {
  const today = startOfToday()
  const firstDayCurrentMonth = date

  const monthStart = startOfMonth(firstDayCurrentMonth)
  const monthEnd = endOfMonth(firstDayCurrentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  })

  const getVacationIcon = (type: string) => {
    switch (type) {
      case "vacation":
        return "🏖️"
      case "sick_leave":
        return "🏥"
      case "personal":
        return "👤"
      default:
        return "😴"
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {["L", "M", "X", "J", "V", "S", "D"].map((day, index) => (
          <div
            key={index}
            className="py-2 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="flex-1 grid grid-cols-7 divide-x divide-gray-200">
        {days.map((day, dayIdx) => {
          const dayDate = format(day, "yyyy-MM-dd")
          const citasDelDia = citas.filter((cita) => isSameDay(new Date(cita.fecha), day))

          // Verificar vacaciones para profesionales seleccionados
          const profesionalesDeVacaciones = profesionales
            .filter((prof) => profesionalesSeleccionados.includes(prof.id))
            .filter((prof) => {
              const userId = prof.userId || prof.id.toString()
              return isUserOnVacationDate(userId, day)
            })

          return (
            <div
              key={day.toString()}
              className={classNames(
                "min-h-[120px] p-2 border-b border-gray-200",
                !isSameMonth(day, firstDayCurrentMonth) && "bg-gray-50 text-gray-400",
                isToday(day) && "bg-blue-50",
              )}
            >
              {/* Número del día */}
              <div className="flex items-center justify-between mb-1">
                <button
                  type="button"
                  className={classNames(
                    "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                    isToday(day) && "bg-blue-600 font-semibold text-white",
                    !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-gray-900 hover:bg-gray-100",
                    !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-gray-400",
                  )}
                  onClick={() => {
                    onAddCita({
                      fecha: day,
                      hora: "09:00",
                    })
                  }}
                >
                  <time dateTime={format(day, "yyyy-MM-dd")}>{format(day, "d")}</time>
                </button>

                {/* Indicador de vacaciones */}
                {profesionalesDeVacaciones.length > 0 && (
                  <div className="flex gap-1">
                    {profesionalesDeVacaciones.slice(0, 3).map((prof) => {
                      const userId = prof.userId || prof.id.toString()
                      const vacationInfo = getUserVacationOnDate(userId, day)
                      return (
                        <Badge key={prof.id} variant="secondary" className="text-xs bg-orange-100 text-orange-700 px-1">
                          {getVacationIcon(vacationInfo?.type)}
                        </Badge>
                      )
                    })}
                    {profesionalesDeVacaciones.length > 3 && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 px-1">
                        +{profesionalesDeVacaciones.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Citas del día */}
              <div className="space-y-1">
                {citasDelDia.slice(0, 3).map((cita) => {
                  const profesional = profesionales.find((p) => p.id === cita.profesionalId)
                  return (
                    <div
                      key={cita.id}
                      className="text-xs p-1 rounded cursor-pointer hover:bg-opacity-80"
                      style={{
                        backgroundColor: profesional?.color + "40" || "#e5e7eb",
                        borderLeft: `3px solid ${profesional?.color || "#6b7280"}`,
                      }}
                      onClick={() => onSelectCita(cita)}
                    >
                      <div className="font-medium truncate">{cita.nombrePaciente}</div>
                      <div className="text-gray-600 truncate">
                        {cita.hora} - {profesional?.nombre}
                      </div>
                    </div>
                  )
                })}

                {citasDelDia.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium">+{citasDelDia.length - 3} más</div>
                )}
              </div>

              {/* Mensaje de día libre si hay vacaciones y no hay citas */}
              {citasDelDia.length === 0 && profesionalesDeVacaciones.length > 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-orange-600">
                    <div className="text-lg mb-1">😴</div>
                    <div className="text-xs">Día libre</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
