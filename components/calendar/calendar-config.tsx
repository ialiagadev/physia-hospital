"use client"

import { useState } from "react"
import { Settings, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { IntervaloTiempo } from "@/types/calendar-types"

interface CalendarConfigProps {
  intervaloTiempo: IntervaloTiempo
  onIntervaloChange: (intervalo: IntervaloTiempo) => void
}

export function CalendarConfig({ intervaloTiempo, onIntervaloChange }: CalendarConfigProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="absolute top-full right-0 mt-2 bg-white border rounded-md shadow-lg p-4 z-50 min-w-[200px]">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Mostrar horas cada:</label>
            <Select
              value={intervaloTiempo.toString()}
              onValueChange={(value) => onIntervaloChange(Number.parseInt(value) as IntervaloTiempo)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">60 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export type { IntervaloTiempo }
