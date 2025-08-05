"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { Clock } from "lucide-react"

interface TimeSlot {
  start_time: string
  end_time: string
  available: boolean
}

interface AvailableSlotsProps {
  organizationId: string
  serviceId: number
  professionalId: string
  duration: number // Quitar el ? para hacerla requerida
  onSelect: (date: string, startTime: string, endTime: string) => void
}

export function AvailableSlots({ organizationId, serviceId, professionalId, duration, onSelect }: AvailableSlotsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAvailableSlots = async (date: Date) => {
    setLoading(true)
    setError(null)
    try {
      const dateStr = format(date, "yyyy-MM-dd")
      const url = `/api/public/${organizationId}/available-slots?date=${dateStr}&serviceId=${serviceId}&professionalId=${professionalId}&duration=${duration}`
      console.log("Fetching slots from:", url)
      console.log("Duration being sent:", duration)

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar los horarios disponibles")
      }

      console.log("Slots response:", data)
      setAvailableSlots(data.slots || [])
    } catch (err) {
      console.error("Error fetching slots:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      setAvailableSlots([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (organizationId && serviceId && professionalId && duration) {
      fetchAvailableSlots(selectedDate)
    }
  }, [selectedDate, organizationId, serviceId, professionalId, duration])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd")
    onSelect(dateStr, slot.start_time, slot.end_time)
  }

  // Deshabilitar fechas pasadas
  const disabledDays = {
    before: startOfDay(new Date()),
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800">Selecciona Fecha y Hora</h2>
        <p className="text-gray-600 mt-2">Elige el día y horario que mejor te convenga</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendario */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selecciona una fecha</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={disabledDays}
              locale={es}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Horarios disponibles */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Horarios disponibles
              <span className="block text-sm font-normal text-gray-600 mt-1">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Cargando horarios...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchAvailableSlots(selectedDate)} className="mt-2">
                  Reintentar
                </Button>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No hay horarios disponibles para esta fecha</p>
                <p className="text-gray-500 text-xs mt-1">Prueba con otra fecha</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start hover:bg-blue-50 hover:border-blue-300 bg-transparent"
                    onClick={() => handleSlotSelect(slot)}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {slot.start_time} - {slot.end_time}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
