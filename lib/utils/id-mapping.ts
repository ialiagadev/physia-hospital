import type { VacationRequest } from "@/hooks/use-vacation-requests"

/**
 * Mapea las vacaciones de UUIDs a IDs numéricos para compatibilidad con la UI
 */
export function mapVacationsToNumericIds(vacations: VacationRequest[], users: any[]): Record<number, VacationRequest> {
  const vacationsMap: Record<number, VacationRequest> = {}

  vacations.forEach((vacation) => {
    // Encontrar el usuario correspondiente
    const user = users.find((u) => u.id === vacation.user_id)
    if (user) {
      // Convertir UUID a ID numérico usando los últimos 8 caracteres
      const numericId = Number.parseInt(user.id.slice(-8), 16)
      vacationsMap[numericId] = vacation
    }
  })

  return vacationsMap
}

/**
 * Convierte un ID numérico de vuelta a UUID
 */
export function mapNumericIdToUuid(numericId: number, users: any[]): string | null {
  const user = users.find((u) => Number.parseInt(u.id.slice(-8), 16) === numericId)
  return user?.id || null
}

/**
 * Verifica si un profesional está de vacaciones en una fecha específica
 */
export function isProfessionalOnVacation(
  professionalId: number,
  date: Date,
  vacationsMap: Record<number, VacationRequest>,
): boolean {
  const vacation = vacationsMap[professionalId]
  if (!vacation || vacation.status !== "approved") {
    return false
  }

  const dateStr = date.toISOString().split("T")[0]
  return vacation.start_date <= dateStr && vacation.end_date >= dateStr
}

/**
 * Obtiene la información de vacaciones de un profesional
 */
export function getProfessionalVacationInfo(
  professionalId: number,
  vacationsMap: Record<number, VacationRequest>,
): VacationRequest | null {
  return vacationsMap[professionalId] || null
}
