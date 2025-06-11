"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Client } from "@/types/chat"

export function useClients(organizationId: number | undefined) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        console.log("Fetching clients for organization:", organizationId)
        setLoading(true)

        if (!organizationId) {
          console.log("No organization ID provided")
          setClients([])
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("organization_id", organizationId)
          .order("name", { ascending: true })

        console.log("Clients query result:", { data, error })

        if (error) {
          console.error("Error fetching clients:", error)
          setError(error.message)
        } else {
          console.log("Clients loaded:", data)
          setClients(data || [])
          setError(null)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setError("Error inesperado al cargar clientes")
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [organizationId])

  return { clients, loading, error }
}
