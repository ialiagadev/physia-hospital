"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getTaskById } from "@/lib/task-guides"
import type { TaskGuide } from "@/lib/task-guides"
import type { TourStep } from "@/types/tour"

export function useGuidedTour() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [currentGuide, setCurrentGuide] = useState<TaskGuide | null>(null)
  const [tourSteps, setTourSteps] = useState<TourStep[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Generador de pasos del tour
  const generateTourSteps = useCallback((guideId: string): TourStep[] => {
    switch (guideId) {
      case "manage-clients":
        return [
          {
            target: '[data-tour="import-clients-btn"]',
            title: "Importar clientes",
            description: "Aquí puedes importar clientes desde un archivo Excel o CSV.",
            tips: ["Ideal para subir clientes en bloque"],
            position: "bottom",
          },
          {
            target: '[data-tour="new-client-btn"]',
            title: "Nuevo cliente",
            description: "Crea manualmente un nuevo cliente para facturación.",
            tips: ["Puedes añadir datos básicos y completarlos luego"],
            position: "bottom",
          },
          {
            target: '[data-tour="clients-search-input"]',
            title: "Buscar clientes",
            description: "Filtra clientes rápidamente escribiendo su nombre, NIF, teléfono o ciudad.",
            tips: ["El buscador es en tiempo real con resaltado de coincidencias"],
            position: "bottom",
          },
          {
            target: '[data-tour="clients-table"]',
            title: "Listado de clientes",
            description: "Aquí verás todos los clientes registrados en tu organización.",
            tips: ["Haz clic en un cliente para ver sus detalles", "Puedes eliminarlos desde las acciones"],
            position: "top",
          },
        ]
      default:
        return []
    }
  }, [])

  // Detectar guía desde query param
  useEffect(() => {
    if (!mounted) return

    const guideId = searchParams.get("tour")

    if (guideId) {
      const guide = getTaskById(guideId)
      if (guide) {
        if (!currentGuide || currentGuide.id !== guideId) {
          setCurrentGuide(guide)
          setTourSteps(generateTourSteps(guideId))
          setIsActive(true)
          setCurrentStep(0)
        }
      }
    } else {
      if (isActive) {
        setIsActive(false)
        setCurrentStep(0)
        setCurrentGuide(null)
        setTourSteps([])
      }
    }
  }, [searchParams, generateTourSteps, mounted, currentGuide, isActive])

  const nextStep = useCallback(() => {
    setCurrentStep((prevStep) => {
      if (prevStep < tourSteps.length - 1) {
        return prevStep + 1
      } else {
        endTour()
        return prevStep
      }
    })
  }, [tourSteps.length])

  const previousStep = useCallback(() => {
    setCurrentStep((prevStep) => {
      if (prevStep > 0) {
        return prevStep - 1
      }
      return prevStep
    })
  }, [])

  const endTour = useCallback(() => {
    setIsActive(false)
    setCurrentStep(0)
    setCurrentGuide(null)
    setTourSteps([])
    router.push("/dashboard/help")
  }, [router])

  const skipTour = useCallback(() => {
    endTour()
  }, [endTour])

  return {
    isActive,
    currentStep,
    currentGuide,
    tourSteps,
    currentTourStep: tourSteps[currentStep],
    nextStep,
    previousStep,
    endTour,
    skipTour,
    totalSteps: tourSteps.length,
    mounted,
  }
}
