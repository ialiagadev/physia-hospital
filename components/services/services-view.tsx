"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Plus, Edit, Trash2, RotateCcw, Euro, Clock, Tag, AlertTriangle, Filter } from "lucide-react"
import { useServices } from "@/hooks/use-services"
import { useToast } from "@/hooks/use-toast"
import { ServiceFormModal } from "./services-form-modal"
import type { Service } from "@/types/services"

interface ServicesViewProps {
  organizationId: number
  onRefreshServices?: () => void
}

type FilterType = "all" | "active" | "inactive"

export function ServicesView({ organizationId, onRefreshServices }: ServicesViewProps) {
  const { services, loading, error, deleteService, reactivateService, refetch } = useServices(organizationId)
  const { toast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [processingServiceId, setProcessingServiceId] = useState<number | null>(null)
  const [serviceToAction, setServiceToAction] = useState<{
    service: Service
    action: "deactivate" | "reactivate"
  } | null>(null)
  const [filter, setFilter] = useState<FilterType>("all")

  // Filtrar servicios según el filtro seleccionado
  const filteredServices = services.filter((service) => {
    switch (filter) {
      case "active":
        return service.active
      case "inactive":
        return !service.active
      default:
        return true
    }
  })

  const handleActionClick = useCallback((service: Service, action: "deactivate" | "reactivate") => {
    setServiceToAction({ service, action })
  }, [])

  const handleConfirmAction = useCallback(async () => {
    if (!serviceToAction) return

    const { service, action } = serviceToAction
    setProcessingServiceId(service.id)

    try {
      if (action === "deactivate") {
        await deleteService(service.id)
        toast({
          title: "✅ Servicio desactivado",
          description: `El servicio "${service.name}" ha sido desactivado correctamente.`,
          variant: "default",
        })
      } else {
        await reactivateService(service.id)
        toast({
          title: "✅ Servicio reactivado",
          description: `El servicio "${service.name}" ha sido reactivado correctamente.`,
          variant: "default",
        })
      }

      // Refrescar datos localmente y en el componente padre
      await refetch()
      onRefreshServices?.()
    } catch (error) {
      console.error(`Error ${action === "deactivate" ? "deactivating" : "reactivating"} service:`, error)
      toast({
        title: `❌ Error al ${action === "deactivate" ? "desactivar" : "reactivar"}`,
        description: `No se pudo ${action === "deactivate" ? "desactivar" : "reactivar"} el servicio "${service.name}". Inténtalo de nuevo.`,
        variant: "destructive",
      })
    } finally {
      setProcessingServiceId(null)
      setServiceToAction(null)
    }
  }, [serviceToAction, deleteService, reactivateService, toast, refetch, onRefreshServices])

  const handleCancelAction = useCallback(() => {
    setServiceToAction(null)
    setProcessingServiceId(null)
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {filter === "active" && "No hay servicios activos"}
              {filter === "inactive" && "No hay servicios inactivos"}
              {filter === "all" && "No hay servicios configurados"}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {filter === "all"
                ? "Crea tu primer servicio para comenzar a gestionar las citas de tu organización."
                : `No se encontraron servicios ${filter === "active" ? "activos" : "inactivos"}.`}
            </p>
            {filter === "all" && (
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Primer Servicio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Card
              key={service.id}
              className={`hover:shadow-lg transition-shadow h-full flex flex-col ${
                !service.active ? "opacity-60" : ""
              }`}
            >
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
                    {service.active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleActionClick(service, "deactivate")}
                        disabled={processingServiceId === service.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {processingServiceId === service.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleActionClick(service, "reactivate")}
                        disabled={processingServiceId === service.id}
                        className="text-green-600 hover:text-green-700"
                      >
                        {processingServiceId === service.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
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

                {/* Estado y badges de impuestos */}
                <div className="mb-4 flex-shrink-0 min-h-[24px] flex items-start gap-2 flex-wrap">
                  <Badge
                    variant={service.active ? "default" : "secondary"}
                    className={
                      service.active
                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                        : "bg-red-100 text-red-800 hover:bg-red-200"
                    }
                  >
                    {service.active ? "Activo" : "Inactivo"}
                  </Badge>
                  {(service.vat_rate > 0 || service.irpf_rate > 0) && (
                    <>
                      {service.vat_rate > 0 && <Badge variant="outline">IVA {service.vat_rate}%</Badge>}
                      {service.irpf_rate > 0 && <Badge variant="outline">IRPF {service.irpf_rate}%</Badge>}
                    </>
                  )}
                </div>

                {/* Icono centrado al final */}
                {service.icon && <div className="text-center text-2xl mt-auto">{service.icon}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de confirmación para acciones */}
      <AlertDialog open={!!serviceToAction} onOpenChange={(open) => !open && handleCancelAction()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDialogTitle>
                {serviceToAction?.action === "reactivate" ? "Confirmar reactivación" : "Confirmar desactivación"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              {serviceToAction?.action === "reactivate" ? (
                <>
                  ¿Estás seguro de que quieres reactivar el servicio{" "}
                  <span className="font-semibold text-gray-900">"{serviceToAction.service.name}"</span>?
                  <br />
                  <br />
                  <span className="text-green-600 font-medium">
                    El servicio volverá a estar disponible para nuevas citas.
                  </span>
                </>
              ) : (
                <>
                  ¿Estás seguro de que quieres desactivar el servicio{" "}
                  <span className="font-semibold text-gray-900">"{serviceToAction?.service.name}"</span>?
                  <br />
                  <br />
                  <span className="text-red-600 font-medium">El servicio no estará disponible para nuevas citas.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction} disabled={!!processingServiceId}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={
                serviceToAction?.action === "reactivate"
                  ? "bg-green-600 hover:bg-green-700 focus:ring-green-600"
                  : "bg-red-600 hover:bg-red-700 focus:ring-red-600"
              }
              disabled={!!processingServiceId}
            >
              {processingServiceId ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {serviceToAction?.action === "reactivate" ? "Reactivando..." : "Desactivando..."}
                </>
              ) : (
                <>
                  {serviceToAction?.action === "reactivate" ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reactivar servicio
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Desactivar servicio
                    </>
                  )}
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
