"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { MessageSquare, Globe, Tag, CheckCircle, Clock, XCircle, Plus, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { TemplateActionsModal } from "@/components/template-actions-modal"
import { TemplateAPI } from "@/app/api/templates/route"

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

export default function AiSensyTemplatesPage() {
  const { userProfile, isLoading: authLoading } = useAuth()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wabaConfig, setWabaConfig] = useState<WabaConfig | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Función para obtener la configuración WABA del usuario
  const fetchWabaConfig = async (organizationId: number) => {
    try {
      console.log("🔍 Buscando configuración WABA para organización:", organizationId)

      // Primero obtenemos los canales de la organización
      console.log("📡 Consultando canales_organizations...")
      const { data: canalesOrg, error: canalError } = await supabase
        .from("canales_organizations")
        .select("id, id_canal, id_organization")
        .eq("id_organization", organizationId)
        .eq("estado", true)

      console.log("📋 Resultado canales_organizations:", { canalesOrg, error: canalError })

      if (canalError) {
        throw new Error(`Error obteniendo canal: ${canalError.message}`)
      }

      if (!canalesOrg || canalesOrg.length === 0) {
        throw new Error("No se encontró configuración de canal para esta organización")
      }

      // Si hay múltiples canales, tomamos el primero
      const canalOrg = canalesOrg[0]
      console.log("✅ Canal seleccionado:", canalOrg)

      // Luego obtenemos la configuración WABA
      console.log("📡 Consultando tabla waba con id_canales_organization:", canalOrg.id)

      // Primero veamos TODOS los registros de waba para debug
      const { data: allWabaData, error: allWabaError } = await supabase
        .from("waba")
        .select("id, id_canales_organization, id_proyecto, token_proyecto, numero, nombre, estado")

      console.log("🔍 TODOS los registros WABA:", { allWabaData, error: allWabaError })

      // Ahora busquemos específicamente por id_canales_organization
      const { data: wabaData, error: wabaError } = await supabase
        .from("waba")
        .select("id, id_proyecto, token_proyecto, numero, nombre, estado, id_canales_organization")
        .eq("id_canales_organization", canalOrg.id)
        .eq("estado", 1)

      console.log("📋 Resultado waba filtrado por id_canales_organization:", { wabaData, error: wabaError })

      // Si no encuentra con estado = 0, busquemos sin filtro de estado
      if (!wabaData || wabaData.length === 0) {
        console.log("⚠️ No se encontró con estado = 0, buscando sin filtro de estado...")
        const { data: wabaDataNoFilter, error: wabaErrorNoFilter } = await supabase
          .from("waba")
          .select("id, id_proyecto, token_proyecto, numero, nombre, estado, id_canales_organization")
          .eq("id_canales_organization", canalOrg.id)

        console.log("📋 Resultado waba SIN filtro de estado:", { wabaDataNoFilter, error: wabaErrorNoFilter })

        if (wabaDataNoFilter && wabaDataNoFilter.length > 0) {
          // Usar el primer registro encontrado, sin importar el estado
          const waba = wabaDataNoFilter[0]
          console.log("✅ WABA seleccionado (sin filtro estado):", waba)

          if (!waba.id_proyecto || !waba.token_proyecto) {
            throw new Error(
              `La configuración WABA no tiene proyecto ID o token válidos. ID: ${waba.id_proyecto}, Token: ${waba.token_proyecto ? "presente" : "ausente"}`,
            )
          }

          console.log("🔑 Configuración final:", {
            id_proyecto: waba.id_proyecto,
            token_proyecto: waba.token_proyecto.substring(0, 20) + "...",
            numero: waba.numero,
            nombre: waba.nombre,
            estado: waba.estado,
          })

          return {
            id_proyecto: waba.id_proyecto,
            token_proyecto: waba.token_proyecto,
          }
        }
      }

      if (wabaError) {
        throw new Error(`Error obteniendo WABA: ${wabaError.message}`)
      }

      if (!wabaData || wabaData.length === 0) {
        throw new Error("No se encontró configuración WABA para este canal")
      }

      // Si hay múltiples registros WABA, tomamos el primero
      const waba = wabaData[0]
      console.log("✅ WABA seleccionado:", waba)

      if (!waba.id_proyecto || !waba.token_proyecto) {
        throw new Error(
          `La configuración WABA no tiene proyecto ID o token válidos. ID: ${waba.id_proyecto}, Token: ${waba.token_proyecto ? "presente" : "ausente"}`,
        )
      }

      console.log("🔑 Configuración final:", {
        id_proyecto: waba.id_proyecto,
        token_proyecto: waba.token_proyecto.substring(0, 20) + "...",
        numero: waba.numero,
        nombre: waba.nombre,
        estado: waba.estado,
      })

      return {
        id_proyecto: waba.id_proyecto,
        token_proyecto: waba.token_proyecto,
      }
    } catch (err: any) {
      console.error("❌ Error obteniendo configuración WABA:", err)
      throw err
    }
  }

  // Función para obtener las plantillas
  const fetchTemplates = async () => {
    if (!wabaConfig) return

    try {
      const api = new TemplateAPI(wabaConfig)
      const result = await api.getTemplates()

      if (Array.isArray(result.data)) {
        setTemplates(result.data)
        console.log(`✅ ${result.data.length} plantillas cargadas`)
      } else {
        console.error("❌ Formato inesperado:", result)
        throw new Error("Formato inesperado en la respuesta")
      }
    } catch (err: any) {
      console.error("❌ Error obteniendo plantillas:", err)
      throw err
    }
  }

  const loadData = async () => {
    if (authLoading) return

    if (!userProfile?.organization_id) {
      setError("No se encontró información de organización")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Obtener configuración WABA
      const config = await fetchWabaConfig(userProfile.organization_id)
      setWabaConfig(config)

      // Obtener plantillas
      const api = new TemplateAPI(config)
      const result = await api.getTemplates()

      if (Array.isArray(result.data)) {
        setTemplates(result.data)
        console.log(`✅ ${result.data.length} plantillas cargadas`)
      } else {
        throw new Error("Formato inesperado en la respuesta")
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [userProfile, authLoading])

  const handleTemplateAction = (template: Template) => {
    setSelectedTemplate(template)
    setIsModalOpen(true)
  }

  const handleTemplateUpdated = () => {
    // Recargar las plantillas después de una actualización
    fetchTemplates()
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            <strong>Error al cargar las plantillas:</strong> {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Plantillas WhatsApp</h1>
          </div>
          <p className="text-gray-600">Gestiona y visualiza tus plantillas de WhatsApp Business</p>
        </div>
        <Link href="/dashboard/templates/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aprobadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {templates.filter((t) => t.status.toLowerCase() === "approved").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {templates.filter((t) => t.status.toLowerCase() === "pending").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rechazadas</p>
                <p className="text-2xl font-bold text-red-600">
                  {templates.filter((t) => t.status.toLowerCase() === "rejected").length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay plantillas disponibles</h3>
            <p className="text-gray-500 mb-4">
              Crea tu primera plantilla para comenzar a enviar mensajes personalizados.
            </p>
            <Link href="/dashboard/templates/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear Primera Plantilla
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template, index) => (
            <Card key={template.id || index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">{template.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(template.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTemplateAction(template)}>Ver detalles</DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleTemplateAction(template)}
                          disabled={template.status.toLowerCase() === "approved"}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTemplateAction(template)} className="text-red-600">
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className={getStatusColor(template.status)}>{template.status}</Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {template.language}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {template.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {template.components?.[0]?.text && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-3">{template.components[0].text}</p>
                    </div>

                    {/* Mostrar variables si las hay */}
                    {(() => {
                      const variables = template.components[0].text.match(/\{\{\d+\}\}/g) || []
                      const uniqueVariables = [...new Set(variables)].sort()

                      return (
                        uniqueVariables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-gray-500 mr-2">Variables:</span>
                            {uniqueVariables.map((variable, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        )
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de acciones */}
      <TemplateActionsModal
        template={selectedTemplate}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedTemplate(null)
        }}
        onTemplateUpdated={handleTemplateUpdated}
        wabaConfig={wabaConfig}
      />
    </div>
  )
}
