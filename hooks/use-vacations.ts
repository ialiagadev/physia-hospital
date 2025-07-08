"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

interface VacationRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  status: string
  reason?: string
}

export function useVacations(organizationId?: number) {
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVacations = useCallback(async () => {
    if (!organizationId) {
      setVacationRequests([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("vacation_requests")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "approved")

      if (fetchError) {
        setError(fetchError.message)
        setVacationRequests([])
      } else {
        setVacationRequests(data || [])
      }
    } catch (err) {
      setError("Error al cargar vacaciones")
      setVacationRequests([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Verificar si un usuario está de vacaciones en una fecha específica
  const isUserOnVacation = useCallback(
    (userId: string, date: Date | string): boolean => {
      const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0]
      return vacationRequests.some(
        (vacation) => vacation.user_id === userId && vacation.start_date <= dateStr && vacation.end_date >= dateStr,
      )
    },
    [vacationRequests],
  )

  // Obtener la información de vacaciones de un usuario en una fecha
  const getUserVacation = useCallback(
    (userId: string, date: Date | string) => {
      const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0]
      return (
        vacationRequests.find(
          (vacation) => vacation.user_id === userId && vacation.start_date <= dateStr && vacation.end_date >= dateStr,
        ) || null
      )
    },
    [vacationRequests],
  )

  // Obtener usuarios que están de vacaciones en una fecha
  const getUsersOnVacation = useCallback(
    (date: Date | string): string[] => {
      const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0]
      const usersOnVacation = vacationRequests
        .filter((vacation) => vacation.start_date <= dateStr && vacation.end_date >= dateStr)
        .map((vacation) => vacation.user_id)
      return [...new Set(usersOnVacation)]
    },
    [vacationRequests],
  )

  // Filtrar usuarios disponibles (no de vacaciones)
  const getAvailableUsers = useCallback(
    (users: any[], date: Date | string) => {
      const usersOnVacation = new Set(getUsersOnVacation(date))
      return users.filter((user) => !usersOnVacation.has(user.id))
    },
    [getUsersOnVacation],
  )

  useEffect(() => {
    fetchVacations()
  }, [fetchVacations])

  return {
    vacationRequests,
    loading,
    error,
    refetch: fetchVacations,
    isUserOnVacation,
    getUserVacation,
    getUsersOnVacation,
    getAvailableUsers,
  }
}
