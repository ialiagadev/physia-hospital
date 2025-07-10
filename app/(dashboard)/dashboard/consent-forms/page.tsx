"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
import { FileText, Plus, Edit, Eye, Trash2, Search, Copy, RefreshCw, Building2, AlertCircle } from "lucide-react"
import type { ConsentForm } from "@/types/consent"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { EditConsentFormModal } from "@/components/consent/edit-consent-form-modal"

export default function ConsentFormsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { userProfile, isLoading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState<ConsentForm[]>([])
  const [filteredForms, setFilteredForms] = useState<ConsentForm[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [previewForm, setPreviewForm] = useState<ConsentForm | null>(null)
  const [editFormId, setEditFormId] = useState<string | null>(null)
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [organizationName, setOrganizationName] = useState<string>("")

  // Cargar formularios cuando el usuario esté disponible
  useEffect(() => {
    if (!authLoading && userProfile?.organization_id) {
      loadForms()
      loadOrganizationName()
    }
  }, [userProfile, authLoading])

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...forms]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (form) =>
          form.title.toLowerCase().includes(term) ||
          form.description?.toLowerCase().includes(term) ||
          form.category.toLowerCase().includes(term),
      )
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((form) => form.category === categoryFilter)
    }

    if (statusFilter !== "all") {
      const isActive = statusFilter === "active"
      filtered = filtered.filter((form) => form.is_active === isActive)
    }

    setFilteredForms(filtered)
  }, [forms, searchTerm, categoryFilter, statusFilter])

  const loadOrganizationName = async () => {
    if (!userProfile?.organization_id) return

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", userProfile.organization_id)
        .single()

      if (error) throw error
      setOrganizationName(data?.name || "")
    } catch (error) {
      console.error("Error loading organization name:", error)
    }
  }

  const loadForms = async () => {
    if (!userProfile?.organization_id) return

    setLoading(true)
    try {
      // Filtrar solo por la organización del usuario
      const { data, error } = await supabase
        .from("consent_forms")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setForms(data || [])

      // Extraer categorías únicas de los formularios de esta organización
      const uniqueCategories = Array.from(new Set((data || []).map((form) => form.category)))
      setCategories(uniqueCategories)
    } catch (error) {
      console.error("Error loading consent forms:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los formularios de consentimiento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const validateOrganizationAccess = (form: ConsentForm): boolean => {
    if (!userProfile?.organization_id) return false
    return form.organization_id === userProfile.organization_id
  }

  const toggleFormStatus = async (formId: string, currentStatus: boolean) => {
    const form = forms.find((f) => f.id === formId)
    if (!form || !validateOrganizationAccess(form)) {
      toast({
        title: "Error de permisos",
        description: "No tienes permisos para modificar este formulario",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("consent_forms")
        .update({ is_active: !currentStatus })
        .eq("id", formId)
        .eq("organization_id", userProfile!.organization_id) // Doble verificación

      if (error) throw error

      setForms(forms.map((form) => (form.id === formId ? { ...form, is_active: !currentStatus } : form)))

      toast({
        title: "Estado actualizado",
        description: `Formulario ${!currentStatus ? "activado" : "desactivado"} correctamente`,
      })
    } catch (error) {
      console.error("Error updating form status:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del formulario",
        variant: "destructive",
      })
    }
  }

  const confirmDeleteForm = async () => {
    if (!deleteFormId || !userProfile?.organization_id) return

    const form = forms.find((f) => f.id === deleteFormId)
    if (!form || !validateOrganizationAccess(form)) {
      toast({
        title: "Error de permisos",
        description: "No tienes permisos para eliminar este formulario",
        variant: "destructive",
      })
      setDeleteFormId(null)
      return
    }

    try {
      const { error } = await supabase
        .from("consent_forms")
        .delete()
        .eq("id", deleteFormId)
        .eq("organization_id", userProfile.organization_id) // Doble verificación

      if (error) throw error

      setForms(forms.filter((form) => form.id !== deleteFormId))
      setDeleteFormId(null)

      toast({
        title: "Formulario eliminado",
        description: "El formulario se ha eliminado correctamente",
      })
    } catch (error) {
      console.error("Error deleting form:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el formulario",
        variant: "destructive",
      })
    }
  }

  const duplicateForm = async (form: ConsentForm) => {
    if (!validateOrganizationAccess(form) || !userProfile?.organization_id) {
      toast({
        title: "Error de permisos",
        description: "No tienes permisos para duplicar este formulario",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("consent_forms").insert({
        organization_id: userProfile.organization_id, // Usar la organización del usuario
        title: `${form.title} (Copia)`,
        content: form.content,
        description: form.description,
        category: form.category,
        is_active: false,
        created_by: userProfile.id,
      })

      if (error) throw error

      await loadForms()

      toast({
        title: "Formulario duplicado",
        description: "Se ha creado una copia del formulario",
      })
    } catch (error) {
      console.error("Error duplicating form:", error)
      toast({
        title: "Error",
        description: "No se pudo duplicar el formulario",
        variant: "destructive",
      })
    }
  }

  const handleEditForm = (formId: string) => {
    const form = forms.find((f) => f.id === formId)
    if (!form || !validateOrganizationAccess(form)) {
      toast({
        title: "Error de permisos",
        description: "No tienes permisos para editar este formulario",
        variant: "destructive",
      })
      return
    }
    setEditFormId(formId)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
  }

  const handleEditSuccess = () => {
    loadForms() // Recargar la lista después de editar
  }

  // Mostrar loading mientras se carga la autenticación
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-gray-500">Cargando usuario...</p>
        </div>
      </div>
    )
  }

  // Mostrar error si no hay usuario o organización
  if (!userProfile?.organization_id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sin organización</h2>
          <p className="text-gray-500">No tienes acceso a ninguna organización</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-gray-500">Cargando formularios...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Formularios de Consentimiento</h1>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-muted-foreground">{organizationName || "Cargando organización..."}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={loadForms}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recargar la lista de formularios</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => router.push("/dashboard/consent-forms/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Formulario
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Crear un nuevo formulario de consentimiento</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Buscar por título o descripción"
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Categoría</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de formularios */}
        <Card>
          <CardHeader>
            <CardTitle>Formularios ({filteredForms.length})</CardTitle>
            <CardDescription>Lista de plantillas de consentimiento informado de tu organización</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredForms.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay formularios</h3>
                <p className="text-gray-500 mb-4">
                  {forms.length === 0
                    ? `Aún no has creado ningún formulario de consentimiento para ${organizationName}.`
                    : "No se encontraron formularios con los filtros seleccionados."}
                </p>
                <Button onClick={() => router.push("/dashboard/consent-forms/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primer formulario
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredForms.map((form) => (
                      <TableRow key={form.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{form.title}</div>
                            {form.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {form.description.length > 60
                                  ? `${form.description.substring(0, 60)}...`
                                  : form.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{form.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={form.is_active}
                              onCheckedChange={() => toggleFormStatus(form.id, form.is_active)}
                            />
                            <span className="text-sm">{form.is_active ? "Activo" : "Inactivo"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(form.created_at)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(form.updated_at)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => setPreviewForm(form)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ver previsualización</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleEditForm(form.id)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar formulario</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => duplicateForm(form)}>
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Duplicar formulario</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteFormId(form.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Eliminar formulario</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de edición */}
        <EditConsentFormModal
          isOpen={!!editFormId}
          onClose={() => setEditFormId(null)}
          formId={editFormId}
          onSuccess={handleEditSuccess}
        />

        {/* Modal de previsualización */}
        <Dialog open={!!previewForm} onOpenChange={() => setPreviewForm(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Previsualización: {previewForm?.title}
              </DialogTitle>
            </DialogHeader>
            {previewForm && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Categoría:</strong> {previewForm.category}
                  </div>
                  <div>
                    <strong>Estado:</strong> {previewForm.is_active ? "Activo" : "Inactivo"}
                  </div>
                  <div>
                    <strong>Creado:</strong> {formatDate(previewForm.created_at)}
                  </div>
                  <div>
                    <strong>Actualizado:</strong> {formatDate(previewForm.updated_at)}
                  </div>
                </div>

                <div className="border rounded-lg p-6 bg-white">
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewForm.content }} />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmación de eliminación */}
        <AlertDialog open={!!deleteFormId} onOpenChange={() => setDeleteFormId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar formulario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El formulario será eliminado permanentemente y no podrá ser
                recuperado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteForm} className="bg-red-600 hover:bg-red-700">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
