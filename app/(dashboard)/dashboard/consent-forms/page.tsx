"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import { Plus, Eye, Edit, Trash2, Copy, Globe, FileText, Search, Filter, Sparkles } from "lucide-react"
import Link from "next/link"
import { EditConsentFormModal } from "@/components/consent/edit-consent-form-modal"

interface ConsentForm {
  id: string
  title: string
  description: string | null
  category: string
  is_active: boolean
  created_at: string
  organization_id: number | null
  version: number
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "odontologia", label: "Odontología" },
  { value: "psicologia", label: "Psicología" },
  { value: "medicina", label: "Medicina" },
  { value: "cirugia", label: "Cirugía" },
  { value: "estetica", label: "Estética" },
  { value: "pediatria", label: "Pediatría" },
  { value: "datos", label: "Protección de Datos" },
]

export default function ConsentFormsPage() {
  const [globalTemplates, setGlobalTemplates] = useState<ConsentForm[]>([])
  const [organizationForms, setOrganizationForms] = useState<ConsentForm[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedForm, setSelectedForm] = useState<ConsentForm | null>(null)
  const [previewContent, setPreviewContent] = useState("")
  const [editingFormId, setEditingFormId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const { toast } = useToast()
  const { user, userProfile } = useAuth()

  useEffect(() => {
    if (userProfile?.organization_id) {
      loadConsentForms()
    }
  }, [userProfile?.organization_id])

  const loadConsentForms = async () => {
    try {
      setLoading(true)
      // Cargar plantillas globales (organization_id IS NULL)
      const { data: globalData, error: globalError } = await supabase
        .from("consent_forms")
        .select("*")
        .is("organization_id", null)
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("title", { ascending: true })

      if (globalError) throw globalError

      // Cargar formularios de la organización
      const { data: orgData, error: orgError } = await supabase
        .from("consent_forms")
        .select("*")
        .eq("organization_id", userProfile?.organization_id)
        .order("created_at", { ascending: false })

      if (orgError) throw orgError

      setGlobalTemplates(globalData || [])
      setOrganizationForms(orgData || [])
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

  const handlePreview = async (form: ConsentForm) => {
    try {
      const { data, error } = await supabase.from("consent_forms").select("content").eq("id", form.id).single()

      if (error) throw error

      setSelectedForm(form)
      setPreviewContent(data.content)
    } catch (error) {
      console.error("Error loading form content:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el contenido del formulario",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (formId: string) => {
    setEditingFormId(formId)
    setShowEditModal(true)
  }

  const handleEditSuccess = () => {
    loadConsentForms()
    setShowEditModal(false)
    setEditingFormId(null)
  }

  const handleDuplicate = async (form: ConsentForm) => {
    try {
      const { data: sourceData, error: sourceError } = await supabase
        .from("consent_forms")
        .select("content")
        .eq("id", form.id)
        .single()

      if (sourceError) throw sourceError

      const { error: insertError } = await supabase.from("consent_forms").insert({
        organization_id: userProfile?.organization_id,
        title: `${form.title} (Copia)`,
        content: sourceData.content,
        description: form.description,
        category: form.category,
        is_active: true,
        created_by: user?.id,
        version: 1,
      })

      if (insertError) throw insertError

      toast({
        title: "Éxito",
        description: "Formulario duplicado correctamente",
      })

      loadConsentForms()
    } catch (error) {
      console.error("Error duplicating form:", error)
      toast({
        title: "Error",
        description: "No se pudo duplicar el formulario",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (formId: string) => {
    try {
      const { error } = await supabase
        .from("consent_forms")
        .delete()
        .eq("id", formId)
        .eq("organization_id", userProfile?.organization_id) // Solo permitir eliminar formularios propios

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Formulario eliminado correctamente",
      })

      loadConsentForms()
    } catch (error) {
      console.error("Error deleting form:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el formulario",
        variant: "destructive",
      })
    }
  }

  const filterForms = (forms: ConsentForm[]) => {
    return forms.filter((form) => {
      const matchesSearch =
        form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = categoryFilter === "all" || form.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((cat) => cat.value === category)?.label || category
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: "bg-blue-100 text-blue-800",
      fisioterapia: "bg-green-100 text-green-800",
      odontologia: "bg-purple-100 text-purple-800",
      psicologia: "bg-orange-100 text-orange-800",
      medicina: "bg-red-100 text-red-800",
      cirugia: "bg-yellow-100 text-yellow-800",
      estetica: "bg-pink-100 text-pink-800",
      pediatria: "bg-cyan-100 text-cyan-800",
      datos: "bg-gray-100 text-gray-800",
    }
    return colors[category] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Cargando formularios...</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredGlobalTemplates = filterForms(globalTemplates)
  const filteredOrganizationForms = filterForms(organizationForms)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Formularios de Consentimiento</h1>
          <p className="text-muted-foreground">Gestiona plantillas globales y formularios personalizados</p>
        </div>
        <Link href="/dashboard/consent-forms/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Formulario
          </Button>
        </Link>
      </div>

      {/* Información del Sistema */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Sparkles className="h-5 w-5" />
            Sistema Inteligente de Consentimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-gray-900">Personalización Automática</h4>
                  <p className="text-sm text-gray-600">
                    Los datos de tu organización (nombre, dirección, CIF, email, teléfono) se insertan automáticamente
                    en todos los consentimientos usando placeholders como{" "}
                    <code className="bg-gray-100 px-1 rounded text-xs">{"{ORGANIZATION_NAME}"}</code>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-gray-900">Plantillas por Especialidad</h4>
                  <p className="text-sm text-gray-600">
                    Existen plantillas de diferentes especialidades.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-gray-900">Firma Digital Válida</h4>
                  <p className="text-sm text-gray-600">
                    Documentos con validez legal, firma digital, timestamps, IP tracking y descarga en HTML completo con
                    todos los datos.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium text-gray-900">Gestión Completa</h4>
                  <p className="text-sm text-gray-600">
                    Genera enlaces únicos, envía por WhatsApp/Email, rastrea firmas y descarga documentos completos para
                    auditorías.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Las plantillas del sistema ya incluyen todos los placeholders necesarios. Al
              duplicarlas, se personalizarán automáticamente con los datos de tu organización.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar formularios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plantillas Globales */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Plantillas del Sistema</h2>
          <Badge variant="secondary">{filteredGlobalTemplates.length}</Badge>
        </div>

        {filteredGlobalTemplates.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || categoryFilter !== "all"
                    ? "No se encontraron plantillas que coincidan con los filtros"
                    : "No hay plantillas globales disponibles"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGlobalTemplates.map((form) => (
              <Card key={form.id} className="border-blue-200 bg-blue-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-600" />
                        {form.title}
                      </CardTitle>
                      {form.description && <CardDescription className="mt-1">{form.description}</CardDescription>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getCategoryColor(form.category)}>{getCategoryLabel(form.category)}</Badge>
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      Sistema
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePreview(form)} className="flex-1">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(form)} className="flex-1">
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Formularios de la Organización */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold">Mis Formularios</h2>
          <Badge variant="secondary">{filteredOrganizationForms.length}</Badge>
        </div>

        {filteredOrganizationForms.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchTerm || categoryFilter !== "all"
                    ? "No se encontraron formularios que coincidan con los filtros"
                    : "Aún no has creado formularios personalizados"}
                </p>
                {!searchTerm && categoryFilter === "all" && (
                  <Link href="/dashboard/consent-forms/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Primer Formulario
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrganizationForms.map((form) => (
              <Card key={form.id} className="border-green-200 bg-green-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" />
                        {form.title}
                      </CardTitle>
                      {form.description && <CardDescription className="mt-1">{form.description}</CardDescription>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getCategoryColor(form.category)}>{getCategoryLabel(form.category)}</Badge>
                    <Badge
                      variant={form.is_active ? "default" : "secondary"}
                      className={form.is_active ? "bg-green-600" : ""}
                    >
                      {form.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePreview(form)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(form.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(form)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar formulario?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. El formulario será eliminado permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(form.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!selectedForm} onOpenChange={() => setSelectedForm(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedForm?.organization_id === null ? (
                <Globe className="h-5 w-5 text-blue-600" />
              ) : (
                <FileText className="h-5 w-5 text-green-600" />
              )}
              {selectedForm?.title}
            </DialogTitle>
            <DialogDescription>Vista previa del formulario de consentimiento</DialogDescription>
          </DialogHeader>
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewContent }} />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <EditConsentFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingFormId(null)
        }}
        formId={editingFormId}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}
