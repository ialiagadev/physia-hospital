"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Euro, Clock, Tag, AlertTriangle } from "lucide-react"
import { useServices } from "@/hooks/use-services"
import { useToast } from "@/hooks/use-toast"
import { ServiceFormModal } from "./services-form-modal"
import type { Service } from "@/types/services"

interface ServicesViewProps {
  organizationId: number
  onRefreshServices?: () => void
}

export function ServicesView({ organizationId, onRefreshServices }: ServicesViewProps) {
  const { services, loading, error, deleteService, refetch } = useServices(organizationId)
  const { toast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null)
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null)

  // Usar useCallback para evitar recrear funciones en cada render
  const handleDeleteClick = useCallback((service: Service) => {
    setServiceToDelete(service)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!serviceToDelete) return

    setDeletingServiceId(serviceToDelete.id)
    try {
      await deleteService(serviceToDelete.id)
      toast({
        title: "✅ Servicio eliminado",
        description: `El servicio "${serviceToDelete.name}" ha sido eliminado correctamente.`,
        variant: "default",
      })

      // Refrescar datos localmente y en el componente padre
      await refetch()
      onRefreshServices?.()
    } catch (error) {
      console.error("Error deleting service:", error)
      toast({
        title: "❌ Error al eliminar",
        description: `No se pudo eliminar el servicio "${serviceToDelete.name}". Inténtalo de nuevo.`,
        variant: "destructive",
      })
    } finally {
      setDeletingServiceId(null)
      setServiceToDelete(null)
    }
  }, [serviceToDelete, deleteService, toast, refetch, onRefreshServices])

  const handleCancelDelete = useCallback(() => {
    setServiceToDelete(null)
    setDeletingServiceId(null)
  }, [])

  const handleCreateSuccess = useCallback(async () => {
    setShowCreateModal(false)
    try {
      await refetch()
      onRefreshServices?.()
    } catch (error) {
      console.error("Error refreshing services:", error)
    }
  }, [refetch, onRefreshServices])

  const handleEditSuccess = useCallback(async () => {
    setEditingService(null)
    try {
      await refetch()
      onRefreshServices?.()
    } catch (error) {
      console.error("Error refreshing services:", error)
    }
  }, [refetch, onRefreshServices])

  const handleEditClick = useCallback((service: Service) => {
    setEditingService(service)
  }, [])

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false)
  }, [])

  const handleCloseEditModal = useCallback(() => {
    setEditingService(null)
  }, [])

  const formatPrice = useCallback((price: number) => {
    return (
      new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price) + " €"
    )
  }, [])

  const formatDuration = useCallback((duration: number) => {
    if (duration >= 60) {
      const hours = Math.floor(duration / 60)
      const minutes = duration % 60
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
    }
    return `${duration}min`
  }, [])

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
          <Button onClick={() => refetch()} className="mt-2">
            Reintentar
          </Button>
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
            <Card key={service.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{service.name}</CardTitle>
                      {service.category && (
                        <Badge variant="secondary" className="mt-1">
                          {service.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(service)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(service)}
                      disabled={deletingServiceId === service.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {deletingServiceId === service.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                {/* Descripción con altura fija */}
                <div className="h-12 mb-4 flex-shrink-0">
                  {service.description && (
                    <CardDescription className="line-clamp-2 text-sm">{service.description}</CardDescription>
                  )}
                </div>

                {/* Precio y duración con anchos fijos para alineación perfecta */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="flex items-center gap-1 text-green-600">
                    <Euro className="h-4 w-4 flex-shrink-0" />
                    <span className="font-semibold">{formatPrice(service.price)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 justify-end">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span className="w-16 text-right">{formatDuration(service.duration)}</span>
                  </div>
                </div>

                {/* Badges de impuestos con altura mínima */}
                <div className="mb-4 flex-shrink-0 min-h-[24px] flex items-start">
                  {(service.vat_rate > 0 || service.irpf_rate > 0) && (
                    <div className="flex gap-2 text-xs">
                      {service.vat_rate > 0 && <Badge variant="outline">IVA {service.vat_rate}%</Badge>}
                      {service.irpf_rate > 0 && <Badge variant="outline">IRPF {service.irpf_rate}%</Badge>}
                    </div>
                  )}
                </div>

                {/* Icono centrado al final */}
                {service.icon && <div className="text-center text-2xl mt-auto">{service.icon}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      <AlertDialog open={!!serviceToDelete} onOpenChange={(open) => !open && handleCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar el servicio{" "}
              <span className="font-semibold text-gray-900">"{serviceToDelete?.name}"</span>?
              <br />
              <br />
              <span className="text-red-600 font-medium">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete} disabled={!!deletingServiceId}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={!!deletingServiceId}
            >
              {deletingServiceId ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar servicio
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para crear servicio */}
      {showCreateModal && (
        <ServiceFormModal
          organizationId={organizationId}
          onClose={handleCloseCreateModal}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Modal para editar servicio */}
      {editingService && (
        <ServiceFormModal
          organizationId={organizationId}
          service={editingService}
          onClose={handleCloseEditModal}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}
