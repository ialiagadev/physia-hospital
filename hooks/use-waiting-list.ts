"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export interface WaitingListEntry {
  id: number
  created_at: string
  organization_id: number
  client_id: number
  professional_id: string | null
  service_id: number
  preferred_date_start: string
  preferred_date_end: string | null
  preferred_time_preference: "morning" | "afternoon" | "any"
  notes: string | null
  // Joined data
  client_name: string
  client_phone: string | null
  professional_name: string | null
  service_name: string
  service_duration: number
  service_color: string
  service_category: string | null
}

export interface CreateWaitingListEntry {
  client_id: number
  professional_id: string | null
  service_id: number
  preferred_date_start: string
  preferred_date_end: string | null
  preferred_time_preference: "morning" | "afternoon" | "any"
  notes: string | null
}

export function useWaitingList(organizationId: number) {
  const [entries, setEntries] = useState<WaitingListEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchWaitingList = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from("waiting_list")
        .select(`
          *,
          clients!waiting_list_client_id_fkey (
            name,
            phone
          ),
          users!waiting_list_professional_id_fkey (
            name
          ),
          services!waiting_list_service_id_fkey (
            name,
            duration,
            color,
            category
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true })

      if (error) throw error

      const formattedEntries: WaitingListEntry[] = data.map((entry: any) => ({
        id: entry.id,
        created_at: entry.created_at,
        organization_id: entry.organization_id,
        client_id: entry.client_id,
        professional_id: entry.professional_id,
        service_id: entry.service_id,
        preferred_date_start: entry.preferred_date_start,
        preferred_date_end: entry.preferred_date_end,
        preferred_time_preference: entry.preferred_time_preference,
        notes: entry.notes,
        client_name: entry.clients?.name || "Cliente desconocido",
        client_phone: entry.clients?.phone || null,
        professional_name: entry.users?.name || null,
        service_name: entry.services?.name || "Servicio desconocido",
        service_duration: entry.services?.duration || 30,
        service_color: entry.services?.color || "#3B82F6",
        service_category: entry.services?.category || null,
      }))

      setEntries(formattedEntries)
    } catch (err) {
      console.error("Error fetching waiting list:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      toast({
        title: "Error",
        description: "No se pudo cargar la lista de espera",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const addToWaitingList = async (entry: CreateWaitingListEntry) => {
    try {
      const { error } = await supabase.from("waiting_list").insert({
        ...entry,
        organization_id: organizationId,
      })

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Paciente añadido a la lista de espera",
      })

      // Refresh the list
      await fetchWaitingList()
      return true
    } catch (err) {
      console.error("Error adding to waiting list:", err)
      toast({
        title: "Error",
        description: "No se pudo añadir a la lista de espera",
        variant: "destructive",
      })
      return false
    }
  }

  const removeFromWaitingList = async (entryId: number) => {
    try {
      const { error } = await supabase
        .from("waiting_list")
        .delete()
        .eq("id", entryId)
        .eq("organization_id", organizationId)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Paciente eliminado de la lista de espera",
      })

      // Refresh the list
      await fetchWaitingList()
      return true
    } catch (err) {
      console.error("Error removing from waiting list:", err)
      toast({
        title: "Error",
        description: "No se pudo eliminar de la lista de espera",
        variant: "destructive",
      })
      return false
    }
  }

  const getDaysWaiting = (createdAt: string) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getTimePreferenceLabel = (preference: string) => {
    switch (preference) {
      case "morning":
        return "Mañanas"
      case "afternoon":
        return "Tardes"
      case "any":
        return "Cualquier hora"
      default:
        return "Cualquier hora"
    }
  }

  useEffect(() => {
    if (organizationId) {
      fetchWaitingList()
    }
  }, [organizationId])

  return {
    entries,
    loading,
    error,
    addToWaitingList,
    removeFromWaitingList,
    refreshWaitingList: fetchWaitingList,
    getDaysWaiting,
    getTimePreferenceLabel,
  }
}
