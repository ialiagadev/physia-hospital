"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
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

  const handleServiceSelect = (serviceId: number, duration: number) => {
    console.log("🛎️ Servicio seleccionado:", { serviceId, duration })
    setBookingData((prev) => ({ ...prev, serviceId, duration }))
    setCurrentStep("professional")
  }

  const handleProfessionalSelect = (professionalId: string) => {
    setBookingData((prev) => ({ ...prev, professionalId }))
    setCurrentStep("slots")
  }

  const handleSlotSelect = (date: string, startTime: string, endTime: string) => {
    setBookingData((prev) => ({
      ...prev,
      date,
      startTime,
      endTime,
    }))
    setCurrentStep("client-data")
  }

  const handleClientDataSubmit = async (clientData: { name: string; phone: string; email?: string }) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/public/${organizationId}/booking/individual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: bookingData.serviceId,
          professionalId: bookingData.professionalId,
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

  const handleStartOver = () => {
    setBookingData({})
    setBookingResult(null)
    setCurrentStep("service")
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
            Paso{" "}
            {currentStep === "service"
              ? 1
              : currentStep === "professional"
                ? 2
                : currentStep === "slots"
                  ? 3
                  : currentStep === "client-data"
                    ? 4
                    : 5}{" "}
            de 5
          </div>
        </div>
      </div>

      {currentStep === "service" && (
        <ServiceSelector organizationId={organizationId} onSelect={handleServiceSelect} />
      )}

      {currentStep === "professional" && (
        <ProfessionalSelector organizationId={organizationId} onSelect={handleProfessionalSelect} />
      )}

      {currentStep === "slots" &&
        bookingData.serviceId &&
        bookingData.professionalId &&
        bookingData.duration !== undefined && (
          <AvailableSlots
            organizationId={organizationId}
            serviceId={bookingData.serviceId}
            professionalId={bookingData.professionalId}
            duration={bookingData.duration} // ✅ pasamos duration al componente
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
