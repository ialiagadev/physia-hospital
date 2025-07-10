"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

interface VacationRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  status: "pending" | "approved" | "rejected"
  reason?: string
  organization_id?: number
  created_at?: string
  updated_at?: string
}

interface UseVacationsReturn {
  vacationRequests: VacationRequest[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isUserOnVacation: (userId: string, date: Date | string) => boolean
  getUserVacation: (userId: string, date: Date | string) => VacationRequest | null
  getUsersOnVacation: (date: Date | string) => string[]
  getAvailableUsers: (users: any[], date: Date | string) => any[]
}

export function useVacations(organizationId?: number): UseVacationsReturn {
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
        .order("start_date", { ascending: true })

      if (fetchError) {
        console.error("Error fetching vacations:", fetchError)
        setError(fetchError.message)
        setVacationRequests([])
      } else {
        setVacationRequests(data || [])
      }
    } catch (err) {
      console.error("Unexpected error in fetchVacations:", err)
      const errorMessage = err instanceof Error ? err.message : "Error al cargar vacaciones"
      setError(errorMessage)
      setVacationRequests([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Función helper para normalizar fechas
  const normalizeDate = useCallback((date: Date | string): string => {
    if (typeof date === "string") {
      return date.split("T")[0]
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }, [])

  // Verificar si un usuario está de vacaciones en una fecha específica
  const isUserOnVacation = useCallback(
    (userId: string, date: Date | string): boolean => {
      if (!userId || vacationRequests.length === 0) return false

      const dateStr = normalizeDate(date)

      return vacationRequests.some(
        (vacation) => vacation.user_id === userId && vacation.start_date <= dateStr && vacation.end_date >= dateStr,
      )
    },
    [vacationRequests, normalizeDate],
  )

  // Obtener la información de vacaciones de un usuario en una fecha
  const getUserVacation = useCallback(
    (userId: string, date: Date | string): VacationRequest | null => {
      if (!userId || vacationRequests.length === 0) return null

      const dateStr = normalizeDate(date)

      return (
        vacationRequests.find(
          (vacation) => vacation.user_id === userId && vacation.start_date <= dateStr && vacation.end_date >= dateStr,
        ) || null
      )
    },
    [vacationRequests, normalizeDate],
  )

  // Obtener usuarios que están de vacaciones en una fecha
  const getUsersOnVacation = useCallback(
    (date: Date | string): string[] => {
      if (vacationRequests.length === 0) return []

      const dateStr = normalizeDate(date)

      const usersOnVacation = vacationRequests
        .filter((vacation) => vacation.start_date <= dateStr && vacation.end_date >= dateStr)
        .map((vacation) => vacation.user_id)

      return [...new Set(usersOnVacation)]
    },
    [vacationRequests, normalizeDate],
  )

  // Filtrar usuarios disponibles (no de vacaciones)
  const getAvailableUsers = useCallback(
    (users: any[], date: Date | string) => {
      if (!Array.isArray(users) || users.length === 0) {
        return []
      }

      try {
        const usersOnVacation = new Set(getUsersOnVacation(date))

        return users.filter((user) => {
          // Validación del objeto user
          if (!user || typeof user !== "object") {
            return false
          }

          // Obtener el ID del usuario
          let userId: string
          if (user.id) {
            userId = String(user.id)
          } else if (user.user_id) {
            userId = String(user.user_id)
          } else {
            return false
          }

          // Verificar que el ID sea válido
          if (!userId || userId === "undefined" || userId === "null") {
            return false
          }

          // Verificar si el usuario NO está de vacaciones
          return !usersOnVacation.has(userId)
        })
      } catch (error) {
        console.error("Error in getAvailableUsers:", error)
        return users // Devolver todos los usuarios si hay error
      }
    },
    [getUsersOnVacation],
  )

  useEffect(() => {
    fetchVacations()
  }, [organizationId])

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
