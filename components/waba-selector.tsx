"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, Phone, AlertCircle, Loader2 } from "lucide-react"
import { useWabaProject } from "@/hooks/use-waba-project"
import { useAuth } from "@/app/contexts/auth-context"
import type { WabaProject } from "@/lib/database"
import React from "react"

interface WabaSelectorProps {
  onProjectSelect?: (project: WabaProject) => void
}

export function WabaSelector({ onProjectSelect }: WabaSelectorProps) {
  const { user, userProfile } = useAuth()
  const { wabaProject, loading, error, fetchWabaProject } = useWabaProject()

  // Llamar callback cuando el proyecto cambie
  React.useEffect(() => {
    if (wabaProject && onProjectSelect) {
      onProjectSelect(wabaProject)
    }
  }, [wabaProject, onProjectSelect])

  if (!user || !userProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-muted-foreground">Debes iniciar sesión para ver tu proyecto</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Cargando proyecto...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !wabaProject) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Proyecto WhatsApp no configurado</h3>
          <p className="text-muted-foreground text-center mb-4">
            {error || "No se encontró un proyecto de WhatsApp Business API configurado para tu cuenta."}
          </p>
          <Button onClick={fetchWabaProject}>Reintentar</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Phone className="h-5 w-5" />
            <span>Proyecto WhatsApp Business</span>
          </CardTitle>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{wabaProject.nombre}</h3>
              <p className="text-sm text-muted-foreground">{wabaProject.descripcion}</p>
            </div>
            <Badge variant={wabaProject.estado === 1 ? "default" : "secondary"}>
              {wabaProject.estado === 1 ? "Activo" : "Inactivo"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Número:</span>
              <p className="text-muted-foreground">{wabaProject.numero}</p>
            </div>
            <div>
              <span className="font-medium">WABA ID:</span>
              <p className="text-muted-foreground">{wabaProject.waba_id}</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Usuario:</span> {userProfile.name} ({userProfile.email})
          </div>

          {wabaProject.token_proyecto && (
            <div className="pt-2 border-t">
              <span className="text-xs text-green-600">✓ Token configurado correctamente</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
