"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle, Trash2, Edit3, Eye } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { TemplateAPI, extractVariables } from "@/app/api/templates/route"

interface Template {
  id: string
  name: string
  status: string
  language: string
  category: string
  components?: Array<{
    text?: string
    type?: string
  }>
}

interface WabaConfig {
  id_proyecto: string
  token_proyecto: string
}

interface TemplateActionsModalProps {
  template: Template | null
  isOpen: boolean
  onClose: () => void
  onTemplateUpdated: () => void
  wabaConfig: WabaConfig | null
}

const CATEGORIES = [
  { value: "UTILITY", label: "Utilidad" },
  { value: "MARKETING", label: "Marketing" },
  { value: "AUTHENTICATION", label: "Autenticación" },
]

export function TemplateActionsModal({
  template,
  isOpen,
  onClose,
  onTemplateUpdated,
  wabaConfig,
}: TemplateActionsModalProps) {
  const [action, setAction] = useState<"view" | "edit" | "delete" | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    category: "",
    body: "",
    footer: "",
  })

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (template && isOpen) {
      const bodyComponent = template.components?.find((c) => c.type === "BODY")
      const footerComponent = template.components?.find((c) => c.type === "FOOTER")

      setEditForm({
        category: template.category || "UTILITY",
        body: bodyComponent?.text || "",
        footer: footerComponent?.text || "",
      })
    }
  }, [template, isOpen])

  const handleDelete = async () => {
    if (!template || !wabaConfig) return

    setIsLoading(true)
    try {
      const api = new TemplateAPI(wabaConfig)
      await api.deleteTemplate(template.name)

      toast({
        title: "Plantilla eliminada",
        description: `La plantilla "${template.name}" ha sido eliminada correctamente.`,
      })

      onTemplateUpdated()
      onClose()
    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: error instanceof Error ? error.message : "No se pudo eliminar la plantilla",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!template || !wabaConfig) return

    // Validar formulario
    if (!editForm.body.trim()) {
      toast({
        title: "Error de validación",
        description: "El contenido del mensaje es obligatorio",
        variant: "destructive",
      })
      return
    }

    // Validar variables secuenciales
    const variables = extractVariables(editForm.body)
    for (let i = 0; i < variables.length; i++) {
      const expected = `{{${i + 1}}}`
      if (variables[i] !== expected) {
        toast({
          title: "Error de validación",
          description: `Las variables deben ser secuenciales: ${expected}`,
          variant: "destructive",
        })
        return
      }
    }

    setIsLoading(true)
    try {
      const api = new TemplateAPI(wabaConfig)

      // Construir componentes
      const components = []

      // Componente BODY
      const bodyComponent: any = {
        type: "BODY",
        text: editForm.body.trim(),
      }

      // Si hay variables, agregar ejemplos
      if (variables.length > 0) {
        const exampleValues = variables.map((_, index) => `Ejemplo${index + 1}`)
        bodyComponent.example = {
          body_text: [exampleValues],
        }
      }

      components.push(bodyComponent)

      // Componente FOOTER (opcional)
      if (editForm.footer.trim()) {
        components.push({
          type: "FOOTER",
          text: editForm.footer.trim(),
        })
      }

      await api.editTemplate(template.id, {
        category: editForm.category,
        components: components,
      })

      toast({
        title: "Plantilla actualizada",
        description: `La plantilla "${template.name}" ha sido actualizada. Los cambios pueden tardar unos minutos en reflejarse.`,
      })

      onTemplateUpdated()
      onClose()
    } catch (error) {
      toast({
        title: "Error al actualizar",
        description: error instanceof Error ? error.message : "No se pudo actualizar la plantilla",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetModal = () => {
    setAction(null)
    setIsLoading(false)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!template) return null

  const variables = extractVariables(editForm.body)
  const bodyComponent = template.components?.find((c) => c.type === "BODY")

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!action ? (
          // Selección de acción
          <>
            <DialogHeader>
              <DialogTitle>Gestionar Plantilla</DialogTitle>
              <DialogDescription>¿Qué acción deseas realizar con la plantilla "{template.name}"?</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <Button
                variant="outline"
                className="justify-start h-auto p-4 bg-transparent"
                onClick={() => setAction("view")}
              >
                <Eye className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Ver Detalles</div>
                  <div className="text-sm text-muted-foreground">Revisar el contenido de la plantilla</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto p-4 bg-transparent"
                onClick={() => setAction("edit")}
                disabled={template.status.toLowerCase() === "approved"}
              >
                <Edit3 className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Editar Plantilla</div>
                  <div className="text-sm text-muted-foreground">
                    {template.status.toLowerCase() === "approved"
                      ? "No se pueden editar plantillas aprobadas"
                      : "Modificar el contenido y configuración"}
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto p-4 border-red-200 hover:bg-red-50 bg-transparent"
                onClick={() => setAction("delete")}
              >
                <Trash2 className="h-5 w-5 mr-3 text-red-500" />
                <div className="text-left">
                  <div className="font-medium text-red-700">Eliminar Plantilla</div>
                  <div className="text-sm text-red-600">Esta acción no se puede deshacer</div>
                </div>
              </Button>
            </div>
          </>
        ) : action === "view" ? (
          // Vista de detalles
          <>
            <DialogHeader>
              <DialogTitle>Detalles de la Plantilla</DialogTitle>
              <DialogDescription>Información completa de "{template.name}"</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <Badge
                    className={
                      template.status.toLowerCase() === "approved"
                        ? "bg-green-100 text-green-800"
                        : template.status.toLowerCase() === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }
                  >
                    {template.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Categoría</Label>
                  <p className="text-sm">{template.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Idioma</Label>
                  <p className="text-sm">{template.language}</p>
                </div>
              </div>

              {bodyComponent?.text && (
                <div>
                  <Label className="text-sm font-medium">Contenido</Label>
                  <div className="bg-gray-50 p-3 rounded-lg mt-1">
                    <p className="text-sm whitespace-pre-wrap">{bodyComponent.text}</p>
                  </div>
                </div>
              )}

              {extractVariables(bodyComponent?.text || "").length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {extractVariables(bodyComponent?.text || "").map((variable, idx) => (
                      <Badge key={idx} variant="secondary">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAction(null)}>
                Volver
              </Button>
            </DialogFooter>
          </>
        ) : action === "edit" ? (
          // Formulario de edición
          <>
            <DialogHeader>
              <DialogTitle>Editar Plantilla</DialogTitle>
              <DialogDescription>Modifica el contenido de "{template.name}"</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Solo se pueden editar plantillas en estado "pending" o "rejected". Los cambios requieren nueva
                  aprobación de Meta.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="body">
                  Contenido del mensaje *
                  <span className="text-xs text-muted-foreground ml-2">({editForm.body.length}/1024)</span>
                </Label>
                <Textarea
                  id="body"
                  value={editForm.body}
                  onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                  className="min-h-[120px]"
                  placeholder="Hola {{1}}, tu pedido {{2}} está listo..."
                />
              </div>

              {variables.length > 0 && (
                <div>
                  <Label>Variables detectadas:</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {variables.map((variable, index) => (
                      <Badge key={variable} variant="secondary">
                        {variable} → Ejemplo{index + 1}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="footer">
                  Pie del mensaje (opcional)
                  <span className="text-xs text-muted-foreground ml-2">({editForm.footer.length}/60)</span>
                </Label>
                <Input
                  id="footer"
                  value={editForm.footer}
                  onChange={(e) => setEditForm({ ...editForm, footer: e.target.value })}
                  placeholder="ej: Equipo de soporte"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAction(null)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleEdit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : action === "delete" ? (
          // Confirmación de eliminación
          <>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
              <DialogDescription>
                Esta acción eliminará permanentemente la plantilla "{template.name}".
              </DialogDescription>
            </DialogHeader>

            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700">
                <strong>¡Atención!</strong> Esta acción no se puede deshacer. La plantilla será eliminada
                permanentemente de tu cuenta.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAction(null)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  "Eliminar Plantilla"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
