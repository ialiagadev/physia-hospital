import { addWeeks, addMonths, isAfter, isBefore } from "date-fns"

export interface RecurrenceConfig {
  type: "weekly" | "monthly"
  interval: number
  endDate: Date
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

    if (config.interval > 12) {
      errors.push("El intervalo no puede ser mayor a 12")
    }

    if (!config.endDate) {
      errors.push("Debe seleccionar una fecha de finalización")
    }

    if (config.endDate && isBefore(config.endDate, new Date())) {
      errors.push("La fecha de finalización debe ser futura")
    }

    // Validar que no sea más de 2 años en el futuro
    const twoYearsFromNow = addMonths(new Date(), 24)
    if (config.endDate && isAfter(config.endDate, twoYearsFromNow)) {
      errors.push("La fecha de finalización no puede ser más de 2 años en el futuro")
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
}

export interface RecurrencePreview {
  dates: Date[]
  count: number
  conflicts: Date[]
}
