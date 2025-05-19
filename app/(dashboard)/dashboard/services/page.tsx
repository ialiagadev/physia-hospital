"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
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
  organization_id: number
  professional_id: number | null
  professionals: {
    name: string
  } | null
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null)
  const { toast } = useToast()

  // Cargar servicios basados en la organización seleccionada
  useEffect(() => {
    async function loadServices() {
      setLoading(true)

      try {
        let query = supabase
          .from("services")
          .select(`
            *,
            organizations (name),
            professionals (name)
          `)
          .order("name")

        // Filtrar por organización si se ha seleccionado una específica
        if (selectedOrgId !== "all") {
          query = query.eq("organization_id", selectedOrgId)
        }

        const { data, error } = await query

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
              <TableHead>Profesional</TableHead>
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
                  Cargando servicios...
                </TableCell>
              </TableRow>
            ) : services.length > 0 ? (
              services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.category || "-"}</TableCell>
                  <TableCell>{service.professionals?.name || "-"}</TableCell>
                  <TableCell>{service.price.toFixed(2)} €</TableCell>
                  <TableCell>{service.vat_rate}%</TableCell>
                  <TableCell>{service.irpf_rate}%</TableCell>
                  <TableCell>{service.retention_rate}%</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={service.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
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
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(service.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No hay servicios registrados
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
