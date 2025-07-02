"use client"

import { useState, useEffect } from "react"
import { UserService } from "@/lib/services/users"
import { useAuth } from "@/app/contexts/auth-context"
import type { User } from "@/types/calendar"

export function useUsers(organizationId?: number) {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, userProfile } = useAuth()

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Verificar que hay una sesión activa antes de hacer las consultas
      if (!user || !userProfile || !organizationId) {
        if (!organizationId) {
          setUsers([])
          setCurrentUser(null)
          setLoading(false)
          return
        }
        throw new Error("No hay sesión activa")
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
  }

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
  }, [user, userProfile, organizationId])

  return {
    users,
    currentUser,
    loading,
    error,
    refetch: fetchData,
  }
}
