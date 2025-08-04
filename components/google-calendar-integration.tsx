"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  FolderSyncIcon as Sync,
  Clock,
  Zap,
  RefreshCw,
} from "lucide-react"
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
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle")
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)
  const [showDebug, setShowDebug] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<any>(null)

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
        loadPendingSyncCount()
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
    loadPendingSyncCount()
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
        setTokenInfo(data)

        // Verificar si el token ha expirado
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          console.log("❌ Token expirado:", {
            expires_at: data.expires_at,
            current_time: new Date().toISOString(),
          })
          setIsConnected(false)
          toast.warning("Tu conexión con Google Calendar ha expirado. Reconéctate.")
        } else {
          console.log("✅ Token válido hasta:", data.expires_at)
          setIsConnected(true)
        }
      } else {
        setIsConnected(false)
        setTokenInfo(null)
        if (error) {
          console.error("❌ Error verificando conexión:", error)
        }
      }
    } catch (err) {
      console.error("❌ Error en checkConnectionStatus:", err)
      setIsConnected(false)
      setTokenInfo(null)
    }
  }

  const loadPendingSyncCount = async () => {
    if (!userProfile?.id) return

    try {
      // Contar citas pendientes
      const { count: appointmentsCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("professional_id", userProfile.id)
        .eq("synced_with_google", false)

      // Contar actividades grupales pendientes
      const { count: activitiesCount } = await supabase
        .from("group_activities")
        .select("*", { count: "exact", head: true })
        .eq("professional_id", userProfile.id)
        .eq("synced_with_google", false)

      const totalPending = (appointmentsCount || 0) + (activitiesCount || 0)
      setPendingSyncCount(totalPending)
    } catch (err) {
      console.error("❌ Error cargando elementos pendientes:", err)
      setPendingSyncCount(0)
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
      console.error("❌ Error conectando:", err)
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

      // También marcar todas las citas como no sincronizadas
      await supabase
        .from("appointments")
        .update({
          synced_with_google: false,
          google_calendar_event_id: null,
        })
        .eq("professional_id", userProfile?.id)

      // Marcar actividades grupales como no sincronizadas
      await supabase
        .from("group_activities")
        .update({
          synced_with_google: false,
          google_calendar_event_id: null,
        })
        .eq("professional_id", userProfile?.id)

      setIsConnected(false)
      setTokenInfo(null)
      setPendingSyncCount(0)
      toast.success("Desconectado de Google Calendar")
    } catch (err) {
      console.error("❌ Error desconectando:", err)
      setError(err instanceof Error ? err.message : "Error al desconectar")
      toast.error("Error al desconectar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncAll = async () => {
    if (!isConnected) return

    setSyncStatus("syncing")
    onSyncStatusChange?.(true)
    setError(null)

    try {
      const response = await fetch("/api/calendar/sync-all", {
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
        console.error("❌ Error en sincronización:", errorText)
        throw new Error("Error al sincronizar citas")
      }

      const result = await response.json()
      console.log("✅ Sincronización exitosa:", result)

      setSyncStatus("success")
      setLastSync(new Date())
      setPendingSyncCount(0)

      const totalSynced = (result.syncedAppointments || 0) + (result.syncedGroupActivities || 0)
      toast.success(`${totalSynced} elementos sincronizados correctamente`)
    } catch (err) {
      console.error("❌ Error en sincronización:", err)
      setSyncStatus("error")
      setError(err instanceof Error ? err.message : "Error en la sincronización")
      toast.error("Error al sincronizar citas")
    } finally {
      onSyncStatusChange?.(false)
      setTimeout(() => setSyncStatus("idle"), 3000)
    }
  }

  const getStatusIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusText = () => {
    switch (syncStatus) {
      case "syncing":
        return "Sincronizando..."
      case "success":
        return "Sincronizado"
      case "error":
        return "Error en sincronización"
      default:
        return "Listo para sincronizar"
    }
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
            {isConnected && autoSyncEnabled && (
              <Badge variant="outline" className="text-green-600">
                <Zap className="h-3 w-3 mr-1" />
                Auto-sync
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {autoSyncEnabled && isConnected
              ? "Las citas se sincronizan automáticamente al crearlas o modificarlas"
              : "Sincroniza manualmente tus citas con Google Calendar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado de conexión */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Conectado
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Desconectado
                  </>
                )}
              </Badge>

              {pendingSyncCount > 0 && (
                <Badge variant="outline" className="text-orange-600">
                  {pendingSyncCount} elementos pendientes
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  checkConnectionStatus()
                  loadPendingSyncCount()
                }}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm text-muted-foreground">{getStatusText()}</span>
            </div>
          </div>

          {/* Info del token para debug */}
          {tokenInfo && showDebug && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Token Info:</strong>
                <br />
                Expira: {tokenInfo.expires_at ? new Date(tokenInfo.expires_at).toLocaleString("es-ES") : "No definido"}
                <br />
                Válido: {tokenInfo.expires_at && new Date(tokenInfo.expires_at) > new Date() ? "✅ Sí" : "❌ No"}
                <br />
                Refresh Token: {tokenInfo.refresh_token ? "✅ Disponible" : "❌ No disponible"}
                <br />
                User ID: <code className="text-xs">{userProfile?.id}</code>
                <br />
                Organization ID: <code className="text-xs">{organizationId}</code>
              </AlertDescription>
            </Alert>
          )}

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info sobre auto-sync */}
          {isConnected && autoSyncEnabled && (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>Sincronización automática activada:</strong> Las nuevas citas y actividades se sincronizan
                automáticamente con Google Calendar.
              </AlertDescription>
            </Alert>
          )}

          {/* Última sincronización */}
          {lastSync && (
            <p className="text-sm text-muted-foreground">Última sincronización: {lastSync.toLocaleString("es-ES")}</p>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2">
            {!isConnected ? (
              <Button onClick={handleConnect} disabled={isLoading} className="flex-1">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
                Conectar Google Calendar
              </Button>
            ) : (
              <>
                <Button onClick={handleSyncAll} disabled={syncStatus === "syncing"} className="flex-1">
                  {syncStatus === "syncing" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sync className="mr-2 h-4 w-4" />
                  )}
                  Sincronizar Todo
                </Button>

                <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Botón de debug */}
          <Button variant="ghost" size="sm" onClick={() => setShowDebug(!showDebug)} className="w-full">
            {showDebug ? "Ocultar" : "Mostrar"} Debug Info
          </Button>

          {/* Información adicional */}
          {isConnected && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• ✅ Las citas se sincronizan automáticamente al crearlas</p>
              <p>• ✅ Las actividades grupales se sincronizan automáticamente</p>
              <p>• ✅ Los cambios se reflejan inmediatamente en Google Calendar</p>
              <p>• ℹ️ Los cambios en Google Calendar no afectan tu sistema</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
