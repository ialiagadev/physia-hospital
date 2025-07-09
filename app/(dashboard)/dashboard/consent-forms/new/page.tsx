"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Save, Eye } from "lucide-react"

const PREDEFINED_CATEGORIES = [
  "general",
  "fisioterapia",
  "odontologia",
  "psicologia",
  "medicina",
  "cirugia",
  "estetica",
  "pediatria",
]

const TEMPLATE_CONTENT = `<h2>CONSENTIMIENTO INFORMADO</h2>

<h3>1. INFORMACIÓN SOBRE EL TRATAMIENTO</h3>
<p>Descripción del tratamiento que se va a realizar...</p>

<h3>2. BENEFICIOS ESPERADOS</h3>
<ul>
  <li>Beneficio 1</li>
  <li>Beneficio 2</li>
  <li>Beneficio 3</li>
</ul>

<h3>3. RIESGOS Y EFECTOS SECUNDARIOS</h3>
<p>Como en cualquier tratamiento médico, pueden existir algunos riesgos:</p>
<ul>
  <li>Riesgo 1</li>
  <li>Riesgo 2</li>
  <li>Riesgo 3</li>
</ul>

<h3>4. CONSENTIMIENTO</h3>
<p>He sido informado/a sobre:</p>
<ul>
  <li>La naturaleza del tratamiento propuesto</li>
  <li>Los beneficios esperados</li>
  <li>Los riesgos y efectos secundarios posibles</li>
  <li>Las alternativas de tratamiento disponibles</li>
</ul>

<p><strong>DECLARO que:</strong></p>
<ul>
  <li>He leído y comprendido toda la información proporcionada</li>
  <li>He tenido la oportunidad de hacer preguntas</li>
  <li>Todas mis dudas han sido resueltas satisfactoriamente</li>
  <li>Consiento voluntariamente al tratamiento propuesto</li>
</ul>

<p style="margin-top: 40px;"><strong>Fecha:</strong> _______________</p>
<p><strong>Paciente:</strong> _______________</p>
<p><strong>DNI:</strong> _______________</p>
<p><strong>Firma del paciente:</strong></p>`

export default function NewConsentFormPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("form")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    content: TEMPLATE_CONTENT,
    is_active: true,
    organization_id: "",
  })

  const [errors, setErrors] = useState({
    title: false,
    category: false,
    content: false,
    organization_id: false,
  })

  // Cargar organizaciones
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        const { data, error } = await supabase.from("organizations").select("id, name").order("name")

        if (error) throw error
        setOrganizations(data || [])

        if (data && data.length > 0) {
          setFormData((prev) => ({ ...prev, organization_id: data[0].id.toString() }))
        }
      } catch (error) {
        console.error("Error loading organizations:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las organizaciones",
          variant: "destructive",
        })
      }
    }

    loadOrganizations()
  }, [])

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpiar error si el campo se llena
    if (errors[field as keyof typeof errors] && value) {
      setErrors((prev) => ({ ...prev, [field]: false }))
    }
  }

  const validateForm = () => {
    const newErrors = {
      title: !formData.title.trim(),
      category: !formData.category,
      content: !formData.content.trim() || formData.content === "<div><br></div>" || formData.content === "<br>",
      organization_id: !formData.organization_id,
    }

    setErrors(newErrors)
    return !Object.values(newErrors).some(Boolean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor, completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { data: userData } = await supabase.auth.getUser()

      const { error } = await supabase.from("consent_forms").insert({
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        content: formData.content,
        is_active: formData.is_active,
        organization_id: Number.parseInt(formData.organization_id),
        created_by: userData.user?.id || null,
        version: 1,
      })

      if (error) throw error

      toast({
        title: "Formulario creado",
        description: "El formulario de consentimiento se ha creado correctamente",
      })

      router.push("/dashboard/consent-forms")
    } catch (error) {
      console.error("Error creating consent form:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el formulario de consentimiento",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Formulario de Consentimiento</h1>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Formularios", href: "/dashboard/consent-forms" },
            { label: "Nuevo", href: "/dashboard/consent-forms/new" },
          ]}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="form">Información Básica</TabsTrigger>
            <TabsTrigger value="content">Contenido</TabsTrigger>
            <TabsTrigger value="preview">Previsualización</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Formulario</CardTitle>
                <CardDescription>Configura los datos básicos del formulario de consentimiento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organization">
                      Organización <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.organization_id}
                      onValueChange={(value) => handleChange("organization_id", value)}
                    >
                      <SelectTrigger className={errors.organization_id ? "border-red-500" : ""}>
                        <SelectValue placeholder="Selecciona una organización" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.organization_id && <p className="text-sm text-red-500 mt-1">Selecciona una organización</p>}
                  </div>

                  <div>
                    <Label htmlFor="category">
                      Categoría <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                      <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREDEFINED_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && <p className="text-sm text-red-500 mt-1">Selecciona una categoría</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">
                    Título <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    placeholder="Ej: Consentimiento Informado para Fisioterapia"
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && <p className="text-sm text-red-500 mt-1">El título es obligatorio</p>}
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Descripción breve del formulario (opcional)"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleChange("is_active", checked)}
                  />
                  <Label htmlFor="is_active">Formulario activo</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contenido del Formulario</CardTitle>
                <CardDescription>
                  Edita el contenido del formulario usando el editor visual. Puedes formatear texto, crear listas y
                  estructurar el documento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="content">
                    Contenido del Formulario <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-2">
                    <RichTextEditor
                      value={formData.content}
                      onChange={(value) => handleChange("content", value)}
                      placeholder="Escribe el contenido del formulario de consentimiento..."
                      error={errors.content}
                    />
                  </div>
                  {errors.content && <p className="text-sm text-red-500 mt-1">El contenido es obligatorio</p>}
                  <p className="text-sm text-gray-500 mt-2">
                    Usa los botones de la barra de herramientas para formatear el texto. Los campos de firma se añadirán
                    automáticamente al final.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Previsualización
                </CardTitle>
                <CardDescription>Vista previa de cómo se verá el formulario para los pacientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-white max-h-96 overflow-y-auto">
                  <div
                    className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900"
                    dangerouslySetInnerHTML={{ __html: formData.content }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/consent-forms")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Crear Formulario
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
