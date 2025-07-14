"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarDays, Clock, AlertTriangle } from "lucide-react"
import { format, addDays, addWeeks, addMonths, isAfter, isValid, parse } from "date-fns"
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

// ✅ FUNCIONES PARA LA MÁSCARA DE FECHA
const formatDateMask = (value: string): string => {
  // Quitar todo lo que no sean números
  const numbers = value.replace(/\D/g, "")

  // Aplicar formato DD/MM/YYYY progresivamente
  if (numbers.length === 0) return ""
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`

  // Limitar a 8 dígitos máximo
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`
}

const parseDateFromMask = (maskedValue: string): Date | null => {
  // Quitar las barras y obtener solo números
  const numbers = maskedValue.replace(/\D/g, "")

  // Necesitamos exactamente 8 dígitos para una fecha completa
  if (numbers.length !== 8) return null

  const day = numbers.slice(0, 2)
  const month = numbers.slice(2, 4)
  const year = numbers.slice(4, 8)

  // Validar rangos básicos
  const dayNum = Number.parseInt(day, 10)
  const monthNum = Number.parseInt(month, 10)
  const yearNum = Number.parseInt(year, 10)

  if (dayNum < 1 || dayNum > 31) return null
  if (monthNum < 1 || monthNum > 12) return null
  if (yearNum < 1900 || yearNum > 2100) return null

  // Crear fecha y validar que sea válida
  try {
    const date = parse(`${day}/${month}/${year}`, "dd/MM/yyyy", new Date())
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

const formatDateForMask = (date: Date): string => {
  if (!date || !isValid(date)) return ""
  return format(date, "dd/MM/yyyy")
}

// ✅ FUNCIÓN PARA CONVERTIR FECHA A FORMATO INPUT DATE (YYYY-MM-DD)
const formatDateForInput = (date: Date): string => {
  if (!date || !isValid(date)) return ""
  return format(date, "yyyy-MM-dd")
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

  // Estado para el input de fecha con máscara
  const [dateInputValue, setDateInputValue] = useState<string>("")

  // Sincronizar config local con prop externa solo cuando cambia externamente
  useEffect(() => {
    if (config && config.endDate && isValid(config.endDate) && JSON.stringify(config) !== JSON.stringify(localConfig)) {
      setLocalConfig(config)
      setDateInputValue(formatDateForMask(config.endDate))
    }
  }, [config])

  // Sincronizar el input de fecha cuando cambia localConfig.endDate
  useEffect(() => {
    if (localConfig.endDate && isValid(localConfig.endDate)) {
      const formattedDate = formatDateForMask(localConfig.endDate)
      if (formattedDate !== dateInputValue) {
        setDateInputValue(formattedDate)
      }
    }
  }, [localConfig.endDate])

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

  // Manejar cambio en el input de fecha con máscara
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const maskedValue = formatDateMask(inputValue)

    setDateInputValue(maskedValue)

    // Intentar parsear la fecha si está completa
    const parsedDate = parseDateFromMask(maskedValue)
    if (parsedDate) {
      // Validar que sea posterior a startDate
      if (isAfter(parsedDate, startDate)) {
        updateConfig({ endDate: parsedDate })
      }
    }
  }

  // ✅ MANEJAR CAMBIO EN EL INPUT DATE
  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value // Formato YYYY-MM-DD
    if (dateValue) {
      const selectedDate = new Date(dateValue + "T00:00:00") // Evitar problemas de zona horaria
      if (isValid(selectedDate) && isAfter(selectedDate, startDate)) {
        updateConfig({ endDate: selectedDate })
        setDateInputValue(formatDateForMask(selectedDate))
      }
    }
  }

  const getFrequencyLabel = () => {
    if (localConfig.type === "weekly") {
      return localConfig.interval === 1 ? "semana" : `${localConfig.interval} semanas`
    }
    return localConfig.interval === 1 ? "mes" : `${localConfig.interval} meses`
  }

  // Calcular fecha mínima para validación visual
  const minDateFormatted = format(addDays(startDate, 1), "dd/MM/yyyy")
  const minDateForInput = formatDateForInput(addDays(startDate, 1))

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
                  <div className="ml-6 space-y-2">
                    {/* Input con máscara + input date oculto con referencia */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          value={dateInputValue}
                          onChange={handleDateInputChange}
                          className="font-mono"
                          maxLength={10}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Escribe: ej. 15012024</p>
                      </div>
                      <div className="relative">
                        {/* Input date oculto */}
                        <input
                          ref={(el) => {
                            if (el) {
                              // Guardar referencia para poder activarlo desde el icono
                              ;(window as any).datePickerRef = el
                            }
                          }}
                          type="date"
                          value={formatDateForInput(localConfig.endDate)}
                          onChange={handleDatePickerChange}
                          min={minDateForInput}
                          className="absolute opacity-0 pointer-events-none"
                        />
                        {/* Icono clickeable que activa el date picker */}
                        <div
                          className="w-10 h-10 border border-input rounded-md flex items-center justify-center bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                          onClick={() => {
                            // Activar el input date oculto
                            const dateInput = (window as any).datePickerRef
                            if (dateInput) {
                              dateInput.showPicker?.() || dateInput.focus()
                            }
                          }}
                        >
                          📅
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 text-center">Calendario</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Fecha mínima: {minDateFormatted}</p>
                  </div>
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
