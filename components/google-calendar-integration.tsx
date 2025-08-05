"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/app/contexts/auth-context"

interface GoogleCalendarIntegrationProps {
  organizationId: number
  onSyncStatusChange?: (syncing: boolean) => void
}

export function GoogleCalendarIntegration({ organizationId, onSyncStatusChange }: GoogleCalendarIntegrationProps) {
  const { userProfile } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar parámetros URL al cargar
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const connected = urlParams.get("connected")
    const error = urlParams.get("error")
    const details = urlParams.get("details")

    if (connected === "true") {
      toast.success("¡Conectado exitosamente a Google Calendar!")
      window.history.replaceState({}, document.title, window.location.pathname)
      setTimeout(() => {
        checkConnectionStatus()
      }, 1000)
    } else if (error) {
      const errorMessages = {
        auth_cancelled: "Autenticación cancelada",
        missing_params: "Parámetros faltantes en la respuesta",
        invalid_state: "Estado inválido en la respuesta",
        save_failed: "Error al guardar tokens",
        auth_failed: "Error en la autenticación",
      }
      const message = errorMessages[error as keyof typeof errorMessages] || "Error desconocido"
      toast.error(`Error: ${message}${details ? ` - ${decodeURIComponent(details)}` : ""}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Verificar estado de conexión al cargar
  useEffect(() => {
    checkConnectionStatus()
  }, [userProfile?.id])

  const checkConnectionStatus = async () => {
    if (!userProfile?.id) return

    try {
      const { data, error } = await supabase
        .from("user_google_tokens")
        .select("*")
        .eq("user_id", userProfile.id)
        .maybeSingle()

      if (!error && data) {
        // Si existe el token, está conectado (sin verificar expiración)
        setIsConnected(true)
        onSyncStatusChange?.(true)
      } else {
        setIsConnected(false)
        onSyncStatusChange?.(false)
      }
    } catch (err) {
      setIsConnected(false)
      onSyncStatusChange?.(false)
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/google/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userProfile?.id,
          organizationId: organizationId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error al inicializar la autenticación: ${response.status} - ${errorText}`)
      }

      const responseData = await response.json()
      const { authUrl } = responseData

      if (authUrl) {
        window.location.href = authUrl
      } else {
        throw new Error("No se recibió authUrl en la respuesta")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      toast.error("Error al conectar con Google Calendar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase.from("user_google_tokens").delete().eq("user_id", userProfile?.id)

      if (error) throw error

      setIsConnected(false)
      onSyncStatusChange?.(false)
      toast.success("Desconectado de Google Calendar")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desconectar")
      toast.error("Error al desconectar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
          {isConnected && (
            <Badge variant="outline" className="text-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isConnected
            ? "Las citas se sincronizan automáticamente al crearlas o modificarlas"
            : "Conecta tu cuenta de Google Calendar para sincronizar automáticamente tus citas"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Información sobre la sincronización automática */}
        {isConnected && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Sincronización automática activada:</strong> Las nuevas citas y actividades se sincronizan
              automáticamente con Google Calendar al crearlas o modificarlas.
            </AlertDescription>
          </Alert>
        )}

        {/* Botón de acción */}
        {!isConnected ? (
          <Button onClick={handleConnect} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
            Conectar Google Calendar
          </Button>
        ) : (
          <Button variant="outline" onClick={handleDisconnect} disabled={isLoading} className="w-full bg-transparent">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
            Desconectar Google Calendar
          </Button>
        )}

        {/* Información adicional */}
        {isConnected && (
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>• Las citas se sincronizan automáticamente al crearlas</p>
            <p>• Las actividades grupales se sincronizan automáticamente</p>
            <p>• Los cambios se reflejan inmediatamente en Google Calendar</p>
            <p>• Los tokens se renuevan automáticamente cuando es necesario</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
