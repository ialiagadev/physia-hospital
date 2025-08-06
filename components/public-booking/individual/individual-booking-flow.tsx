"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'
import { ServiceSelector } from "./service-selector"
import { ProfessionalSelector } from "./professional-selector"
import { AvailableSlots } from "./available-slots"
import { ClientDataForm } from "../shared/client-data-form"
import { BookingConfirmation } from "../shared/booking-confirmation"

interface IndividualBookingFlowProps {
  organizationId: string
  onBack: () => void
}

type Step = "service" | "professional" | "slots" | "client-data" | "confirmation"

interface BookingData {
  serviceId: number
  professionalId: string
  assignedProfessionalId?: string // Para cuando se selecciona "any"
  date: string
  startTime: string
  endTime: string
  duration: number
  clientData: {
    name: string
    phone: string
    email?: string
  }
}

export function IndividualBookingFlow({ organizationId, onBack }: IndividualBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>("service")
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({})
  const [loading, setLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)

  // Configuración especial para organización 68
  useEffect(() => {
    if (organizationId === "68") {
      // Auto-configurar para organización 68
      const fetchServiceAndSetup = async () => {
        try {
          // Obtener el primer servicio disponible
          const response = await fetch(`/api/public/${organizationId}/services`)
          const data = await response.json()
          
          if (data.services && data.services.length > 0) {
            const firstService = data.services[0]
            setBookingData({
              serviceId: firstService.id,
              duration: firstService.duration,
              professionalId: "any" // Cualquier profesional
            })
            setCurrentStep("slots") // Ir directamente a slots
          }
        } catch (error) {
          console.error("Error fetching service for org 68:", error)
          // Si hay error, usar flujo normal
        }
      }
      
      fetchServiceAndSetup()
    }
  }, [organizationId])

  const handleServiceSelect = (serviceId: number, duration: number) => {
    console.log("🛎️ Servicio seleccionado:", { serviceId, duration })
    setBookingData((prev) => ({ ...prev, serviceId, duration }))
    setCurrentStep("professional")
  }

  const handleProfessionalSelect = (professionalId: string) => {
    console.log("👨‍⚕️ Profesional seleccionado:", professionalId)
    setBookingData((prev) => ({ ...prev, professionalId }))
    setCurrentStep("slots")
  }

  const handleSlotSelect = (
    date: string,
    startTime: string,
    endTime: string,
    assignedProfessionalId?: string
  ) => {
    console.log("🕐 Slot seleccionado:", { date, startTime, endTime, assignedProfessionalId })
    setBookingData((prev) => ({
      ...prev,
      date,
      startTime,
      endTime,
      assignedProfessionalId, // Guardar el profesional asignado si existe
    }))
    setCurrentStep("client-data")
  }

  const handleClientDataSubmit = async (clientData: { name: string; phone: string; email?: string }) => {
    setLoading(true)
    try {
      // Usar el profesional asignado si existe, sino el seleccionado originalmente
      const finalProfessionalId = bookingData.assignedProfessionalId || bookingData.professionalId
      console.log("📝 Enviando datos de booking:", {
        serviceId: bookingData.serviceId,
        professionalId: finalProfessionalId, // Nunca debe ser "any"
        originalProfessionalId: bookingData.professionalId,
        assignedProfessionalId: bookingData.assignedProfessionalId,
        date: bookingData.date,
        startTime: bookingData.startTime,
        endTime: bookingData.endTime,
        clientData,
      })

      const response = await fetch(`/api/public/${organizationId}/booking/individual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: bookingData.serviceId,
          professionalId: finalProfessionalId,
          date: bookingData.date,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          clientData,
        }),
      })

      const result = await response.json()
      setBookingResult(result)
      setCurrentStep("confirmation")
    } catch (error) {
      console.error("Error:", error)
      setBookingResult({
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      })
      setCurrentStep("confirmation")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    // Para organización 68, el primer paso es slots
    if (organizationId === "68") {
      switch (currentStep) {
        case "slots":
          onBack()
          break
        case "client-data":
          setCurrentStep("slots")
          break
        case "confirmation":
          setCurrentStep("client-data")
          break
      }
    } else {
      // Flujo normal para otras organizaciones
      switch (currentStep) {
        case "service":
          onBack()
          break
        case "professional":
          setCurrentStep("service")
          break
        case "slots":
          setCurrentStep("professional")
          break
        case "client-data":
          setCurrentStep("slots")
          break
        case "confirmation":
          setCurrentStep("client-data")
          break
      }
    }
  }

  const handleStartOver = () => {
    setBookingData({})
    setBookingResult(null)
    
    if (organizationId === "68") {
      // Para org 68, reiniciar en slots
      setCurrentStep("slots")
      // Re-configurar datos
      const fetchServiceAndSetup = async () => {
        try {
          const response = await fetch(`/api/public/${organizationId}/services`)
          const data = await response.json()
          
          if (data.services && data.services.length > 0) {
            const firstService = data.services[0]
            setBookingData({
              serviceId: firstService.id,
              duration: firstService.duration,
              professionalId: "any"
            })
          }
        } catch (error) {
          console.error("Error fetching service for org 68:", error)
        }
      }
      fetchServiceAndSetup()
    } else {
      setCurrentStep("service")
    }
  }

  // Calcular el paso actual para la UI
  const getCurrentStepNumber = () => {
    if (organizationId === "68") {
      // Para org 68: slots=1, client-data=2, confirmation=3
      switch (currentStep) {
        case "slots": return 1
        case "client-data": return 2
        case "confirmation": return 3
        default: return 1
      }
    } else {
      // Flujo normal: service=1, professional=2, slots=3, client-data=4, confirmation=5
      switch (currentStep) {
        case "service": return 1
        case "professional": return 2
        case "slots": return 3
        case "client-data": return 4
        case "confirmation": return 5
        default: return 1
      }
    }
  }

  const getTotalSteps = () => {
    return organizationId === "68" ? 3 : 5
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <div className="text-sm text-gray-500">
            Paso {getCurrentStepNumber()} de {getTotalSteps()}
          </div>
        </div>
      </div>

      {/* Solo mostrar estos pasos si NO es organización 68 */}
      {organizationId !== "68" && currentStep === "service" && (
        <ServiceSelector organizationId={organizationId} onSelect={handleServiceSelect} />
      )}

      {organizationId !== "68" && currentStep === "professional" && bookingData.serviceId && (
        <ProfessionalSelector 
          organizationId={organizationId} 
          serviceId={bookingData.serviceId.toString()}
          onSelect={handleProfessionalSelect} 
        />
      )}

      {/* Available Slots - se muestra para todas las organizaciones */}
      {currentStep === "slots" &&
        bookingData.serviceId &&
        bookingData.professionalId &&
        bookingData.duration !== undefined && (
        <AvailableSlots
          organizationId={organizationId}
          serviceId={bookingData.serviceId}
          professionalId={bookingData.professionalId}
          duration={bookingData.duration}
          onSelect={handleSlotSelect}
        />
      )}

      {currentStep === "client-data" && (
        <ClientDataForm onSubmit={handleClientDataSubmit} loading={loading} />
      )}

      {currentStep === "confirmation" && bookingResult && (
        <BookingConfirmation
          result={bookingResult}
          bookingType="individual"
          onStartOver={handleStartOver}
        />
      )}
    </div>
  )
}
