"use client"

import { useState, useEffect, useCallback } from "react"
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
  entry_type: "entrada" | "salida" | "pausa_inicio" | "pausa_fin"
  local_timestamp: string
  user_name: string | null
  notes?: string | null
}

interface ActivePause {
  id: string
  local_pause_start: string
  pause_number: number
}

interface WorkSession {
  id: string
  work_date: string
  clock_in_time: string | null
  clock_out_time: string | null
  total_minutes: number | null
  status: string | null
  user_name: string | null
  user_email: string | null
  user_id: string
  notes?: string | null
  created_at?: string
  updated_at?: string
  organization_id?: number
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

  const getLastEntry = useCallback(async (userId?: string): Promise<TimeEntry | null> => {
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return null
    }

    try {
      const { data, error } = await supabase
        .from("time_entries_with_user")
        .select("*")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("Error getting last entry:", error)
        return null
      }

      if (data) {
        setLastEntry(data)
        return data
      }

      setLastEntry(null)
      return null
    } catch (err) {
      console.error("Error getting last entry:", err)
      return null
    }
  }, [])

  const getActivePause = useCallback(async (userId: string): Promise<ActivePause | null> => {
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return null
    }

    try {
      const today = new Date().toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("work_pauses_with_user")
        .select("*")
        .eq("user_id", userId)
        .eq("work_date", today)
        .is("pause_end", null)
        .order("pause_start", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error("Error getting active pause:", error)
        return null
      }

      return data
    } catch (err) {
      console.error("Error getting active pause:", err)
      return null
    }
  }, [])

  const clockInOut = async (
    userId: string,
    organizationId: number,
    entryType: "entrada" | "salida" | "pausa_inicio" | "pausa_fin",
    isAdminAction = false,
  ) => {
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return { success: false, error: "ID de usuario inválido" }
    }

    setLoading(true)
    setError(null)

    try {
      // Verificar el último entry y pausa activa para validar la secuencia
      const [lastEntry, activePause] = await Promise.all([getLastEntry(userId), getActivePause(userId)])

      // Validaciones de secuencia
      if (entryType === "entrada") {
        // Solo validar si la última entrada no tiene salida
        if (lastEntry?.entry_type === "entrada") {
          throw new Error("Ya tienes una entrada registrada. Debes fichar salida primero.")
        }
        if (activePause) {
          throw new Error("Tienes una pausa activa. Debes finalizarla primero.")
        }
      }

      if (entryType === "salida") {
        if (!lastEntry || lastEntry.entry_type === "salida") {
          throw new Error("No tienes una entrada registrada. Debes fichar entrada primero.")
        }
        if (activePause) {
          throw new Error("Tienes una pausa activa. Debes finalizarla antes de fichar salida.")
        }
      }

      if (entryType === "pausa_inicio") {
        if (!lastEntry || (lastEntry.entry_type !== "entrada" && lastEntry.entry_type !== "pausa_fin")) {
          throw new Error("Debes tener una entrada registrada para iniciar una pausa.")
        }
        if (activePause) {
          throw new Error("Ya tienes una pausa activa. Debes finalizarla primero.")
        }
      }

      if (entryType === "pausa_fin") {
        if (!activePause) {
          throw new Error("No tienes ninguna pausa activa para finalizar.")
        }
      }

      // Establecer contexto de auditoría
      if (user) {
        try {
          await setAuditContext(user.id, {
            isAdminAction,
            reason: isAdminAction ? `Fichaje ${entryType} para usuario ${userId} por administrador` : undefined,
            details: {
              entry_type: entryType,
              target_user_id: userId,
            },
          })
        } catch (auditError) {
          console.warn("Error setting audit context:", auditError)
        }
      }

      // Preparar datos para inserción
      const now = new Date()
      const insertData = {
        user_id: userId,
        organization_id: organizationId,
        entry_type: entryType,
        timestamp: now.toISOString(),
        local_timestamp: now.toISOString(),
        notes: isAdminAction ? `Fichaje realizado por administrador: ${userProfile?.name || user?.email}` : null,
      }

      console.log("Insertando datos:", insertData)

      // Insertar entrada
      const { error: insertError } = await supabase.from("time_entries").insert(insertData)

      if (insertError) {
        console.error("Error de inserción:", insertError)
        throw insertError
      }

      // Esperar para que los triggers procesen
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Actualizar el último entry
      await getLastEntry(userId)

      return { success: true, data: { id: "temp-id", ...insertData } }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al fichar"
      console.error("Error en clockInOut:", err)
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
      if (user) {
        try {
          await setAuditContext(user.id, {
            isAdminAction: true,
            reason: reason || "Actualización manual de jornada por administrador",
            details: {
              session_id: sessionId,
              updates,
            },
          })
        } catch (auditError) {
          console.warn("Error setting audit context:", auditError)
        }
      }

      // Primero obtenemos la sesión actual para tener todos los datos
      const { data: currentSession, error: fetchError } = await supabase
        .from("work_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("organization_id", userProfile.organization_id)
        .single()

      if (fetchError) throw fetchError

      // Preparar los updates con los campos calculados
      const finalUpdates: any = { ...updates }

      // Si se están actualizando los horarios, recalcular total_minutes y status
      if (updates.clock_in_time !== undefined || updates.clock_out_time !== undefined) {
        const clockIn = updates.clock_in_time !== undefined ? updates.clock_in_time : currentSession.clock_in_time
        const clockOut = updates.clock_out_time !== undefined ? updates.clock_out_time : currentSession.clock_out_time

        if (clockIn && clockOut) {
          // Convertir las horas a timestamps completos para el cálculo
          const workDate = currentSession.work_date
          const startTime = new Date(`${workDate}T${clockIn}`)
          const endTime = new Date(`${workDate}T${clockOut}`)

          // Calcular tiempo bruto en minutos
          const grossMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

          // Obtener pausas del día para calcular tiempo neto
          const { data: pauses, error: pausesError } = await supabase
            .from("work_pauses")
            .select("pause_start, pause_end")
            .eq("user_id", currentSession.user_id)
            .eq("work_date", workDate)
            .not("pause_end", "is", null)

          if (pausesError) {
            console.warn("Error obteniendo pausas:", pausesError)
          }

          // Calcular tiempo total de pausas
          let totalPauseMinutes = 0
          if (pauses && pauses.length > 0) {
            totalPauseMinutes = pauses.reduce((total, pause) => {
              if (pause.pause_start && pause.pause_end) {
                const pauseStart = new Date(`${workDate}T${pause.pause_start}`)
                const pauseEnd = new Date(`${workDate}T${pause.pause_end}`)
                const pauseMinutes = Math.round((pauseEnd.getTime() - pauseStart.getTime()) / (1000 * 60))
                return total + pauseMinutes
              }
              return total
            }, 0)
          }

          // Tiempo neto = tiempo bruto - pausas
          const netMinutes = Math.max(0, grossMinutes - totalPauseMinutes)

          // Actualizar los campos calculados
          finalUpdates.total_minutes = netMinutes
          finalUpdates.status = "complete" // Usar el valor en inglés que espera la BD
        } else if (clockIn && !clockOut) {
          finalUpdates.status = "incomplete"
          finalUpdates.total_minutes = 0
        } else if (!clockIn && !clockOut) {
          finalUpdates.status = "incomplete"
          finalUpdates.total_minutes = 0
        }
      }

      console.log("Final updates:", finalUpdates)

      const { data, error } = await supabase
        .from("work_sessions")
        .update(finalUpdates)
        .eq("id", sessionId)
        .eq("organization_id", userProfile.organization_id)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar registro"
      console.error("Error updating work session:", err)
      return { success: false, error: errorMessage }
    }
  }

  const deleteWorkSession = async (sessionId: string, reason?: string) => {
    if (!userProfile || userProfile.role !== "admin") {
      return { success: false, error: "Sin permisos de administrador" }
    }

    try {
      if (user) {
        try {
          await setAuditContext(user.id, {
            isAdminAction: true,
            reason: reason || "Eliminación manual de jornada por administrador",
            details: {
              session_id: sessionId,
            },
          })
        } catch (auditError) {
          console.warn("Error setting audit context:", auditError)
        }
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
      if (user) {
        try {
          await setAuditContext(user.id, {
            isAdminAction: true,
            reason: reason || "Creación manual de jornada por administrador",
            details: {
              user_id: sessionData.user_id,
              work_date: sessionData.work_date,
            },
          })
        } catch (auditError) {
          console.warn("Error setting audit context:", auditError)
        }
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
        .from("work_sessions_with_pauses")
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

  const refreshLastEntry = useCallback(
    (userId?: string) => {
      if (userId) {
        getLastEntry(userId)
      } else if (user) {
        getLastEntry(user.id)
      }
    },
    [getLastEntry, user],
  )

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
    getActivePause,
    clockInOut,
    getWorkDays,
    getOrganizationUsers,
    // Funciones de edición
    updateWorkSession,
    deleteWorkSession,
    createWorkSession,
  }
}
