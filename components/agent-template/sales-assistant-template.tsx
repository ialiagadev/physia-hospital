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
import { ArrowLeft, TrendingUp } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface SalesAssistantFormData {
  agentName: string
  industry: string
  products: string
  salesProcess: string
  targetCustomer: string
  salesGoals: string
  includeLeadQualification: boolean
  qualificationCriteria: string
  includeObjectionHandling: boolean
  commonObjections: string
  includeFollowUp: boolean
  followUpSchedule: string
  includePricing: boolean
  pricingStrategy: string
  discountLimits: string
  includeCompetitorAnalysis: boolean
  competitors: string
  includeReporting: boolean
  kpiMetrics: string
  customInstructions: string
}

interface SalesAssistantTemplateProps {
  onBack: () => void
  onSave: (data: SalesAssistantFormData & { prompt: string }) => void
}

export default function SalesAssistantTemplate({ onBack, onSave }: SalesAssistantTemplateProps) {
  const [formData, setFormData] = useState<SalesAssistantFormData>({
    agentName: "",
    industry: "",
    products: "",
    salesProcess: "",
    targetCustomer: "",
    salesGoals: "",
    includeLeadQualification: false,
    qualificationCriteria: "",
    includeObjectionHandling: false,
    commonObjections: "",
    includeFollowUp: false,
    followUpSchedule: "",
    includePricing: false,
    pricingStrategy: "",
    discountLimits: "",
    includeCompetitorAnalysis: false,
    competitors: "",
    includeReporting: false,
    kpiMetrics: "",
    customInstructions: "",
  })

  const updateFormData = (field: keyof SalesAssistantFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const generatePrompt = () => {
    let prompt = `# ${formData.agentName || "[Nombre del Agente]"} - Asistente de Ventas Especializado

Eres un experto asistente de ventas con amplia experiencia en ${formData.industry || "[Industria]"}.

## **PERFIL COMERCIAL**
- **Industria**: ${formData.industry || "[Industria específica]"}
- **Productos/Servicios**: ${formData.products || "[Productos y servicios]"}
- **Proceso de ventas**: ${formData.salesProcess || "[Proceso de ventas]"}
- **Cliente objetivo**: ${formData.targetCustomer || "[Perfil del cliente ideal]"}

## **OBJETIVOS DE VENTAS**
${formData.salesGoals || "[Objetivos específicos de ventas]"}

## **METODOLOGÍA DE VENTAS**`

    if (formData.includeLeadQualification) {
      prompt += `

### 🎯 **Calificación de Leads**
- Evalúa cada prospecto según criterios específicos
- **Criterios de calificación**: ${formData.qualificationCriteria || "Presupuesto, autoridad, necesidad, tiempo (BANT)"}
- Clasifica leads como: Caliente, Tibio, Frío
- Prioriza seguimiento según puntuación de calificación
- Documenta información clave del prospecto`
    }

    if (formData.includeObjectionHandling) {
      prompt += `

### 💬 **Manejo de Objeciones**
- Identifica y responde a objeciones comunes
- **Objeciones frecuentes**: ${formData.commonObjections || "Precio, tiempo, competencia, necesidad"}
- Utiliza técnicas de escucha activa
- Convierte objeciones en oportunidades
- Mantén un enfoque consultivo y empático`
    }

    if (formData.includeFollowUp) {
      prompt += `

### 📅 **Seguimiento Sistemático**
- Programa seguimientos estratégicos
- **Cronograma**: ${formData.followUpSchedule || "Inmediato, 3 días, 1 semana, 2 semanas, 1 mes"}
- Personaliza mensajes según etapa del cliente
- Utiliza múltiples canales de comunicación
- Registra todas las interacciones`
    }

    if (formData.includePricing) {
      prompt += `

### 💰 **Estrategia de Precios**
- **Estrategia principal**: ${formData.pricingStrategy || "Valor agregado"}
- **Límites de descuento**: ${formData.discountLimits || "Máximo 15% sin aprobación"}
- Presenta valor antes que precio
- Ofrece opciones de pago flexibles
- Justifica inversión con ROI claro`
    }

    if (formData.includeCompetitorAnalysis) {
      prompt += `

### 🏆 **Análisis Competitivo**
- **Competidores principales**: ${formData.competitors || "[Competidores clave]"}
- Destaca ventajas diferenciales
- Conoce fortalezas y debilidades propias
- Responde comparaciones de forma profesional
- Enfócate en valor único de propuesta`
    }

    if (formData.includeReporting) {
      prompt += `

### 📊 **Seguimiento y Reportes**
- **KPIs principales**: ${formData.kpiMetrics || "Conversión, tiempo de ciclo, valor promedio"}
- Registra actividades de ventas
- Analiza patrones de comportamiento
- Identifica oportunidades de mejora
- Reporta progreso regularmente`
    }

    if (formData.customInstructions) {
      prompt += `

## **INSTRUCCIONES PERSONALIZADAS**
${formData.customInstructions}`
    }

    prompt += `

## **PRINCIPIOS DE VENTAS**
1. **Escucha Activa**: Comprende antes de ser comprendido
2. **Consulta**: Actúa como asesor, no como vendedor
3. **Valor**: Siempre comunica beneficios, no características
4. **Confianza**: Construye relaciones a largo plazo
5. **Persistencia**: Sigue up sin ser invasivo
6. **Ética**: Mantén integridad en todas las interacciones

## **PROCESO DE INTERACCIÓN**
1. **Saludo y Rapport**: Establece conexión personal
2. **Descubrimiento**: Identifica necesidades y dolor
3. **Presentación**: Muestra solución personalizada
4. **Manejo de Objeciones**: Aborda preocupaciones
5. **Cierre**: Solicita compromiso específico
6. **Seguimiento**: Mantén comunicación continua

## **COMUNICACIÓN EFECTIVA**
- Usa lenguaje claro y profesional
- Adapta el mensaje al perfil del cliente
- Incluye historias de éxito relevantes
- Proporciona pruebas sociales y testimonios
- Mantén un tono consultivo y empático`

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
          <TrendingUp className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Asistente de Ventas</h1>
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
              <CardTitle>Perfil del Asistente de Ventas</CardTitle>
              <CardDescription>
                Define las características comerciales y objetivos de tu agente de ventas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nombre del agente *</Label>
                <Input
                  id="agentName"
                  placeholder="Ej: SalesBot Pro"
                  value={formData.agentName}
                  onChange={(e) => updateFormData("agentName", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industria *</Label>
                  <Select value={formData.industry} onValueChange={(value) => updateFormData("industry", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona industria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tecnologia">Tecnología</SelectItem>
                      <SelectItem value="salud">Salud</SelectItem>
                      <SelectItem value="educacion">Educación</SelectItem>
                      <SelectItem value="finanzas">Finanzas</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="inmobiliaria">Inmobiliaria</SelectItem>
                      <SelectItem value="consultoria">Consultoría</SelectItem>
                      <SelectItem value="otra">Otra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesProcess">Proceso de ventas *</Label>
                  <Select
                    value={formData.salesProcess}
                    onValueChange={(value) => updateFormData("salesProcess", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="b2b-complejo">B2B Complejo</SelectItem>
                      <SelectItem value="b2b-simple">B2B Simple</SelectItem>
                      <SelectItem value="b2c-alto-valor">B2C Alto Valor</SelectItem>
                      <SelectItem value="b2c-transaccional">B2C Transaccional</SelectItem>
                      <SelectItem value="consultivo">Consultivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="products">Productos/Servicios *</Label>
                <Textarea
                  id="products"
                  placeholder="Describe los productos o servicios que vendes..."
                  value={formData.products}
                  onChange={(e) => updateFormData("products", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetCustomer">Cliente objetivo *</Label>
                <Textarea
                  id="targetCustomer"
                  placeholder="Describe tu cliente ideal: demografía, necesidades, comportamiento..."
                  value={formData.targetCustomer}
                  onChange={(e) => updateFormData("targetCustomer", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesGoals">Objetivos de ventas *</Label>
                <Textarea
                  id="salesGoals"
                  placeholder="Metas específicas: volumen, conversión, valor promedio..."
                  value={formData.salesGoals}
                  onChange={(e) => updateFormData("salesGoals", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metodología y Herramientas</CardTitle>
              <CardDescription>Configura las capacidades avanzadas de tu asistente de ventas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calificación de Leads */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeLeadQualification"
                    checked={formData.includeLeadQualification}
                    onCheckedChange={(checked) => updateFormData("includeLeadQualification", checked)}
                  />
                  <Label htmlFor="includeLeadQualification" className="font-medium">
                    Calificación de Leads
                  </Label>
                </div>
                {formData.includeLeadQualification && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="qualificationCriteria" className="text-sm">
                      Criterios de calificación
                    </Label>
                    <Textarea
                      id="qualificationCriteria"
                      placeholder="BANT (Budget, Authority, Need, Timeline), MEDDIC, etc."
                      value={formData.qualificationCriteria}
                      onChange={(e) => updateFormData("qualificationCriteria", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Manejo de Objeciones */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeObjectionHandling"
                    checked={formData.includeObjectionHandling}
                    onCheckedChange={(checked) => updateFormData("includeObjectionHandling", checked)}
                  />
                  <Label htmlFor="includeObjectionHandling" className="font-medium">
                    Manejo de Objeciones
                  </Label>
                </div>
                {formData.includeObjectionHandling && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="commonObjections" className="text-sm">
                      Objeciones comunes
                    </Label>
                    <Textarea
                      id="commonObjections"
                      placeholder="Es muy caro, no tengo tiempo, necesito pensarlo..."
                      value={formData.commonObjections}
                      onChange={(e) => updateFormData("commonObjections", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Seguimiento */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeFollowUp"
                    checked={formData.includeFollowUp}
                    onCheckedChange={(checked) => updateFormData("includeFollowUp", checked)}
                  />
                  <Label htmlFor="includeFollowUp" className="font-medium">
                    Sistema de Seguimiento
                  </Label>
                </div>
                {formData.includeFollowUp && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="followUpSchedule" className="text-sm">
                      Cronograma de seguimiento
                    </Label>
                    <Input
                      id="followUpSchedule"
                      placeholder="Inmediato, 3 días, 1 semana, 2 semanas..."
                      value={formData.followUpSchedule}
                      onChange={(e) => updateFormData("followUpSchedule", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Estrategia de Precios */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includePricing"
                    checked={formData.includePricing}
                    onCheckedChange={(checked) => updateFormData("includePricing", checked)}
                  />
                  <Label htmlFor="includePricing" className="font-medium">
                    Estrategia de Precios
                  </Label>
                </div>
                {formData.includePricing && (
                  <div className="ml-6 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="pricingStrategy" className="text-sm">
                        Estrategia principal
                      </Label>
                      <Input
                        id="pricingStrategy"
                        placeholder="Valor agregado, competitiva, premium..."
                        value={formData.pricingStrategy}
                        onChange={(e) => updateFormData("pricingStrategy", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discountLimits" className="text-sm">
                        Límites de descuento
                      </Label>
                      <Input
                        id="discountLimits"
                        placeholder="Máximo 15% sin aprobación gerencial"
                        value={formData.discountLimits}
                        onChange={(e) => updateFormData("discountLimits", e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Análisis Competitivo */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeCompetitorAnalysis"
                    checked={formData.includeCompetitorAnalysis}
                    onCheckedChange={(checked) => updateFormData("includeCompetitorAnalysis", checked)}
                  />
                  <Label htmlFor="includeCompetitorAnalysis" className="font-medium">
                    Análisis Competitivo
                  </Label>
                </div>
                {formData.includeCompetitorAnalysis && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="competitors" className="text-sm">
                      Competidores principales
                    </Label>
                    <Textarea
                      id="competitors"
                      placeholder="Lista los principales competidores y sus características..."
                      value={formData.competitors}
                      onChange={(e) => updateFormData("competitors", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Reportes y KPIs */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeReporting"
                    checked={formData.includeReporting}
                    onCheckedChange={(checked) => updateFormData("includeReporting", checked)}
                  />
                  <Label htmlFor="includeReporting" className="font-medium">
                    Seguimiento y Reportes
                  </Label>
                </div>
                {formData.includeReporting && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="kpiMetrics" className="text-sm">
                      KPIs principales
                    </Label>
                    <Input
                      id="kpiMetrics"
                      placeholder="Tasa de conversión, tiempo de ciclo, valor promedio..."
                      value={formData.kpiMetrics}
                      onChange={(e) => updateFormData("kpiMetrics", e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customInstructions" className="font-medium">
                  Instrucciones personalizadas (opcional)
                </Label>
                <Textarea
                  id="customInstructions"
                  placeholder="Scripts específicos, políticas de empresa, casos especiales..."
                  value={formData.customInstructions}
                  onChange={(e) => updateFormData("customInstructions", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Crear Asistente de Ventas
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Prompt</CardTitle>
              <CardDescription>Así se verá el prompt generado para tu asistente de ventas.</CardDescription>
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
