"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

// Mock data - después conectaremos con Supabase
const mockTemplates = [
  {
    id: "1",
    name: "welcome_message",
    language: "es",
    category: "UTILITY",
    status: "APPROVED",
    body: "Hola {{1}}, bienvenido a {{2}}. ¿En qué podemos ayudarte hoy?",
    footer: "Equipo de soporte",
    created_at: "2024-01-15T10:00:00Z",
    variables_count: 2,
  },
  {
    id: "2",
    name: "appointment_reminder",
    language: "es",
    category: "UTILITY",
    status: "PENDING",
    body: "Recordatorio: Tienes una cita el {{1}} a las {{2}} con {{3}}.",
    footer: "Confirma tu asistencia",
    created_at: "2024-01-14T15:30:00Z",
    variables_count: 3,
  },
  {
    id: "3",
    name: "promotion_offer",
    language: "es",
    category: "MARKETING",
    status: "REJECTED",
    body: "¡Oferta especial! {{1}}% de descuento en {{2}}. Válido hasta {{3}}.",
    footer: "Términos y condiciones aplican",
    created_at: "2024-01-13T09:15:00Z",
    variables_count: 3,
  },
]

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

export default function TemplatesPage() {
  const [templates] = useState(mockTemplates)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plantillas de WhatsApp</h1>
          <p className="text-muted-foreground">Gestiona las plantillas de mensajes para WhatsApp Business API</p>
        </div>
        <Link href="/dashboard/chat/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {templates.filter((t) => t.status === "APPROVED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {templates.filter((t) => t.status === "PENDING").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {templates.filter((t) => t.status === "REJECTED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
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
                  <span>{template.variables_count} variables</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Contenido:</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-md font-mono">{template.body}</p>
                </div>
                {template.footer && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Pie:</p>
                    <p className="text-xs text-muted-foreground italic">{template.footer}</p>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Creada: {new Date(template.created_at).toLocaleDateString("es-ES")}
                  </span>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                    <Button variant="outline" size="sm">
                      Duplicar
                    </Button>
                    {template.status === "APPROVED" && (
                      <Button variant="outline" size="sm">
                        Usar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay plantillas</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea tu primera plantilla para comenzar a enviar mensajes estructurados.
            </p>
            <Link href="/dashboard/whatsapp/templates/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Plantilla
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
