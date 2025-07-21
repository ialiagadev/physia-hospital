"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

export function useUserServices(organizationId: number) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Memoizar la función con useCallback para evitar re-creaciones
  const getServicesByUser = useCallback(
    async (userId: string) => {
      if (!userId || !organizationId) return []

      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from("services")
          .select(`
          id,
          name,
          description,
          price,
          duration,
          color,
          category,
          active,
          user_services!inner(user_id)
        `)
          .eq("organization_id", organizationId)
          .eq("active", true)
          .eq("user_services.user_id", userId)
          .order("sort_order")
          .order("name")

        if (error) {
          console.error("Error fetching user services:", error)
          setError(error.message)
          return []
        }

        return data || []
      } catch (err) {
        console.error("Error in getServicesByUser:", err)
        setError("Error al obtener los servicios del usuario")
        return []
      } finally {
        setLoading(false)
      }
    },
    [organizationId],
  ) // ✅ Solo depende de organizationId

  // ✅ Memoizar también esta función
  const getUsersByService = useCallback(
    async (serviceId: number) => {
      if (!serviceId || !organizationId) return []

      setLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase
          .from("users")
          .select(`
          id,
          name,
          email,
          type,
          user_services!inner(service_id)
        `)
          .eq("user_services.service_id", serviceId)
          .eq("type", 1) // Solo profesionales
          .order("name")

        if (error) {
          console.error("Error fetching service users:", error)
          setError(error.message)
          return []
        }

        return data || []
      } catch (err) {
        console.error("Error in getUsersByService:", err)
        setError("Error al obtener los usuarios del servicio")
        return []
      } finally {
        setLoading(false)
      }
    },
    [organizationId],
  ) // ✅ Solo depende de organizationId

  return {
    getServicesByUser,
    getUsersByService,
    loading,
    error,
  }
}
