"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { TimeEntry, WorkDayWithUser } from "@/types/time-tracking"

export function useTimeTracking(organizationId: number) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fichar entrada o salida
  const clockInOut = async (userId: string, entryType: "entrada" | "salida") => {
    setLoading(true)
    setError(null)

    try {
      const now = new Date()

      const { error: insertError } = await supabase.from("simple_time_entries").insert({
        user_id: userId,
        organization_id: organizationId,
        entry_type: entryType,
        entry_timestamp: now.toISOString(),
      })

      if (insertError) throw insertError

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al fichar"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Obtener último fichaje del usuario
  const getLastEntry = async (userId: string): Promise<TimeEntry | null> => {
    try {
      const { data, error } = await supabase
        .from("simple_time_entries")
        .select("*")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .order("entry_timestamp", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") throw error

      // Convertir UTC a Madrid sumando las horas de diferencia
      if (data) {
        const utcDate = new Date(data.entry_timestamp)
        // Sumar 2 horas para horario de verano (CEST) o 1 hora para horario de invierno (CET)
        // En junio es horario de verano, así que sumamos 2 horas
        const madridDate = new Date(utcDate.getTime() + 2 * 60 * 60 * 1000)

        return {
          ...data,
          entry_timestamp: madridDate.toISOString(),
        }
      }

      return null
    } catch (err) {
      console.error("Error getting last entry:", err)
      return null
    }
  }

  // Obtener jornadas de trabajo en un rango de fechas
  const getWorkDays = async (startDate: string, endDate: string): Promise<WorkDayWithUser[]> => {
    try {
      const { data, error } = await supabase
        .from("work_days_with_user")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error getting work days:", err)
      return []
    }
  }

  // Obtener usuarios de la organización
  const getOrganizationUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("organization_id", organizationId)
        .order("name")

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error getting users:", err)
      return []
    }
  }

  return {
    loading,
    error,
    clockInOut,
    getLastEntry,
    getWorkDays,
    getOrganizationUsers,
  }
}
