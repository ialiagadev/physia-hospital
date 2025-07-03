"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export type VacationType = "vacation" | "sick_leave" | "personal" | "maternity" | "training" | "other"
export type VacationStatus = "pending" | "approved" | "rejected"

export interface VacationRequest {
  id: string
  user_id: string
  organization_id: string
  type: VacationType
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: VacationStatus
  created_at: string
  updated_at: string
}

export interface VacationRequestInsert {
  user_id: string
  organization_id: string
  type: VacationType
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: VacationStatus
}

export function useVacationRequests(organizationId?: number) {
  const [requests, setRequests] = useState<VacationRequest[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Función helper para notificar cambios globalmente
  const notifyGlobalUpdate = () => {
    // Disparar evento personalizado para notificar a otros componentes
    window.dispatchEvent(new CustomEvent("vacation-requests-updated"))
  }

  const getRequests = async (orgId?: number, userId?: string) => {
    if (!orgId) return

    setLoading(true)
    try {
      let query = supabase
        .from("vacation_requests")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })

      if (userId) {
        query = query.eq("user_id", userId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      setRequests(data || [])
    } catch (error) {
      console.error("Error fetching vacation requests:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createRequest = async (request: VacationRequestInsert) => {
    try {
      console.log("Creating request:", request)

      const { data, error } = await supabase.from("vacation_requests").insert([request]).select().single()

      if (error) {
        console.error("Supabase error creating request:", error)
        throw error
      }

      console.log("Request created successfully:", data)
      setRequests((prev) => [data, ...prev])

      // Notificar cambios globalmente
      notifyGlobalUpdate()

      return data
    } catch (error) {
      console.error("Error creating vacation request:", error)
      throw error
    }
  }

  const updateRequestStatus = async (requestId: string, status: VacationStatus) => {
    try {
      console.log("Updating request status:", { requestId, status })

      const { data, error } = await supabase
        .from("vacation_requests")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single()

      if (error) {
        console.error("Supabase error updating request:", error)
        throw error
      }

      console.log("Request updated successfully:", data)
      setRequests((prev) => prev.map((req) => (req.id === requestId ? { ...req, status } : req)))

      // Notificar cambios globalmente
      notifyGlobalUpdate()

      return data
    } catch (error) {
      console.error("Error updating vacation request:", error)
      throw error
    }
  }

  const deleteRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.from("vacation_requests").delete().eq("id", requestId)

      if (error) {
        console.error("Supabase error deleting request:", error)
        throw error
      }

      setRequests((prev) => prev.filter((req) => req.id !== requestId))
    } catch (error) {
      console.error("Error deleting vacation request:", error)
      throw error
    }
  }

  const getUserRequests = async (userId: string, organizationId: string) => {
    try {
      const { data, error } = await supabase
        .from("vacation_requests")
        .select("*")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error("Error fetching user requests:", error)
      return []
    }
  }

  const getUserVacationDays = async (userId: string, year: number) => {
    try {
      const { data, error } = await supabase
        .from("vacation_requests")
        .select("total_days")
        .eq("user_id", userId)
        .eq("status", "approved")
        .gte("start_date", `${year}-01-01`)
        .lte("end_date", `${year}-12-31`)

      if (error) throw error

      const totalDays = data?.reduce((sum, req) => sum + req.total_days, 0) || 0
      return totalDays
    } catch (error) {
      console.error("Error calculating vacation days:", error)
      return 0
    }
  }

  const isUserOnVacation = async (userId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from("vacation_requests")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "approved")
        .lte("start_date", date)
        .gte("end_date", date)

      if (error) throw error
      return (data?.length || 0) > 0
    } catch (error) {
      console.error("Error checking vacation status:", error)
      return false
    }
  }

  // Cargar automáticamente cuando cambia organizationId
  useEffect(() => {
    if (organizationId) {
      getRequests(organizationId)
    }
  }, [organizationId])

  // Suscripción en tiempo real
  useEffect(() => {
    if (!organizationId) return

    const channel = supabase
      .channel("vacation_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vacation_requests",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log("Real-time update:", payload)

          if (payload.eventType === "INSERT") {
            setRequests((prev) => [payload.new as VacationRequest, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setRequests((prev) =>
              prev.map((req) => (req.id === payload.new.id ? (payload.new as VacationRequest) : req)),
            )
          } else if (payload.eventType === "DELETE") {
            setRequests((prev) => prev.filter((req) => req.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId])

  // Listener para eventos globales de actualización
  useEffect(() => {
    const handleGlobalUpdate = () => {
      if (organizationId) {
        getRequests(organizationId)
      }
    }

    window.addEventListener("vacation-requests-updated", handleGlobalUpdate)

    return () => {
      window.removeEventListener("vacation-requests-updated", handleGlobalUpdate)
    }
  }, [organizationId])

  return {
    requests,
    loading,
    getRequests,
    createRequest,
    updateRequestStatus,
    deleteRequest,
    getUserRequests,
    getUserVacationDays,
    isUserOnVacation,
  }
}
