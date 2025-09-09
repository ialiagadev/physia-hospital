"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, FileText } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface ContentCreatorFormData {
  agentName: string
  contentTypes: string[]
  targetAudience: string
  writingStyle: string
  brandVoice: string
  contentGoals: string
  includeResearch: boolean
  researchSources: string
  includeSEO: boolean
  seoKeywords: string
  includeVisuals: boolean
  visualStyle: string
  includeScheduling: boolean
  postingFrequency: string
  platformOptimization: boolean
  platforms: string[]
  customInstructions: string
}

interface ContentCreatorTemplateProps {
  onBack: () => void
  onSave: (data: ContentCreatorFormData & { prompt: string }) => void
}

export default function ContentCreatorTemplate({ onBack, onSave }: ContentCreatorTemplateProps) {
  const [formData, setFormData] = useState<ContentCreatorFormData>({
    agentName: "",
    contentTypes: [],
    targetAudience: "",
    writingStyle: "",
    brandVoice: "",
    contentGoals: "",
    includeResearch: false,
    researchSources: "",
    includeSEO: false,
    seoKeywords: "",
    includeVisuals: false,
    visualStyle: "",
    includeScheduling: false,
    postingFrequency: "",
    platformOptimization: false,
    platforms: [],
    customInstructions: "",
  })

  const updateFormData = (field: keyof ContentCreatorFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: keyof ContentCreatorFormData, item: string) => {
    const currentArray = formData[field] as string[]
    const newArray = currentArray.includes(item) ? currentArray.filter((i) => i !== item) : [...currentArray, item]
    updateFormData(field, newArray)
  }

  const generatePrompt = () => {
    let prompt = `# ${formData.agentName || "[Nombre del Agente]"} - Especialista en Creación de Contenido

Eres un experto creador de contenido especializado en generar material de alta calidad y engagement.

## **PERFIL DEL CREADOR**
- **Tipos de contenido**: ${formData.contentTypes.length > 0 ? formData.contentTypes.join(", ") : "[Tipos de contenido]"}
- **Audiencia objetivo**: ${formData.targetAudience || "[Audiencia objetivo]"}
- **Estilo de escritura**: ${formData.writingStyle || "[Estilo de escritura]"}
- **Voz de marca**: ${formData.brandVoice || "[Voz de marca]"}

## **OBJETIVOS DEL CONTENIDO**
${formData.contentGoals || "[Objetivos del contenido]"}

## **CAPACIDADES PRINCIPALES**`

    if (formData.includeResearch) {
      prompt += `

### 🔍 **Investigación y Análisis**
- Realiza investigación profunda antes de crear contenido
- Fuentes de investigación: ${formData.researchSources || "Fuentes académicas, estudios de mercado, tendencias actuales"}
- Verifica la veracidad de la información
- Identifica insights únicos y datos relevantes`
    }

    if (formData.includeSEO) {
      prompt += `

### 📈 **Optimización SEO**
- Integra palabras clave de forma natural: ${formData.seoKeywords || "[Palabras clave principales]"}
- Optimiza títulos, meta descripciones y estructura
- Crea contenido que responda a intenciones de búsqueda
- Sugiere enlaces internos y externos relevantes`
    }

    if (formData.includeVisuals) {
      prompt += `

### 🎨 **Elementos Visuales**
- Sugiere imágenes, gráficos y elementos visuales
- Estilo visual: ${formData.visualStyle || "Moderno y profesional"}
- Crea descripciones detalladas para diseñadores
- Propone formatos visuales según la plataforma`
    }

    if (formData.includeScheduling) {
      prompt += `

### 📅 **Planificación de Contenido**
- Frecuencia de publicación: ${formData.postingFrequency || "Regular"}
- Crea calendarios editoriales
- Sugiere mejores horarios de publicación
- Planifica contenido estacional y tendencias`
    }

    if (formData.platformOptimization && formData.platforms.length > 0) {
      prompt += `

### 🌐 **Optimización por Plataforma**
Adapta el contenido para: ${formData.platforms.join(", ")}
- Ajusta formato, longitud y tono según la plataforma
- Utiliza hashtags y menciones apropiadas
- Optimiza para algoritmos específicos de cada red`
    }

    if (formData.customInstructions) {
      prompt += `

## **INSTRUCCIONES PERSONALIZADAS**
${formData.customInstructions}`
    }

    prompt += `

## **DIRECTRICES GENERALES**
- **Originalidad**: Crea contenido único y auténtico
- **Engagement**: Fomenta la interacción y participación
- **Consistencia**: Mantén coherencia con la voz de marca
- **Valor**: Proporciona información útil y relevante
- **Adaptabilidad**: Ajusta el contenido según feedback y métricas

## **FORMATO DE ENTREGA**
Para cada pieza de contenido, proporciona:
1. **Título/Headline** optimizado
2. **Contenido principal** estructurado
3. **Call-to-action** específico
4. **Hashtags/Keywords** relevantes
5. **Sugerencias visuales** (si aplica)
6. **Métricas a monitorear**`

    return prompt
  }

  const handleSave = () => {
    const prompt = generatePrompt()
    onSave({ ...formData, prompt })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Creador de Contenido</h1>
        </div>
      </div>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configuration">Configuración</TabsTrigger>
          <TabsTrigger value="preview">Vista Previa</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Básica del Creador</CardTitle>
              <CardDescription>Define el perfil y características principales de tu agente creador.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nombre del agente *</Label>
                <Input
                  id="agentName"
                  placeholder="Ej: CreativeBot Pro"
                  value={formData.agentName}
                  onChange={(e) => updateFormData("agentName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipos de contenido *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["Blog posts", "Redes sociales", "Newsletters", "Videos", "Podcasts", "Infografías"].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={type}
                        checked={formData.contentTypes.includes(type)}
                        onChange={() => toggleArrayItem("contentTypes", type)}
                        className="rounded"
                      />
                      <Label htmlFor={type} className="text-sm">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Audiencia objetivo *</Label>
                <Input
                  id="targetAudience"
                  placeholder="Ej: Profesionales de marketing, emprendedores, millennials"
                  value={formData.targetAudience}
                  onChange={(e) => updateFormData("targetAudience", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="writingStyle">Estilo de escritura *</Label>
                  <Select
                    value={formData.writingStyle}
                    onValueChange={(value) => updateFormData("writingStyle", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estilo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversacional">Conversacional</SelectItem>
                      <SelectItem value="profesional">Profesional</SelectItem>
                      <SelectItem value="educativo">Educativo</SelectItem>
                      <SelectItem value="inspiracional">Inspiracional</SelectItem>
                      <SelectItem value="humoristico">Humorístico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandVoice">Voz de marca *</Label>
                  <Input
                    id="brandVoice"
                    placeholder="Ej: Amigable, experta, innovadora"
                    value={formData.brandVoice}
                    onChange={(e) => updateFormData("brandVoice", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentGoals">Objetivos del contenido *</Label>
                <Textarea
                  id="contentGoals"
                  placeholder="Ej: Educar a la audiencia, generar leads, aumentar engagement..."
                  value={formData.contentGoals}
                  onChange={(e) => updateFormData("contentGoals", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capacidades Avanzadas</CardTitle>
              <CardDescription>Activa funcionalidades especializadas para tu creador de contenido.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Investigación */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeResearch"
                    checked={formData.includeResearch}
                    onCheckedChange={(checked) => updateFormData("includeResearch", checked)}
                  />
                  <Label htmlFor="includeResearch" className="font-medium">
                    Incluir Investigación y Análisis
                  </Label>
                </div>
                {formData.includeResearch && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="researchSources" className="text-sm">
                      Fuentes de investigación
                    </Label>
                    <Textarea
                      id="researchSources"
                      placeholder="Estudios académicos, informes de industria, encuestas..."
                      value={formData.researchSources}
                      onChange={(e) => updateFormData("researchSources", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* SEO */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeSEO"
                    checked={formData.includeSEO}
                    onCheckedChange={(checked) => updateFormData("includeSEO", checked)}
                  />
                  <Label htmlFor="includeSEO" className="font-medium">
                    Optimización SEO
                  </Label>
                </div>
                {formData.includeSEO && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="seoKeywords" className="text-sm">
                      Palabras clave principales
                    </Label>
                    <Input
                      id="seoKeywords"
                      placeholder="marketing digital, SEO, contenido viral..."
                      value={formData.seoKeywords}
                      onChange={(e) => updateFormData("seoKeywords", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Elementos Visuales */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeVisuals"
                    checked={formData.includeVisuals}
                    onCheckedChange={(checked) => updateFormData("includeVisuals", checked)}
                  />
                  <Label htmlFor="includeVisuals" className="font-medium">
                    Sugerencias de Elementos Visuales
                  </Label>
                </div>
                {formData.includeVisuals && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="visualStyle" className="text-sm">
                      Estilo visual preferido
                    </Label>
                    <Input
                      id="visualStyle"
                      placeholder="Minimalista, colorido, profesional, moderno..."
                      value={formData.visualStyle}
                      onChange={(e) => updateFormData("visualStyle", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Planificación */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeScheduling"
                    checked={formData.includeScheduling}
                    onCheckedChange={(checked) => updateFormData("includeScheduling", checked)}
                  />
                  <Label htmlFor="includeScheduling" className="font-medium">
                    Planificación de Contenido
                  </Label>
                </div>
                {formData.includeScheduling && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="postingFrequency" className="text-sm">
                      Frecuencia de publicación
                    </Label>
                    <Select
                      value={formData.postingFrequency}
                      onValueChange={(value) => updateFormData("postingFrequency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona frecuencia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Diaria</SelectItem>
                        <SelectItem value="3-veces-semana">3 veces por semana</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quincenal">Quincenal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Optimización por Plataforma */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="platformOptimization"
                    checked={formData.platformOptimization}
                    onCheckedChange={(checked) => updateFormData("platformOptimization", checked)}
                  />
                  <Label htmlFor="platformOptimization" className="font-medium">
                    Optimización por Plataforma
                  </Label>
                </div>
                {formData.platformOptimization && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm">Plataformas objetivo</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Instagram", "LinkedIn", "Twitter", "Facebook", "TikTok", "YouTube"].map((platform) => (
                        <div key={platform} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={platform}
                            checked={formData.platforms.includes(platform)}
                            onChange={() => toggleArrayItem("platforms", platform)}
                            className="rounded"
                          />
                          <Label htmlFor={platform} className="text-sm">
                            {platform}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customInstructions" className="font-medium">
                  Instrucciones personalizadas (opcional)
                </Label>
                <Textarea
                  id="customInstructions"
                  placeholder="Instrucciones específicas, restricciones, preferencias adicionales..."
                  value={formData.customInstructions}
                  onChange={(e) => updateFormData("customInstructions", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Crear Agente Creador
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Prompt</CardTitle>
              <CardDescription>Así se verá el prompt generado para tu agente creador de contenido.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{generatePrompt()}</ReactMarkdown>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
