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
import { ArrowLeft, BarChart3 } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface DataAnalystFormData {
  agentName: string
  dataTypes: string[]
  analysisGoals: string
  businessContext: string
  stakeholders: string
  includeDataCleaning: boolean
  cleaningMethods: string
  includeStatisticalAnalysis: boolean
  statisticalMethods: string
  includeVisualization: boolean
  chartTypes: string
  includeReporting: boolean
  reportFormat: string
  reportFrequency: string
  includePredictiveAnalysis: boolean
  predictionMethods: string
  includeDataValidation: boolean
  validationCriteria: string
  includeInsights: boolean
  insightTypes: string
  customInstructions: string
}

interface DataAnalystTemplateProps {
  onBack: () => void
  onSave: (data: DataAnalystFormData & { prompt: string }) => void
}

export default function DataAnalystTemplate({ onBack, onSave }: DataAnalystTemplateProps) {
  const [formData, setFormData] = useState<DataAnalystFormData>({
    agentName: "",
    dataTypes: [],
    analysisGoals: "",
    businessContext: "",
    stakeholders: "",
    includeDataCleaning: false,
    cleaningMethods: "",
    includeStatisticalAnalysis: false,
    statisticalMethods: "",
    includeVisualization: false,
    chartTypes: "",
    includeReporting: false,
    reportFormat: "",
    reportFrequency: "",
    includePredictiveAnalysis: false,
    predictionMethods: "",
    includeDataValidation: false,
    validationCriteria: "",
    includeInsights: false,
    insightTypes: "",
    customInstructions: "",
  })

  const updateFormData = (field: keyof DataAnalystFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: keyof DataAnalystFormData, item: string) => {
    const currentArray = formData[field] as string[]
    const newArray = currentArray.includes(item) ? currentArray.filter((i) => i !== item) : [...currentArray, item]
    updateFormData(field, newArray)
  }

  const generatePrompt = () => {
    let prompt = `# ${formData.agentName || "[Nombre del Agente]"} - Analista de Datos Especializado

Eres un analista de datos experto con amplia experiencia en análisis estadístico, visualización y generación de insights accionables.

## **PERFIL DEL ANALISTA**
- **Tipos de datos**: ${formData.dataTypes.length > 0 ? formData.dataTypes.join(", ") : "[Tipos de datos]"}
- **Objetivos de análisis**: ${formData.analysisGoals || "[Objetivos específicos]"}
- **Contexto empresarial**: ${formData.businessContext || "[Contexto del negocio]"}
- **Stakeholders**: ${formData.stakeholders || "[Usuarios de los análisis]"}

## **METODOLOGÍA DE ANÁLISIS**`

    if (formData.includeDataCleaning) {
      prompt += `

### 🧹 **Limpieza y Preparación de Datos**
- Identifica y corrige inconsistencias en los datos
- **Métodos de limpieza**: ${formData.cleaningMethods || "Eliminación de duplicados, tratamiento de valores nulos, normalización"}
- Valida integridad y calidad de datos
- Documenta transformaciones realizadas
- Establece pipelines de procesamiento
- Mantiene trazabilidad de cambios`
    }

    if (formData.includeStatisticalAnalysis) {
      prompt += `

### 📊 **Análisis Estadístico**
- Aplica técnicas estadísticas apropiadas
- **Métodos estadísticos**: ${formData.statisticalMethods || "Descriptiva, correlación, regresión, pruebas de hipótesis"}
- Calcula métricas de tendencia central y dispersión
- Identifica patrones y anomalías
- Realiza análisis de segmentación
- Interpreta significancia estadística`
    }

    if (formData.includeVisualization) {
      prompt += `

### 📈 **Visualización de Datos**
- Crea visualizaciones claras y efectivas
- **Tipos de gráficos**: ${formData.chartTypes || "Barras, líneas, scatter plots, heatmaps, dashboards"}
- Selecciona el tipo de gráfico apropiado para cada dato
- Aplica principios de diseño visual
- Crea dashboards interactivos
- Adapta visualizaciones a la audiencia`
    }

    if (formData.includeReporting) {
      prompt += `

### 📋 **Reportes y Documentación**
- **Formato de reportes**: ${formData.reportFormat || "Ejecutivo, técnico, presentaciones"}
- **Frecuencia**: ${formData.reportFrequency || "Semanal"}
- Estructura hallazgos de forma clara
- Incluye metodología y limitaciones
- Proporciona recomendaciones accionables
- Adapta lenguaje a la audiencia objetivo`
    }

    if (formData.includePredictiveAnalysis) {
      prompt += `

### 🔮 **Análisis Predictivo**
- Desarrolla modelos predictivos
- **Métodos de predicción**: ${formData.predictionMethods || "Regresión, series temporales, machine learning"}
- Evalúa precisión de modelos
- Identifica variables predictoras clave
- Proporciona intervalos de confianza
- Actualiza modelos con nuevos datos`
    }

    if (formData.includeDataValidation) {
      prompt += `

### ✅ **Validación de Datos**
- Implementa controles de calidad
- **Criterios de validación**: ${formData.validationCriteria || "Completitud, consistencia, precisión, actualidad"}
- Detecta outliers y anomalías
- Verifica coherencia entre fuentes
- Establece alertas de calidad
- Documenta issues encontrados`
    }

    if (formData.includeInsights) {
      prompt += `

### 💡 **Generación de Insights**
- Extrae insights accionables de los datos
- **Tipos de insights**: ${formData.insightTypes || "Tendencias, oportunidades, riesgos, optimizaciones"}
- Conecta hallazgos con objetivos de negocio
- Prioriza insights por impacto
- Propone acciones específicas
- Cuantifica impacto potencial`
    }

    if (formData.customInstructions) {
      prompt += `

## **INSTRUCCIONES PERSONALIZADAS**
${formData.customInstructions}`
    }

    prompt += `

## **PRINCIPIOS DE ANÁLISIS**
1. **Objetividad**: Mantén neutralidad en el análisis
2. **Rigor**: Aplica metodología científica
3. **Claridad**: Comunica hallazgos de forma comprensible
4. **Relevancia**: Enfócate en insights accionables
5. **Transparencia**: Documenta limitaciones y supuestos
6. **Ética**: Respeta privacidad y confidencialidad

## **PROCESO DE TRABAJO**
1. **Definición**: Clarifica objetivos y preguntas de negocio
2. **Recolección**: Identifica y obtiene fuentes de datos
3. **Preparación**: Limpia y transforma datos
4. **Exploración**: Realiza análisis exploratorio
5. **Análisis**: Aplica técnicas estadísticas apropiadas
6. **Visualización**: Crea gráficos y dashboards
7. **Interpretación**: Extrae insights y conclusiones
8. **Comunicación**: Presenta hallazgos y recomendaciones

## **HERRAMIENTAS Y TÉCNICAS**
- **Estadística descriptiva**: Media, mediana, desviación estándar
- **Análisis de correlación**: Pearson, Spearman, análisis de covarianza
- **Pruebas de hipótesis**: t-test, chi-cuadrado, ANOVA
- **Análisis de regresión**: Lineal, logística, múltiple
- **Análisis de series temporales**: Tendencias, estacionalidad, forecasting
- **Segmentación**: Clustering, análisis de cohortes
- **A/B Testing**: Diseño experimental y análisis de resultados

## **COMUNICACIÓN DE RESULTADOS**
- Estructura presentaciones con narrativa clara
- Usa visualizaciones para apoyar argumentos
- Proporciona contexto y significado empresarial
- Incluye limitaciones y nivel de confianza
- Sugiere próximos pasos y análisis adicionales
- Adapta nivel técnico a la audiencia`

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
          <BarChart3 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Analista de Datos</h1>
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
              <CardTitle>Perfil del Analista</CardTitle>
              <CardDescription>Define el contexto y objetivos de tu analista de datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nombre del agente *</Label>
                <Input
                  id="agentName"
                  placeholder="Ej: DataBot Analyst"
                  value={formData.agentName}
                  onChange={(e) => updateFormData("agentName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipos de datos *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Ventas",
                    "Marketing",
                    "Financieros",
                    "Operacionales",
                    "Web Analytics",
                    "Encuestas",
                    "IoT",
                    "Redes Sociales",
                  ].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={type}
                        checked={formData.dataTypes.includes(type)}
                        onChange={() => toggleArrayItem("dataTypes", type)}
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
                <Label htmlFor="analysisGoals">Objetivos de análisis *</Label>
                <Textarea
                  id="analysisGoals"
                  placeholder="Ej: Optimizar conversión, identificar patrones de comportamiento, predecir demanda..."
                  value={formData.analysisGoals}
                  onChange={(e) => updateFormData("analysisGoals", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessContext">Contexto empresarial *</Label>
                <Textarea
                  id="businessContext"
                  placeholder="Describe el negocio, industria, desafíos principales..."
                  value={formData.businessContext}
                  onChange={(e) => updateFormData("businessContext", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stakeholders">Stakeholders *</Label>
                <Input
                  id="stakeholders"
                  placeholder="Ej: Equipo de marketing, gerencia, producto..."
                  value={formData.stakeholders}
                  onChange={(e) => updateFormData("stakeholders", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capacidades de Análisis</CardTitle>
              <CardDescription>Configura las funcionalidades específicas de análisis de datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Limpieza de Datos */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeDataCleaning"
                    checked={formData.includeDataCleaning}
                    onCheckedChange={(checked) => updateFormData("includeDataCleaning", checked)}
                  />
                  <Label htmlFor="includeDataCleaning" className="font-medium">
                    Limpieza y Preparación de Datos
                  </Label>
                </div>
                {formData.includeDataCleaning && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="cleaningMethods" className="text-sm">
                      Métodos de limpieza
                    </Label>
                    <Textarea
                      id="cleaningMethods"
                      placeholder="Eliminación de duplicados, tratamiento de valores nulos, normalización..."
                      value={formData.cleaningMethods}
                      onChange={(e) => updateFormData("cleaningMethods", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Análisis Estadístico */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeStatisticalAnalysis"
                    checked={formData.includeStatisticalAnalysis}
                    onCheckedChange={(checked) => updateFormData("includeStatisticalAnalysis", checked)}
                  />
                  <Label htmlFor="includeStatisticalAnalysis" className="font-medium">
                    Análisis Estadístico
                  </Label>
                </div>
                {formData.includeStatisticalAnalysis && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="statisticalMethods" className="text-sm">
                      Métodos estadísticos
                    </Label>
                    <Input
                      id="statisticalMethods"
                      placeholder="Descriptiva, correlación, regresión, pruebas de hipótesis..."
                      value={formData.statisticalMethods}
                      onChange={(e) => updateFormData("statisticalMethods", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Visualización */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeVisualization"
                    checked={formData.includeVisualization}
                    onCheckedChange={(checked) => updateFormData("includeVisualization", checked)}
                  />
                  <Label htmlFor="includeVisualization" className="font-medium">
                    Visualización de Datos
                  </Label>
                </div>
                {formData.includeVisualization && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="chartTypes" className="text-sm">
                      Tipos de gráficos
                    </Label>
                    <Input
                      id="chartTypes"
                      placeholder="Barras, líneas, scatter plots, heatmaps, dashboards..."
                      value={formData.chartTypes}
                      onChange={(e) => updateFormData("chartTypes", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Reportes */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeReporting"
                    checked={formData.includeReporting}
                    onCheckedChange={(checked) => updateFormData("includeReporting", checked)}
                  />
                  <Label htmlFor="includeReporting" className="font-medium">
                    Reportes y Documentación
                  </Label>
                </div>
                {formData.includeReporting && (
                  <div className="ml-6 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="reportFormat" className="text-sm">
                        Formato de reportes
                      </Label>
                      <Select
                        value={formData.reportFormat}
                        onValueChange={(value) => updateFormData("reportFormat", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona formato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ejecutivo">Ejecutivo</SelectItem>
                          <SelectItem value="tecnico">Técnico</SelectItem>
                          <SelectItem value="presentacion">Presentación</SelectItem>
                          <SelectItem value="dashboard">Dashboard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reportFrequency" className="text-sm">
                        Frecuencia de reportes
                      </Label>
                      <Select
                        value={formData.reportFrequency}
                        onValueChange={(value) => updateFormData("reportFrequency", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona frecuencia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diaria">Diaria</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="mensual">Mensual</SelectItem>
                          <SelectItem value="trimestral">Trimestral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Análisis Predictivo */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includePredictiveAnalysis"
                    checked={formData.includePredictiveAnalysis}
                    onCheckedChange={(checked) => updateFormData("includePredictiveAnalysis", checked)}
                  />
                  <Label htmlFor="includePredictiveAnalysis" className="font-medium">
                    Análisis Predictivo
                  </Label>
                </div>
                {formData.includePredictiveAnalysis && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="predictionMethods" className="text-sm">
                      Métodos de predicción
                    </Label>
                    <Input
                      id="predictionMethods"
                      placeholder="Regresión, series temporales, machine learning..."
                      value={formData.predictionMethods}
                      onChange={(e) => updateFormData("predictionMethods", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Validación de Datos */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeDataValidation"
                    checked={formData.includeDataValidation}
                    onCheckedChange={(checked) => updateFormData("includeDataValidation", checked)}
                  />
                  <Label htmlFor="includeDataValidation" className="font-medium">
                    Validación de Datos
                  </Label>
                </div>
                {formData.includeDataValidation && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="validationCriteria" className="text-sm">
                      Criterios de validación
                    </Label>
                    <Input
                      id="validationCriteria"
                      placeholder="Completitud, consistencia, precisión, actualidad..."
                      value={formData.validationCriteria}
                      onChange={(e) => updateFormData("validationCriteria", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Generación de Insights */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeInsights"
                    checked={formData.includeInsights}
                    onCheckedChange={(checked) => updateFormData("includeInsights", checked)}
                  />
                  <Label htmlFor="includeInsights" className="font-medium">
                    Generación de Insights
                  </Label>
                </div>
                {formData.includeInsights && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="insightTypes" className="text-sm">
                      Tipos de insights
                    </Label>
                    <Input
                      id="insightTypes"
                      placeholder="Tendencias, oportunidades, riesgos, optimizaciones..."
                      value={formData.insightTypes}
                      onChange={(e) => updateFormData("insightTypes", e.target.value)}
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
                  placeholder="Herramientas específicas, metodologías particulares, restricciones..."
                  value={formData.customInstructions}
                  onChange={(e) => updateFormData("customInstructions", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Crear Analista de Datos
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Prompt</CardTitle>
              <CardDescription>Así se verá el prompt generado para tu analista de datos.</CardDescription>
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
