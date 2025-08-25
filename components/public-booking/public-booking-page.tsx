"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin } from 'lucide-react'
import { BookingTypeSelector } from "./booking-type-selector"
import { IndividualBookingFlow } from "./individual/individual-booking-flow"
import { GroupBookingFlow } from "./group/group-booking-flow"
import { BookingConfirmation } from "./shared/booking-confirmation"

interface PublicBookingPageProps {
  organizationId: string
}

type BookingType = "individual" | "group" | null
type BookingStep = "type" | "booking" | "confirmation"

interface BookingResult {
  success: boolean
  appointment?: any
  participant?: any
  message?: string
}

// 👇 helper para detectar subdominio
function getSubdomain() {
  if (typeof window === "undefined") return "general"
  const host = window.location.hostname // ej: "nora.healthmate.tech"
  const parts = host.split(".")
  if (parts.length > 2) {
    return parts[0] // "nora", "lia", "physia", "leo"
  }
  return "general"
}

export function PublicBookingPage({ organizationId }: PublicBookingPageProps) {
  const [bookingType, setBookingType] = useState<BookingType>(null)
  const [currentStep, setCurrentStep] = useState<BookingStep>("type")
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null)
  const [organizationData, setOrganizationData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOrganizationData()
  }, [organizationId])

  useEffect(() => {
    // Auto-configuración para organización 68
    if (organizationId === "68") {
      setBookingType("individual")
      setCurrentStep("booking")

      // 👉 Avisar al padre que el iframe está cargado
      window.parent.postMessage(
        { type: "booking_iframe_loaded", subdomain: getSubdomain() },
        "*"
      )
    }
  }, [organizationId])

  const loadOrganizationData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/public/${organizationId}/services`)
      if (!response.ok) {
        throw new Error("Organización no encontrada")
      }
      const data = await response.json()
      setOrganizationData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const handleBookingTypeSelect = (type: BookingType) => {
    setBookingType(type)
    setCurrentStep("booking")

    if (organizationId === "68") {
      // 👉 Avisar al padre que el usuario inicia la reserva
      window.parent.postMessage(
        { type: "booking_submit", subdomain: getSubdomain() },
        "*"
      )
    }
  }

  const handleBookingComplete = (result: BookingResult) => {
    setBookingResult(result)
    setCurrentStep("confirmation")

    if (organizationId === "68") {
      // 👉 Avisar al padre que se confirmó la reserva
      window.parent.postMessage(
        {
          type: "booking_confirmed",
          payload: {
            bookingId: result?.appointment?.id,
            dateISO: result?.appointment?.date,
          },
          subdomain: getSubdomain(),
        },
        "*"
      )
    }
  }

  const handleStartOver = () => {
    setBookingType(null)
    setCurrentStep("type")
    setBookingResult(null)
    
    // Para org 68, volver a configurar automáticamente
    if (organizationId === "68") {
      setTimeout(() => {
        setBookingType("individual")
        setCurrentStep("booking")
      }, 100)
    }
  }
  const handleReset = () => {
    if (organizationId === "68") {
      // 👇 en lugar de recargar, mantenemos la confirmación visible
      setBookingType("individual")
      setCurrentStep("confirmation")
    } else {
      setBookingType(null)
      setCurrentStep("type")
    }
  }
  

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Intentar de nuevo</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-800">
              Reservar Cita
            </CardTitle>
            <p className="text-gray-600 mt-2">
              {organizationId === "68" 
                ? "Selecciona tu horario ideal" 
                : "Selecciona el tipo de cita que deseas reservar"
              }
            </p>
          </CardHeader>
          <CardContent>
            {/* Solo mostrar selector de tipo si NO es org 68 */}
            {currentStep === "type" && !bookingType && organizationId !== "68" ? (
              <BookingTypeSelector onSelect={handleBookingTypeSelect} />
            ) : currentStep === "booking" && bookingType === "individual" ? (
              <IndividualBookingFlow 
                organizationId={organizationId} 
                onBack={handleReset} 
                onComplete={handleBookingComplete} // 👈 añadimos onComplete aquí
              />
            ) : currentStep === "booking" && bookingType === "group" ? (
              <GroupBookingFlow
                organizationId={organizationId}
                onComplete={handleBookingComplete}
                onBack={handleReset}
              />
            ) : currentStep === "confirmation" && bookingResult ? (
              <BookingConfirmation 
                result={bookingResult} 
                bookingType={bookingType} 
                onStartOver={handleStartOver} 
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
