"use client"

import type React from "react"

import type { Profesional } from "@/types/calendar-types"

interface HoraPreviewTooltipProps {
  hora: string
  position: { x: number; y: number }
  citaOriginal?: {
    hora: string
    fecha: Date
    profesionalId: number
  }
  profesionales: Profesional[]
  children?: React.ReactNode
}

export function HoraPreviewTooltip({ hora, position, citaOriginal, profesionales, children }: HoraPreviewTooltipProps) {
  const profesionalOriginal = citaOriginal ? profesionales.find((p) => p.id === citaOriginal.profesionalId) : null

  return (
    <>
      {children}
      <div
        className="fixed z-50 bg-white border-2 border-blue-400 rounded-lg shadow-xl p-3 pointer-events-none"
        style={{
          left: 20,
          top: position.y - 50,
        }}
      >
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span className="font-medium">Nueva hora: {hora}</span>
          </div>
          {citaOriginal && (
            <div className="text-xs text-gray-600">
              <div>Hora original: {citaOriginal.hora}</div>
              {profesionalOriginal && <div>Profesional: {profesionalOriginal.nombre}</div>}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
