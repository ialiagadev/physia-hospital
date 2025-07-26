"use client"

import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfToday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
} from "date-fns"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/app/contexts/auth-context"

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(" ")
}

// Función helper para convertir UUID a número
const uuidToNumber = (uuid: string): number => {
  try {
    return parseInt(uuid.slice(-8), 16)
  } catch {
    return 0
  }
}

interface MonthViewProps {
  date: Date
  citas: any[]
  profesionales: any[]
  onSelectCita: (cita: any) => void
  profesionalesSeleccionados: number[]
  onUpdateCita: (cita: any) => void
  onAddCita: (cita: any) => void
  onDateSelect?: (date: Date) => void
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
  onDateSelect,
  vacationRequests = [],
  isUserOnVacationDate = () => false,
  getUserVacationOnDate = () => null,
}: MonthViewProps) {
  const { user, userProfile } = useAuth()
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

  // Verificar si el usuario actual tiene rol 'user'
  const isUserRole = userProfile?.role === "user"

  // 🚀 ENCONTRAR EL PROFESIONAL ACTUAL - USANDO LA MISMA LÓGICA QUE WEEKVIEW
  const currentUserProfessional = isUserRole && userProfile?.id
    ? profesionales.find((prof) => {
        // Si prof.id es número y userProfile.id es string (UUID)
        if (typeof prof.id === 'number' && typeof userProfile.id === 'string') {
          // Convertir UUID a número para comparar
          const userIdAsNumber = uuidToNumber(userProfile.id)
          return prof.id === userIdAsNumber
        }
        // Si prof.id es string y userProfile.id es string
        if (typeof prof.id === 'string' && typeof userProfile.id === 'string') {
          return prof.id === userProfile.id
        }
        // Intentar con propiedades adicionales si existen
        const profAny = prof as any
        return (
          profAny.userId === userProfile.id ||
          profAny.user_id === userProfile.id
        )
      })
    : null

  // 🚀 FILTRAR CITAS SEGÚN EL ROL DEL USUARIO - USANDO LA MISMA LÓGICA QUE WEEKVIEW
  const filteredCitas = isUserRole && currentUserProfessional
    ? citas.filter((cita) => {
        // Manejar diferentes tipos de profesionalId
        if (typeof cita.profesionalId === 'string' && typeof currentUserProfessional.id === 'number') {
          // Si cita tiene UUID y profesional tiene número
          const citaIdAsNumber = uuidToNumber(cita.profesionalId)
          return citaIdAsNumber === currentUserProfessional.id
        }
        if (typeof cita.profesionalId === 'number' && typeof currentUserProfessional.id === 'string') {
          // Si cita tiene número y profesional tiene UUID
          const profIdAsNumber = uuidToNumber(currentUserProfessional.id)
          return cita.profesionalId === profIdAsNumber
        }
        // Comparación directa si son del mismo tipo
        return cita.profesionalId === currentUserProfessional.id
      })
    : citas

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

  const handleDayClick = (day: Date) => {
    if (onDateSelect) {
      onDateSelect(day)
    } else {
      // Crear nueva cita
      const newAppointment: any = {
        fecha: day,
        hora: "09:00",
      }
      // Si es usuario con rol 'user', asignar automáticamente su profesional
      if (isUserRole && currentUserProfessional) {
        newAppointment.profesionalId = currentUserProfessional.id
      }
      onAddCita(newAppointment)
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
          
          // 🆕 USAR LAS CITAS FILTRADAS
          const citasDelDia = filteredCitas.filter((cita) => 
            isSameDay(new Date(cita.fecha), day)
          )

          // Verificar vacaciones para profesionales seleccionados
          // Si es usuario con rol 'user', solo verificar sus propias vacaciones
          const profesionalesParaVacaciones = isUserRole && currentUserProfessional
            ? [currentUserProfessional]
            : profesionales.filter((prof) => profesionalesSeleccionados.includes(prof.id))

          const profesionalesDeVacaciones = profesionalesParaVacaciones.filter((prof) => {
            const userId = prof.user_id || prof.id.toString()
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
              {/* Número del día - CLICKEABLE PARA CAMBIAR A VISTA DIARIA */}
              <div className="flex items-center justify-between mb-1">
                <button
                  type="button"
                  className={classNames(
                    "flex h-6 w-6 items-center justify-center rounded-full text-sm cursor-pointer transition-colors",
                    isToday(day) && "bg-blue-600 font-semibold text-white hover:bg-blue-700",
                    !isToday(day) && isSameMonth(day, firstDayCurrentMonth) && "text-gray-900 hover:bg-blue-100",
                    !isToday(day) && !isSameMonth(day, firstDayCurrentMonth) && "text-gray-400 hover:bg-gray-200",
                  )}
                  onClick={() => handleDayClick(day)}
                  title={`Ir a vista diaria: ${format(day, "EEEE d 'de' MMMM")}`}
                >
                  <time dateTime={format(day, "yyyy-MM-dd")}>
                    {format(day, "d")}
                  </time>
                </button>

                {/* Indicador de vacaciones */}
                {profesionalesDeVacaciones.length > 0 && (
                  <div className="flex gap-1">
                    {profesionalesDeVacaciones.slice(0, 3).map((prof) => {
                      const userId = prof.user_id || prof.id.toString()
                      const vacationInfo = getUserVacationOnDate(userId, day)
                      return (
                        <Badge 
                          key={prof.id} 
                          variant="secondary" 
                          className="text-xs bg-orange-100 text-orange-700 px-1"
                        >
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
                  // 🚀 BÚSQUEDA DE PROFESIONAL CON MANEJO DE TIPOS - IGUAL QUE WEEKVIEW
                  const profesional = profesionales.find((p) => {
                    // Manejar diferentes combinaciones de tipos
                    if (typeof p.id === 'number' && typeof cita.profesionalId === 'string') {
                      // Profesional tiene número, cita tiene UUID
                      const citaIdAsNumber = uuidToNumber(cita.profesionalId)
                      return p.id === citaIdAsNumber
                    }
                    if (typeof p.id === 'string' && typeof cita.profesionalId === 'number') {
                      // Profesional tiene UUID, cita tiene número
                      const profIdAsNumber = uuidToNumber(p.id)
                      return profIdAsNumber === cita.profesionalId
                    }
                    // Comparación directa si son del mismo tipo
                    return p.id === cita.profesionalId
                  })

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
                      <div className="font-medium truncate">
                        {cita.nombrePaciente || cita.client?.name}
                      </div>
                      <div className="text-gray-600 truncate">
                        {cita.hora || cita.start_time} - {profesional?.nombre || profesional?.name}
                      </div>
                    </div>
                  )
                })}
                {citasDelDia.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium">
                    +{citasDelDia.length - 3} más
                  </div>
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