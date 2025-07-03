"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Settings } from "lucide-react"
import type { IntervaloTiempo } from "@/types/calendar"

interface CalendarConfigProps {
  intervaloTiempo: IntervaloTiempo
  onIntervaloChange: (intervalo: IntervaloTiempo) => void
}

export function CalendarConfig({ intervaloTiempo, onIntervaloChange }: CalendarConfigProps) {
  const [isOpen, setIsOpen] = useState(false)

  const intervalos = [
    { value: 15 as IntervaloTiempo, label: "15 minutos" },
    { value: 30 as IntervaloTiempo, label: "30 minutos" },
    { value: 45 as IntervaloTiempo, label: "45 minutos" },
    { value: 60 as IntervaloTiempo, label: "60 minutos" },
  ]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Configuración del Calendario</h4>
            <p className="text-sm text-muted-foreground">Ajusta la visualización del calendario</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mostrar horas cada:</label>
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
                <SelectItem value="45">45 minutos</SelectItem>
                <SelectItem value="60">60 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
