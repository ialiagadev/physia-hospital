"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LiquidGlass } from "@/components/liquid-glass"
import { Users, FileText, CreditCard, TrendingUp, Sparkles, ArrowRight, CheckCircle, Plus } from "lucide-react"
import { AgentTemplateWizard } from "./agent-template-wizard"
import { CustomAgentForm } from "./custom-agent-form"
import { agentTemplates, type AgentTemplate } from "@/lib/agent-templates/agent-templates"

interface AgentTemplateSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateAgent: (agentData: { name: string; prompt: string }) => Promise<void>
}

export function AgentTemplateSelector({ open, onOpenChange, onCreateAgent }: AgentTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template)
    setShowWizard(true)
  }

  const handleCreateFromScratch = () => {
    setShowCustomForm(true)
  }

  const handleWizardComplete = async (agentData: { name: string; prompt: string }) => {
    await onCreateAgent(agentData)
    setShowWizard(false)
    setSelectedTemplate(null)
    onOpenChange(false)
  }

  const handleCustomFormComplete = async (agentData: { name: string; prompt: string }) => {
    await onCreateAgent(agentData)
    setShowCustomForm(false)
    onOpenChange(false)
  }

  const handleBack = () => {
    setShowWizard(false)
    setShowCustomForm(false)
    setSelectedTemplate(null)
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      "bg-blue-500": {
        background: "rgba(59, 130, 246, 0.15)",
        border: "1px solid rgba(59, 130, 246, 0.3)",
        iconBg: "rgba(59, 130, 246, 0.15)",
        iconBorder: "1px solid rgba(59, 130, 246, 0.3)",
        textColor: "text-blue-700",
      },
      "bg-green-500": {
        background: "rgba(34, 197, 94, 0.15)",
        border: "1px solid rgba(34, 197, 94, 0.3)",
        iconBg: "rgba(34, 197, 94, 0.15)",
        iconBorder: "1px solid rgba(34, 197, 94, 0.3)",
        textColor: "text-green-700",
      },
      "bg-red-500": {
        background: "rgba(239, 68, 68, 0.15)",
        border: "1px solid rgba(239, 68, 68, 0.3)",
        iconBg: "rgba(239, 68, 68, 0.15)",
        iconBorder: "1px solid rgba(239, 68, 68, 0.3)",
        textColor: "text-red-700",
      },
      "bg-orange-500": {
        background: "rgba(249, 115, 22, 0.15)",
        border: "1px solid rgba(249, 115, 22, 0.3)",
        iconBg: "rgba(249, 115, 22, 0.15)",
        iconBorder: "1px solid rgba(249, 115, 22, 0.3)",
        textColor: "text-orange-700",
      },
    }
    return colorMap[color as keyof typeof colorMap] || colorMap["bg-blue-500"]
  }

  const getTemplateIcon = (icon: string) => {
    const iconMap = {
      "👥": <Users className="h-6 w-6" />,
      "✍️": <FileText className="h-6 w-6" />,
      "💳": <CreditCard className="h-6 w-6" />,
      "📈": <TrendingUp className="h-6 w-6" />,
    }
    return iconMap[icon as keyof typeof iconMap] || <Users className="h-6 w-6" />
  }

  if (showCustomForm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <CustomAgentForm onComplete={handleCustomFormComplete} onBack={handleBack} />
        </DialogContent>
      </Dialog>
    )
  }

  if (showWizard && selectedTemplate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AgentTemplateWizard template={selectedTemplate} onComplete={handleWizardComplete} onBack={handleBack} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <LiquidGlass
              variant="floating"
              intensity="medium"
              className="w-16 h-16 flex items-center justify-center"
              style={{
                background: "rgba(147, 51, 234, 0.15)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(147, 51, 234, 0.3)",
                boxShadow: "0 4px 16px rgba(147, 51, 234, 0.1)",
              }}
            >
              <Sparkles className="h-8 w-8 text-purple-600" />
            </LiquidGlass>
          </div>
          <DialogTitle className="text-3xl font-bold text-gray-800 mb-2">Elige una plantilla</DialogTitle>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Selecciona una plantilla predefinida para crear tu agente más rápidamente
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {agentTemplates.map((template) => {
            const colors = getColorClasses(template.color)

            return (
              <LiquidGlass
                key={template.id}
                variant="card"
                intensity="medium"
                className="group relative p-6 transition-all duration-300 cursor-pointer hover:shadow-xl"
                style={{
                  background: colors.background,
                  backdropFilter: "blur(20px)",
                  border: colors.border,
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                }}
                rippleEffect
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="flex items-start gap-4 mb-4">
                  <LiquidGlass
                    variant="floating"
                    intensity="subtle"
                    className="w-12 h-12 flex items-center justify-center flex-shrink-0"
                    style={{
                      background: colors.iconBg,
                      backdropFilter: "blur(10px)",
                      border: colors.iconBorder,
                    }}
                  >
                    <div className={colors.textColor}>{getTemplateIcon(template.icon)}</div>
                  </LiquidGlass>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xl font-semibold mb-2 ${colors.textColor}`}>{template.name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{template.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Configuración completa</span>
                  </div>

                  <Button variant="ghost" size="sm" className={`${colors.textColor} hover:bg-white/50`}>
                    Configurar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </LiquidGlass>
            )
          })}
        </div>

        <div className="border-t pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">¿Prefieres empezar desde cero?</h3>
            <p className="text-gray-600 mb-4">Crea un agente personalizado con tu propio prompt</p>
            <Button
              variant="outline"
              onClick={handleCreateFromScratch}
              className="flex items-center gap-2 bg-transparent"
            >
              <Plus className="h-4 w-4" />
              Crear desde cero
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
