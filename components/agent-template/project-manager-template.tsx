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
import { ArrowLeft, Briefcase } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface ProjectManagerFormData {
  agentName: string
  projectType: string
  methodology: string
  teamSize: string
  projectDuration: string
  stakeholders: string
  includeTaskManagement: boolean
  taskCategories: string
  includeRiskManagement: boolean
  riskTypes: string
  includeResourcePlanning: boolean
  resourceTypes: string
  includeTimeTracking: boolean
  timeTrackingMethod: string
  includeBudgetControl: boolean
  budgetCategories: string
  includeQualityAssurance: boolean
  qualityStandards: string
  includeReporting: boolean
  reportingFrequency: string
  reportingStakeholders: string
  customInstructions: string
}

interface ProjectManagerTemplateProps {
  onBack: () => void
  onSave: (data: ProjectManagerFormData & { prompt: string }) => void
}

export default function ProjectManagerTemplate({ onBack, onSave }: ProjectManagerTemplateProps) {
  const [formData, setFormData] = useState<ProjectManagerFormData>({
    agentName: "",
    projectType: "",
    methodology: "",
    teamSize: "",
    projectDuration: "",
    stakeholders: "",
    includeTaskManagement: false,
    taskCategories: "",
    includeRiskManagement: false,
    riskTypes: "",
    includeResourcePlanning: false,
    resourceTypes: "",
    includeTimeTracking: false,
    timeTrackingMethod: "",
    includeBudgetControl: false,
    budgetCategories: "",
    includeQualityAssurance: false,
    qualityStandards: "",
    includeReporting: false,
    reportingFrequency: "",
    reportingStakeholders: "",
    customInstructions: "",
  })

  const updateFormData = (field: keyof ProjectManagerFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const generatePrompt = () => {
    let prompt = `# ${formData.agentName || "[Nombre del Agente]"} - Project Manager Especializado

Eres un Project Manager experto con amplia experiencia en la gestión de proyectos ${formData.projectType || "[tipo de proyecto]"}.

## **PERFIL DEL PROYECTO**
- **Tipo de proyecto**: ${formData.projectType || "[Tipo de proyecto]"}
- **Metodología**: ${formData.methodology || "[Metodología de gestión]"}
- **Tamaño del equipo**: ${formData.teamSize || "[Número de miembros]"}
- **Duración estimada**: ${formData.projectDuration || "[Duración del proyecto]"}
- **Stakeholders clave**: ${formData.stakeholders || "[Stakeholders principales]"}

## **RESPONSABILIDADES PRINCIPALES**`

    if (formData.includeTaskManagement) {
      prompt += `

### 📋 **Gestión de Tareas**
- Descompone proyectos en tareas manejables
- **Categorías de tareas**: ${formData.taskCategories || "Desarrollo, Testing, Documentación, Revisión"}
- Asigna responsables y fechas límite
- Monitorea progreso y dependencias
- Identifica y resuelve bloqueos
- Mantiene backlog priorizado`
    }

    if (formData.includeRiskManagement) {
      prompt += `

### ⚠️ **Gestión de Riesgos**
- Identifica riesgos potenciales proactivamente
- **Tipos de riesgo**: ${formData.riskTypes || "Técnicos, de recursos, de cronograma, de calidad"}
- Evalúa probabilidad e impacto
- Desarrolla planes de mitigación
- Monitorea indicadores de riesgo
- Comunica riesgos a stakeholders`
    }

    if (formData.includeResourcePlanning) {
      prompt += `

### 👥 **Planificación de Recursos**
- Planifica asignación de recursos
- **Tipos de recursos**: ${formData.resourceTypes || "Humanos, tecnológicos, financieros"}
- Optimiza utilización del equipo
- Identifica necesidades de capacitación
- Gestiona conflictos de recursos
- Planifica escalabilidad del equipo`
    }

    if (formData.includeTimeTracking) {
      prompt += `

### ⏱️ **Control de Tiempo**
- Monitorea tiempo dedicado a tareas
- **Método de seguimiento**: ${formData.timeTrackingMethod || "Timeboxing y sprints"}
- Identifica desviaciones del cronograma
- Ajusta planificación según progreso real
- Optimiza estimaciones futuras
- Reporta métricas de productividad`
    }

    if (formData.includeBudgetControl) {
      prompt += `

### 💰 **Control Presupuestario**
- Monitorea gastos del proyecto
- **Categorías presupuestarias**: ${formData.budgetCategories || "Personal, tecnología, infraestructura"}
- Controla desviaciones presupuestarias
- Aprueba gastos según autorización
- Proyecta costos futuros
- Optimiza uso de recursos financieros`
    }

    if (formData.includeQualityAssurance) {
      prompt += `

### ✅ **Aseguramiento de Calidad**
- Define estándares de calidad
- **Estándares aplicables**: ${formData.qualityStandards || "ISO, CMMI, mejores prácticas de industria"}
- Implementa procesos de revisión
- Coordina testing y validación
- Gestiona feedback y mejoras
- Asegura entregables de calidad`
    }

    if (formData.includeReporting) {
      prompt += `

### 📊 **Reportes y Comunicación**
- **Frecuencia de reportes**: ${formData.reportingFrequency || "Semanal"}
- **Audiencia**: ${formData.reportingStakeholders || "Equipo, management, cliente"}
- Prepara dashboards de progreso
- Comunica estado y métricas clave
- Facilita reuniones de seguimiento
- Documenta decisiones importantes`
    }

    if (formData.customInstructions) {
      prompt += `

## **INSTRUCCIONES PERSONALIZADAS**
${formData.customInstructions}`
    }

    prompt += `

## **METODOLOGÍA DE TRABAJO**
1. **Planificación**: Define objetivos, alcance y cronograma
2. **Organización**: Estructura equipo y recursos
3. **Ejecución**: Coordina actividades y monitorea progreso
4. **Control**: Gestiona cambios y desviaciones
5. **Cierre**: Evalúa resultados y documenta lecciones

## **PRINCIPIOS DE GESTIÓN**
- **Comunicación Clara**: Mantén a todos informados
- **Transparencia**: Comparte progreso y obstáculos
- **Adaptabilidad**: Ajusta planes según necesidades
- **Liderazgo**: Motiva y guía al equipo
- **Orientación a Resultados**: Enfócate en entregables
- **Mejora Continua**: Aprende de cada proyecto

## **HERRAMIENTAS Y TÉCNICAS**
- Diagramas de Gantt y cronogramas
- Matrices de responsabilidades (RACI)
- Análisis de valor ganado (EVM)
- Técnicas de estimación (Planning Poker, etc.)
- Retrospectivas y lecciones aprendidas
- Gestión de cambios estructurada

## **COMUNICACIÓN EFECTIVA**
- Adapta el mensaje a la audiencia
- Usa visualizaciones para claridad
- Documenta decisiones importantes
- Facilita colaboración entre equipos
- Resuelve conflictos constructivamente
- Mantén canales de comunicación abiertos`

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
          <Briefcase className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Project Manager</h1>
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
              <CardTitle>Perfil del Proyecto</CardTitle>
              <CardDescription>Define las características principales del proyecto que gestionarás.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nombre del agente *</Label>
                <Input
                  id="agentName"
                  placeholder="Ej: ProjectBot Manager"
                  value={formData.agentName}
                  onChange={(e) => updateFormData("agentName", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectType">Tipo de proyecto *</Label>
                  <Select value={formData.projectType} onValueChange={(value) => updateFormData("projectType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desarrollo-software">Desarrollo de Software</SelectItem>
                      <SelectItem value="implementacion-sistema">Implementación de Sistema</SelectItem>
                      <SelectItem value="marketing-digital">Marketing Digital</SelectItem>
                      <SelectItem value="construccion">Construcción</SelectItem>
                      <SelectItem value="investigacion">Investigación</SelectItem>
                      <SelectItem value="consultoria">Consultoría</SelectItem>
                      <SelectItem value="evento">Organización de Eventos</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="methodology">Metodología *</Label>
                  <Select value={formData.methodology} onValueChange={(value) => updateFormData("methodology", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona metodología" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agile-scrum">Agile/Scrum</SelectItem>
                      <SelectItem value="kanban">Kanban</SelectItem>
                      <SelectItem value="waterfall">Waterfall</SelectItem>
                      <SelectItem value="lean">Lean</SelectItem>
                      <SelectItem value="prince2">PRINCE2</SelectItem>
                      <SelectItem value="hibrida">Híbrida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teamSize">Tamaño del equipo *</Label>
                  <Input
                    id="teamSize"
                    placeholder="Ej: 5-8 personas"
                    value={formData.teamSize}
                    onChange={(e) => updateFormData("teamSize", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectDuration">Duración del proyecto *</Label>
                  <Input
                    id="projectDuration"
                    placeholder="Ej: 6 meses"
                    value={formData.projectDuration}
                    onChange={(e) => updateFormData("projectDuration", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stakeholders">Stakeholders principales *</Label>
                <Textarea
                  id="stakeholders"
                  placeholder="Cliente, sponsor, usuarios finales, equipo técnico..."
                  value={formData.stakeholders}
                  onChange={(e) => updateFormData("stakeholders", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capacidades de Gestión</CardTitle>
              <CardDescription>Activa las funcionalidades específicas que necesitas para tu proyecto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gestión de Tareas */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeTaskManagement"
                    checked={formData.includeTaskManagement}
                    onCheckedChange={(checked) => updateFormData("includeTaskManagement", checked)}
                  />
                  <Label htmlFor="includeTaskManagement" className="font-medium">
                    Gestión de Tareas
                  </Label>
                </div>
                {formData.includeTaskManagement && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="taskCategories" className="text-sm">
                      Categorías de tareas
                    </Label>
                    <Input
                      id="taskCategories"
                      placeholder="Desarrollo, Testing, Documentación, Revisión..."
                      value={formData.taskCategories}
                      onChange={(e) => updateFormData("taskCategories", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Gestión de Riesgos */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeRiskManagement"
                    checked={formData.includeRiskManagement}
                    onCheckedChange={(checked) => updateFormData("includeRiskManagement", checked)}
                  />
                  <Label htmlFor="includeRiskManagement" className="font-medium">
                    Gestión de Riesgos
                  </Label>
                </div>
                {formData.includeRiskManagement && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="riskTypes" className="text-sm">
                      Tipos de riesgo
                    </Label>
                    <Input
                      id="riskTypes"
                      placeholder="Técnicos, de recursos, de cronograma, de calidad..."
                      value={formData.riskTypes}
                      onChange={(e) => updateFormData("riskTypes", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Planificación de Recursos */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeResourcePlanning"
                    checked={formData.includeResourcePlanning}
                    onCheckedChange={(checked) => updateFormData("includeResourcePlanning", checked)}
                  />
                  <Label htmlFor="includeResourcePlanning" className="font-medium">
                    Planificación de Recursos
                  </Label>
                </div>
                {formData.includeResourcePlanning && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="resourceTypes" className="text-sm">
                      Tipos de recursos
                    </Label>
                    <Input
                      id="resourceTypes"
                      placeholder="Humanos, tecnológicos, financieros..."
                      value={formData.resourceTypes}
                      onChange={(e) => updateFormData("resourceTypes", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Control de Tiempo */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeTimeTracking"
                    checked={formData.includeTimeTracking}
                    onCheckedChange={(checked) => updateFormData("includeTimeTracking", checked)}
                  />
                  <Label htmlFor="includeTimeTracking" className="font-medium">
                    Control de Tiempo
                  </Label>
                </div>
                {formData.includeTimeTracking && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="timeTrackingMethod" className="text-sm">
                      Método de seguimiento
                    </Label>
                    <Input
                      id="timeTrackingMethod"
                      placeholder="Timeboxing, sprints, horas registradas..."
                      value={formData.timeTrackingMethod}
                      onChange={(e) => updateFormData("timeTrackingMethod", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Control Presupuestario */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeBudgetControl"
                    checked={formData.includeBudgetControl}
                    onCheckedChange={(checked) => updateFormData("includeBudgetControl", checked)}
                  />
                  <Label htmlFor="includeBudgetControl" className="font-medium">
                    Control Presupuestario
                  </Label>
                </div>
                {formData.includeBudgetControl && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="budgetCategories" className="text-sm">
                      Categorías presupuestarias
                    </Label>
                    <Input
                      id="budgetCategories"
                      placeholder="Personal, tecnología, infraestructura..."
                      value={formData.budgetCategories}
                      onChange={(e) => updateFormData("budgetCategories", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Aseguramiento de Calidad */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeQualityAssurance"
                    checked={formData.includeQualityAssurance}
                    onCheckedChange={(checked) => updateFormData("includeQualityAssurance", checked)}
                  />
                  <Label htmlFor="includeQualityAssurance" className="font-medium">
                    Aseguramiento de Calidad
                  </Label>
                </div>
                {formData.includeQualityAssurance && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor="qualityStandards" className="text-sm">
                      Estándares de calidad
                    </Label>
                    <Input
                      id="qualityStandards"
                      placeholder="ISO, CMMI, mejores prácticas..."
                      value={formData.qualityStandards}
                      onChange={(e) => updateFormData("qualityStandards", e.target.value)}
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
                    Reportes y Comunicación
                  </Label>
                </div>
                {formData.includeReporting && (
                  <div className="ml-6 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="reportingFrequency" className="text-sm">
                        Frecuencia de reportes
                      </Label>
                      <Select
                        value={formData.reportingFrequency}
                        onValueChange={(value) => updateFormData("reportingFrequency", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona frecuencia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diaria">Diaria</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="quincenal">Quincenal</SelectItem>
                          <SelectItem value="mensual">Mensual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reportingStakeholders" className="text-sm">
                        Audiencia de reportes
                      </Label>
                      <Input
                        id="reportingStakeholders"
                        placeholder="Equipo, management, cliente..."
                        value={formData.reportingStakeholders}
                        onChange={(e) => updateFormData("reportingStakeholders", e.target.value)}
                      />
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
                  placeholder="Procesos específicos, herramientas particulares, políticas de empresa..."
                  value={formData.customInstructions}
                  onChange={(e) => updateFormData("customInstructions", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Crear Project Manager
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Prompt</CardTitle>
              <CardDescription>Así se verá el prompt generado para tu Project Manager.</CardDescription>
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
