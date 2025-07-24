"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2, RotateCcw, Filter } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
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

interface Service {
  id: number
  name: string
  description: string | null
  price: number
  vat_rate: number
  irpf_rate: number
  retention_rate: number
  active: boolean
  category: string | null
  duration: number
  color: string
  icon: string | null
  sort_order: number
  organization_id: number
  created_at: string
  updated_at: string
}

type FilterType = "all" | "active" | "inactive"

export default function ServicesPage() {
  const { userProfile, isLoading: authLoading } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [serviceToAction, setServiceToAction] = useState<{
    service: Service
    action: "deactivate" | "reactivate"
  } | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const { toast } = useToast()

  // Cargar servicios de la organización del usuario
  useEffect(() => {
    async function loadServices() {
      if (authLoading) return

      if (!userProfile?.organization_id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("organization_id", userProfile.organization_id)
          .order("active", { ascending: false }) // Activos primero
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })

        if (error) throw error
        setServices(data || [])
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar los servicios",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadServices()
  }, [userProfile, authLoading, toast])

  // Filtrar servicios según el filtro seleccionado
  useEffect(() => {
    let filtered = services

    switch (filter) {
      case "active":
        filtered = services.filter((service) => service.active)
        break
      case "inactive":
        filtered = services.filter((service) => !service.active)
        break
      default:
        filtered = services
    }

    setFilteredServices(filtered)
  }, [services, filter])

  const handleActionClick = (service: Service, action: "deactivate" | "reactivate") => {
    setServiceToAction({ service, action })
    setActionDialogOpen(true)
  }

  const confirmAction = async () => {
    if (!serviceToAction) return

    const { service, action } = serviceToAction
    setProcessingId(service.id)

    try {
      const { error } = await supabase
        .from("services")
        .update({
          active: action === "reactivate",
          updated_at: new Date().toISOString(),
        })
        .eq("id", service.id)

      if (error) throw error

      // Actualizar la lista local
      setServices((prev) =>
        prev
          .map((s) => (s.id === service.id ? { ...s, active: action === "reactivate" } : s))
          .sort((a, b) => {
            // Activos primero
            if (a.active !== b.active) return b.active ? 1 : -1
            // Luego por sort_order
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
            // Finalmente por nombre
            return a.name.localeCompare(b.name)
          }),
      )

      toast({
        title: action === "reactivate" ? "Servicio reactivado" : "Servicio desactivado",
        description: `El servicio "${service.name}" ha sido ${action === "reactivate" ? "reactivado" : "desactivado"} correctamente`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: `No se pudo ${action === "reactivate" ? "reactivar" : "desactivar"} el servicio`,
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
      setActionDialogOpen(false)
      setServiceToAction(null)
    }
  }

  const formatPrice = (price: number) => {
    return (
      new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price) + " €"
    )
  }

  const formatDuration = (duration: number) => {
    if (duration >= 60) {
      const hours = Math.floor(duration / 60)
      const minutes = duration % 60
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
    }
    return `${duration}min`
  }

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!userProfile?.organization_id) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin organización</h3>
          <p className="text-gray-600">No tienes una organización asignada para gestionar servicios</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground">Gestiona tu catálogo de servicios para facturación</p>
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
          <Button asChild>
            <Link href="/dashboard/services/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Servicio
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead>IRPF</TableHead>
              <TableHead>Retención</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Cargando servicios...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredServices.length > 0 ? (
              filteredServices.map((service) => (
                <TableRow key={service.id} className={!service.active ? "opacity-60" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: service.color }} />
                      <span>{service.name}</span>
                      {service.icon && <span className="text-sm">{service.icon}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {service.category ? (
                      <Badge variant="secondary">{service.category}</Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDuration(service.duration)}</TableCell>
                  <TableCell className="font-medium">{formatPrice(service.price)}</TableCell>
                  <TableCell>{service.vat_rate}%</TableCell>
                  <TableCell>{service.irpf_rate}%</TableCell>
                  <TableCell>{service.retention_rate}%</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/services/${service.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      {service.active ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleActionClick(service, "deactivate")}
                          disabled={processingId === service.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {processingId === service.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleActionClick(service, "reactivate")}
                          disabled={processingId === service.id}
                          className="text-green-600 hover:text-green-700"
                        >
                          {processingId === service.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-gray-500">
                      {filter === "active" && "No hay servicios activos"}
                      {filter === "inactive" && "No hay servicios inactivos"}
                      {filter === "all" && "No hay servicios registrados"}
                    </p>
                    {filter === "all" && <p className="text-sm text-gray-400">Crea tu primer servicio para comenzar</p>}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {serviceToAction?.action === "reactivate" ? "¿Reactivar servicio?" : "¿Desactivar servicio?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {serviceToAction?.action === "reactivate" ? (
                <>
                  ¿Estás seguro de que quieres reactivar el servicio{" "}
                  <span className="font-semibold">"{serviceToAction.service.name}"</span>?
                  <br />
                  <br />
                  El servicio volverá a estar disponible para nuevas citas y facturación.
                </>
              ) : (
                <>
                  ¿Estás seguro de que quieres desactivar el servicio{" "}
                  <span className="font-semibold">"{serviceToAction?.service.name}"</span>?
                  <br />
                  <br />
                  El servicio no estará disponible para nuevas citas, pero se mantendrán los registros existentes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={
                serviceToAction?.action === "reactivate"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {serviceToAction?.action === "reactivate" ? "Reactivar" : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
