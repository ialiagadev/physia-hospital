"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@/types/chat"

export function useOrganizationUsers(organizationId: string | undefined) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      if (!organizationId) {
        setUsers([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("is_active", true)
          .order("name")

        if (error) throw error
        
        setUsers(data || [])
        setError(null)
      } catch (err: any) {
        console.error("Error fetching organization users:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [organizationId])

  // Memoizar resultados para evitar re-renderizados innecesarios
  const memoizedUsers = useMemo(() => users, [users])

  return {
    users: memoizedUsers,
    loading,
    error
  }
}