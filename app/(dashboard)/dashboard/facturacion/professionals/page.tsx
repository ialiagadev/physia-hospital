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

interface Professional {
  id: number
  name: string
  active: boolean
  organization_id: number
}

export default function ProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [professionalToDelete, setProfessionalToDelete] = useState<number | null>(null)
  const { toast } = useToast()

  // Cargar profesionales basados en la organización seleccionada
  useEffect(() => {
    async function loadProfessionals() {
      setLoading(true)

      try {
        let query = supabase
          .from("professionals")
          .select(`
            *,
            organizations (name)
          `)
          .order("name")

        // Filtrar por organización si se ha seleccionado una específica
        if (selectedOrgId !== "all") {
          query = query.eq("organization_id", selectedOrgId)
        }

        const { data, error } = await query

        if (error) throw error

        setProfessionals(data || [])
      } catch (error) {
        console.error("Error al cargar profesionales:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los profesionales",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfessionals()
  }, [selectedOrgId, toast])

  const handleDeleteClick = (professionalId: number) => {
    setProfessionalToDelete(professionalId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!professionalToDelete) return

    try {
      const { error } = await supabase.from("professionals").delete().eq("id", professionalToDelete)

      if (error) throw error

      setProfessionals((prev) => prev.filter((professional) => professional.id !== professionalToDelete))
      toast({
        title: "Profesional eliminado",
        description: "El profesional ha sido eliminado correctamente",
      })
    } catch (error) {
      console.error("Error al eliminar el profesional:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el profesional",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setProfessionalToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profesionales</h1>
          <p className="text-muted-foreground">Gestiona los profesionales para asignarlos a servicios</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/facturacion/professionals/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Profesional
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
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  Cargando profesionales...
                </TableCell>
              </TableRow>
            ) : professionals.length > 0 ? (
              professionals.map((professional) => (
                <TableRow key={professional.id}>
                  <TableCell className="font-medium">{professional.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={professional.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                    >
                      {professional.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/professionals/${professional.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(professional.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No hay profesionales registrados
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el profesional seleccionado.
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
