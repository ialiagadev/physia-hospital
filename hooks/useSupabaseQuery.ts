"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"

type QueryOptions = {
  enabled?: boolean
  refetchOnWindowFocus?: boolean
}

export function useSupabaseQuery<T = any>(table: string, query = "*", options: QueryOptions = {}) {
  const [data, setData] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user, isLoading: authLoading } = useAuth()

  const { enabled = true, refetchOnWindowFocus = false } = options

  const fetchData = useCallback(async () => {
    if (!enabled || authLoading || !user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log(`🔍 Fetching data from ${table}`)

      const { data: result, error } = await supabase.from(table).select(query)

      if (error) {
        throw error
      }

      // Usamos type assertion para asegurar que el tipo es correcto
      setData((result || []) as T[])
      console.log(`✅ Data fetched from ${table}:`, result?.length, "records")
    } catch (err) {
      console.error(`❌ Error fetching from ${table}:`, err)
      const errorMessage = err instanceof Error ? err.message : "Error desconocido"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [table, query, enabled, authLoading, user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refetch cuando la ventana vuelve a tener foco
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      if (!document.hidden) {
        console.log(`👁️ Window focused - refetching ${table}`)
        fetchData()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleFocus)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleFocus)
    }
  }, [fetchData, refetchOnWindowFocus, table])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}
