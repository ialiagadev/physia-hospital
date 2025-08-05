"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Users, Clock, User } from "lucide-react"

interface BookingTypeSelectorProps {
  onSelect: (type: "individual" | "group") => void
}

export function BookingTypeSelector({ onSelect }: BookingTypeSelectorProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-200">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Cita Individual</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6">Reserva una cita personalizada con uno de nuestros profesionales</p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              Elige fecha y hora
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <User className="w-4 h-4 mr-2" />
              Selecciona profesional
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-2" />
              Atención personalizada
            </div>
          </div>

          <Button onClick={() => onSelect("individual")} className="w-full" size="lg">
            Reservar Cita Individual
          </Button>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-200">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-xl">Actividad Grupal</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-6">Únete a una actividad grupal programada con otros participantes</p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              Actividades programadas
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Users className="w-4 h-4 mr-2" />
              Ambiente grupal
            </div>
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Clock className="w-4 h-4 mr-2" />
              Horarios fijos
            </div>
          </div>

          <Button onClick={() => onSelect("group")} className="w-full bg-green-600 hover:bg-green-700" size="lg">
            Ver Actividades Grupales
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
