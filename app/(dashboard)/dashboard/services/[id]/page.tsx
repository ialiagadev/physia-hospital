"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ServiceForm } from "@/components/services/service-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/app/contexts/auth-context"
import type { Service } from "@/types/services"

export default function EditServicePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { userProfile, isLoading: authLoading } = useAuth()
  const [serviceData, setServiceData] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchService = async () => {
      if (authLoading) return

      if (!userProfile?.organization_id) {
        setError("No se pudo obtener la información de la organización")
        setLoading(false)
        return
      }

      try {
        // Primero buscar el servicio sin filtro de organización
        const { data: service, error: serviceError } = await supabase
          .from("services")
          .select("*")
          .eq("id", params.id)
          .single()

        if (serviceError) {
          throw new Error("Servicio no encontrado")
        }

        // Verificar que pertenece a la organización del usuario
        if (service.organization_id !== userProfile.organization_id) {
          throw new Error("No tienes permisos para editar este servicio")
        }

        setServiceData(service)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar el servicio")
      } finally {
        setLoading(false)
      }
    }

    fetchService()
  }, [params.id, userProfile, authLoading])

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (error || !serviceData || !userProfile?.organization_id) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>{error || "No se pudo cargar el servicio"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Editar Servicio</h1>
      <Card>
        <CardHeader>
          <CardTitle>Información del servicio</CardTitle>
          <CardDescription>Modifica los datos del servicio</CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceForm
            organizationId={userProfile.organization_id}
            service={serviceData}
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
