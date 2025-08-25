"use client"

import { useState, useEffect } from "react"
import type { GuideStep } from "@/lib/task-guides"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface Props {
  steps: GuideStep[]
  onClose: () => void
  onFinish: () => void
}

export default function SelfOnboardingTour({ steps, onClose, onFinish }: Props) {
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const progress = ((index + 1) / steps.length) * 100

  // Opcional: scroll o foco contextual por paso (ejemplo básico)
  useEffect(() => {
    // aquí podrías resaltar el calendario en el step 0, etc.
  }, [index])

  const handleNext = () => {
    if (index < steps.length - 1) {
      setIndex((i) => Math.min(i + 1, steps.length - 1))
    } else {
      onFinish()
    }
  }

  const handlePrevious = () => {
    setIndex((i) => Math.max(i - 1, 0))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full shadow-2xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
              </div>
              <Progress value={progress} className="h-2 mb-3" />
              <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-4 h-8 w-8 p-0 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            {step.tips && step.tips.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Consejos útiles:</h4>
                <ul className="space-y-1">
                  {step.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i <= index ? "bg-blue-500" : "bg-gray-200"}`}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              Paso {index + 1} de {steps.length}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={index === 0}
                className="flex items-center gap-2 bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              {index < steps.length - 1 ? (
                <Button onClick={handleNext} className="flex items-center gap-2">
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={onFinish} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                  <Check className="h-4 w-4" />
                  Finalizar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
