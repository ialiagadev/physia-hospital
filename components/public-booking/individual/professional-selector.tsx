"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Users } from "lucide-react"

interface Professional {
  id: string
  name: string
  specialty: string
}

interface ProfessionalSelectorProps {
  organizationId: string
  onSelect: (professionalId: string) => void
}

export function ProfessionalSelector({ organizationId, onSelect }: ProfessionalSelectorProps) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProfessionals()
  }, [organizationId])

  const loadProfessionals = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/public/${organizationId}/professionals`)

      if (!response.ok) {
        throw new Error("Error al cargar profesionales")
      }

      const data = await response.json()
      setProfessionals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando profesionales...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadProfessionals}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Selecciona un Profesional</h3>
        <p className="text-gray-600">Elige con qué profesional quieres tu cita</p>
      </div>

      {/* Opción "Cualquier profesional disponible" */}
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-green-200"
        onClick={() => onSelect("")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h5 className="font-semibold text-gray-900">Cualquier profesional disponible</h5>
                <p className="text-sm text-gray-600">Te asignaremos el primer profesional disponible</p>
              </div>
            </div>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              Seleccionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de profesionales específicos */}
      <div className="grid gap-4">
        {professionals.map((professional) => (
          <Card
            key={professional.id}
            className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-blue-200"
            onClick={() => onSelect(professional.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">{professional.name}</h5>
                    <Badge variant="secondary" className="text-xs">
                      {professional.specialty}
                    </Badge>
                  </div>
                </div>
                <Button size="sm">Seleccionar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
