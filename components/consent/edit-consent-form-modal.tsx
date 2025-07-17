"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
import { Save, FileText, Building2, AlertCircle } from "lucide-react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"

const CONSENT_CATEGORIES = [
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

interface EditConsentFormModalProps {
  isOpen: boolean
  onClose: () => void
  formId: string | null
  onSuccess: () => void
}

export function EditConsentFormModal({ isOpen, onClose, formId, onSuccess }: EditConsentFormModalProps) {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingForm, setLoadingForm] = useState(false)
  const [organizationName, setOrganizationName] = useState<string>("")
  const [hasAccess, setHasAccess] = useState(true)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    content: "",
    is_active: true,
  })

  useEffect(() => {
    if (isOpen && formId && userProfile?.organization_id) {
      loadForm()
      loadOrganizationName()
    }
  }, [isOpen, formId, userProfile])

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

  const loadForm = async () => {
    if (!formId || !userProfile?.organization_id) return

    setLoadingForm(true)
    setHasAccess(true)

    try {
      // Cargar el formulario verificando que pertenece a la organización del usuario
      const { data, error } = await supabase
        .from("consent_forms")
        .select("*")
        .eq("id", formId)
        .eq("organization_id", userProfile.organization_id)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // No se encontró el registro o no pertenece a la organización
          setHasAccess(false)
          toast({
            title: "Sin permisos",
            description: "No tienes permisos para editar este formulario",
            variant: "destructive",
          })
          return
        }
        throw error
      }

      setFormData({
        title: data.title,
        description: data.description || "",
        category: data.category,
        content: data.content,
        is_active: data.is_active,
      })
    } catch (error) {
      console.error("Error loading consent form:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el formulario",
        variant: "destructive",
      })
    } finally {
      setLoadingForm(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formId || !userProfile?.organization_id) {
      toast({
        title: "Error",
        description: "No se pudo identificar el formulario o tu organización",
        variant: "destructive",
      })
      return
    }

    if (!hasAccess) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para editar este formulario",
        variant: "destructive",
      })
      return
    }

    if (!formData.title.trim() || !formData.category || !formData.content.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Actualizar solo si pertenece a la organización del usuario
      const { error } = await supabase
        .from("consent_forms")
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          content: formData.content,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formId)
        .eq("organization_id", userProfile.organization_id) // Doble verificación

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
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      content: "",
      is_active: true,
    })
    setHasAccess(true)
    onClose()
  }

  if (!userProfile?.organization_id) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Editar Formulario de Consentimiento
          </DialogTitle>
          <DialogDescription>Modifica los datos del formulario de consentimiento</DialogDescription>
          {organizationName && (
            <div className="flex items-center gap-2 mt-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{organizationName}</span>
            </div>
          )}
        </DialogHeader>

        {loadingForm ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="text-gray-500">Cargando formulario...</p>
            </div>
          </div>
        ) : !hasAccess ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin permisos</h3>
              <p className="text-gray-500">No tienes permisos para editar este formulario</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información básica */}
            <div className="space-y-4">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="edit-title">
                  Título <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  placeholder="Ej: Consentimiento para Cirugía General"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Descripción opcional del formulario"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label>
                  Categoría <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSENT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado activo */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Estado del formulario</Label>
                  <p className="text-sm text-gray-500">
                    Los formularios activos pueden ser utilizados para generar consentimientos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <span className="text-sm">{formData.is_active ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            </div>

            {/* Contenido del formulario */}
            <div className="space-y-2">
              <Label>
                Contenido <span className="text-red-500">*</span>
              </Label>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Escribe aquí el contenido del formulario de consentimiento..."
              />
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <strong>Placeholders disponibles:</strong> Se reemplazan automáticamente con datos de tu organización
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{"{ORGANIZATION_NAME}"}</code>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{"{ORGANIZATION_TAX_ID}"}</code>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{"{ORGANIZATION_EMAIL}"}</code>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{"{ORGANIZATION_PHONE}"}</code>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{"{ORGANIZATION_ADDRESS}"}</code>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs">{"{ORGANIZATION_FULL_ADDRESS}"}</code>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
