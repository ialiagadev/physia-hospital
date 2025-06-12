"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@/types/chat"

export function useAgents(organizationId: string | undefined) {
  const [agents, setAgents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!organizationId) {
        setAgents([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("type", 2) // Solo agentes IA
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching agents:", error)
        setError(error.message)
        setAgents([])
      } else {
        setAgents(data || [])
        setError(null)
      }
    } catch (err) {
      console.error("Unexpected error:", err)
      setError("Error inesperado al cargar agentes")
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  const createAgent = async (agentData: { name: string; prompt: string }) => {
    try {
      const newAgent = {
        name: agentData.name,
        email: null, // Sin email para agentes IA
        prompt: agentData.prompt,
        organization_id: organizationId,
        type: 2, // Agente IA
        id: crypto.randomUUID(),
      }

      const { data, error } = await supabase.from("users").insert(newAgent).select().single()

      if (error) {
        console.error("Supabase error creating agent:", error)
        throw error
      }

      // Actualizar el estado local inmediatamente
      setAgents((prev) => [...prev, data])
      console.log("Agent created successfully:", data)
      return data
    } catch (error) {
      console.error("Error creating agent:", error)
      throw error
    }
  }

  const updateAgent = async (agentId: string, updates: { name?: string; prompt?: string }) => {
    try {
      console.log("Updating agent:", agentId, updates)

      // Solo enviar los campos que existen en la tabla
      const updateData = {
        name: updates.name,
        prompt: updates.prompt,
      }

      const { data, error } = await supabase.from("users").update(updateData).eq("id", agentId).select().single()

      if (error) {
        console.error("Supabase error updating agent:", error)
        throw error
      }

      if (!data) {
        throw new Error("No data returned from update")
      }

      // Actualizar el estado local inmediatamente
      setAgents((prev) => {
        const updated = prev.map((agent) => (agent.id === agentId ? data : agent))
        console.log("Updated agents list:", updated)
        return updated
      })

      console.log("Agent updated successfully:", data)
      return data
    } catch (error) {
      console.error("Error updating agent:", error)
      throw error
    }
  }

  const deleteAgent = async (agentId: string) => {
    try {
      const { error } = await supabase.from("users").delete().eq("id", agentId)

      if (error) {
        console.error("Supabase error deleting agent:", error)
        throw error
      }

      // Actualizar el estado local inmediatamente
      setAgents((prev) => prev.filter((agent) => agent.id !== agentId))
      console.log("Agent deleted successfully:", agentId)
    } catch (error) {
      console.error("Error deleting agent:", error)
      throw error
    }
  }

  return {
    agents,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    refetch: fetchAgents, // Función completa de refetch
  }
}
