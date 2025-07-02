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
        console.log("No organizationId provided, skipping consultations fetch")
        setConsultations([])
        return
      }

      console.log("Fetching consultations for organization:", organizationId)

      const { data, error: fetchError } = await supabase
        .from("consultations")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })

      if (fetchError) {
        console.error("Error fetching consultations:", fetchError)
        setError(fetchError.message)
        setConsultations([])
      } else {
        console.log("Consultations fetched successfully:", data?.length || 0, "consultations")
        console.log("Consultations data:", data)
        setConsultations(data || [])
        setError(null)
      }
    } catch (err) {
      console.error("Unexpected error fetching consultations:", err)
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
        console.error("Organization ID is required for getAvailableConsultations")
        throw new Error("Organization ID is required")
      }

      console.log("Getting available consultations for:", {
        organizationId,
        date,
        startTime,
        endTime,
        excludeAppointmentId,
        totalConsultations: consultations.length,
      })

      // Si no hay consultas cargadas, devolver array vacío
      if (consultations.length === 0) {
        console.log("No consultations loaded yet, returning empty array")
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
        console.error("Error fetching occupied consultations:", error)
        throw error
      }

      console.log("Occupied consultations query result:", occupiedConsultations)

      const occupiedIds = occupiedConsultations?.map((apt) => apt.consultation_id) || []

      // Log detallado de las citas que causan conflicto
      if (occupiedConsultations && occupiedConsultations.length > 0) {
        console.log(
          "Conflicting appointments:",
          occupiedConsultations.map((apt) => ({
            consultation_id: apt.consultation_id,
            existing_start: apt.start_time,
            existing_end: apt.end_time,
            new_start: startTime,
            new_end: endTime,
          })),
        )
      }

      const available = consultations.filter((consultation) => !occupiedIds.includes(consultation.id))

      console.log("Available consultations result:", {
        total: consultations.length,
        occupied: occupiedIds.length,
        occupiedIds,
        available: available.length,
        availableIds: available.map((c) => c.id),
        availableNames: available.map((c) => c.name),
      })

      return available
    } catch (err) {
      console.error("Error getting available consultations:", err)
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
        console.error("Organization ID is required for isConsultationAvailable")
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
        console.error("Error checking consultation availability:", error)
        throw error
      }

      const isAvailable = !data || data.length === 0

      if (!isAvailable && data) {
        console.log(
          `Consultation ${consultationId} not available due to conflicts:`,
          data.map((apt) => ({
            id: apt.id,
            existing_start: apt.start_time,
            existing_end: apt.end_time,
            new_start: startTime,
            new_end: endTime,
          })),
        )
      }

      return isAvailable
    } catch (err) {
      console.error("Error checking consultation availability:", err)
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
