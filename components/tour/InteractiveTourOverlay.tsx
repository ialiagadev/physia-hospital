"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { X, ChevronLeft, ChevronRight, Check, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import type { TourStep } from "@/types/tour"

interface Props {
  steps: TourStep[]
  onClose: () => void
  onFinish: () => void
  isActive: boolean
}

export default function InteractiveTourOverlay({ steps, onClose, onFinish, isActive }: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })
  const popupRef = useRef<HTMLDivElement>(null)

  const step = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  useEffect(() => {
    if (!isActive || !step?.target) return

    const findElement = () => {
      const element = document.querySelector(step.target!) as HTMLElement
      if (element) {
        setTargetElement(element)

        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        })

        setTimeout(() => {
          calculatePopupPosition(element)
        }, 300)
      } else {
        setTimeout(findElement, 500)
      }
    }

    findElement()
  }, [currentStep, isActive, step?.target])

  const calculatePopupPosition = (element: HTMLElement) => {
    if (!popupRef.current) return

    const rect = element.getBoundingClientRect()
    const popupRect = popupRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let top = 0
    let left = 0

    const offset = step.offset || { x: 0, y: 0 }

    switch (step.position || "bottom") {
      case "top":
        top = rect.top - popupRect.height - 20 + offset.y
        left = rect.left + rect.width / 2 - popupRect.width / 2 + offset.x
        break
      case "bottom":
        top = rect.bottom + 20 + offset.y
        left = rect.left + rect.width / 2 - popupRect.width / 2 + offset.x
        break
      case "left":
        top = rect.top + rect.height / 2 - popupRect.height / 2 + offset.y
        left = rect.left - popupRect.width - 20 + offset.x
        break
      case "right":
        top = rect.top + rect.height / 2 - popupRect.height / 2 + offset.y
        left = rect.right + 20 + offset.x
        break
      case "center":
        top = viewportHeight / 2 - popupRect.height / 2 + offset.y
        left = viewportWidth / 2 - popupRect.width / 2 + offset.x
        break
    }

    if (left < 10) left = 10
    if (left + popupRect.width > viewportWidth - 10) left = viewportWidth - popupRect.width - 10
    if (top < 10) top = 10
    if (top + popupRect.height > viewportHeight - 10) top = viewportHeight - popupRect.height - 10

    setPopupPosition({ top, left })
  }

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

  const handleSkip = () => {
    onClose()
    router.push("/dashboard/help")
  }

  const handleFinish = () => {
    onFinish()
    router.push("/dashboard/help")
  }

  if (!steps || steps.length === 0 || !isActive || !step) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />

      {targetElement && (
        <div
          className="fixed border-4 border-blue-500 rounded-lg shadow-lg z-50 pointer-events-none animate-pulse"
          style={{
            top: targetElement.getBoundingClientRect().top - 4,
            left: targetElement.getBoundingClientRect().left - 4,
            width: targetElement.getBoundingClientRect().width + 8,
            height: targetElement.getBoundingClientRect().height + 8,
          }}
        />
      )}

      <Card
        ref={popupRef}
        className="fixed z-50 w-80 shadow-2xl border-2 border-blue-200"
        style={{
          top: popupPosition.top,
          left: popupPosition.left,
        }}
      >
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold">{currentStep + 1}</span>
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  <Target className="w-3 h-3 mr-1" />
                  Tour interactivo
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-white hover:bg-white/20 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Progress value={progress} className="h-1 bg-white/20" />
          </div>

          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">{step.description}</p>

            {step.tips && step.tips.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <h4 className="text-xs font-medium text-blue-900 mb-1">💡 Consejo:</h4>
                <ul className="space-y-1">
                  {step.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-blue-800 flex items-start gap-1">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center p-4 border-t bg-gray-50 rounded-b-lg">
            <div className="text-xs text-gray-500">
              Paso {currentStep + 1} de {steps.length}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="h-8 bg-transparent"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext} size="sm" className="h-8">
                  <ChevronRight className="h-3 w-3" />
                </Button>
              ) : (
                <Button onClick={handleFinish} size="sm" className="h-8 bg-green-600 hover:bg-green-700">
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
