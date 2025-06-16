"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Eye, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

export default function NewTemplatePage() {
  const router = useRouter()
  const [form, setForm] = useState<TemplateForm>({
    name: "",
    language: "",
    category: "",
    body: "",
    footer: "",
  })
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      return
    }

    setIsSubmitting(true)

    try {
      // Aquí conectaremos con la API/Supabase
      console.log("Enviando plantilla:", form)

      // Simular delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Redirigir a la lista
      router.push("/dashboard/whatsapp/templates")
    } catch (error) {
      console.error("Error al crear plantilla:", error)
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
        <Link href="/dashboard/whatsapp/templates">
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
                  onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase() })}
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
                  placeholder="Escribe tu mensaje aquí. Usa {{1}}, {{2}} para variables..."
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
                    {variables.map((variable) => (
                      <Badge key={variable} variant="secondary">
                        {variable}
                      </Badge>
                    ))}
                  </div>
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
                  {isSubmitting ? "Creando..." : "Crear Plantilla"}
                </Button>
                <Link href="/dashboard/whatsapp/templates">
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
                    <p className="text-sm whitespace-pre-wrap">{form.body}</p>
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
                      Deberás proporcionar valores para estas variables al enviar el mensaje.
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
