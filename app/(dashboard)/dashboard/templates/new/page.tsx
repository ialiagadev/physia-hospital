"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Eye, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"

const LANGUAGES = [
  { code: "es", name: "Español" },
  { code: "en", name: "English" },
  { code: "es_MX", name: "Español (México)" },
  { code: "es_AR", name: "Español (Argentina)" },
  { code: "pt_BR", name: "Português (Brasil)" },
]

const CATEGORIES = [
  {
    value: "UTILITY",
    label: "Utilidad",
    description: "Mensajes transaccionales (confirmaciones, recordatorios)",
  },
  {
    value: "MARKETING",
    label: "Marketing",
    description: "Mensajes promocionales y de marketing",
  },
  {
    value: "AUTHENTICATION",
    label: "Autenticación",
    description: "Códigos OTP y verificación",
  },
]

interface TemplateForm {
  name: string
  language: string
  category: string
  body: string
  footer: string
}

interface ValidationError {
  field: string
  message: string
}

interface WabaConfig {
  id_proyecto: string
  token_proyecto: string
  nombre: string
}

interface TemplateComponent {
  type: string
  text: string
  example?: {
    body_text: string[][]
  }
}

interface CreateTemplateData {
  name: string
  category: string
  language: string
  components: TemplateComponent[]
}

