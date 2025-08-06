"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { Clock, User, AlertCircle, RotateCcw, CalendarIcon } from 'lucide-react'

interface TimeSlot {
  start_time: string
  end_time: string
  available: boolean
  professional_id?: string
  professional_name?: string
}

interface AvailableSlotsProps {
  organizationId: string
  serviceId: number
  professionalId: string
  duration: number
  onSelect: (date: string, startTime: string, endTime: string, assignedProfessionalId?: string) => void
}

// Paleta de colores para profesionales
const professionalColors = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'text-blue-600' },
  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-600' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'text-purple-600' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-600' },
  { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: 'text-pink-600' },
  { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'text-indigo-600' },
  { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: 'text-teal-600' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: 'text-rose-600' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', icon: 'text-cyan-600' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-600' },
]

// Función para obtener color de profesional
const getProfessionalColor = (professionalId: string) => {
  const hash = professionalId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  const index = Math.abs(hash) % professionalColors.length
  return professionalColors[index]
}

export function AvailableSlots({ organizationId, serviceId, professionalId, duration, onSelect }: AvailableSlotsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [professionalColorMap, setProfessionalColorMap] = useState<Map<string, any>>(new Map())

  const fetchAvailableSlots = async (date: Date) => {
    setLoading(true)
    setError(null)
    try {
      const dateStr = format(date, "yyyy-MM-dd")
      const url = `/api/public/${organizationId}/available-slots?date=${dateStr}&serviceId=${serviceId}&professionalId=${professionalId}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Error al cargar los horarios disponibles")
      }
      
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
    if (organizationId && serviceId && professionalId) {
      fetchAvailableSlots(selectedDate)
    }
  }, [selectedDate, organizationId, serviceId, professionalId])

  useEffect(() => {
    if (availableSlots.length > 0 && professionalId === "any") {
      const colorMap = new Map()
      availableSlots.forEach(slot => {
        if (slot.professional_id && !colorMap.has(slot.professional_id)) {
          colorMap.set(slot.professional_id, getProfessionalColor(slot.professional_id))
        }
      })
      setProfessionalColorMap(colorMap)
    }
  }, [availableSlots, professionalId])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleSlotSelect = (slot: TimeSlot) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd")
    onSelect(dateStr, slot.start_time, slot.end_time, slot.professional_id)
  }

  const disabledDays = {
    before: startOfDay(new Date()),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium shadow-lg">
            <CalendarIcon className="w-4 h-4" />
            Reserva tu cita
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Selecciona tu horario ideal
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Encuentra el momento perfecto para tu cita
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-800">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  Elige tu fecha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={disabledDays}
                  locale={es}
                  className="rounded-xl border-0 bg-gradient-to-br from-blue-50 to-indigo-50 p-4"
                />
              </CardContent>
            </Card>
          </div>

          {/* Time Slots */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm h-full">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl text-gray-800">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-emerald-600" />
                    </div>
                    Horarios disponibles
                  </CardTitle>
                  {availableSlots.length > 0 && (
                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                      {availableSlots.length} disponibles
                    </div>
                  )}
                </div>
                <p className="text-gray-600 capitalize font-medium">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </p>
              </CardHeader>
              
              <CardContent>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="relative">
                      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-blue-300 rounded-full animate-spin animation-delay-150"></div>
                    </div>
                    <p className="text-gray-600 font-medium">Buscando horarios...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                      <p className="text-red-600 font-semibold">Ups, algo salió mal</p>
                      <p className="text-gray-500 text-sm mt-1">{error}</p>
                    </div>
                    <Button 
                      onClick={() => fetchAvailableSlots(selectedDate)}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Intentar de nuevo
                    </Button>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Clock className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-gray-700 font-semibold">No hay citas disponibles</p>
                      <p className="text-gray-500">Prueba seleccionando otra fecha</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {availableSlots.map((slot, index) => {
                      const professionalColor = slot.professional_id && professionalId === "any" 
                        ? professionalColorMap.get(slot.professional_id) 
                        : null

                      return (
                        <button
                          key={index}
                          onClick={() => handleSlotSelect(slot)}
                          className="w-full group relative overflow-hidden bg-white border-2 border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                              <div className="text-left">
                                <div className="text-lg font-bold text-gray-900">
                                  {slot.start_time} - {slot.end_time}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {duration} minutos
                                </div>
                              </div>
                            </div>
                            
                            {slot.professional_name && professionalId === "any" && professionalColor && (
                              <div className={`flex items-center space-x-2 ${professionalColor.bg} ${professionalColor.border} border px-3 py-1 rounded-full`}>
                                <User className={`w-4 h-4 ${professionalColor.icon}`} />
                                <span className={`${professionalColor.text} font-medium text-sm`}>
                                  {slot.professional_name}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Hover effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Service Info */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-800 to-slate-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
    
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
