"use client"

import { useState, useEffect, useCallback } from "react"
import { UserService } from "@/lib/services/users"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import type { User } from "@/types/calendar"

interface UseUsersReturn {
  users: User[]
  currentUser: User | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  getUsersByService: (serviceId: number) => Promise<User[]>
}

export function useUsers(organizationId?: number): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, userProfile } = useAuth()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar que hay una sesión activa antes de hacer las consultas
      if (!user || !userProfile) {
        throw new Error("No hay sesión activa")
      }

      if (!organizationId) {
        setUsers([])
        setCurrentUser(null)
        setLoading(false)
        return
      }

      const [usersData, currentUserData] = await Promise.all([
        UserService.getUsersInOrganization(),
        UserService.getCurrentUser(),
      ])

      setUsers(usersData)
      setCurrentUser(currentUserData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error fetching data"
      setError(errorMessage)
      console.error("Error in useUsers:", err)
    } finally {
      setLoading(false)
    }
  }, [user, userProfile, organizationId])

  // SOLUCIÓN: Usar los usuarios ya cargados y filtrar por servicio
  const getUsersByService = useCallback(
    async (serviceId: number): Promise<User[]> => {
      if (!organizationId || !serviceId) {
        return []
      }

      try {
        // 1. Obtener los user_ids del servicio usando el contexto de auth correcto
        const { data: userServiceData, error: userServiceError } = await supabase
          .from("user_services")
          .select("user_id")
          .eq("service_id", serviceId)

        if (userServiceError) {
          console.error("Error obteniendo user_services:", userServiceError)
          return []
        }

        if (!userServiceData || userServiceData.length === 0) {
          return []
        }

        // 2. Extraer los IDs de usuario
        const userIds = userServiceData.map((item) => item.user_id).filter(Boolean)

        if (userIds.length === 0) {
          return []
        }

        // 3. CLAVE: Filtrar de los usuarios ya cargados en lugar de hacer nueva consulta
        // Esto respeta las RLS porque los usuarios ya fueron obtenidos con el contexto correcto
        const serviceUsers = users.filter((user) => userIds.includes(user.id) && user.type === 1)

        return serviceUsers
      } catch (err) {
        console.error("Error en getUsersByService:", err)
        return []
      }
    },
    [organizationId, users], // Agregar users como dependencia
  )

  useEffect(() => {
    if (user && userProfile && organizationId) {
      fetchData()
    } else if (!user) {
      setLoading(false)
      setError("Usuario no autenticado")
    } else if (!organizationId) {
      setLoading(false)
      setUsers([])
      setCurrentUser(null)
    }
  }, [fetchData])

  return {
    users,
    currentUser,
    loading,
    error,
    refetch: fetchData,
    getUsersByService,
  }
}
