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
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { FileText, Plus, Edit, Eye, Trash2, Search, Copy, RefreshCw } from "lucide-react"
import type { ConsentForm } from "@/types/consent"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function ConsentFormsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [forms, setForms] = useState<ConsentForm[]>([])
  const [filteredForms, setFilteredForms] = useState<ConsentForm[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [previewForm, setPreviewForm] = useState<ConsentForm | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  // Cargar formularios
  useEffect(() => {
    loadForms()
  }, [])

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

  const loadForms = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("consent_forms").select("*").order("created_at", { ascending: false })

      if (error) throw error

      setForms(data || [])

      // Extraer categorías únicas
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

  const toggleFormStatus = async (formId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("consent_forms").update({ is_active: !currentStatus }).eq("id", formId)

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

  const deleteForm = async (formId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este formulario? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      const { error } = await supabase.from("consent_forms").delete().eq("id", formId)

      if (error) throw error

      setForms(forms.filter((form) => form.id !== formId))

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
    try {
      const { error } = await supabase.from("consent_forms").insert({
        organization_id: form.organization_id,
        title: `${form.title} (Copia)`,
        content: form.content,
        description: form.description,
        category: form.category,
        is_active: false,
        created_by: (await supabase.auth.getUser()).data.user?.id,
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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Formularios de Consentimiento</h1>
          <p className="text-muted-foreground mt-1">Gestiona las plantillas de consentimiento informado</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadForms}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => router.push("/dashboard/consent-forms/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Formulario
          </Button>
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
          <CardDescription>Lista de plantillas de consentimiento informado</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredForms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay formularios</h3>
              <p className="text-gray-500 mb-4">
                {forms.length === 0
                  ? "Aún no has creado ningún formulario de consentimiento."
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
                    <TableHead>Versión</TableHead>
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
                        <Badge variant="secondary">v{form.version}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(form.created_at)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatDate(form.updated_at)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewForm(form)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/consent-forms/${form.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => duplicateForm(form)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteForm(form.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                  <strong>Versión:</strong> v{previewForm.version}
                </div>
                <div>
                  <strong>Estado:</strong> {previewForm.is_active ? "Activo" : "Inactivo"}
                </div>
                <div>
                  <strong>Creado:</strong> {formatDate(previewForm.created_at)}
                </div>
              </div>

              <div className="border rounded-lg p-6 bg-white">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewForm.content }} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
