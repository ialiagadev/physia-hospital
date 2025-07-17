"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, FileText, Calendar, List, Users, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DailyBillingModal } from "./daily-billing-modal"

interface CalendarHeaderProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  view: string
  onViewChange: (view: string) => void
  onNewAppointment: () => void
  appointmentCounts?: {
    total: number
    confirmed: number
    pending: number
    completed: number
  }
}

export function CalendarHeader({
  currentDate,
  onDateChange,
  view,
  onViewChange,
  onNewAppointment,
  appointmentCounts,
}: CalendarHeaderProps) {
  const [billingModalOpen, setBillingModalOpen] = useState(false)

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
      default:
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
    }

    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const getDateRangeText = () => {
    switch (view) {
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: es })
      case "week":
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        return `${format(startOfWeek, "d MMM", { locale: es })} - ${format(endOfWeek, "d MMM yyyy", { locale: es })}`
      case "day":
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
      default:
        return format(currentDate, "MMMM yyyy", { locale: es })
    }
  }

  const getViewIcon = (viewType: string) => {
    switch (viewType) {
      case "month":
        return <Calendar className="h-4 w-4" />
      case "week":
        return <List className="h-4 w-4" />
      case "day":
        return <Clock className="h-4 w-4" />
      case "agenda":
        return <List className="h-4 w-4" />
      case "professionals":
        return <Users className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {/* Left section - Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate("prev")} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={goToToday} className="px-3 h-8 text-sm bg-transparent">
              Hoy
            </Button>

            <Button variant="outline" size="sm" onClick={() => navigateDate("next")} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-lg font-semibold text-gray-900 capitalize">{getDateRangeText()}</div>
        </div>

        {/* Center section - Stats */}
        {appointmentCounts && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Total: {appointmentCounts.total}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Confirmadas: {appointmentCounts.confirmed}
            </Badge>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Pendientes: {appointmentCounts.pending}
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              Completadas: {appointmentCounts.completed}
            </Badge>
          </div>
        )}

        {/* Right section - Actions and View */}
        <div className="flex items-center gap-2">
          {/* Billing button - now always visible */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBillingModalOpen(true)}
            className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 bg-transparent"
          >
            <FileText className="h-4 w-4" />
            Facturar Día
          </Button>

          <Button onClick={onNewAppointment} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Button>

          <Select value={view} onValueChange={onViewChange}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {getViewIcon(view)}
                  <span className="capitalize">
                    {view === "month" && "Mes"}
                    {view === "week" && "Semana"}
                    {view === "day" && "Día"}
                    {view === "agenda" && "Agenda"}
                    {view === "professionals" && "Profesionales"}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Mes
                </div>
              </SelectItem>
              <SelectItem value="week">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Semana
                </div>
              </SelectItem>
              <SelectItem value="day">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Día
                </div>
              </SelectItem>
              <SelectItem value="agenda">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Agenda
                </div>
              </SelectItem>
              <SelectItem value="professionals">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Profesionales
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Daily Billing Modal */}
      <DailyBillingModal
        isOpen={billingModalOpen}
        onClose={() => setBillingModalOpen(false)}
        selectedDate={currentDate}
      />
    </>
  )
}
