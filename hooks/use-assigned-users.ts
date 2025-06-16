"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@/types/chat"

export function useAssignedUsers(userIds: string[] | undefined) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!userIds || userIds.length === 0) {
          setUsers([])
          setLoading(false)
          return
        }

        // Consultar usuarios reales de la base de datos
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .in("id", userIds)
          .order("name", { ascending: true })

        if (error) {
          console.error("Error fetching assigned users:", error)
          setError(error.message)
          return
        }

        setUsers(data || [])
      } catch (err) {
        console.error("Unexpected error:", err)
        setError("Error inesperado al cargar usuarios asignados")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [userIds])

  return { users, loading, error }
}
