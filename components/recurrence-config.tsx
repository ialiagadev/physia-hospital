"use client"

import { useState, useEffect, useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarDays, Clock, AlertTriangle } from "lucide-react"
import { format, addDays, addWeeks, addMonths, isAfter, isValid } from "date-fns"
import { es } from "date-fns/locale"

// ✅ TIPOS CORREGIDOS
export interface GroupActivityRecurrenceConfig {
  type: "weekly" | "monthly"
  interval: number
  endType: "date" | "count"
  endDate: Date
  count?: number
}

interface RecurrenceConfigComponentProps {
  isEnabled: boolean
  onEnabledChange: (enabled: boolean) => void
  config: GroupActivityRecurrenceConfig | null
  onConfigChange: (config: GroupActivityRecurrenceConfig | null) => void
  startDate: Date
  title?: string
  description?: string
}

export function RecurrenceConfigComponent({
  isEnabled,
  onEnabledChange,
  config,
  onConfigChange,
  startDate,
  title = "Repetir esta actividad",
  description = "Crea múltiples actividades automáticamente",
}: RecurrenceConfigComponentProps) {
  const [localConfig, setLocalConfig] = useState<GroupActivityRecurrenceConfig>({
    type: "weekly",
    interval: 1,
    endType: "date",
    endDate: addMonths(startDate, 1),
    count: 5,
  })

  // Sincronizar config local con prop externa solo cuando cambia externamente
  useEffect(() => {
    if (config && config.endDate && isValid(config.endDate) && JSON.stringify(config) !== JSON.stringify(localConfig)) {
      setLocalConfig(config)
    }
  }, [config])

  // Generar fechas de preview
  const previewDates = useMemo(() => {
    if (!isEnabled) return []

    const dates: Date[] = []
    let currentDate = new Date(startDate)
    const maxDates = 50 // Límite de seguridad

    while (dates.length < maxDates) {
      dates.push(new Date(currentDate))

      // Calcular siguiente fecha
      if (localConfig.type === "weekly") {
        currentDate = addWeeks(currentDate, localConfig.interval)
      } else if (localConfig.type === "monthly") {
        currentDate = addMonths(currentDate, localConfig.interval)
      }

      // Verificar condición de parada
      if (localConfig.endType === "date" && isAfter(currentDate, localConfig.endDate)) {
        break
      }
      if (localConfig.endType === "count" && dates.length >= (localConfig.count || 1)) {
        break
      }
    }

    return dates
  }, [isEnabled, startDate, localConfig])

  // Actualizar config externa cuando cambia la local
  const updateConfig = (newConfig: Partial<GroupActivityRecurrenceConfig>) => {
    const updatedConfig = { ...localConfig, ...newConfig }

    // Validar endDate si se está actualizando
    if (newConfig.endDate && !isValid(newConfig.endDate)) {
      return // No actualizar si la fecha es inválida
    }

    setLocalConfig(updatedConfig)

    // Solo actualizar la config externa si está habilitada
    if (isEnabled) {
      onConfigChange(updatedConfig)
    }
  }

  // Manejar cambio de habilitación
  const handleEnabledChange = (enabled: boolean) => {
    onEnabledChange(enabled)
    if (enabled) {
      onConfigChange(localConfig)
    } else {
      onConfigChange(null)
    }
  }

  const getFrequencyLabel = () => {
    if (localConfig.type === "weekly") {
      return localConfig.interval === 1 ? "semana" : `${localConfig.interval} semanas`
    }
    return localConfig.interval === 1 ? "mes" : `${localConfig.interval} meses`
  }

  return (
    <div className="space-y-4">
      {/* Checkbox principal */}
      <div className="flex items-center space-x-2">
        <Checkbox id="recurring" checked={isEnabled} onCheckedChange={handleEnabledChange} />
        <div className="grid gap-1.5 leading-none">
          <Label
            htmlFor="recurring"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {title}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Configuración de recurrencia */}
      {isEnabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Configuración de Recurrencia
            </CardTitle>
            <CardDescription>Define cómo se repetirá esta actividad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de recurrencia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select
                  value={localConfig.type}
                  onValueChange={(value: "weekly" | "monthly") => updateConfig({ type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cada</Label>
                <Select
                  value={localConfig.interval.toString()}
                  onValueChange={(value) => updateConfig({ interval: Number.parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}{" "}
                        {localConfig.type === "weekly"
                          ? num === 1
                            ? "semana"
                            : "semanas"
                          : num === 1
                            ? "mes"
                            : "meses"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo de finalización */}
            <div className="space-y-3">
              <Label>Finalizar</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="endDate"
                    name="endType"
                    checked={localConfig.endType === "date"}
                    onChange={() => updateConfig({ endType: "date" })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="endDate" className="text-sm">
                    En fecha específica
                  </Label>
                </div>
                {localConfig.endType === "date" && (
                  <Input
                    type="date"
                    value={
                      localConfig.endDate && !isNaN(localConfig.endDate.getTime())
                        ? format(localConfig.endDate, "yyyy-MM-dd")
                        : ""
                    }
                    onChange={(e) => {
                      const newDate = new Date(e.target.value)
                      if (e.target.value && !isNaN(newDate.getTime())) {
                        updateConfig({ endDate: newDate })
                      }
                    }}
                    min={format(addDays(startDate, 1), "yyyy-MM-dd")}
                    className="ml-6"
                  />
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="endCount"
                    name="endType"
                    checked={localConfig.endType === "count"}
                    onChange={() => updateConfig({ endType: "count", count: 5 })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="endCount" className="text-sm">
                    Después de un número de sesiones
                  </Label>
                </div>
                {localConfig.endType === "count" && (
                  <div className="ml-6 flex items-center space-x-2">
                    <Input
                      type="number"
                      min="1"
                      max="52"
                      value={localConfig.count || 5}
                      onChange={(e) => updateConfig({ count: Number.parseInt(e.target.value) || 1 })}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">sesiones</span>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            {previewDates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Label className="text-sm font-medium">Vista previa ({previewDates.length} sesiones)</Label>
                </div>

                {previewDates.length > 10 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Se crearán {previewDates.length} actividades. Considera reducir el período o aumentar el
                      intervalo.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-muted/50 rounded-md">
                  {previewDates.slice(0, 10).map((date, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span>{format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}</span>
                      <Badge variant="outline" className="text-xs">
                        Sesión {index + 1}
                      </Badge>
                    </div>
                  ))}
                  {previewDates.length > 10 && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      ... y {previewDates.length - 10} sesiones más
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  📅 Cada {getFrequencyLabel()} •
                  {localConfig.endType === "date"
                    ? ` Hasta ${format(localConfig.endDate, "dd/MM/yyyy")}`
                    : ` ${localConfig.count} sesiones total`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
