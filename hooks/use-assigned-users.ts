import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface AssignedUser {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: string | null
  organization_id: number | null
  is_physia_admin: boolean | null
  type: number | null
  prompt: string | null
  created_at: string
}

interface UseAssignedUsersReturn {
  users: AssignedUser[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAssignedUsers(conversationId: string): UseAssignedUsersReturn {
  const [users, setUsers] = useState<AssignedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAssignedUsers = async () => {
    if (!conversationId) {
      setUsers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .from('users_conversations')
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
        .eq('conversation_id', conversationId)

      if (supabaseError) {
        console.error('Error fetching assigned users:', supabaseError)
        setError(supabaseError.message)
        return
      }

      const assignedUsers: AssignedUser[] = (data || []).map((item: any) => ({
        id: item.users.id,
        email: item.users.email,
        name: item.users.name,
        avatar_url: item.users.avatar_url,
        role: item.users.role,
        organization_id: item.users.organization_id,
        is_physia_admin: item.users.is_physia_admin,
        type: item.users.type,
        prompt: item.users.prompt,
        created_at: item.users.created_at,
      }))

      setUsers(assignedUsers)
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Error inesperado al cargar usuarios asignados')
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

  return {
    users,
    loading,
    error,
    refetch
  }
}
