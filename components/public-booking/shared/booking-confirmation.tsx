"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Calendar, Clock, User, Phone, Mail, Users } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface BookingResult {
  success: boolean
  appointment?: any
  participant?: any
  message?: string
}

interface BookingConfirmationProps {
  result: BookingResult
  bookingType: "individual" | "group" | null
  onStartOver: () => void
}

export function BookingConfirmation({ result, bookingType, onStartOver }: BookingConfirmationProps) {
  const [loading, setLoading] = useState(false)

  if (!result.success) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Error en la Reserva</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{result.message || "Ha ocurrido un error al procesar tu reserva"}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={onStartOver} variant="outline">
                Intentar de Nuevo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const appointmentData = result.appointment || result.participant

  return (
    <div className="space-y-6">
      <Card className="border-green-200">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            {bookingType === "individual" ? "¡Cita Confirmada!" : "¡Inscripción Confirmada!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              {bookingType === "individual"
                ? "Tu cita ha sido reservada exitosamente"
                : "Te has inscrito exitosamente en la actividad grupal"}
            </p>
          </div>

          {appointmentData && (
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg text-gray-800">Detalles de la Reserva</h3>

              <div className="grid gap-4">
                {appointmentData.date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Fecha</p>
                      <p className="text-gray-600">
                        {format(new Date(appointmentData.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                )}

                {appointmentData.start_time && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Hora</p>
                      <p className="text-gray-600">
                        {appointmentData.start_time} - {appointmentData.end_time}
                      </p>
                    </div>
                  </div>
                )}

                {appointmentData.professional_name && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Profesional</p>
                      <p className="text-gray-600">{appointmentData.professional_name}</p>
                    </div>
                  </div>
                )}

                {appointmentData.service_name && (
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Servicio</p>
                      <p className="text-gray-600">{appointmentData.service_name}</p>
                    </div>
                  </div>
                )}

                {appointmentData.client_name && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Cliente</p>
                      <p className="text-gray-600">{appointmentData.client_name}</p>
                    </div>
                  </div>
                )}

                {appointmentData.client_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Teléfono</p>
                      <p className="text-gray-600">{appointmentData.client_phone}</p>
                    </div>
                  </div>
                )}

                {appointmentData.client_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-gray-600">{appointmentData.client_email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Información Importante</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Llega 10 minutos antes de tu cita</li>
              <li>• Si necesitas cancelar, contacta con nosotros con al menos 24h de antelación</li>
              <li>• Guarda esta información para futuras referencias</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={onStartOver} variant="outline">
              Reservar Otra Cita
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
