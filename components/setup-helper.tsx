"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Copy, Database, User, Key } from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

export function SetupHelper() {
  const { user, userProfile } = useAuth()
  const [token, setToken] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [orgInfo, setOrgInfo] = useState<any>(null)

  // Obtener información de la organización
  useEffect(() => {
    if (user && userProfile) {
      fetchOrganizationInfo()
    }
  }, [user, userProfile])

  const fetchOrganizationInfo = async () => {
    try {
      const response = await fetch("/api/organization/current")
      if (response.ok) {
        const data = await response.json()
        setOrgInfo(data)
      }
    } catch (error) {
      console.error("Error fetching organization:", error)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: `${label} copiado al portapapeles`,
    })
  }

  const generateSQL = () => {
    if (!user || !token.trim()) return ""

    return `-- Script para insertar datos WABA de prueba
INSERT INTO public.waba (
  id_canales_organization,
  waba_id,
  numero,
  nombre,
  descripcion,
  estado,
  id_proyecto,
  token_proyecto,
  id_usuario,
  webhook
) VALUES (
  1,
  123456789,
  '+1234567890',
  'Proyecto ${userProfile?.name || "Usuario"}',
  'Proyecto de prueba para plantillas de WhatsApp',
  1,
  'project_${user.id.substring(0, 8)}',
  '${token.trim()}',
  '${user.id}',
  'https://webhook-example.com/waba'
);

-- Verificar inserción
SELECT * FROM public.waba WHERE id_usuario = '${user.id}';`
  }

  const createWabaProject = async () => {
    if (!user || !userProfile?.organization_id || !token.trim()) {
      toast({
        title: "Error",
        description: "Token de Aisensy requerido y organización válida",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/waba/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token.trim(),
          nombre: `Proyecto ${userProfile?.name || "Usuario"}`,
          descripcion: "Proyecto de WhatsApp Business API",
          organizationId: userProfile.organization_id,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al crear proyecto WABA")
      }

      toast({
        title: "¡Éxito!",
        description: "Proyecto WABA creado correctamente",
      })

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto WABA",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Mostrar información de la organización directamente del contexto
  if (!userProfile?.organization_id) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No tienes una organización asignada</p>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Debes iniciar sesión para configurar WABA</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Configuración WABA - Enfoque Organizacional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información del usuario y organización */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Información del Usuario y Organización
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{user.email}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">User ID</Label>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.id}</code>
                <Button size="sm" variant="ghost" onClick={() => copyToClipboard(user.id, "User ID")}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {userProfile?.organization_id && (
              <div>
                <Label className="text-xs text-muted-foreground">Organización ID</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{userProfile.organization_id}</Badge>
                </div>
              </div>
            )}
            {orgInfo && (
              <div>
                <Label className="text-xs text-muted-foreground">Organización</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{orgInfo.name}</Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Explicación del enfoque organizacional */}
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">💡 Enfoque Organizacional</h4>
          <p className="text-sm text-blue-800">
            Con este enfoque, <strong>todos los usuarios de tu organización</strong> tendrán acceso al mismo proyecto
            WABA. Esto significa que las plantillas serán compartidas entre todos los miembros del equipo.
          </p>
        </div>

        {/* Configuración del token */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Key className="h-4 w-4" />
            Token de Aisensy
          </h4>
          <div className="space-y-2">
            <Label htmlFor="token">Token del Proyecto</Label>
            <Input
              id="token"
              type="password"
              placeholder="Pega aquí tu token de Aisensy..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Este es el token que aparece en tus ejemplos de curl de Aisensy
            </p>
          </div>
        </div>

        {/* Botón para crear automáticamente */}
        <div className="space-y-3">
          <Button onClick={createWabaProject} disabled={!token.trim() || isCreating} className="w-full">
            {isCreating ? "Creando..." : "Crear Proyecto WABA Automáticamente"}
          </Button>
        </div>

        {/* SQL generado */}
        {token.trim() && (
          <div className="space-y-3">
            <h4 className="font-medium">SQL Generado (Alternativa Manual)</h4>
            <div className="relative">
              <pre className="text-xs bg-gray-100 p-3 rounded-md overflow-auto max-h-40 border">{generateSQL()}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(generateSQL(), "SQL")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes ejecutar este SQL directamente en tu base de datos Supabase si prefieres hacerlo manualmente.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
