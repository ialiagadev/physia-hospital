"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Consultation } from "@/types/calendar"

export function useConsultations(organizationId?: number) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userOrgId, setUserOrgId] = useState<number | null>(null)

  const fetchConsultations = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener organization_id del usuario autenticado
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        setConsultations([])
        return
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.user.id)
        .single()

      if (userError || !userData?.organization_id) {
        setConsultations([])
        return
      }

      setUserOrgId(userData.organization_id)

      const { data, error: fetchError } = await supabase
        .from("consultations")
        .select("*")
        .eq("organization_id", userData.organization_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })

      if (fetchError) {
        setError(fetchError.message)
        setConsultations([])
      } else {
        setConsultations(data || [])
        setError(null)
      }
    } catch (err) {
      setError("Error inesperado al cargar consultas")
      setConsultations([])
    } finally {
      setLoading(false)
    }
  }

  const getAvailableConsultations = async (
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ) => {
    try {
      if (!userOrgId) {
        throw new Error("Organization ID is required")
      }

      // Si no hay consultas cargadas, devolver array vacío
      if (consultations.length === 0) {
        return []
      }

      let query = supabase
        .from("appointments")
        .select("consultation_id, start_time, end_time")
        .eq("date", date)
        .eq("organization_id", userOrgId)
        .neq("status", "cancelled")
        .lt("start_time", endTime)
        .gt("end_time", startTime)

      if (excludeAppointmentId) {
        query = query.neq("id", excludeAppointmentId)
      }

      const { data: occupiedConsultations, error } = await query

      if (error) {
        throw error
      }

      const occupiedIds = occupiedConsultations?.map((apt) => apt.consultation_id) || []
      const available = consultations.filter((consultation) => !occupiedIds.includes(consultation.id))

      return available
    } catch (err) {
      throw err
    }
  }

  const isConsultationAvailable = async (
    consultationId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ) => {
    try {
      if (!userOrgId) {
        return false
      }

      let query = supabase
        .from("appointments")
        .select("id, start_time, end_time")
        .eq("consultation_id", consultationId)
        .eq("date", date)
        .eq("organization_id", userOrgId)
        .neq("status", "cancelled")
        .lt("start_time", endTime)
        .gt("end_time", startTime)

      if (excludeAppointmentId) {
        query = query.neq("id", excludeAppointmentId)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const isAvailable = !data || data.length === 0
      return isAvailable
    } catch (err) {
      return false
    }
  }

  useEffect(() => {
    fetchConsultations()
  }, [])

  return {
    consultations,
    loading,
    error,
    organizationId: userOrgId,
    refetch: fetchConsultations,
    getAvailableConsultations,
    isConsultationAvailable,
  }
}
