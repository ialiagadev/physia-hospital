"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Organization, User } from "@/types/calendar"

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizationData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setCurrentUser(null)
        setOrganization(null)
        return
      }

      // Obtener datos del usuario desde la tabla users
      const { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", user.id).single()

      if (userError) throw userError

      setCurrentUser(userData)

      // Obtener datos de la organización
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userData.organization_id)
        .single()

      if (orgError) throw orgError

      setOrganization(orgData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching organization data")
      console.error("Error in useOrganization:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganizationData()
  }, [])

  return {
    organization,
    currentUser,
    loading,
    error,
    refetch: fetchOrganizationData,
  }
}
