"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, DollarSign, Clock, Tag } from "lucide-react"
import { useServices } from "@/hooks/use-services"
import { ServiceFormModal } from "./services-form-modal"
import type { Service } from "@/types/services"

interface ServicesViewProps {
  organizationId?: number
  onRefreshServices?: () => void
}

export function ServicesView({ organizationId, onRefreshServices }: ServicesViewProps) {
  const { services, loading, error, deleteService } = useServices(organizationId)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const handleDeleteService = async (service: Service) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el servicio "${service.name}"?`)) {
      try {
        await deleteService(service.id)
        onRefreshServices?.()
      } catch (error) {
        console.error("Error deleting service:", error)
      }
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(price)
  }

  const formatDuration = (duration: number) => {
    if (duration >= 60) {
      const hours = Math.floor(duration / 60)
      const minutes = duration % 60
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
    }
    return `${duration}min`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando servicios...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error al cargar servicios</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Servicios</h2>
          <p className="text-gray-600">Gestiona los servicios de tu organización</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay servicios configurados</h3>
            <p className="text-gray-600 text-center mb-4">
              Crea tu primer servicio para comenzar a gestionar las citas de tu organización.
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Primer Servicio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{service.name}</CardTitle>
                      {service.category && (
                        <Badge variant="secondary" className="mt-1">
                          {service.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setEditingService(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteService(service)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {service.description && (
                  <CardDescription className="line-clamp-2">{service.description}</CardDescription>
                )}

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold">{formatPrice(service.price)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(service.duration)}</span>
                  </div>
                </div>

                {(service.vat_rate > 0 || service.irpf_rate > 0) && (
                  <div className="flex gap-2 text-xs">
                    {service.vat_rate > 0 && <Badge variant="outline">IVA {service.vat_rate}%</Badge>}
                    {service.irpf_rate > 0 && <Badge variant="outline">IRPF {service.irpf_rate}%</Badge>}
                  </div>
                )}

                {service.icon && <div className="text-center text-2xl">{service.icon}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para crear servicio */}
      {showCreateModal && (
        <ServiceFormModal
          organizationId={organizationId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            onRefreshServices?.()
          }}
        />
      )}

      {/* Modal para editar servicio */}
      {editingService && (
        <ServiceFormModal
          organizationId={organizationId}
          service={editingService}
          onClose={() => setEditingService(null)}
          onSuccess={() => {
            setEditingService(null)
            onRefreshServices?.()
          }}
        />
      )}
    </div>
  )
}
