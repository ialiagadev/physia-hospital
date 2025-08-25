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
  onComplete?: (result: any) => void
}

type Step = "service" | "professional" | "slots" | "client-data" | "confirmation"

interface BookingData {
  serviceId: number
  professionalId: string
  assignedProfessionalId?: string
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

// 🔹 auxiliar: detecta el subdominio actual
function getSubdomain() {
  if (typeof window === "undefined") return null
  const host = window.location.hostname
  const parts = host.split(".")
  return parts.length > 2 ? parts[0] : "general"
}

// 🔹 notificar al padre (marketing)
function notifyParentBookingSuccess(lead: {
  name: string
  email: string
  phone?: string
  notes?: string
  value?: number
  calendarId?: string | number
}) {
  const TARGET = "*" // ⚠️ en producción cambia a "https://nora.healthmate.tech", etc.

  window.parent?.postMessage(
    {
      source: "hm-booking",
      event: "booking_success",
      lead,
      ts: Date.now(),
    },
    TARGET
  )
}

export function IndividualBookingFlow({ organizationId, onBack, onComplete }: IndividualBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>("service")
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({})
  const [loading, setLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)

  // 🔹 Avisar al cargar el iframe (métrica de vistas)
  useEffect(() => {
    window.parent?.postMessage(
      { source: "hm-booking", event: "booking_loaded", ts: Date.now() },
      "*"
    )
  }, [])

  // Configuración especial para organización 68
  useEffect(() => {
    if (organizationId === "68") {
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
            setCurrentStep("slots")
          }
        } catch (error) {
          console.error("Error fetching service for org 68:", error)
        }
      }
      fetchServiceAndSetup()
    }
  }, [organizationId])

  const handleServiceSelect = (serviceId: number, duration: number) => {
    setBookingData((prev) => ({ ...prev, serviceId, duration }))
    setCurrentStep("professional")
  }

  const handleProfessionalSelect = (professionalId: string) => {
    setBookingData((prev) => ({ ...prev, professionalId }))
    setCurrentStep("slots")
  }

  const handleSlotSelect = (
    date: string,
    startTime: string,
    endTime: string,
    assignedProfessionalId?: string
  ) => {
    setBookingData((prev) => ({
      ...prev,
      date,
      startTime,
      endTime,
      assignedProfessionalId,
    }))
    setCurrentStep("client-data")
  }

  const handleClientDataSubmit = async (clientData: { name: string; phone: string; email?: string }) => {
    setLoading(true)
    try {
      const finalProfessionalId = bookingData.assignedProfessionalId || bookingData.professionalId

      const response = await fetch(`/api/public/${organizationId}/booking/individual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      // 🔔 notificar al padre vía postMessage (marketing)
      notifyParentBookingSuccess({
        name: clientData.name,
        email: clientData.email ?? "",
        phone: clientData.phone ?? "",
        notes: "Reserva creada desde calendario",
        value: 0,
        calendarId: organizationId,
      })
      

      if (onComplete) onComplete(result)

    } catch (error) {
      console.error("Error:", error)
      const failResult = {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      }
      setBookingResult(failResult)
      setCurrentStep("confirmation")

      if (onComplete) onComplete(failResult)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
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
      setCurrentStep("slots")
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

  const getCurrentStepNumber = () => {
    if (organizationId === "68") {
      switch (currentStep) {
        case "slots": return 1
        case "client-data": return 2
        case "confirmation": return 3
        default: return 1
      }
    } else {
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
