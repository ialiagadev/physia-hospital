"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Consultation } from "@/types/calendar"

export function useConsultations(organizationId?: number) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userOrgId, setUserOrgId] = useState<number | null>(null)

  const fetchConsultations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener organization_id del usuario autenticado
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        setConsultations([])
        setUserOrgId(null)
        return
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.user.id)
        .single()

      if (userError || !userData?.organization_id) {
        setConsultations([])
        setUserOrgId(null)
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
      setUserOrgId(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const getAvailableConsultations = useCallback(
    async (date: string, startTime: string, endTime: string, excludeAppointmentId?: string) => {
      try {
        // Verificaciones rápidas
        if (!userOrgId || consultations.length === 0) {
          return consultations
        }

        // Query optimizada - solo los campos necesarios
        let query = supabase
          .from("appointments")
          .select("consultation_id")
          .eq("date", date)
          .eq("organization_id", userOrgId)
          .in("status", ["confirmed", "pending"])
          .not("consultation_id", "is", null)
          .lt("start_time", endTime)
          .gt("end_time", startTime)

        // Excluir cita actual si existe
        if (excludeAppointmentId && excludeAppointmentId !== "undefined" && excludeAppointmentId.trim() !== "") {
          query = query.neq("id", excludeAppointmentId)
        }

        const { data: occupiedAppointments, error } = await query

        if (error) {
          return consultations
        }

        // Filtrado rápido
        const occupiedIds = new Set(occupiedAppointments?.map((apt) => apt.consultation_id).filter(Boolean) || [])

        return consultations.filter((consultation) => !occupiedIds.has(consultation.id))
      } catch (err) {
        return consultations
      }
    },
    [userOrgId, consultations],
  )

  const isConsultationAvailable = useCallback(
    async (consultationId: string, date: string, startTime: string, endTime: string, excludeAppointmentId?: string) => {
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

        if (excludeAppointmentId && excludeAppointmentId !== "undefined") {
          query = query.neq("id", excludeAppointmentId)
        }

        const { data, error } = await query

        if (error) {
          throw error
        }

        return !data || data.length === 0
      } catch (err) {
        return false
      }
    },
    [userOrgId],
  )

  // Nueva función para obtener la primera consulta disponible
  const getFirstAvailableConsultation = useCallback(
    async (date: string, startTime: string, endTime: string, excludeAppointmentId?: string) => {
      try {
        const available = await getAvailableConsultations(date, startTime, endTime, excludeAppointmentId)
        return available.length > 0 ? available[0].id : null
      } catch (err) {
        return null
      }
    },
    [getAvailableConsultations],
  )

  useEffect(() => {
    fetchConsultations()
  }, [fetchConsultations])

  return {
    consultations,
    loading,
    error,
    organizationId: userOrgId,
    refetch: fetchConsultations,
    getAvailableConsultations,
    isConsultationAvailable,
    getFirstAvailableConsultation,
  }
}
