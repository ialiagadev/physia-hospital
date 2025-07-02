"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { OrganizationSelector } from "@/components/organization-selector"
import { useToast } from "@/hooks/use-toast"
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

interface Organization {
  id: number
  name: string
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null)
  const { toast } = useToast()

  // Cargar organizaciones
  useEffect(() => {
    async function loadOrganizations() {
      try {
        const { data, error } = await supabase.from("organizations").select("id, name").order("name")

        if (error) {
          console.error("Error loading organizations:", error)
          return
        }

        setOrganizations(data || [])
      } catch (error) {
        console.error("Error loading organizations:", error)
      }
    }

    loadOrganizations()
  }, [])

  // Cargar servicios basados en la organización seleccionada
  useEffect(() => {
    async function loadServices() {
      setLoading(true)
      try {
        console.log("🔍 Loading services for organization:", selectedOrgId)

        let query = supabase
          .from("services")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })

        // Filtrar por organización si se ha seleccionado una específica
        if (selectedOrgId !== "all") {
          query = query.eq("organization_id", Number.parseInt(selectedOrgId))
        }

        const { data, error } = await query

        console.log("📊 Services loaded:", data)
        console.log("❌ Error:", error)

        if (error) throw error

        setServices(data || [])
      } catch (error) {
        console.error("Error al cargar servicios:", error)
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
  }, [selectedOrgId, toast])

  const handleDeleteClick = (serviceId: number) => {
    setServiceToDelete(serviceId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!serviceToDelete) return

    try {
      const { error } = await supabase.from("services").delete().eq("id", serviceToDelete)

      if (error) throw error

      setServices((prev) => prev.filter((service) => service.id !== serviceToDelete))
      toast({
        title: "Servicio eliminado",
        description: "El servicio ha sido eliminado correctamente",
      })
    } catch (error) {
      console.error("Error al eliminar el servicio:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setServiceToDelete(null)
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

  const getOrganizationName = (orgId: number) => {
    const org = organizations.find((o) => o.id === orgId)
    return org?.name || `Organización ${orgId}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servicios</h1>
          <p className="text-muted-foreground">Gestiona tu catálogo de servicios para facturación</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/services/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Servicio
          </Link>
        </Button>
      </div>

      {/* Selector de organización */}
      <OrganizationSelector selectedOrgId={selectedOrgId} onSelectOrganization={setSelectedOrgId} className="mb-6" />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Organización</TableHead>
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
                <TableCell colSpan={10} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Cargando servicios...
                  </div>
                </TableCell>
              </TableRow>
            ) : services.length > 0 ? (
              services.map((service) => (
                <TableRow key={service.id}>
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
                  <TableCell>{getOrganizationName(service.organization_id)}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(service.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-gray-500">No hay servicios registrados</p>
                    {selectedOrgId !== "all" && (
                      <p className="text-sm text-gray-400">
                        Prueba seleccionando "Todas las organizaciones" o crea un nuevo servicio
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el servicio seleccionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
