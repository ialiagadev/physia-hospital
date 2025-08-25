"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, ArrowRight, BookOpen } from "lucide-react"
import type { TaskGuide } from "@/lib/task-guides"

interface TaskGuideModalProps {
  task: TaskGuide
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  isCompleted: boolean
}

export function TaskGuideModal({ task, isOpen, onClose, onComplete, isCompleted }: TaskGuideModalProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "essential":
        return "bg-red-100 text-red-800 border-red-200"
      case "recommended":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "advanced":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <DialogTitle className="text-xl">{task.title}</DialogTitle>
            <Badge className={getCategoryColor(task.category)}>{task.category}</Badge>
          </div>
          <DialogDescription className="text-base">{task.description}</DialogDescription>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Tiempo estimado: {task.estimatedTime}</span>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Steps */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Pasos a seguir
            </h3>
            <div className="space-y-3">
              {task.steps.map((step, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{step.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                      {step.tips.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Consejos:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {step.tips.map((tip, tipIndex) => (
                              <li key={tipIndex} className="flex items-start gap-1">
                                <span className="text-blue-500 mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {step.action && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 bg-transparent"
                          onClick={() => window.open(step.action!.href, "_blank")}
                        >
                          {step.action.text}
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {task.tips.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Consejos adicionales</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {task.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="text-blue-500 mt-1">💡</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <div className="flex items-center gap-2">
              {!isCompleted && (
                <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marcar como completada
                </Button>
              )}
              {isCompleted && (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Completada
                </Badge>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
