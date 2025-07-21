"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { setAuditContext } from "@/lib/actions/time-tracking-audit"

interface UserProfile {
  id: string
  name: string | null
  email: string | null
  organization_id: number | null
  role: string | null
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
  user_id: string
  notes?: string | null
}

interface OrganizationUser {
  id: string
  name: string | null
  email: string | null
  role: string | null
  organization_id: number | null
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
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) throw profileError
        setUserProfile(profile)
        await getLastEntry(user.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const getLastEntry = async (userId?: string): Promise<TimeEntry | null> => {
    // Validar que el userId sea una cadena válida y no esté vacía
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      console.log("getLastEntry: ID de usuario inválido o vacío")
      return null
    }

    try {
      const { data, error } = await supabase
        .from("time_entries_with_user")
        .select("*")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // PGRST116 es el código cuando no hay resultados, no es un error real
        if (error.code !== "PGRST116") {
          console.error("Error getting last entry:", error)
        }
        return null
      }

      setLastEntry(data)
      return data
    } catch (err) {
      console.error("Error getting last entry:", err)
      return null
    }
  }

  const clockInOut = async (
    userId: string,
    organizationId: number,
    entryType: "entrada" | "salida",
    isAdminAction = false,
  ) => {
    // Validar que el userId sea una cadena válida y no esté vacía
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return { success: false, error: "ID de usuario inválido" }
    }

    setLoading(true)
    setError(null)

    try {
      // Verificar el último entry para validar la secuencia
      const lastEntry = await getLastEntry(userId)

      // Validación de secuencia - mantener la validación pero permitir ciclos completos
      if (entryType === "entrada" && lastEntry?.entry_type === "entrada") {
        throw new Error("Ya tienes una entrada registrada. Debes fichar salida primero.")
      }

      if (entryType === "salida" && (!lastEntry || lastEntry.entry_type === "salida")) {
        throw new Error("No tienes una entrada registrada. Debes fichar entrada primero.")
      }

      // Establecer el contexto de auditoría antes de la operación
      if (user) {
        await setAuditContext(user.id, {
          isAdminAction,
          reason: isAdminAction ? `Fichaje ${entryType} para usuario ${userId} por administrador` : undefined,
          details: {
            entry_type: entryType,
            target_user_id: userId,
          },
        })
      }

      const { data, error: insertError } = await supabase
        .from("time_entries")
        .insert({
          user_id: userId,
          organization_id: organizationId,
          entry_type: entryType,
          timestamp: new Date().toISOString(),
          notes: isAdminAction ? `Fichaje realizado por administrador: ${userProfile?.name || user?.email}` : null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Actualizar el último entry después de un fichaje exitoso
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

  const updateWorkSession = async (
    sessionId: string,
    updates: {
      clock_in_time?: string | null
      clock_out_time?: string | null
      notes?: string | null
    },
    reason?: string,
  ) => {
    if (!userProfile || userProfile.role !== "admin") {
      return { success: false, error: "Sin permisos de administrador" }
    }

    try {
      // Establecer el contexto de auditoría antes de la operación
      if (user) {
        await setAuditContext(user.id, {
          isAdminAction: true,
          reason: reason || "Actualización manual de jornada por administrador",
          details: {
            session_id: sessionId,
            updates,
          },
        })
      }

      const { data, error } = await supabase
        .from("work_sessions")
        .update(updates)
        .eq("id", sessionId)
        .eq("organization_id", userProfile.organization_id)
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar registro"
      return { success: false, error: errorMessage }
    }
  }

  const deleteWorkSession = async (sessionId: string, reason?: string) => {
    if (!userProfile || userProfile.role !== "admin") {
      return { success: false, error: "Sin permisos de administrador" }
    }

    try {
      // Establecer el contexto de auditoría antes de la operación
      if (user) {
        await setAuditContext(user.id, {
          isAdminAction: true,
          reason: reason || "Eliminación manual de jornada por administrador",
          details: {
            session_id: sessionId,
          },
        })
      }

      const { error } = await supabase
        .from("work_sessions")
        .delete()
        .eq("id", sessionId)
        .eq("organization_id", userProfile.organization_id)

      if (error) throw error

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar registro"
      return { success: false, error: errorMessage }
    }
  }

  const createWorkSession = async (
    sessionData: {
      user_id: string
      work_date: string
      clock_in_time?: string | null
      clock_out_time?: string | null
      notes?: string | null
    },
    reason?: string,
  ) => {
    if (!userProfile || userProfile.role !== "admin") {
      return { success: false, error: "Sin permisos de administrador" }
    }

    try {
      // Establecer el contexto de auditoría antes de la operación
      if (user) {
        await setAuditContext(user.id, {
          isAdminAction: true,
          reason: reason || "Creación manual de jornada por administrador",
          details: {
            user_id: sessionData.user_id,
            work_date: sessionData.work_date,
          },
        })
      }

      const { data, error } = await supabase
        .from("work_sessions")
        .insert({
          ...sessionData,
          organization_id: userProfile.organization_id,
        })
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear registro"
      return { success: false, error: errorMessage }
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
        .select("id, name, email, role, organization_id, created_at")
        .eq("organization_id", userProfile.organization_id)
        .neq("type", 2)
        .order("name")

      if (error) throw error

      return { users: users || [] }
    } catch (err) {
      return { users: [], error: err instanceof Error ? err.message : "Error al cargar usuarios" }
    }
  }

  const refreshLastEntry = (userId?: string) => {
    if (userId) {
      getLastEntry(userId)
    } else if (user) {
      getLastEntry(user.id)
    }
  }

  return {
    user,
    userProfile,
    lastEntry,
    loading,
    error,
    refreshLastEntry,
    isAdmin: userProfile?.role === "admin",
    canManageUsers: userProfile?.role === "admin",
    canViewReports: userProfile?.role === "admin" || userProfile?.role === "viewer",
    // Funciones principales
    getLastEntry,
    clockInOut,
    getWorkDays,
    getOrganizationUsers,
    // Funciones de edición
    updateWorkSession,
    deleteWorkSession,
    createWorkSession,
  }
}
