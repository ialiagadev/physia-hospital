"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Loader2, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ProgressStep {
  id: string
  label: string
  status: "pending" | "processing" | "completed" | "error"
  details?: string
}

interface ProgressDialogProps {
  isOpen: boolean
  title: string
  steps: ProgressStep[]
  currentStep: number
  totalSteps: number
  canClose: boolean
  onClose?: () => void
  onCancel?: () => void
  showCancelButton?: boolean
}

export function ProgressDialog({
  isOpen,
  title,
  steps,
  currentStep,
  totalSteps,
  canClose,
  onClose,
  onCancel,
  showCancelButton = false,
}: ProgressDialogProps) {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0
  const isCompleted = currentStep >= totalSteps
  const hasErrors = steps.some((step) => step.status === "error")

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent
        className="w-[500px] max-w-[90vw]"
        onPointerDownOutside={(e) => !canClose && e.preventDefault()}
        onEscapeKeyDown={(e) => !canClose && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCompleted ? (
              hasErrors ? (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra de progreso principal */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="text-xs text-gray-500 text-center">
              {currentStep} de {totalSteps} completados
            </div>
          </div>

          {/* Lista de pasos */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                  step.status === "processing"
                    ? "bg-blue-50 border border-blue-200"
                    : step.status === "completed"
                      ? "bg-green-50"
                      : step.status === "error"
                        ? "bg-red-50"
                        : "bg-gray-50"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">{getStepIcon(step)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{step.label}</div>
                  {step.details && <div className="text-xs text-gray-600 mt-1">{step.details}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Mensaje de estado */}
          {!canClose && !isCompleted && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">No cierres esta ventana hasta que termine el proceso</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                El proceso se está ejecutando en segundo plano. Cerrar la ventana podría interrumpir la operación.
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            {showCancelButton && !isCompleted && onCancel && (
              <Button variant="outline" onClick={onCancel} size="sm">
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            )}

            {canClose && onClose && (
              <Button onClick={onClose} variant={hasErrors ? "destructive" : "default"} size="sm">
                {hasErrors ? "Cerrar con errores" : isCompleted ? "Finalizar" : "Cerrar"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
