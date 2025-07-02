"use client"

import { ChevronLeft, ChevronRight, Plus, Filter } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CalendarView } from "@/types/calendar"

interface CalendarHeaderProps {
  currentDate: Date
  view: CalendarView
  onDateChange: (date: Date) => void
  onViewChange: (view: CalendarView) => void
  onNewAppointment: () => void
  onToggleFilters: () => void
}

export function CalendarHeader({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  onNewAppointment,
  onToggleFilters,
}: CalendarHeaderProps) {
  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)

    switch (view) {
      case "month":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
        break
      case "week":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
        break
      case "day":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
        break
    }

    onDateChange(newDate)
  }

  const getDateTitle = () => {
    switch (view) {
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: es })
      case "week":
        return `Semana del ${format(currentDate, "d MMM", { locale: es })}`
      case "day":
        return format(currentDate, "EEEE, d MMMM yyyy", { locale: es })
      case "agenda":
        return "Agenda"
      default:
        return ""
    }
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateDate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateDate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoy
          </Button>
        </div>

        <h1 className="text-xl font-semibold capitalize">{getDateTitle()}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToggleFilters}>
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>

        <Select value={view} onValueChange={(value: CalendarView) => onViewChange(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mes</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="day">Día</SelectItem>
            <SelectItem value="agenda">Agenda</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={onNewAppointment}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cita
        </Button>
      </div>
    </div>
  )
}
