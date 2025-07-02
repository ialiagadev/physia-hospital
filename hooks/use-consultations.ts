"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Consultation } from "@/types/calendar"

export function useConsultations(organizationId?: number) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConsultations = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!organizationId) {
        setConsultations([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from("consultations")
        .select("*")
        .eq("organization_id", organizationId)
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
      if (!organizationId) {
        throw new Error("Organization ID is required")
      }

      // Si no hay consultas cargadas, devolver array vacío
      if (consultations.length === 0) {
        return []
      }

      // Obtener consultas ocupadas en ese horario específico
      // La lógica correcta para detectar solapamiento es:
      // Hay solapamiento si: start_time < endTime AND end_time > startTime
      let query = supabase
        .from("appointments")
        .select("consultation_id, start_time, end_time")
        .eq("date", date)
        .eq("organization_id", organizationId)
        .neq("status", "cancelled")
        .lt("start_time", endTime) // La cita existente empieza antes de que termine la nueva
        .gt("end_time", startTime) // La cita existente termina después de que empiece la nueva

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
      if (!organizationId) {
        return false
      }

      let query = supabase
        .from("appointments")
        .select("id, start_time, end_time")
        .eq("consultation_id", consultationId)
        .eq("date", date)
        .eq("organization_id", organizationId)
        .neq("status", "cancelled")
        .lt("start_time", endTime) // La cita existente empieza antes de que termine la nueva
        .gt("end_time", startTime) // La cita existente termina después de que empiece la nueva

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
    if (organizationId) {
      fetchConsultations()
    } else {
      setLoading(false)
      setConsultations([])
    }
  }, [organizationId])

  return {
    consultations,
    loading,
    error,
    organizationId,
    refetch: fetchConsultations,
    getAvailableConsultations,
    isConsultationAvailable,
  }
}
