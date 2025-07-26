"use client"

import { useState, useEffect } from "react"
import { UserService } from "@/lib/services/professionals"
import type { Professional } from "@/types/calendar"
import { useAuth } from "@/app/contexts/auth-context"

export function useProfessionals() {
  const { userProfile } = useAuth()
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [currentUser, setCurrentUser] = useState<Professional | null>(null)
  const [allUsers, setAllUsers] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [professionalsData, currentUserData, allUsersData] = await Promise.all([
        UserService.getProfessionalsInOrganization(),
        UserService.getCurrentUser(),
        UserService.getUsersInOrganization(),
      ])

      // 🆕 FILTRAR SEGÚN EL ROL DEL USUARIO
      const isUserRole = userProfile?.role === "user"

      if (isUserRole && currentUserData) {
        // Para usuarios 'user', solo mostrar a sí mismos
        const currentUserAsProfessional = professionalsData.find((p) => p.id === currentUserData.id)
        setProfessionals(currentUserAsProfessional ? [currentUserAsProfessional] : [])
        setAllUsers([currentUserData])
      } else {
        // Para admin/coordinador, mostrar todos como antes
        setProfessionals(professionalsData)
        setAllUsers(allUsersData)
      }

      setCurrentUser(currentUserData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching data")
      console.error("Error in useProfessionals:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userProfile?.role]) // 🆕 Recargar cuando cambie el rol

  return {
    professionals, // Solo usuarios con rol "professional" (filtrado por rol del usuario actual)
    currentUser, // Usuario actual logueado
    allUsers, // Todos los usuarios de la organización (filtrado por rol del usuario actual)
    loading,
    error,
    refetch: fetchData,
  }
}
