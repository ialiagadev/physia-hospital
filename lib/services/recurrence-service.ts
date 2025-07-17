import { addDays, addWeeks, addMonths, isAfter, isBefore } from "date-fns"

// ✅ INTERFAZ ACTUALIZADA CON "daily"
export interface RecurrenceConfig {
  type: "daily" | "weekly" | "monthly"
  interval: number
  endDate: Date
}

export interface RecurrencePreview {
  dates: Date[]
  count: number
  conflicts: Date[]
}

export class RecurrenceService {
  /**
   * Genera las fechas para una serie recurrente
   */
  static generateRecurringDates(startDate: Date, config: RecurrenceConfig, maxInstances = 100): Date[] {
    const dates: Date[] = []
    let currentDate = new Date(startDate)

    // ✅ SIEMPRE incluir la fecha inicial
    dates.push(new Date(currentDate))

    // ✅ GENERAR LAS FECHAS SIGUIENTES
    while (dates.length < maxInstances) {
      // Calcular la siguiente fecha según el tipo de recurrencia
      switch (config.type) {
        case "daily":
          currentDate = addDays(currentDate, config.interval)
          break
        case "weekly":
          currentDate = addWeeks(currentDate, config.interval)
          break
        case "monthly":
          currentDate = addMonths(currentDate, config.interval)
          break
        default:
          throw new Error(`Tipo de recurrencia no soportado: ${config.type}`)
      }

      // ✅ VERIFICAR SI LA NUEVA FECHA ESTÁ DENTRO DEL RANGO
      if (isAfter(currentDate, config.endDate)) {
        // Si la fecha calculada es posterior a la fecha límite, parar
        break
      }

      // ✅ AÑADIR LA FECHA VÁLIDA
      dates.push(new Date(currentDate))
    }

    return dates
  }

  /**
   * Genera preview de las fechas que se van a crear
   */
  static generatePreview(
    startDate: Date,
    config: RecurrenceConfig,
    existingAppointments: any[] = [],
  ): RecurrencePreview {
    const dates = this.generateRecurringDates(startDate, config)

    // Detectar conflictos (fechas que ya tienen citas)
    const conflicts = dates.filter((date) => {
      const dateStr = date.toISOString().split("T")[0]
      return existingAppointments.some((apt) => {
        const aptDateStr = new Date(apt.date).toISOString().split("T")[0]
        return aptDateStr === dateStr
      })
    })

    return {
      dates,
      count: dates.length,
      conflicts,
    }
  }

  /**
   * Valida la configuración de recurrencia
   */
  static validateRecurrenceConfig(config: RecurrenceConfig): string[] {
    const errors: string[] = []

    if (!config.type) {
      errors.push("Debe seleccionar un tipo de recurrencia")
    }

    if (!config.interval || config.interval < 1) {
      errors.push("El intervalo debe ser mayor a 0")
    }

    // ✅ VALIDACIONES ESPECÍFICAS POR TIPO
    if (config.type === "daily" && config.interval > 7) {
      errors.push("Para recurrencia diaria, el intervalo máximo es 7 días")
    }

    if (config.type === "weekly" && config.interval > 12) {
      errors.push("Para recurrencia semanal, el intervalo máximo es 12 semanas")
    }

    if (config.type === "monthly" && config.interval > 12) {
      errors.push("Para recurrencia mensual, el intervalo máximo es 12 meses")
    }

    if (!config.endDate) {
      errors.push("Debe seleccionar una fecha de finalización")
    }

    if (config.endDate && isBefore(config.endDate, new Date())) {
      errors.push("La fecha de finalización debe ser futura")
    }

    // ✅ VALIDAR LÍMITES SEGÚN EL TIPO
    const maxEndDate =
      config.type === "daily"
        ? addMonths(new Date(), 6) // 6 meses para diaria
        : config.type === "weekly"
          ? addMonths(new Date(), 12) // 1 año para semanal
          : addMonths(new Date(), 24) // 2 años para mensual

    if (config.endDate && isAfter(config.endDate, maxEndDate)) {
      const maxPeriod = config.type === "daily" ? "6 meses" : config.type === "weekly" ? "1 año" : "2 años"
      errors.push(
        `Para recurrencia ${config.type === "daily" ? "diaria" : config.type === "weekly" ? "semanal" : "mensual"}, el máximo es ${maxPeriod}`,
      )
    }

    return errors
  }

  /**
   * Formatea la descripción de la recurrencia para mostrar al usuario
   */
  static formatRecurrenceDescription(config: RecurrenceConfig): string {
    const { type, interval, endDate } = config
    const endDateStr = endDate.toLocaleDateString("es-ES")

    switch (type) {
      case "daily":
        if (interval === 1) {
          return `Cada día hasta el ${endDateStr}`
        } else {
          return `Cada ${interval} días hasta el ${endDateStr}`
        }
      case "weekly":
        if (interval === 1) {
          return `Cada semana hasta el ${endDateStr}`
        } else {
          return `Cada ${interval} semanas hasta el ${endDateStr}`
        }
      case "monthly":
        if (interval === 1) {
          return `Cada mes hasta el ${endDateStr}`
        } else {
          return `Cada ${interval} meses hasta el ${endDateStr}`
        }
      default:
        return `Recurrencia personalizada hasta el ${endDateStr}`
    }
  }

  /**
   * Calcula cuántas instancias se van a generar (para mostrar preview)
   */
  static calculateInstanceCount(startDate: Date, config: RecurrenceConfig): number {
    const dates = this.generateRecurringDates(startDate, config)
    return dates.length
  }

  /**
   * ✅ NUEVA: Obtiene las opciones de intervalo según el tipo
   */
  static getIntervalOptions(type: "daily" | "weekly" | "monthly"): number[] {
    switch (type) {
      case "daily":
        return [1, 2, 3, 4, 5, 6, 7] // Hasta una semana
      case "weekly":
        return [1, 2, 3, 4, 6, 8, 12] // Hasta 3 meses
      case "monthly":
        return [1, 2, 3, 4, 6, 12] // Hasta un año
      default:
        return [1]
    }
  }

  /**
   * ✅ NUEVA: Obtiene el límite máximo de fechas según el tipo
   */
  static getMaxInstances(type: "daily" | "weekly" | "monthly"): number {
    switch (type) {
      case "daily":
        return 180 // ~6 meses máximo
      case "weekly":
        return 52 // ~1 año máximo
      case "monthly":
        return 24 // ~2 años máximo
      default:
        return 50
    }
  }
}
