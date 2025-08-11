"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Clock, Trash2, Copy, Edit, Play } from "lucide-react"
import type { AisensyTemplate } from "@/lib/aisensy-api"
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
import { toast } from "@/hooks/use-toast"

interface TemplateCardProps {
  template: AisensyTemplate
  onEdit: (template: AisensyTemplate) => void
  onDuplicate: (template: AisensyTemplate) => void
  onDelete: (id: string, name: string) => void
  onUse: (template: AisensyTemplate) => void
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "APPROVED":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "PENDING":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "REJECTED":
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-800"
    case "PENDING":
      return "bg-yellow-100 text-yellow-800"
    case "REJECTED":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "MARKETING":
      return "bg-purple-100 text-purple-800"
    case "UTILITY":
      return "bg-blue-100 text-blue-800"
    case "AUTHENTICATION":
      return "bg-orange-100 text-orange-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function TemplateCard({ template, onEdit, onDuplicate, onDelete, onUse }: TemplateCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(template.id, template.name)
      toast({
        title: "Plantilla eliminada",
        description: "La plantilla se ha eliminado correctamente.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la plantilla.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      await onDuplicate(template)
      toast({
        title: "Plantilla duplicada",
        description: "La plantilla se ha duplicado correctamente.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo duplicar la plantilla.",
        variant: "destructive",
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  // Extraer el texto del cuerpo del template
  const bodyComponent = template.components.find((c) => c.type === "BODY")
  const footerComponent = template.components.find((c) => c.type === "FOOTER")
  const bodyText = bodyComponent?.text || "Sin contenido"
  const footerText = footerComponent?.text

  // Contar variables en el texto del cuerpo
  const variablesCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <Badge variant="outline" className={getCategoryColor(template.category)}>
              {template.category}
            </Badge>
            <Badge variant="outline" className={getStatusColor(template.status)}>
              <div className="flex items-center space-x-1">
                {getStatusIcon(template.status)}
                <span>{template.status}</span>
              </div>
            </Badge>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>{template.language.toUpperCase()}</span>
            <span>•</span>
            <span>{variablesCount} variables</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Contenido:</p>
            <p className="text-sm bg-gray-50 p-3 rounded-md font-mono">{bodyText}</p>
          </div>
          {footerText && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Pie:</p>
              <p className="text-xs text-muted-foreground italic">{footerText}</p>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">
              Creada: {template.created_at ? new Date(template.created_at).toLocaleDateString("es-ES") : "N/A"}
            </span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(template)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={isDuplicating}>
                <Copy className="h-4 w-4 mr-1" />
                {isDuplicating ? "Duplicando..." : "Duplicar"}
              </Button>
              {template.status === "APPROVED" && (
                <Button variant="outline" size="sm" onClick={() => onUse(template)}>
                  <Play className="h-4 w-4 mr-1" />
                  Usar
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esto eliminará permanentemente la plantilla "{template.name}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? "Eliminando..." : "Eliminar"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
