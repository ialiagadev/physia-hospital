"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  name: string | null
  email: string | null
  organization_id: number | null
  role: string | null // 'admin' | 'user' | 'viewer'
}

interface TimeEntry {
  id: string
  entry_type: "entrada" | "salida"
  local_timestamp: string
  user_name: string | null
  notes?: string | null
}

interface WorkSession {
  id: string
  work_date: string
  local_clock_in: string | null
  local_clock_out: string | null
  total_hours: number | null
  status: string | null
  user_name: string | null
  user_email: string | null
}

interface OrganizationUser {
  id: string
  name: string | null
  email: string | null
  role: string | null
  created_at: string
}

export function useTimeTracking() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      setUser(user)

      if (user) {
        // Obtener perfil del usuario
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) throw profileError
        setUserProfile(profile)

        // Obtener último fichaje
        await getLastEntry(user.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const getLastEntry = async (userId?: string) => {
    if (!user && !userId) return null

    const targetUserId = userId || user?.id
    if (!targetUserId) return null

    try {
      const { data, error } = await supabase
        .from("time_entries_with_user")
        .select("*")
        .eq("user_id", targetUserId)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") throw error
      setLastEntry(data)
      return data
    } catch (err) {
      console.error("Error getting last entry:", err)
      return null
    }
  }

  const clockInOut = async (userId: string, organizationId: number, entryType: "entrada" | "salida") => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from("time_entries")
        .insert({
          user_id: userId,
          organization_id: organizationId,
          entry_type: entryType,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Actualizar último fichaje
      await getLastEntry(userId)

      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al fichar"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const getWorkDays = async ({
    userId,
    organizationId,
    page = 1,
    pageSize = 20,
    startDate,
    endDate,
  }: {
    userId?: string
    organizationId: number
    page?: number
    pageSize?: number
    startDate?: string
    endDate?: string
  }) => {
    try {
      const offset = (page - 1) * pageSize

      let query = supabase
        .from("work_sessions_with_user")
        .select("*", { count: "exact" })
        .eq("organization_id", organizationId)
        .order("work_date", { ascending: false })

      if (userId) {
        query = query.eq("user_id", userId)
      }

      if (startDate) {
        query = query.gte("work_date", startDate)
      }

      if (endDate) {
        query = query.lte("work_date", endDate)
      }

      const { data: sessions, error, count } = await query.range(offset, offset + pageSize - 1)

      if (error) throw error

      return {
        sessions: sessions || [],
        totalRecords: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        currentPage: page,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al obtener jornadas"
      return { sessions: [], totalRecords: 0, totalPages: 0, currentPage: 1, error: errorMessage }
    }
  }

  const getOrganizationUsers = async (): Promise<{ users: OrganizationUser[]; error?: string }> => {
    if (!userProfile || userProfile.role !== "admin") {
      return { users: [], error: "Sin permisos de administrador" }
    }

    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, name, email, role, created_at")
        .eq("organization_id", userProfile.organization_id)
        .order("name")

      if (error) throw error

      return { users: users || [] }
    } catch (err) {
      return { users: [], error: err instanceof Error ? err.message : "Error al cargar usuarios" }
    }
  }

  const refreshLastEntry = (userId?: string) => {
    getLastEntry(userId)
  }

  return {
    user,
    userProfile,
    lastEntry,
    loading,
    error,
    refreshLastEntry,
    isAdmin: userProfile?.role === "admin",
    canManageUsers: userProfile?.role === "admin", // Solo admins pueden gestionar usuarios
    canViewReports: userProfile?.role === "admin" || userProfile?.role === "viewer", // Admins y viewers pueden ver reportes
    // Funciones
    getLastEntry,
    clockInOut,
    getWorkDays,
    getOrganizationUsers,
  }
}
