"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

interface AssignedUser {
  id: string
  email: string
  name?: string
  avatar_url?: string
  role?: string
  organization_id: number
  is_physia_admin: boolean
  type: number
  prompt?: string
  created_at: string
}

export function useAssignedUsers(conversationId: string) {
  const [users, setUsers] = useState<AssignedUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssignedUsers = async () => {
    if (!conversationId) {
      setUsers([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from("users_conversations")
        .select(`
          user_id,
          users!inner (
            id,
            email,
            name,
            avatar_url,
            role,
            organization_id,
            is_physia_admin,
            type,
            prompt,
            created_at
          )
        `)
        .eq("conversation_id", conversationId)

      if (error) throw error

      // Mapear los datos para que coincidan con la interfaz AssignedUser
      const mappedUsers: AssignedUser[] = (data || []).map((item: any) => ({
        id: item.users.id,
        email: item.users.email,
        name: item.users.name || undefined,
        avatar_url: item.users.avatar_url || undefined,
        role: item.users.role || undefined,
        organization_id: item.users.organization_id,
        is_physia_admin: item.users.is_physia_admin || false,
        type: item.users.type || 1,
        prompt: item.users.prompt || undefined,
        created_at: item.users.created_at,
      }))

      setUsers(mappedUsers)
    } catch (err) {
      console.error("Error fetching assigned users:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignedUsers()
  }, [conversationId])

  const refetch = () => {
    fetchAssignedUsers()
  }

  return { users, loading, error, refetch }
}
