// types/tour.ts
export interface TourStep {
    id?: string
    target?: string // Selector CSS del elemento a resaltar
    title: string
    description: string
    tips?: string[]
    position?: "top" | "bottom" | "left" | "right" | "center"
    offset?: { x: number; y: number }
    action?: () => void
  }
  