export default function NewTemplatePage() {
  const router = useRouter()
  const { user, userProfile, isLoading: authLoading } = useAuth()
  const [wabaConfig, setWabaConfig] = useState<WabaConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [form, setForm] = useState<TemplateForm>({
    name: "",
    language: "es",
    category: "UTILITY",
    body: "",
    footer: "",
  })
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

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
            nombre: waba.nombre || "WhatsApp Business",
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
        nombre: waba.nombre || "WhatsApp Business",
      }
    } catch (err: any) {
      throw err
    }
  }

  // Función para crear plantilla
  const createTemplate = async (templateData: CreateTemplateData) => {
    if (!wabaConfig) {
      throw new Error("No hay configuración WABA disponible")
    }

    const res = await fetch(`https://backend.aisensy.com/direct-apis/t1/wa_template`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${wabaConfig.token_proyecto}`,
      },
      body: JSON.stringify(templateData),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Error ${res.status}: ${errorText}`)
    }

    const result = await res.json()
    return result
  }

  useEffect(() => {
    const loadWabaConfig = async () => {
      if (authLoading) return

      if (!userProfile?.organization_id) {
        setLoadingConfig(false)
        return
      }

      try {
        const config = await fetchWabaConfig(userProfile.organization_id)
        setWabaConfig(config)
      } catch (error) {
        console.error("Error cargando configuración WABA:", error)
      } finally {
        setLoadingConfig(false)
      }
    }

    loadWabaConfig()
  }, [userProfile, authLoading])

  // Verificar si el usuario tiene acceso
  if (!user || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acceso no autorizado</h3>
            <p className="text-muted-foreground text-center mb-4">Debes iniciar sesión para crear plantillas.</p>
            <Link href="/dashboard/templates">
              <Button>Volver a plantillas</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verificar si tiene proyecto WABA configurado
  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Cargando configuración...</h3>
            <p className="text-muted-foreground text-center">Verificando configuración WABA</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!wabaConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Configuración requerida</h3>
            <p className="text-muted-foreground text-center mb-4">
              Necesitas configurar un proyecto WABA antes de crear plantillas.
            </p>
            <Link href="/dashboard/templates">
              <Button>Volver y configurar</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Extraer variables del body
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{\d+\}\}/g) || []
    return [...new Set(matches)].sort()
  }

  // Validar formulario
  const validateForm = (): ValidationError[] => {
    const newErrors: ValidationError[] = []

    // Validar nombre
    if (!form.name.trim()) {
      newErrors.push({ field: "name", message: "El nombre es obligatorio" })
    } else if (!/^[a-z0-9_]+$/.test(form.name)) {
      newErrors.push({
        field: "name",
        message: "Solo letras minúsculas, números y guiones bajos",
      })
    } else if (form.name.length > 512) {
      newErrors.push({ field: "name", message: "Máximo 512 caracteres" })
    }

    // Validar idioma
    if (!form.language) {
      newErrors.push({ field: "language", message: "Selecciona un idioma" })
    }

    // Validar categoría
    if (!form.category) {
      newErrors.push({ field: "category", message: "Selecciona una categoría" })
    }

    // Validar body
    if (!form.body.trim()) {
      newErrors.push({ field: "body", message: "El contenido es obligatorio" })
    } else if (form.body.length > 1024) {
      newErrors.push({ field: "body", message: "Máximo 1024 caracteres" })
    }

    // Validar variables secuenciales
    const variables = extractVariables(form.body)
    for (let i = 0; i < variables.length; i++) {
      const expected = `{{${i + 1}}}`
      if (variables[i] !== expected) {
        newErrors.push({
          field: "body",
          message: `Las variables deben ser secuenciales: ${expected}`,
        })
        break
      }
    }

    // Validar footer
    if (form.footer && form.footer.length > 60) {
      newErrors.push({ field: "footer", message: "El pie máximo 60 caracteres" })
    }

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateForm()
    setErrors(validationErrors)

    if (validationErrors.length > 0) {
      toast({
        title: "Errores en el formulario",
        description: "Por favor corrige los errores antes de continuar",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Construir los componentes de la plantilla según el formato de Aisensy
      const components: TemplateComponent[] = []

      // Componente BODY (obligatorio)
      const bodyComponent: TemplateComponent = {
        type: "BODY",
        text: form.body.trim(),
      }

      // Si hay variables, agregar ejemplos
      const variables = extractVariables(form.body)
      if (variables.length > 0) {
        const exampleValues = variables.map((_, index) => `Ejemplo${index + 1}`)
        bodyComponent.example = {
          body_text: [exampleValues],
        }
      }

      components.push(bodyComponent)

      // Componente FOOTER (opcional)
      if (form.footer.trim()) {
        components.push({
          type: "FOOTER",
          text: form.footer.trim(),
        })
      }

      // Datos para crear la plantilla
      const templateData: CreateTemplateData = {
        name: form.name.trim(),
        category: form.category,
        language: form.language,
        components: components,
      }

      // Crear la plantilla
      await createTemplate(templateData)

      toast({
        title: "¡Plantilla creada!",
        description: "La plantilla se ha enviado para revisión de Meta. Puede tardar 24-48 horas en ser aprobada.",
      })

      // Redirigir a la lista de plantillas
      router.push("/dashboard/templates")
    } catch (error) {
      let errorMessage = "No se pudo crear la plantilla"
      if (error instanceof Error) {
        errorMessage = error.message
      }

      toast({
        title: "Error al crear plantilla",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFieldError = (field: string) => {
    return errors.find((error) => error.field === field)?.message
  }

  const variables = extractVariables(form.body)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/templates">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Plantilla</h1>
          <p className="text-muted-foreground">Crea una plantilla de mensaje para WhatsApp Business API</p>
        </div>
      </div>

      {/* Información del proyecto WABA */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm font-medium">Proyecto: {wabaConfig.nombre}</p>
            <p className="text-xs text-muted-foreground">Organización: {userProfile.name}</p>
          </div>
          <Badge variant="outline">Configurado</Badge>
        </CardContent>
      </Card>

      {/* Ejemplo de formato correcto */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Formato de ejemplo:</strong> "Hola {`{{1}}`}, tu pedido {`{{2}}`} está listo para recoger."
          <br />
          <span className="text-xs">Las variables deben ser secuenciales: {`{{1}}, {{2}}, {{3}}`}, etc.</span>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Plantilla</CardTitle>
            <CardDescription>Completa los datos requeridos por Meta para aprobar tu plantilla</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la plantilla *</Label>
                <Input
                  id="name"
                  placeholder="ej: welcome_message"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    })
                  }
                  className={getFieldError("name") ? "border-red-500" : ""}
                />
                {getFieldError("name") && <p className="text-sm text-red-500">{getFieldError("name")}</p>}
                <p className="text-xs text-muted-foreground">Solo letras minúsculas, números y guiones bajos</p>
              </div>

              {/* Idioma */}
              <div className="space-y-2">
                <Label htmlFor="language">Idioma *</Label>
                <Select value={form.language} onValueChange={(value) => setForm({ ...form, language: value })}>
                  <SelectTrigger className={getFieldError("language") ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecciona un idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("language") && <p className="text-sm text-red-500">{getFieldError("language")}</p>}
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger className={getFieldError("category") ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div>
                          <div className="font-medium">{cat.label}</div>
                          <div className="text-xs text-muted-foreground">{cat.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError("category") && <p className="text-sm text-red-500">{getFieldError("category")}</p>}
              </div>

              {/* Contenido */}
              <div className="space-y-2">
                <Label htmlFor="body">
                  Contenido del mensaje *
                  <span className="text-xs text-muted-foreground ml-2">({form.body.length}/1024)</span>
                </Label>
                <Textarea
                  id="body"
                  placeholder="Hola {{1}}, tu pedido {{2}} está listo para recoger."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className={`min-h-[120px] ${getFieldError("body") ? "border-red-500" : ""}`}
                />
                {getFieldError("body") && <p className="text-sm text-red-500">{getFieldError("body")}</p>}
                <p className="text-xs text-muted-foreground">
                  Usa variables como {`{{1}}, {{2}}, {{3}}`} para personalizar el mensaje
                </p>
              </div>

              {/* Variables detectadas */}
              {variables.length > 0 && (
                <div className="space-y-2">
                  <Label>Variables detectadas:</Label>
                  <div className="flex flex-wrap gap-2">
                    {variables.map((variable, index) => (
                      <Badge key={variable} variant="secondary">
                        {variable} → Ejemplo{index + 1}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se generarán ejemplos automáticamente para cada variable
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="space-y-2">
                <Label htmlFor="footer">
                  Pie del mensaje (opcional)
                  <span className="text-xs text-muted-foreground ml-2">({form.footer.length}/60)</span>
                </Label>
                <Input
                  id="footer"
                  placeholder="ej: Equipo de soporte"
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                  className={getFieldError("footer") ? "border-red-500" : ""}
                />
                {getFieldError("footer") && <p className="text-sm text-red-500">{getFieldError("footer")}</p>}
              </div>

              {/* Botones */}
              <div className="flex space-x-3 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Plantilla"
                  )}
                </Button>
                <Link href="/dashboard/templates">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Vista Previa</span>
            </CardTitle>
            <CardDescription>Así se verá tu plantilla en WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Información de la plantilla */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{form.name || "nombre_plantilla"}</Badge>
                  {form.language && <Badge variant="outline">{form.language.toUpperCase()}</Badge>}
                  {form.category && <Badge variant="outline">{form.category}</Badge>}
                </div>
              </div>

              {/* Simulación de WhatsApp */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  {form.body ? (
                    <p className="text-sm whitespace-pre-wrap">
                      {form.body.replace(/\{\{(\d+)\}\}/g, (match, num) => `[Ejemplo${num}]`)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">El contenido aparecerá aquí...</p>
                  )}
                  {form.footer && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <p className="text-xs text-muted-foreground">{form.footer}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información adicional */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Las plantillas deben ser aprobadas por Meta antes de poder usarse. El
                  proceso puede tomar 24-48 horas.
                </AlertDescription>
              </Alert>

              {variables.length > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Variables encontradas:</strong> {variables.join(", ")}
                    <br />
                    <span className="text-xs">
                      Se generarán ejemplos automáticamente: {variables.map((_, i) => `Ejemplo${i + 1}`).join(", ")}
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
