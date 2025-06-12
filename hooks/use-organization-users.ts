"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@/types/chat"

export function useOrganizationUsers(organizationId: string | undefined) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)

        if (!organizationId) {
          setUsers([])
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("organization_id", organizationId)
          .order("name", { ascending: true })

        if (error) {
          console.error("Error fetching users:", error)
          setError(error.message)
        } else {
          setUsers(data || [])
          setError(null)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setError("Error inesperado al cargar usuarios")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [organizationId])

  return { users, loading, error }
}
