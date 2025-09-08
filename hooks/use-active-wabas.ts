"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface ActiveWaba {
  id: number
  numero: string
  nombre: string
  token_proyecto: string
}

export function useActiveWabas(organizationId: number | null) {
  const [wabas, setWabas] = useState<ActiveWaba[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (!organizationId) {
      setWabas([])
      return
    }

    const fetchActiveWabas = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: canalOrg, error: canalError } = await supabase
          .from("canales_organizations")
          .select("id")
          .eq("id_organization", organizationId)
          .eq("estado", true)

        if (canalError) {
          throw new Error("Error fetching organization channels")
        }

        if (!canalOrg || canalOrg.length === 0) {
          setWabas([])
          return
        }

        const channelIds = canalOrg.map((canal) => canal.id)
        const { data: wabaData, error: wabaError } = await supabase
          .from("waba")
          .select("id, numero, nombre, token_proyecto")
          .in("id_canales_organization", channelIds)
          .eq("estado", 1) // Only active WABAs
          .not("token_proyecto", "is", null)

        if (wabaError) {
          throw new Error("Error fetching WABA projects")
        }

        setWabas(wabaData || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        setWabas([])
      } finally {
        setLoading(false)
      }
    }

    fetchActiveWabas()
  }, [organizationId, supabase])

  return { wabas, loading, error, hasActiveWabas: wabas.length > 0 }
}
