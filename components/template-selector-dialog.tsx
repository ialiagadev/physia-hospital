"use client"

import { useState } from "react"
import { FileText, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface Template {
  id: string
  name: string
  content: string
  category: string
  variables?: string[]
}

interface TemplateSelectorDialogProps {
  onTemplateSelect: (template: Template) => void
  disabled?: boolean
}

// Plantillas de ejemplo - en producción vendrían de la base de datos
const TEMPLATES: Template[] = [
  {
    id: "1",
    name: "Saludo inicial",
    content: "¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?",
    category: "Saludos",
  },
  {
    id: "2",
    name: "Información de horarios",
    content:
      "Nuestros horarios de atención son de lunes a viernes de 9:00 AM a 6:00 PM. ¿Te gustaría agendar una cita?",
    category: "Información",
  },
  {
    id: "3",
    name: "Solicitar información",
    content: "Para poder ayudarte mejor, ¿podrías proporcionarnos tu nombre completo y número de teléfono?",
    category: "Información",
  },
  {
    id: "4",
    name: "Confirmación de cita",
    content: "Tu cita ha sido confirmada para el [FECHA] a las [HORA]. Te enviaremos un recordatorio 24 horas antes.",
    category: "Citas",
    variables: ["FECHA", "HORA"],
  },
  {
    id: "5",
    name: "Seguimiento post-consulta",
    content:
      "¡Hola! Esperamos que te encuentres bien después de tu consulta. ¿Tienes alguna pregunta o necesitas algo más?",
    category: "Seguimiento",
  },
  {
    id: "6",
    name: "Despedida",
    content: "¡Gracias por contactarnos! Si necesitas algo más, no dudes en escribirnos. ¡Que tengas un excelente día!",
    category: "Despedidas",
  },
  {
    id: "7",
    name: "Información de precios",
    content:
      "Te comparto nuestra lista de precios. Para más información detallada, puedes agendar una consulta gratuita.",
    category: "Información",
  },
  {
    id: "8",
    name: "Reagendar cita",
    content:
      "Entendemos que a veces surgen imprevistos. ¿Te gustaría reagendar tu cita? Tenemos disponibilidad para [OPCIONES].",
    category: "Citas",
    variables: ["OPCIONES"],
  },
]

export function TemplateSelectorDialog({ onTemplateSelect, disabled = false }: TemplateSelectorDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Obtener categorías únicas
  const categories = Array.from(new Set(TEMPLATES.map((t) => t.category)))

  // Filtrar plantillas por categoría
  const filteredTemplates = selectedCategory ? TEMPLATES.filter((t) => t.category === selectedCategory) : TEMPLATES

  const handleTemplateSelect = (template: Template) => {
    onTemplateSelect(template)
    setOpen(false)
    setSelectedCategory(null)
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      Saludos: "bg-green-100 text-green-800 border-green-200",
      Información: "bg-blue-100 text-blue-800 border-blue-200",
      Citas: "bg-purple-100 text-purple-800 border-purple-200",
      Seguimiento: "bg-orange-100 text-orange-800 border-orange-200",
      Despedidas: "bg-gray-100 text-gray-800 border-gray-200",
    }
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-gray-500 hover:text-green-600 hover:bg-green-50"
          disabled={disabled}
        >
          <FileText className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Seleccionar Plantilla
          </DialogTitle>
          <DialogDescription>Elige una plantilla para enviar en esta conversación</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Filtros por categoría */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="h-8"
            >
              Todas
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="h-8"
              >
                {category}
              </Button>
            ))}
          </div>

          <Separator />

          {/* Lista de plantillas */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <Badge variant="outline" className={`text-xs ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{template.content}</p>
                      {template.variables && template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.variables.map((variable) => (
                            <Badge key={variable} variant="secondary" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay plantillas disponibles en esta categoría</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
