"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/contexts/auth-context"
import { useRouter } from "next/navigation"
import MedicalCalendarSystem from "@/components/dashboard/medical-calendar-system"
import Loading from "@/components/loading"

export default function Page() {
  const [mounted, setMounted] = useState(false)
  const { user, userProfile, isLoading } = useAuth()
  const router = useRouter()

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
        <Loading size="lg" text="Cargando..." />
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

  return <MedicalCalendarSystem />
}
