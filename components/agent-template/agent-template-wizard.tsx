"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { LiquidGlass } from "@/components/liquid-glass"
import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from "lucide-react"
import CustomerServiceTemplate from "./customer-service-template"
import ContentCreationTemplate from "./content-creation-template"
import DebtManagementTemplate from "./debt-management-template"
import SalesTemplate from "./sales-template"
import type { AgentTemplate, AgentField } from "@/lib/agent-templates/agent-templates"

interface AgentTemplateWizardProps {
  template: AgentTemplate
  onComplete: (agentData: { name: string; prompt: string }) => Promise<void>
  onBack: () => void
}

export function AgentTemplateWizard({ template, onComplete, onBack }: AgentTemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[] | boolean | number>>({})
  const [agentName, setAgentName] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  if (template.id === "customer-service") {
    return (
      <CustomerServiceTemplate
        onBack={onBack}
        onSave={async (data) => {
          await onComplete({
            name: data.agentName,
            prompt: data.prompt,
          })
        }}
      />
    )
  }

  if (template.id === "content-creation") {
    return (
      <ContentCreationTemplate
        onBack={onBack}
        onSave={async (data) => {
          await onComplete({
            name: data.agentName,
            prompt: data.prompt,
          })
        }}
      />
    )
  }

  if (template.id === "debt-management") {
    return (
      <DebtManagementTemplate
        onBack={onBack}
        onSave={async (data) => {
          await onComplete({
            name: data.agentName,
            prompt: data.prompt,
          })
        }}
      />
    )
  }

  if (template.id === "sales") {
    return (
      <SalesTemplate
        onBack={onBack}
        onSave={async (data) => {
          await onComplete({
            name: data.agentName,
            prompt: data.prompt,
          })
        }}
      />
    )
  }

  const totalSteps = template.fields.length + 1 // +1 para el paso del nombre

  const handleAnswerChange = (fieldId: string, value: string | string[] | boolean | number) => {
    setAnswers((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const generatePrompt = (): string => {
    return template.generatePrompt(answers)
  }

  const handleComplete = async () => {
    if (!agentName.trim()) {
      alert("Por favor, ingresa un nombre para el agente")
      return
    }

    setIsGenerating(true)
    try {
      const prompt = generatePrompt()
      await onComplete({
        name: agentName,
        prompt: prompt,
      })
    } catch (error) {
      console.error("Error creating agent:", error)
      alert("Error al crear el agente. Por favor, inténtalo de nuevo.")
    } finally {
      setIsGenerating(false)
    }
  }

  const renderField = (field: AgentField) => {
    const value = answers[field.id]

    switch (field.type) {
      case "text":
        return (
          <Input
            value={(value as string) || ""}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="mt-2"
          />
        )

      case "textarea":
        return (
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className="mt-2"
          />
        )

      case "select":
        return (
          <RadioGroup
            value={(value as string) || ""}
            onValueChange={(newValue) => handleAnswerChange(field.id, newValue)}
            className="mt-4"
          >
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case "multiselect":
        const selectedValues = (value as string[]) || []
        return (
          <div className="mt-4 space-y-3">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={option}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleAnswerChange(field.id, [...selectedValues, option])
                    } else {
                      handleAnswerChange(
                        field.id,
                        selectedValues.filter((v) => v !== option),
                      )
                    }
                  }}
                />
                <Label htmlFor={option} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        )

      case "switch":
        return (
          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id={field.id}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => handleAnswerChange(field.id, checked)}
            />
            <Label htmlFor={field.id} className="cursor-pointer">
              {field.label}
            </Label>
          </div>
        )

      case "number":
        return (
          <Input
            type="number"
            value={(value as number) || ""}
            onChange={(e) => handleAnswerChange(field.id, Number(e.target.value))}
            placeholder={field.placeholder}
            className="mt-2"
          />
        )

      default:
        return null
    }
  }

  const isCurrentStepValid = () => {
    if (currentStep === totalSteps - 1) {
      return agentName.trim().length > 0
    }

    const field = template.fields[currentStep]
    if (!field?.required) return true

    const answer = answers[field.id]
    if (field.type === "multiselect") {
      return Array.isArray(answer) && answer.length > 0
    }
    if (field.type === "switch") {
      return answer !== undefined
    }
    return answer !== undefined && answer.toString().trim().length > 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="text-sm text-gray-500">
          Paso {currentStep + 1} de {totalSteps}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Content */}
      <LiquidGlass
        variant="card"
        intensity="medium"
        className="p-8 min-h-[400px] flex flex-col justify-center"
        style={{
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0, 0, 0, 0.1)",
        }}
      >
        {currentStep < template.fields.length ? (
          // Field Step
          <div className="space-y-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{template.fields[currentStep].label}</h2>
              {template.fields[currentStep].required && <p className="text-sm text-gray-500">* Campo obligatorio</p>}
            </div>
            {renderField(template.fields[currentStep])}
          </div>
        ) : (
          // Final Step - Agent Name
          <div className="space-y-6 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">¡Perfecto! Ahora dale un nombre a tu agente</h2>
            <div className="max-w-md mx-auto">
              <Label htmlFor="agent-name" className="text-left block mb-2">
                Nombre del agente *
              </Label>
              <Input
                id="agent-name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder={`Ej: Asistente de ${template.name}`}
                className="text-center"
              />
            </div>
          </div>
        )}
      </LiquidGlass>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center gap-2 bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </Button>

        {currentStep < totalSteps - 1 ? (
          <Button onClick={handleNext} disabled={!isCurrentStepValid()} className="flex items-center gap-2">
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={!isCurrentStepValid() || isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando agente...
              </>
            ) : (
              <>
                Crear agente
                <CheckCircle className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
