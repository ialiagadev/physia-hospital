"use client"

import { useState, useEffect } from "react"
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

// Params del iframe
const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
const rawParent = params?.get("parent") || ""
const origin_site = params?.get("origin_site") || "desconocida"

// Whitelist sencilla de dominios permitidos para el postMessage
const ALLOWED_PARENTS = new Set([
  "https://healthmate.tech",
  "https://www.healthmate.tech",
  "https://lia.healthmate.tech",
  "https://nora.healthmate.tech",
  "https://leo.healthmate.tech",
  "https://physia.healthmate.tech",
])
const parentOrigin = (() => {
  try {
    const o = new URL(rawParent).origin
    return ALLOWED_PARENTS.has(o) ? o : "*"
  } catch {
    return "*"
  }
})()

// Notificación al padre cuando se confirma una reserva
function notifyParentBooking(lead: { name: string; email: string; phone?: string }) {
  window.parent?.postMessage(
    {
      type: "healthmate:calendar:booking_submitted",
      payload: { ...lead, origin_site },
      ts: Date.now(),
    },
    parentOrigin
  )
}

export function IndividualBookingFlow({ organizationId, onBack, onComplete }: IndividualBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>("service")
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({})
  const [loading, setLoading] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)

  // Métrica de carga del iframe
  useEffect(() => {
    window.parent?.postMessage(
      { type: "healthmate:calendar:booking_loaded", origin_site, ts: Date.now() },
      parentOrigin
    )
  }, [])

  // Config especial para organización 68 (salta selector servicio/profesional)
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
              professionalId: "any",
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

      // Notificar al padre (creará el lead en el CRM)
      notifyParentBooking({
        name: clientData.name,
        email: clientData.email ?? "",
        phone: clientData.phone ?? "",
      })

      onComplete?.(result)
    } catch (error) {
      console.error("Error:", error)
      const failResult = {
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      }
      setBookingResult(failResult)
      setCurrentStep("confirmation")
      onComplete?.(failResult)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (organizationId === "68") {
      switch (currentStep) {
        case "slots": return onBack()
        case "client-data": return setCurrentStep("slots")
        case "confirmation": return setCurrentStep("client-data")
      }
    } else {
      switch (currentStep) {
        case "service": return onBack()
        case "professional": return setCurrentStep("service")
        case "slots": return setCurrentStep("professional")
        case "client-data": return setCurrentStep("slots")
        case "confirmation": return setCurrentStep("client-data")
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
              professionalId: "any",
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

  const getTotalSteps = () => (organizationId === "68" ? 3 : 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <div className="text-sm text-gray-500">Paso {getCurrentStepNumber()} de {getTotalSteps()}</div>
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
