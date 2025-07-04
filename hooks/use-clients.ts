"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Client, ClientInsert, ClientUpdate } from "@/types/calendar"

export interface UseClientsReturn {
  clients: Client[]
  loading: boolean
  error: string | null
  searchClients: (query: string) => Client[]
  createClient: (clientData: ClientInsert) => Promise<Client>
  updateClient: (id: number, clientData: ClientUpdate) => Promise<Client>
  deleteClient: (id: number) => Promise<void>
  refreshClients: () => Promise<void>
}

export function useClients(organizationId?: number): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!organizationId) {
        console.log("No organizationId provided, skipping clients fetch")
        setClients([])
        return
      }

      console.log("Fetching clients for organization:", organizationId)

      const { data, error: fetchError } = await supabase
        .from("clients")
        .select("*")
        
        .eq("organization_id", organizationId)
        .order("name", { ascending: true })

      if (fetchError) {
        console.error("Error fetching clients:", fetchError)
        setError(fetchError.message)
        setClients([])
      } else {
        console.log("Clients fetched successfully:", data?.length || 0, "clients")
        setClients(data || [])
        setError(null)
      }
    } catch (err) {
      console.error("Unexpected error fetching clients:", err)
      setError("Error inesperado al cargar clientes")
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (organizationId) {
      fetchClients()
    } else {
      setLoading(false)
      setClients([])
    }
  }, [organizationId])

  const searchClients = (query: string): Client[] => {
    if (!query.trim()) return clients

    const searchTerm = query.toLowerCase().trim()
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm) ||
        client.phone?.toLowerCase().includes(searchTerm) ||
        client.email?.toLowerCase().includes(searchTerm),
    )
  }

  const createClient = async (clientData: ClientInsert): Promise<Client> => {
    try {
      const { data, error: insertError } = await supabase.from("clients").insert(clientData).select().single()

      if (insertError) {
        throw insertError
      }

      setClients((prev) => [...prev, data])
      return data
    } catch (err) {
      console.error("Error creating client:", err)
      throw err
    }
  }

  const updateClient = async (id: number, clientData: ClientUpdate): Promise<Client> => {
    try {
      const { data, error: updateError } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      setClients((prev) => prev.map((client) => (client.id === id ? data : client)))
      return data
    } catch (err) {
      console.error("Error updating client:", err)
      throw err
    }
  }

  const deleteClient = async (id: number): Promise<void> => {
    try {
      const { error: deleteError } = await supabase.from("clients").delete().eq("id", id)

      if (deleteError) {
        throw deleteError
      }

      setClients((prev) => prev.filter((client) => client.id !== id))
    } catch (err) {
      console.error("Error deleting client:", err)
      throw err
    }
  }

  const refreshClients = async (): Promise<void> => {
    await fetchClients()
  }

  return {
    clients,
    loading,
    error,
    searchClients,
    createClient,
    updateClient,
    deleteClient,
    refreshClients,
  }
}