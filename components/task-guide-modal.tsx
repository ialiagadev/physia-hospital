"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, CheckCircle, Clock, Lightbulb, ArrowRight, BookOpen } from "lucide-react"
import Link from "next/link"
import type { TaskGuide } from "@/lib/task-guides"

interface TaskGuideModalProps {
  task: TaskGuide
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  isCompleted: boolean
}

export function TaskGuideModal({ task, isOpen, onClose, onComplete, isCompleted }: TaskGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < task.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    setCurrentStep(0)
    onClose()
  }

  const progress = ((currentStep + 1) / task.steps.length) * 100
  const isLastStep = currentStep === task.steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="space-y-4 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{task.title}</DialogTitle>
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1 text-xs">
              <Clock className="w-3 h-3" />
              {task.estimatedTime}
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Paso {currentStep + 1} de {task.steps.length}
              </span>
              <span className="text-gray-600">{Math.round(progress)}% completado</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Current Step */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <span className="text-lg font-bold text-blue-600">{currentStep + 1}</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">{task.steps[currentStep].title}</h3>
              <p className="text-gray-600">{task.steps[currentStep].description}</p>
            </div>
          </div>

          {/* Tips */}
          {task.tips.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">💡 Consejos útiles:</h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      {task.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="border-t pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handlePrevious} disabled={isFirstStep} className="gap-2 bg-transparent">
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <div className="flex gap-2">
              {isLastStep ? (
                <div className="flex gap-2">
                  {task.action && (
                    <Link href={task.action.target}>
                      <Button className="gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Completar tarea
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" onClick={handleClose}>
                    Cerrar
                  </Button>
                </div>
              ) : (
                <Button onClick={handleNext} className="gap-2">
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Action */}
          {task.action && (
            <div className="text-center">
              <Link href={task.action.target}>
                <Button variant="ghost" size="sm" className="text-gray-600 gap-2">
                  <ArrowRight className="w-3 h-3" />
                  Ir directamente a la tarea
                </Button>
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
