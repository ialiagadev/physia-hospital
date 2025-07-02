"use client"

import { useState, useEffect } from "react"
import { UserService } from "@/lib/services/professionals"
import type { Professional } from "@/types/calendar"

export function useProfessionals() {
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

      setProfessionals(professionalsData)
      setCurrentUser(currentUserData)
      setAllUsers(allUsersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching data")
      console.error("Error in useProfessionals:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return {
    professionals, // Solo usuarios con rol "professional"
    currentUser, // Usuario actual logueado
    allUsers, // Todos los usuarios de la organización
    loading,
    error,
    refetch: fetchData,
  }
}
