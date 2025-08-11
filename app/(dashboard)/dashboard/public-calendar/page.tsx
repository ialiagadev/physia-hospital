"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Calendar, Users, Clock, Settings, ExternalLink, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase/client"

export default function PublicCalendarInfo() {
  const [copied, setCopied] = useState(false)
  const [copiedIframe, setCopiedIframe] = useState(false)
  const [publicUrl, setPublicUrl] = useState("")
  const [iframeCode, setIframeCode] = useState("")
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info"
    message: string
  } | null>(null)

  const showNotification = (type: "success" | "error" | "warning" | "info", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const generateUrls = (orgId: string) => {
    if (!orgId) return

    const url = `${window.location.origin}/booking/${orgId}`
    setPublicUrl(url)
    setIframeCode(`<iframe 
  src="${url}" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
</iframe>`)
  }

  const copyToClipboard = async (text: string, type: "url" | "iframe") => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === "url") {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        showNotification("success", "Enlace copiado al portapapeles")
      } else {
        setCopiedIframe(true)
        setTimeout(() => setCopiedIframe(false), 2000)
        showNotification("success", "Código iframe copiado al portapapeles")
      }
    } catch (err) {
      console.error("Error al copiar:", err)
      showNotification("error", "Error al copiar al portapapeles")
    }
  }

  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId)
    generateUrls(orgId)
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          setError("Error de autenticación")
          setLoading(false)
          return
        }

        setUser(user)

        const { data: orgs, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false })

        if (orgsError) {
          setError("Error al cargar organizaciones")
        } else {
          setOrganizations(orgs || [])
          // Seleccionar la primera organización por defecto
          if (orgs && orgs.length > 0) {
            const firstOrgId = orgs[0].id
            setSelectedOrgId(firstOrgId)
            generateUrls(firstOrgId)
          }
        }

        setLoading(false)
      } catch (err) {
        console.error("Error en getUser:", err)
        setError("Error inesperado")
        setLoading(false)
      }
    }

    getUser()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando organizaciones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert className="border-red-500 bg-red-50">
          <AlertDescription className="text-red-800">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertDescription className="text-yellow-800">
            <strong>Sin organizaciones:</strong> No tienes organizaciones configuradas. Crea una organización primero.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-16 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 blur-3xl -z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent -z-10"></div>
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <Calendar className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-6">
          Calendario Público para tus Clientes
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Permite que tus clientes reserven citas directamente desde tu calendario público. Configura tus servicios,
          horarios y disponibilidad para ofrecer una experiencia perfecta.
        </p>
      </div>

      {/* Selector de organización */}
      {organizations.length > 1 && (
        <div className="mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-gray-50 ring-1 ring-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Seleccionar Organización
              </CardTitle>
              <CardDescription>
                Elige la organización para la cual quieres obtener el calendario público
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedOrgId} onValueChange={handleOrgChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una organización" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} {org.city && `- ${org.city}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notificaciones */}
      {notification && (
        <Alert
          className={`mb-6 ${
            notification.type === "success"
              ? "border-green-500 bg-green-50"
              : notification.type === "error"
                ? "border-red-500 bg-red-50"
                : notification.type === "warning"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-blue-500 bg-blue-50"
          }`}
        >
          <AlertDescription
            className={`${
              notification.type === "success"
                ? "text-green-800"
                : notification.type === "error"
                  ? "text-red-800"
                  : notification.type === "warning"
                    ? "text-yellow-800"
                    : "text-blue-800"
            }`}
          >
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Configuración requerida */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configuración Requerida
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-100 ring-1 ring-cyan-200 hover:scale-105">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-800">
                <Users className="h-5 w-5 text-cyan-600" />
                Servicios y Personal
              </CardTitle>
              <CardDescription className="text-cyan-700">
                Configura qué servicios ofreces y quién los puede realizar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-2 h-2 p-0 rounded-full bg-cyan-500" />
                  <span className="text-cyan-800">Define tus servicios (duración, precio, descripción)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-2 h-2 p-0 rounded-full bg-cyan-500" />
                  <span className="text-cyan-800">Asigna servicios a usuarios específicos</span>
                </li>
               
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 ring-1 ring-emerald-200 hover:scale-105">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-800">
                <Clock className="h-5 w-5 text-emerald-600" />
                Horarios y Disponibilidad
              </CardTitle>
              <CardDescription className="text-emerald-700">
                Gestiona horarios de trabajo y días no disponibles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-2 h-2 p-0 rounded-full bg-emerald-500" />
                  <span className="text-emerald-800">Horarios de trabajo por usuario</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-2 h-2 p-0 rounded-full bg-emerald-500" />
                  <span className="text-emerald-800">Solicitudes de días libres</span>
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="outline" className="w-2 h-2 p-0 rounded-full bg-emerald-500" />
                  <span className="text-emerald-800">Vacaciones y bajas médicas</span>
                </li>
                
              </ul>
            </CardContent>
          </Card>
        </div>

        <Alert className="mt-6">
          <Settings className="h-4 w-4" />
          <AlertDescription>
  <strong>Importante:</strong> Puedes configurar todos estos aspectos desde la página del{' '}
  <Button
    variant="link"
    className="p-0 h-auto font-semibold text-blue-600"
    onClick={() => (window.location.href = "/dashboard")}
  >
    calendario
  </Button>
  . Las solicitudes de días libres, vacaciones o baja médica se gestionan desde{' '}
  <Button
    variant="link"
    className="p-0 h-auto font-semibold text-blue-600"
    onClick={() => (window.location.href = "/dashboard/fichaje")}
  >
    solicitudes
  </Button>
  . El sistema detectará automáticamente la disponibilidad real considerando horarios y ausencias.
</AlertDescription>

        </Alert>
      </div>

      {/* Obtener enlace público */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Obtener Enlace Público</h2>

        <Card className="border-0 shadow-2xl bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-100 ring-2 ring-yellow-200">
          <CardHeader>
            <CardTitle className="text-amber-800">Tu Calendario Público</CardTitle>
            <CardDescription className="text-amber-700">
              Comparte este enlace con tus clientes para que puedan reservar citas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-white/70 rounded-lg mb-4 border border-amber-200">
              {publicUrl ? (
                <code className="flex-1 text-sm font-mono break-all text-amber-900">{publicUrl}</code>
              ) : (
                <div className="flex-1 h-5 bg-amber-200 animate-pulse rounded"></div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(publicUrl, "url")}
                className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
                disabled={!publicUrl}
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => copyToClipboard(publicUrl, "url")}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={!publicUrl}
              >
                {copied ? "¡Copiado!" : "Copiar Enlace"}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(publicUrl, "_blank")}
                disabled={!publicUrl}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Calendario
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Código iframe */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Integrar en tu Sitio Web</h2>

        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 ring-1 ring-violet-200">
          <CardHeader>
            <CardTitle className="text-violet-800">Código iframe</CardTitle>
            <CardDescription className="text-violet-700">
              Copia este código para embeber el calendario directamente en tu sitio web
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-900 rounded-lg overflow-x-auto">
                {iframeCode ? (
                  <pre className="text-sm text-gray-100">
                    <code>{iframeCode}</code>
                  </pre>
                ) : (
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-700 animate-pulse rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700 animate-pulse rounded w-1/2"></div>
                    <div className="h-4 bg-gray-700 animate-pulse rounded w-2/3"></div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => copyToClipboard(iframeCode, "iframe")}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={!iframeCode}
              >
                {copiedIframe ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    ¡Código Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Código iframe
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Footer con acciones */}
      <div className="text-center">
        <p className="text-gray-600 mb-4">¿Necesitas configurar tus servicios o horarios?</p>
        <Button
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          onClick={() => (window.location.href = "/dashboard")}
        >
          <Settings className="h-5 w-5 mr-2" />
          Ir a Configuración del Calendario
        </Button>
      </div>
    </div>
  )
}
