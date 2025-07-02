"use client"

import { useState } from "react"
import { ChevronDown, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Profesional } from "@/types/calendar-types"

interface ProfesionalesLegendProps {
  profesionales: Profesional[]
  profesionalesSeleccionados: number[]
  onToggleProfesional: (profesionalId: number) => void
  onToggleAll: () => void
}

const COLORES_PROFESIONALES = {
  teal: "bg-teal-100 border-teal-500",
  blue: "bg-blue-100 border-blue-500",
  purple: "bg-purple-100 border-purple-500",
  amber: "bg-amber-100 border-amber-500",
  rose: "bg-rose-100 border-rose-500",
  emerald: "bg-emerald-100 border-emerald-500",
}

export function ProfesionalesLegend({
  profesionales,
  profesionalesSeleccionados,
  onToggleProfesional,
  onToggleAll,
}: ProfesionalesLegendProps) {
  const [isOpen, setIsOpen] = useState(false)

  const todosSeleccionados = profesionalesSeleccionados.length === profesionales.length
  const algunosSeleccionados =
    profesionalesSeleccionados.length > 0 && profesionalesSeleccionados.length < profesionales.length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          Profesionales
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="absolute top-full right-0 mt-2 bg-white border rounded-md shadow-lg p-4 z-50 min-w-[250px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Leyenda de Profesionales</h3>
            <Button variant="ghost" size="sm" onClick={onToggleAll} className="text-xs">
              {todosSeleccionados ? (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Ocultar todos
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Mostrar todos
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {profesionales.map((profesional) => {
              const isSelected = profesionalesSeleccionados.includes(profesional.id)
              const colorClass =
                COLORES_PROFESIONALES[profesional.color as keyof typeof COLORES_PROFESIONALES] ||
                COLORES_PROFESIONALES.teal

              return (
                <div key={profesional.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`prof-${profesional.id}`}
                    checked={isSelected}
                    onCheckedChange={() => onToggleProfesional(profesional.id)}
                  />
                  <div className={`w-4 h-4 rounded border-2 ${colorClass}`} />
                  <label htmlFor={`prof-${profesional.id}`} className="text-sm cursor-pointer flex-1">
                    <div className="font-medium">{profesional.nombre}</div>
                    <div className="text-xs text-gray-500">{profesional.especialidad}</div>
                  </label>
                </div>
              )
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
