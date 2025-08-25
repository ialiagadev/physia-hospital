"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, CheckCircle2, BookOpen, Target } from "lucide-react"
import type { GuideStep } from "@/lib/task-guides"

interface SelfOnboardingTourProps {
  steps: GuideStep[]
  onClose: () => void
  onFinish: () => void
}

export default function SelfOnboardingTour({ steps, onClose, onFinish }: SelfOnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onFinish()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepComplete = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep])
    }
  }

  const progress = ((currentStep + 1) / steps.length) * 100
  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isStepCompleted = completedSteps.includes(currentStep)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Guía paso a paso
            </DialogTitle>
            <Badge variant="outline" className="text-xs">
              {currentStep + 1} de {steps.length}
            </Badge>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <DialogDescription className="text-sm text-gray-600">
              Sigue estos pasos para completar la configuración
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Step */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-semibold">
                {currentStep + 1}
              </div>
              <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">{currentStepData.title}</h3>
                <p className="text-gray-700 leading-relaxed">{currentStepData.description}</p>

                {/* Tips */}
                {currentStepData.tips.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Consejos útiles
                    </h4>
                    <ul className="space-y-1">
                      {currentStepData.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Button */}
                {currentStepData.action && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.open(currentStepData.action!.href, "_blank")
                        handleStepComplete()
                      }}
                      className="bg-white hover:bg-gray-50"
                    >
                      {currentStepData.action.text}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}

                {/* Step Completion */}
                <div className="pt-2">
                  {!isStepCompleted ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleStepComplete}
                      className="text-green-700 border-green-300 hover:bg-green-50 bg-transparent"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Marcar como completado
                    </Button>
                  ) : (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Completado
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0} size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cerrar guía
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {completedSteps.length} de {steps.length} completados
              </span>
              <Button onClick={handleNext} className={isLastStep ? "bg-green-600 hover:bg-green-700" : ""}>
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Finalizar
                  </>
                ) : (
                  <>
                    Siguiente
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-blue-600"
                    : completedSteps.includes(index)
                      ? "bg-green-500"
                      : index < currentStep
                        ? "bg-gray-400"
                        : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
