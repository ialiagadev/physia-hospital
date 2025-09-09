"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, User } from "lucide-react"

interface CustomerServiceFormData {
  agentName: string
  specialties: string
  communicationTone: string
  presentationMessage: string
  useEmojis: boolean
  includeSymptomEvaluation: boolean
  symptomQuestions: number
  includeAppointmentManagement: boolean
  morningSlots: number
  afternoonSlots: number
  includeClinicInfo: boolean
  clinicSchedule: string
  clinicLocation: string
  appointmentDuration: string
  patientTypes: string
  customInstructions: string
}

interface CustomerServiceTemplateProps {
  onBack: () => void
  onSave: (data: CustomerServiceFormData & { prompt: string }) => void
}

export default function CustomerServiceTemplate({ onBack, onSave }: CustomerServiceTemplateProps) {
  const [formData, setFormData] = useState<CustomerServiceFormData>({
    agentName: "",
    specialties: "",
    communicationTone: "",
    presentationMessage: "",
    useEmojis: false,
    includeSymptomEvaluation: false,
    symptomQuestions: 5,
    includeAppointmentManagement: false,
    morningSlots: 2,
    afternoonSlots: 2,
    includeClinicInfo: false,
    clinicSchedule: "",
    clinicLocation: "",
    appointmentDuration: "",
    patientTypes: "",
    customInstructions: "",
  })

  const updateFormData = (field: keyof CustomerServiceFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const generatePrompt = () => {
    let prompt = `Eres ${formData.agentName || "[Nombre del Agente]"}, un asistente de atención al cliente especializado en el sector de la salud.`

    if (formData.specialties) {
      prompt += `\n\nEspecialidades de la clínica: ${formData.specialties}`
    }

    if (formData.communicationTone) {
      prompt += `\n\nTono de comunicación: Mantén siempre un tono ${formData.communicationTone}.`
    }

    if (formData.presentationMessage) {
      prompt += `\n\nMensaje de presentación: "${formData.presentationMessage}"`
    }

    if (formData.useEmojis) {
      prompt += `\n\nUsa emoticonos apropiados para hacer la conversación más amigable.`
    }

    prompt += `\n\n## FUNCIONALIDADES:`

    if (formData.includeSymptomEvaluation) {
      prompt += `\n\n### 1. Evaluación de Síntomas
- Realiza una evaluación inicial de síntomas mediante ${formData.symptomQuestions} preguntas específicas
- Proporciona orientación general basada en las respuestas
- IMPORTANTE: Siempre recuerda que no sustituyes el diagnóstico médico profesional`
    }

    if (formData.includeAppointmentManagement) {
      prompt += `\n\n### 2. Gestión de Citas
- Ayuda a los pacientes a solicitar y gestionar citas
- Ofrece hasta ${formData.morningSlots} huecos disponibles en horario de mañana
- Ofrece hasta ${formData.afternoonSlots} huecos disponibles en horario de tarde
- Proporciona información sobre disponibilidad y proceso de reserva`
    }

    if (formData.includeClinicInfo) {
      prompt += `\n\n### 3. Información de la Clínica`

      if (formData.clinicSchedule) {
        prompt += `\n- Horario: ${formData.clinicSchedule}`
      }

      if (formData.clinicLocation) {
        prompt += `\n- Ubicación: ${formData.clinicLocation}`
      }

      if (formData.appointmentDuration) {
        prompt += `\n- Duración de las citas: ${formData.appointmentDuration}`
      }

      if (formData.patientTypes) {
        prompt += `\n- Tipo de pacientes: ${formData.patientTypes}`
      }
    }

    if (formData.customInstructions) {
      prompt += `\n\n### Instrucciones Adicionales:
${formData.customInstructions}`
    }

    prompt += `\n\n## DIRECTRICES GENERALES:
- Siempre mantén la confidencialidad del paciente
- Deriva a consulta presencial cuando sea necesario
- Proporciona información clara y comprensible
- Muestra empatía y profesionalidad en todo momento`

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
          <User className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Atención al Cliente</h1>
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
              <CardTitle>Información Básica del Agente</CardTitle>
              <CardDescription>Define el nombre, especialidades y tono de tu asistente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nombre del agente *</Label>
                <Input
                  id="agentName"
                  placeholder="Ej: Asistente PHYSIA"
                  value={formData.agentName}
                  onChange={(e) => updateFormData("agentName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialties">Especialidades *</Label>
                <Textarea
                  id="specialties"
                  placeholder="fisioterapia, osteopatía, podología..."
                  value={formData.specialties}
                  onChange={(e) => updateFormData("specialties", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Especialidades médicas de la clínica</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tono de comunicación *</Label>
                <Input
                  id="tone"
                  placeholder="amigable y empático, profesional"
                  value={formData.communicationTone}
                  onChange={(e) => updateFormData("communicationTone", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="presentation">Mensaje de presentación *</Label>
                <Textarea
                  id="presentation"
                  placeholder="Hola! Soy PHYSIA... ¿en qué te puedo ayudar?"
                  value={formData.presentationMessage}
                  onChange={(e) => updateFormData("presentationMessage", e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="emojis"
                  checked={formData.useEmojis}
                  onCheckedChange={(checked) => updateFormData("useEmojis", checked)}
                />
                <Label htmlFor="emojis">Usar emoticonos</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Funcionalidades del Agente</CardTitle>
              <CardDescription>Activa y configura las capacidades específicas de tu asistente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Evaluación de síntomas */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="symptomEvaluation"
                    checked={formData.includeSymptomEvaluation}
                    onCheckedChange={(checked) => updateFormData("includeSymptomEvaluation", checked)}
                  />
                  <Label htmlFor="symptomEvaluation" className="font-medium">
                    Incluir Punto 1 – Evaluación de síntomas
                  </Label>
                </div>
                {formData.includeSymptomEvaluation && (
                  <div className="ml-6 space-y-2">
                    <p className="text-sm text-muted-foreground">Valoración en preguntas + prediagnósticos</p>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="symptomQuestions" className="text-sm">
                        Número de preguntas para síntomas
                      </Label>
                      <Input
                        id="symptomQuestions"
                        type="number"
                        min="1"
                        max="10"
                        className="w-20"
                        value={formData.symptomQuestions}
                        onChange={(e) => updateFormData("symptomQuestions", Number.parseInt(e.target.value) || 5)}
                      />
                    </div>
                  </div>
                )}
              </div>
              {/*
  Gestión de citas
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Switch
        id="appointmentManagement"
        checked={formData.includeAppointmentManagement}
        onCheckedChange={(checked) => updateFormData("includeAppointmentManagement", checked)}
      />
      <Label htmlFor="appointmentManagement" className="font-medium">
        Incluir Punto 2 – Gestión de citas
      </Label>
    </div>
    {formData.includeAppointmentManagement && (
      <div className="ml-6 space-y-3">
        <p className="text-sm text-muted-foreground">Gestión de citas con IDs y ofertas</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="morningSlots" className="text-sm">
              Huecos mañana a ofrecer
            </Label>
            <Input
              id="morningSlots"
              type="number"
              min="1"
              max="10"
              value={formData.morningSlots}
              onChange={(e) => updateFormData("morningSlots", Number.parseInt(e.target.value) || 2)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="afternoonSlots" className="text-sm">
              Huecos tarde a ofrecer
            </Label>
            <Input
              id="afternoonSlots"
              type="number"
              min="1"
              max="10"
              value={formData.afternoonSlots}
              onChange={(e) => updateFormData("afternoonSlots", Number.parseInt(e.target.value) || 2)}
            />
          </div>
        </div>
      </div>
    )}
  </div>
*/}


              {/* Información de clínica */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="clinicInfo"
                    checked={formData.includeClinicInfo}
                    onCheckedChange={(checked) => updateFormData("includeClinicInfo", checked)}
                  />
                  <Label htmlFor="clinicInfo" className="font-medium">
                    Incluir Punto 2 – Información de clínica
                  </Label>
                </div>
                {formData.includeClinicInfo && (
                  <div className="ml-6 space-y-3">
                    <p className="text-sm text-muted-foreground">Especialidades, horario, ubicación, tarifas...</p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="schedule" className="text-sm">
                          Horario de la clínica
                        </Label>
                        <Input
                          id="schedule"
                          placeholder="Lunes a Viernes 9:00-20:00, Sábados 9:00-14:00"
                          value={formData.clinicSchedule}
                          onChange={(e) => updateFormData("clinicSchedule", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-sm">
                          Ubicación de la clínica
                        </Label>
                        <Input
                          id="location"
                          placeholder="Calle Principal 123, Madrid"
                          value={formData.clinicLocation}
                          onChange={(e) => updateFormData("clinicLocation", e.target.value)}
                        />
                      </div>
                     
                      <div className="space-y-2">
                        <Label htmlFor="patientTypes" className="text-sm">
                          Tipo de pacientes
                        </Label>
                        <Input
                          id="patientTypes"
                          placeholder="Adultos y niños a partir de 12 años"
                          value={formData.patientTypes}
                          onChange={(e) => updateFormData("patientTypes", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Punto personalizado */}
              <div className="space-y-2">
                <Label htmlFor="customInstructions" className="font-medium">
                  Punto personalizado (opcional)
                </Label>
                <Textarea
                  id="customInstructions"
                  placeholder="Instrucciones adicionales específicas..."
                  value={formData.customInstructions}
                  onChange={(e) => updateFormData("customInstructions", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">Instrucciones extra para personalizar el agente</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg">
              Crear Agente
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa del Prompt</CardTitle>
              <CardDescription>Así se verá el prompt generado para tu agente de atención al cliente.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono">{generatePrompt()}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
