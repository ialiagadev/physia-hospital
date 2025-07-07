"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"

export interface Professional {
  id: string
  name: string
}

export interface Service {
  id: number
  name: string
  duration: number
  color: string
  category: string | null
}

export interface Client {
  id: number
  name: string
  phone: string | null
  email: string | null
}

export function useWaitingListData(organizationId: number) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("type", 1)
        .order("name")

      if (error) throw error
      setProfessionals(data || [])
    } catch (err) {
      console.error("Error fetching professionals:", err)
    }
  }

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, duration, color, category")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("category, name")

      if (error) throw error
      setServices(data || [])
    } catch (err) {
      console.error("Error fetching services:", err)
    }
  }

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone, email")
        .eq("organization_id", organizationId)
        .order("name")

      if (error) throw error
      setClients(data || [])
    } catch (err) {
      console.error("Error fetching clients:", err)
    }
  }

  const searchClients = async (query: string) => {
    if (!query.trim()) return []

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, phone, email")
        .eq("organization_id", organizationId)
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(10)

      if (error) throw error
      return data || []
    } catch (err) {
      console.error("Error searching clients:", err)
      return []
    }
  }

  useEffect(() => {
    if (organizationId) {
      const fetchData = async () => {
        setLoading(true)
        await Promise.all([fetchProfessionals(), fetchServices(), fetchClients()])
        setLoading(false)
      }
      fetchData()
    }
  }, [organizationId])

  return {
    professionals,
    services,
    clients,
    loading,
    searchClients,
    refreshData: async () => {
      await Promise.all([fetchProfessionals(), fetchServices(), fetchClients()])
    },
  }
}
