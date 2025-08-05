"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Euro, Loader2 } from "lucide-react"

interface Service {
  id: number
  name: string
  description: string | null
  price: number
  duration: number
  category: string | null
  color: string
}

interface ServiceSelectorProps {
  organizationId: string
  onSelect: (serviceId: number, duration: number) => void
}

export function ServiceSelector({ organizationId, onSelect }: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadServices()
  }, [organizationId])

  const loadServices = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/public/${organizationId}/services`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cargar servicios")
      }

      const data = await response.json()

      // Verificar que la respuesta tiene la estructura correcta
      if (data && Array.isArray(data.services)) {
        setServices(data.services)
      } else {
        console.error("Respuesta inesperada de la API:", data)
        setServices([])
      }
    } catch (err) {
      console.error("Error loading services:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      setServices([]) // Asegurar que services sea siempre un array
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Cargando servicios...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadServices} variant="outline">
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  if (!Array.isArray(services) || services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No hay servicios disponibles en este momento.</p>
        <Button onClick={loadServices} variant="outline" className="mt-4 bg-transparent">
          Recargar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Selecciona un Servicio</h3>
        <p className="text-gray-600">Elige el servicio que necesitas</p>
      </div>

      <div className="grid gap-4">
        {services.map((service) => (
          <Card
            key={service.id}
            className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-300"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: service.color || "#3B82F6" }} />
                    <h4 className="text-lg font-semibold text-gray-800">{service.name}</h4>
                    {service.category && (
                      <Badge variant="secondary" className="text-xs">
                        {service.category}
                      </Badge>
                    )}
                  </div>

                  {service.description && <p className="text-gray-600 mb-4">{service.description}</p>}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {service.duration} min
                    </div>
                    <div className="flex items-center">
                      <Euro className="w-4 h-4 mr-1" />
                      {Number(service.price).toFixed(2)}€
                    </div>
                  </div>
                </div>

                <Button onClick={() => onSelect(service.id, service.duration)} className="ml-4">
                  Seleccionar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
