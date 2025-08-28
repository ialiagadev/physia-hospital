"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { FileText, Send, Loader2, AlertCircle, CheckCircle, Clock, XCircle, Eye } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import { TemplateAPI, extractVariables, formatPhoneNumber } from "@/app/api/templates/route"
import { toast } from "@/hooks/use-toast"

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

interface TemplateWithVariables extends Template {
  variableValues?: Record<string, string>
  finalContent?: string
}

interface WabaConfig {
  id_proyecto: string
  token_proyecto: string
  phone_number_id?: string
}

interface TemplateSelectorDialogProps {
  recipientPhone: string
  onTemplateSent?: (template: TemplateWithVariables) => void
  disabled?: boolean
  trigger?: React.ReactNode
}

export function TemplateSelectorDialog({
  recipientPhone,
  onTemplateSent,
  disabled = false,
  trigger,
}: TemplateSelectorDialogProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [wabaConfig, setWabaConfig] = useState<WabaConfig | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [showVariableForm, setShowVariableForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { userProfile } = useAuth()

  // Función para reemplazar variables en el texto
  const replaceVariables = (text: string, values: Record<string, string>): string => {
    let result = text

    // Extraer todas las variables del texto
    const variables = extractVariables(text)

    // Para cada variable encontrada, reemplazarla con su valor correspondiente
    variables.forEach((variable, index) => {
      // La clave en variableValues corresponde al índice + 1
      const key = (index + 1).toString()
      const value = values[key] || variable // Si no hay valor, mantener la variable original

      // Reemplazar la variable específica
      result = result.replace(variable, value)
    })

    return result
  }

  // Función para obtener el mensaje preview
  const getMessagePreview = (): string => {
    if (!selectedTemplate) return ""

    const bodyComponent = selectedTemplate.components?.find((c) => c.type === "BODY")
    if (!bodyComponent?.text) return ""

    return replaceVariables(bodyComponent.text, variableValues)
  }

  // Función para construir el contenido final de la plantilla
  const buildFinalTemplateContent = (template: Template, values: Record<string, string>): string => {
    const bodyComponent = template.components?.find((c) => c.type === "BODY")
    const headerComponent = template.components?.find((c) => c.type === "HEADER")
    const footerComponent = template.components?.find((c) => c.type === "FOOTER")

    let templateContent = ""

    if (headerComponent?.text) {
      templateContent += `*${replaceVariables(headerComponent.text, values)}*\n\n`
    }

    if (bodyComponent?.text) {
      templateContent += replaceVariables(bodyComponent.text, values)
    }

    if (footerComponent?.text) {
      templateContent += `\n\n_${replaceVariables(footerComponent.text, values)}_`
    }

    // Fallback if no content found
    if (!templateContent.trim()) {
      templateContent = `Plantilla "${template.name}" enviada`
    }

    return templateContent
  }

  // Verificar si todas las variables están completas
  const areAllVariablesFilled = (): boolean => {
    if (!selectedTemplate) return false

    const bodyComponent = selectedTemplate.components?.find((c) => c.type === "BODY")
    if (!bodyComponent?.text) return true

    const variables = extractVariables(bodyComponent.text)
    return variables.every((variable, index) => {
      const key = (index + 1).toString()
      return variableValues[key]?.trim()
    })
  }

  // Debug: Log cuando se monta el componente
  useEffect(() => {}, [recipientPhone, disabled, userProfile])

  // Función para obtener la configuración WABA del usuario
  const fetchWabaConfig = async (organizationId: number) => {
    try {
      const { data: canalesOrg, error: canalError } = await supabase
        .from("canales_organizations")
        .select("id, id_canal, id_organization")
        .eq("id_organization", organizationId)
        .eq("estado", true)

      if (canalError) {
        throw new Error(`Error obteniendo canal: ${canalError.message}`)
      }

      if (!canalesOrg || canalesOrg.length === 0) {
        throw new Error("No se encontró configuración de canal para esta organización")
      }

      const canalOrg = canalesOrg[0]
      const { data: wabaData, error: wabaError } = await supabase
        .from("waba")
        .select("id, id_proyecto, token_proyecto, numero, nombre, estado, id_canales_organization")
        .eq("id_canales_organization", canalOrg.id)
        .eq("estado", 1)

      if (wabaError) {
        throw new Error(`Error obteniendo WABA: ${wabaError.message}`)
      }

      if (!wabaData || wabaData.length === 0) {
        const { data: wabaDataNoFilter, error: wabaErrorNoFilter } = await supabase
          .from("waba")
          .select("id, id_proyecto, token_proyecto, numero, nombre, estado, id_canales_organization")
          .eq("id_canales_organization", canalOrg.id)

        if (wabaDataNoFilter && wabaDataNoFilter.length > 0) {
          const waba = wabaDataNoFilter[0]
          if (!waba.id_proyecto || !waba.token_proyecto) {
            throw new Error("La configuración WABA no tiene proyecto ID o token válidos")
          }
          return {
            id_proyecto: waba.id_proyecto,
            token_proyecto: waba.token_proyecto,
            phone_number_id: waba.numero,
          }
        }
      }

      if (!wabaData || wabaData.length === 0) {
        throw new Error("No se encontró configuración WABA para este canal")
      }

      const waba = wabaData[0]
      if (!waba.id_proyecto || !waba.token_proyecto) {
        throw new Error("La configuración WABA no tiene proyecto ID o token válidos")
      }

      return {
        id_proyecto: waba.id_proyecto,
        token_proyecto: waba.token_proyecto,
        phone_number_id: waba.numero,
      }
    } catch (err: any) {
      console.error("❌ Error en fetchWabaConfig:", err)
      throw err
    }
  }

  // Cargar plantillas cuando se abre el diálogo
  useEffect(() => {
    if (open && userProfile?.organization_id) {
      loadTemplates()
    }
  }, [open, userProfile])

  const loadTemplates = async () => {
    if (!userProfile?.organization_id) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Obtener configuración WABA
      const config = await fetchWabaConfig(userProfile.organization_id)
      setWabaConfig(config)

      // Obtener plantillas
      const api = new TemplateAPI(config)
      const result = await api.getTemplates()

      if (Array.isArray(result.data)) {
        // Filtrar solo plantillas aprobadas
        const approvedTemplates = result.data.filter(
          (template: Template) => template.status.toLowerCase() === "approved",
        )
        setTemplates(approvedTemplates)
      } else {
        throw new Error("Formato inesperado en la respuesta")
      }
    } catch (error) {
      console.error("❌ Error loading templates:", error)
      const errorMessage = error instanceof Error ? error.message : "No se pudieron cargar las plantillas"
      setError(errorMessage)
      toast({
        title: "Error al cargar plantillas",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Debug: Log cuando cambia el estado open
  useEffect(() => {}, [open])

  // Obtener categorías únicas
  const categories = Array.from(new Set(templates.map((t) => t.category)))

  // Filtrar plantillas por categoría
  const filteredTemplates = selectedCategory ? templates.filter((t) => t.category === selectedCategory) : templates

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

  const getCategoryColor = (category: string) => {
    const colors = {
      UTILITY: "bg-blue-100 text-blue-800 border-blue-200",
      MARKETING: "bg-purple-100 text-purple-800 border-purple-200",
      AUTHENTICATION: "bg-green-100 text-green-800 border-green-200",
    }
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const handleTemplateSelect = (template: Template) => {
    const bodyComponent = template.components?.find((c) => c.type === "BODY")
    if (bodyComponent?.text) {
      const variables = extractVariables(bodyComponent.text)
      if (variables.length > 0) {
        // Si tiene variables, mostrar formulario
        setSelectedTemplate(template)
        setVariableValues({})
        setShowVariableForm(true)
      } else {
        // Si no tiene variables, enviar directamente
        sendTemplate(template, [])
      }
    } else {
      sendTemplate(template, [])
    }
  }

  const handleVariableFormSubmit = () => {
    if (!selectedTemplate) return

    const bodyComponent = selectedTemplate.components?.find((c) => c.type === "BODY")
    if (bodyComponent?.text) {
      const variables = extractVariables(bodyComponent.text)
      const values = variables.map((variable, index) => {
        const key = (index + 1).toString()
        return variableValues[key] || ""
      })
      sendTemplate(selectedTemplate, values)
    }
  }

  const sendTemplate = async (template: Template, parameters: string[]) => {
    if (!wabaConfig) {
      toast({
        title: "Error",
        description: "No hay configuración WABA disponible",
        variant: "destructive",
      })
      return
    }

    if (!userProfile?.organization_id) {
      toast({
        title: "Error",
        description: "No se pudo obtener la información de la organización",
        variant: "destructive",
      })
      return
    }

    setSending(template.id)

    try {
      const api = new TemplateAPI(wabaConfig)
      const formattedPhone = formatPhoneNumber(recipientPhone)

      if (parameters.length > 0) {
        await api.sendTemplateWithTextParams(
          formattedPhone,
          template.name,
          parameters,
          template.language,
          userProfile.organization_id,
        )
      } else {
        await api.sendSimpleTemplate(formattedPhone, template.name, template.language, userProfile.organization_id)
      }

      toast({
        title: "Plantilla enviada",
        description: `La plantilla "${template.name}" se ha enviado correctamente`,
      })

      // Crear el template con variables para enviar al callback
      const templateWithVariables: TemplateWithVariables = {
        ...template,
        variableValues,
        finalContent: buildFinalTemplateContent(template, variableValues),
      }

      onTemplateSent?.(templateWithVariables)
      setOpen(false)
      setShowVariableForm(false)
      setSelectedTemplate(null)
      setVariableValues({})
    } catch (error) {
      console.error("❌ Error sending template:", error)
  
      let description = "No se pudo enviar la plantilla"
  
      if (error instanceof Error && error.message.includes("Saldo insuficiente")) {
        description = "Saldo insuficiente. Recarga tu balance para enviar plantillas."
      }
  
      toast({
        title: "Error al enviar plantilla",
        description,
        variant: "destructive",
      })
    } finally {
      setSending(null)
    }
  }
  
  const handleClose = () => {
    setOpen(false)
    setShowVariableForm(false)
    setSelectedTemplate(null)
    setVariableValues({})
    setSelectedCategory(null)
    setError(null)
  }
  
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      handleClose()
    }
  }
  
  // Debug del botón trigger
  const handleTriggerClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault()
      return
    }
  
    if (!userProfile?.organization_id) {
      toast({
        title: "Error",
        description: "No se pudo obtener la información de la organización",
        variant: "destructive",
      })
      e.preventDefault()
      return
    }
  }
  

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-gray-500"
            disabled={disabled}
            onClick={handleTriggerClick}
          >
            <FileText className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Seleccionar Plantilla
          </DialogTitle>
          <DialogDescription>Elige una plantilla para enviar a {recipientPhone}</DialogDescription>
        </DialogHeader>

        {showVariableForm && selectedTemplate ? (
          // Formulario de variables
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">{selectedTemplate.name}</h4>
              <p className="text-sm text-blue-700">
                {selectedTemplate.components?.find((c) => c.type === "BODY")?.text}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Completa las variables:</Label>
              {(() => {
                const bodyComponent = selectedTemplate.components?.find((c) => c.type === "BODY")
                if (!bodyComponent?.text) return null

                const variables = extractVariables(bodyComponent.text)
                return variables.map((variable, index) => {
                  const key = (index + 1).toString() // Usar índice numérico como clave
                  return (
                    <div key={variable}>
                      <Label htmlFor={key} className="text-xs text-gray-600">
                        Variable {index + 1}: {variable}
                      </Label>
                      <Input
                        id={key}
                        value={variableValues[key] || ""}
                        onChange={(e) => setVariableValues({ ...variableValues, [key]: e.target.value })}
                        placeholder={`Valor para ${variable}`}
                      />
                    </div>
                  )
                })
              })()}
            </div>

            {/* Preview del mensaje */}
            {Object.keys(variableValues).length > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-green-600" />
                  <Label className="text-sm font-medium text-green-800">Vista previa del mensaje:</Label>
                </div>
                <div className="p-3 bg-white rounded border text-sm whitespace-pre-wrap">{getMessagePreview()}</div>
                {!areAllVariablesFilled() && (
                  <p className="text-xs text-green-600 mt-2">
                    * Completa todas las variables para ver el mensaje final
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowVariableForm(false)} className="flex-1">
                Volver
              </Button>
              <Button
                onClick={handleVariableFormSubmit}
                disabled={sending === selectedTemplate.id || !areAllVariablesFilled()}
                className="flex-1"
              >
                {sending === selectedTemplate.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Plantilla
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Lista de plantillas
          <div className="flex flex-col gap-4">
            {/* Estado de error */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-700">
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Filtros por categoría */}
            {!loading && !error && templates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="h-8"
                >
                  Todas ({templates.length})
                </Button>
                {categories.map((category) => {
                  const count = templates.filter((t) => t.category === category).length
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="h-8"
                    >
                      {category} ({count})
                    </Button>
                  )
                })}
              </div>
            )}

            {!loading && !error && templates.length > 0 && <Separator />}

            {/* Lista de plantillas */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando plantillas...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Error al cargar plantillas</p>
                <p className="text-sm mt-1">{error}</p>
                <Button onClick={loadTemplates} variant="outline" className="mt-4 bg-transparent">
                  Reintentar
                </Button>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay plantillas aprobadas disponibles</p>
                {selectedCategory && <p className="text-sm mt-1">en la categoría "{selectedCategory}"</p>}
                {templates.length === 0 && (
                  <p className="text-sm mt-2 text-blue-600">
                    Crea plantillas en la sección de plantillas para poder enviarlas
                  </p>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {filteredTemplates.map((template) => {
                    const bodyComponent = template.components?.find((c) => c.type === "BODY")
                    const variables = bodyComponent?.text ? extractVariables(bodyComponent.text) : []
                    const isSending = sending === template.id

                    return (
                      <div
                        key={template.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => !isSending && handleTemplateSelect(template)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {getStatusIcon(template.status)}
                              <h4 className="font-medium text-sm">{template.name}</h4>
                              <Badge variant="outline" className={`text-xs ${getCategoryColor(template.category)}`}>
                                {template.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {template.language.toUpperCase()}
                              </Badge>
                            </div>
                            {bodyComponent?.text && (
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{bodyComponent.text}</p>
                            )}
                            {variables.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {variables.map((variable) => (
                                  <Badge key={variable} variant="secondary" className="text-xs">
                                    {variable}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" className="shrink-0" disabled={isSending}>
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
