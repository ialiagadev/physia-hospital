"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { FileText, Save, Eye, Loader2 } from "lucide-react"
import type { ConsentForm } from "@/types/consent"

const PREDEFINED_CATEGORIES = [
  "general",
  "fisioterapia",
  "odontologia",
  "psicologia",
  "medicina",
  "cirugia",
  "estetica",
  "pediatria",
]

interface EditConsentFormModalProps {
  isOpen: boolean
  onClose: () => void
  formId: string | null
  onSuccess: () => void
}

export function EditConsentFormModal({ isOpen, onClose, formId, onSuccess }: EditConsentFormModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("form")
  const [originalForm, setOriginalForm] = useState<ConsentForm | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    content: "",
    is_active: true,
    organization_id: "",
  })

  const [errors, setErrors] = useState({
    title: false,
    category: false,
    content: false,
    organization_id: false,
  })

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && formId) {
      loadData()
    }
  }, [isOpen, formId])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("form")
      setFormData({
        title: "",
        description: "",
        category: "",
        content: "",
        is_active: true,
        organization_id: "",
      })
      setErrors({
        title: false,
        category: false,
        content: false,
        organization_id: false,
      })
      setOriginalForm(null)
    }
  }, [isOpen])

  const loadData = async () => {
    if (!formId) return

    setIsLoading(true)
    try {
      // Cargar organizaciones
      const { data: orgsData, error: orgsError } = await supabase.from("organizations").select("id, name").order("name")

      if (orgsError) throw orgsError
      setOrganizations(orgsData || [])

      // Cargar formulario
      const { data: formData, error: formError } = await supabase
        .from("consent_forms")
        .select("*")
        .eq("id", formId)
        .single()

      if (formError) throw formError
      if (!formData) throw new Error("Formulario no encontrado")

      setOriginalForm(formData)
      setFormData({
        title: formData.title,
        description: formData.description || "",
        category: formData.category,
        content: formData.content,
        is_active: formData.is_active,
        organization_id: formData.organization_id.toString(),
      })
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el formulario",
        variant: "destructive",
      })
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpiar error si el campo se llena
    if (errors[field as keyof typeof errors] && value) {
      setErrors((prev) => ({ ...prev, [field]: false }))
    }
  }

  const validateForm = () => {
    const newErrors = {
      title: !formData.title.trim(),
      category: !formData.category,
      content: !formData.content.trim() || formData.content === "<div><br></div>" || formData.content === "<br>",
      organization_id: !formData.organization_id,
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some(Boolean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor, completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    if (!formId) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from("consent_forms")
        .update({
          title: formData.title,
          description: formData.description || null,
          category: formData.category,
          content: formData.content,
          is_active: formData.is_active,
          organization_id: Number.parseInt(formData.organization_id),
          updated_at: new Date().toISOString(),
        })
        .eq("id", formId)

      if (error) throw error

      toast({
        title: "Formulario actualizado",
        description: "Los cambios se han guardado correctamente",
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Error updating consent form:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el formulario",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Editar Formulario de Consentimiento
            {originalForm && (
              <span className="text-sm font-normal text-gray-500">
                - {originalForm.title} (v{originalForm.version})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-gray-500">Cargando formulario...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="form">Información Básica</TabsTrigger>
                <TabsTrigger value="content">Contenido</TabsTrigger>
                <TabsTrigger value="preview">Previsualización</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="form" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="organization">
                        Organización <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.organization_id}
                        onValueChange={(value) => handleChange("organization_id", value)}
                      >
                        <SelectTrigger className={errors.organization_id ? "border-red-500" : ""}>
                          <SelectValue placeholder="Selecciona una organización" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.organization_id && (
                        <p className="text-sm text-red-500 mt-1">Selecciona una organización</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="category">
                        Categoría <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                        <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {PREDEFINED_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && <p className="text-sm text-red-500 mt-1">Selecciona una categoría</p>}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="title">
                      Título <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleChange("title", e.target.value)}
                      placeholder="Ej: Consentimiento Informado para Fisioterapia"
                      className={errors.title ? "border-red-500" : ""}
                    />
                    {errors.title && <p className="text-sm text-red-500 mt-1">El título es obligatorio</p>}
                  </div>

                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleChange("description", e.target.value)}
                      placeholder="Descripción breve del formulario (opcional)"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleChange("is_active", checked)}
                    />
                    <Label htmlFor="is_active">Formulario activo</Label>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="content">
                      Contenido del Formulario <span className="text-red-500">*</span>
                    </Label>
                    <div className="mt-2">
                      <RichTextEditor
                        value={formData.content}
                        onChange={(value) => handleChange("content", value)}
                        placeholder="Escribe el contenido del formulario de consentimiento..."
                        error={errors.content}
                      />
                    </div>
                    {errors.content && <p className="text-sm text-red-500 mt-1">El contenido es obligatorio</p>}
                    <p className="text-sm text-gray-500 mt-2">
                      Usa los botones de la barra de herramientas para formatear el texto. Los campos de firma se
                      añadirán automáticamente al final.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="space-y-4 mt-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4" />
                      Previsualización
                    </Label>
                    <div className="border rounded-lg p-6 bg-white max-h-80 overflow-y-auto">
                      <div
                        className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900"
                        dangerouslySetInnerHTML={{ __html: formData.content }}
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  <div className="flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </div>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
