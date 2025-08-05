"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { GroupActivitiesList } from "./group-activities-list"
import { ClientDataForm } from "../shared/client-data-form"

interface GroupBookingFlowProps {
  organizationId: string
  onComplete: (result: any) => void
  onBack: () => void
}

type Step = "activities" | "client-data"

interface BookingData {
  activityId?: string
  clientData?: {
    name: string
    phone: string
    email?: string
  }
}

export function GroupBookingFlow({ organizationId, onComplete, onBack }: GroupBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>("activities")
  const [bookingData, setBookingData] = useState<BookingData>({})
  const [loading, setLoading] = useState(false)

  const handleActivitySelect = (activityId: string) => {
    setBookingData((prev) => ({ ...prev, activityId }))
    setCurrentStep("client-data")
  }

  const handleClientDataSubmit = async (clientData: { name: string; phone: string; email?: string }) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/public/${organizationId}/booking/group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityId: bookingData.activityId,
          clientData,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        onComplete(result)
      } else {
        throw new Error(result.error || "Error al inscribirse en la actividad")
      }
    } catch (error) {
      console.error("Error:", error)
      onComplete({
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case "activities":
        onBack()
        break
      case "client-data":
        setCurrentStep("activities")
        break
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="flex-1">
          <div className="text-sm text-gray-500">Paso {currentStep === "activities" ? 1 : 2} de 2</div>
        </div>
      </div>

      {currentStep === "activities" && (
        <GroupActivitiesList organizationId={organizationId} onSelect={handleActivitySelect} />
      )}

      {currentStep === "client-data" && <ClientDataForm onSubmit={handleClientDataSubmit} loading={loading} />}
    </div>
  )
}
