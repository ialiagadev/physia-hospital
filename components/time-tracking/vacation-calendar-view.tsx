"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useVacationRequests, type VacationType } from "@/hooks/use-vacation-requests"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Calendar, Filter, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface VacationCalendarViewProps {
  userProfile: any
  isAdmin: boolean
  selectedUser?: any
  organizationUsers: any[]
}

const VACATION_TYPES = [
  { value: "vacation" as VacationType, label: "Vacaciones", color: "bg-blue-500", textColor: "text-blue-700" },
  { value: "sick_leave" as VacationType, label: "Baja médica", color: "bg-red-500", textColor: "text-red-700" },
  { value: "personal" as VacationType, label: "Asunto personal", color: "bg-yellow-500", textColor: "text-yellow-700" },
  {
    value: "maternity" as VacationType,
    label: "Maternidad/Paternidad",
    color: "bg-pink-500",
    textColor: "text-pink-700",
  },
  { value: "training" as VacationType, label: "Formación", color: "bg-green-500", textColor: "text-green-700" },
  { value: "other" as VacationType, label: "Otros", color: "bg-gray-500", textColor: "text-gray-700" },
]

export function VacationCalendarView({
  userProfile,
  isAdmin,
  selectedUser,
  organizationUsers,
}: VacationCalendarViewProps) {
  const { requests, loading, getRequests } = useVacationRequests()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [filters, setFilters] = useState({
    user: "all",
    type: "all",
    status: "approved", // Por defecto solo mostrar aprobadas
  })

  useEffect(() => {
    if (userProfile?.organization_id) {
      getRequests(userProfile.organization_id, isAdmin ? undefined : userProfile.id)
    }
  }, [userProfile, isAdmin])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  // Generar días del calendario incluyendo días de meses anteriores/siguientes para completar la grilla
  const calendarStart = new Date(monthStart)
  calendarStart.setDate(calendarStart.getDate() - ((monthStart.getDay() + 6) % 7))

  const calendarEnd = new Date(monthEnd)
  const daysToAdd = (7 - ((monthEnd.getDay() + 1) % 7)) % 7
  calendarEnd.setDate(calendarEnd.getDate() + daysToAdd)

  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Filtrar solicitudes aprobadas del mes actual
  const filteredRequests = requests.filter((request) => {
    if (filters.status !== "all" && request.status !== filters.status) return false
    if (filters.type !== "all" && request.type !== filters.type) return false
    if (filters.user !== "all" && request.user_id !== filters.user) return false

    const startDate = parseISO(request.start_date)
    const endDate = parseISO(request.end_date)

    // Verificar si la solicitud se superpone con el mes actual o los días visibles
    return startDate <= calendarEnd && endDate >= calendarStart
  })

  // Obtener solicitudes para un día específico
  const getRequestsForDay = (day: Date) => {
    return filteredRequests.filter((request) => {
      const startDate = parseISO(request.start_date)
      const endDate = parseISO(request.end_date)
      return day >= startDate && day <= endDate
    })
  }

  const getTypeInfo = (type: VacationType) => {
    return VACATION_TYPES.find((t) => t.value === type) || VACATION_TYPES[VACATION_TYPES.length - 1]
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentDate(subMonths(currentDate, 1))
    } else {
      setCurrentDate(addMonths(currentDate, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Estadísticas del mes
  const monthStats = {
    totalDays: filteredRequests.reduce((acc, req) => {
      const startDate = parseISO(req.start_date)
      const endDate = parseISO(req.end_date)

      // Calcular días que se superponen con el mes actual
      const overlapStart = startDate > monthStart ? startDate : monthStart
      const overlapEnd = endDate < monthEnd ? endDate : monthEnd

      if (overlapStart <= overlapEnd) {
        const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        return acc + days
      }
      return acc
    }, 0),
    byType: VACATION_TYPES.reduce(
      (acc, type) => {
        acc[type.value] = filteredRequests.filter((req) => req.type === type.value).length
        return acc
      },
      {} as Record<VacationType, number>,
    ),
  }

  // Próximas vacaciones
  const upcomingVacations = requests
    .filter((req) => req.status === "approved" && parseISO(req.start_date) > new Date())
    .sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header simplificado */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendario de Vacaciones
        </h2>
        <p className="text-sm text-muted-foreground">Gestiona y visualiza las vacaciones del equipo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendario principal */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="space-y-4">
              {/* Título del mes con navegación */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-lg font-semibold">
                    {format(currentDate, "MMMM yyyy", { locale: es })}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday} className="ml-2 bg-transparent">
                    <Home className="h-4 w-4 mr-1" />
                    Hoy
                  </Button>
                </div>
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {isAdmin && (
                  <Select value={filters.user} onValueChange={(value) => setFilters({ ...filters, user: value })}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {organizationUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name?.split(" ")[0] || user.email.split("@")[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {VACATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="approved">Aprobadas</SelectItem>
                    <SelectItem value="rejected">Rechazadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Días del calendario */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dayRequests = getRequestsForDay(day)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isTodayDate = isToday(day)

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "p-1 h-20 border rounded-lg relative overflow-hidden transition-colors hover:bg-muted/50",
                        isCurrentMonth ? "bg-background" : "bg-muted/30",
                        isTodayDate && "ring-2 ring-primary",
                        dayRequests.length > 0 && isCurrentMonth && "bg-blue-50",
                      )}
                    >
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isTodayDate && "text-primary font-bold",
                          !isCurrentMonth && "text-muted-foreground",
                        )}
                      >
                        {format(day, "d")}
                      </div>

                      {/* Indicadores de vacaciones */}
                      <div className="space-y-1 mt-1">
                        {dayRequests.slice(0, 2).map((request, index) => {
                          const typeInfo = getTypeInfo(request.type)
                          const user = organizationUsers.find((u) => u.id === request.user_id)

                          return (
                            <div
                              key={`${request.id}-${index}`}
                              className={cn(
                                "text-xs px-1 py-0.5 rounded truncate",
                                typeInfo.color,
                                "text-white",
                                request.status === "pending" && "opacity-60 border border-dashed border-white",
                              )}
                              title={`${user?.name || user?.email}: ${typeInfo.label} (${request.status})`}
                            >
                              {isAdmin ? user?.name?.split(" ")[0] || user?.email.split("@")[0] : typeInfo.label}
                            </div>
                          )
                        })}
                        {dayRequests.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center">+{dayRequests.length - 2} más</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {/* Navegación rápida */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Navegación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="text-xs"
                >
                  {format(subMonths(currentDate, 1), "MMM", { locale: es })}
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday} className="text-xs bg-transparent">
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="text-xs"
                >
                  {format(addMonths(currentDate, 1), "MMM", { locale: es })}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas del mes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estadísticas del Mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-2xl font-bold">{monthStats.totalDays}</div>
                <p className="text-sm text-muted-foreground">Días totales</p>
              </div>
              <div className="space-y-2">
                {VACATION_TYPES.filter((type) => monthStats.byType[type.value] > 0).map((type) => (
                  <div key={type.value} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${type.color}`} />
                      <span className="text-sm">{type.label}</span>
                    </div>
                    <Badge variant="outline">{monthStats.byType[type.value]}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leyenda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leyenda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {VACATION_TYPES.map((type) => (
                <div key={type.value} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${type.color}`} />
                  <span className="text-sm">{type.label}</span>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-dashed border-gray-400 bg-gray-200 opacity-60" />
                  <span className="text-sm text-muted-foreground">Pendiente</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Próximas vacaciones */}
          {upcomingVacations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Próximas Vacaciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingVacations.map((vacation) => {
                  const typeInfo = getTypeInfo(vacation.type)
                  const user = organizationUsers.find((u) => u.id === vacation.user_id)

                  return (
                    <div key={vacation.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${typeInfo.color}`} />
                        <span className="text-sm font-medium">
                          {isAdmin ? user?.name || user?.email : typeInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground ml-4">
                        {format(parseISO(vacation.start_date), "dd MMM", { locale: es })} -{" "}
                        {format(parseISO(vacation.end_date), "dd MMM", { locale: es })}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
