"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/contexts/auth-context"
import { useRouter } from "next/navigation"
import MedicalCalendarSystem from "@/components/dashboard/medical-calendar-system"
import { useGuidedTour } from "@/hooks/useGuidedTour"
import InteractiveTourOverlay from "@/components/tour/InteractiveTourOverlay"

export default function Page() {
  const [mounted, setMounted] = useState(false)
  const { user, userProfile, isLoading } = useAuth()
  const router = useRouter()

  const { isActive, tourSteps, endTour } = useGuidedTour()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Cargando...</h2>
          <p className="text-gray-600">Configurando tu calendario médico</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Redirigiendo...</h2>
          <p className="text-gray-600">Te estamos redirigiendo al login</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Error</h2>
          <p className="text-gray-600 mb-4">No se pudo cargar el perfil del usuario</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <MedicalCalendarSystem />

      <InteractiveTourOverlay steps={tourSteps} onClose={endTour} onFinish={endTour} isActive={isActive} />
    </>
  )
}
