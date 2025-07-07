"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ServiceForm } from "@/components/services/service-form"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function NewServicePage() {
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        // Obtener la primera organización disponible
        const { data, error } = await supabase.from("organizations").select("id").order("name").limit(1).single()

        if (error) throw error
        if (!data) throw new Error("No hay organizaciones disponibles")

        setOrganizationId(data.id)
      } catch (err) {
        setError("Error al cargar la organización")
      } finally {
        setLoading(false)
      }
    }

    fetchOrganization()
  }, [])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (error || !organizationId) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>{error || "No se pudo cargar la organización"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Nuevo Servicio</h1>
      <Card>
        <CardHeader>
          <CardTitle>Información del servicio</CardTitle>
          <CardDescription>Introduce los datos del nuevo servicio</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceForm
            organizationId={organizationId}
            onSuccess={() => {
              router.push("/dashboard/services")
              router.refresh()
            }}
            onCancel={() => router.push("/dashboard/services")}
          />
        </CardContent>
      </Card>
    </div>
  )
}
