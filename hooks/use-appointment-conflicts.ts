"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"

interface ConflictAppointment {
  id: string
  client_name: string
  start_time: string
  end_time: string
  professional_name: string
  status: string
  type: "appointment" | "group_activity" // ✅ NUEVO: tipo de conflicto
}

export function useAppointmentConflicts(organizationId?: number) {
  const [conflicts, setConflicts] = useState<ConflictAppointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkConflicts = useCallback(
    async (
      date: Date | string,
      startTime: string,
      duration: number,
      professionalId: string,
      excludeAppointmentId?: string,
      excludeGroupActivityId?: string, // ✅ NUEVO: excluir actividad grupal
    ) => {
      if (!organizationId || !date || !startTime || !duration || !professionalId) {
        setConflicts([])
        return []
      }

      setLoading(true)
      setError(null)

      try {
        const dateString = typeof date === "string" ? date : date.toISOString().split("T")[0]
        const [hours, minutes] = startTime.split(":").map(Number)
        const totalMinutes = hours * 60 + minutes + duration
        const endHours = Math.floor(totalMinutes / 60)
        const endMinutes = totalMinutes % 60
        const endTime = `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`

        let query = supabase
          .from("appointments")
          .select(`
            id,
            start_time,
            end_time,
            status,
            clients!inner (
              name
            ),
            professional:users!professional_id (
              name,
              email
            )
          `)
          .eq("organization_id", organizationId)
          .eq("date", dateString)
          .eq("professional_id", professionalId)
          .neq("status", "cancelled")
          .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`)

        if (excludeAppointmentId) {
          query = query.neq("id", excludeAppointmentId)
        }

        const { data: appointments, error: fetchError } = await query

        if (fetchError) {
          setError(fetchError.message)
          setConflicts([])
          return []
        }

        // ✅ NUEVO: Verificar conflictos con actividades grupales
        let groupQuery = supabase
          .from("group_activities")
          .select(`
            id,
            name,
            start_time,
            end_time,
            status,
            professional:users!professional_id (
              name,
              email
            )
          `)
          .eq("organization_id", organizationId)
          .eq("date", dateString)
          .eq("professional_id", professionalId)
          .neq("status", "cancelled")
          .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`)

        if (excludeGroupActivityId) {
          groupQuery = groupQuery.neq("id", excludeGroupActivityId)
        }

        const { data: groupActivities, error: groupFetchError } = await groupQuery

        if (groupFetchError) {
          setError(groupFetchError.message)
          setConflicts([])
          return []
        }

        const conflictList: ConflictAppointment[] = [
          // Conflictos de citas individuales
          ...(appointments || []).map((apt) => ({
            id: apt.id,
            client_name: (apt.clients as any)?.name || "Cliente desconocido",
            start_time: apt.start_time,
            end_time: apt.end_time,
            professional_name:
              (apt.professional as any)?.name || (apt.professional as any)?.email || "Profesional desconocido",
            status: apt.status,
            type: "appointment" as const,
          })),
          // ✅ NUEVO: Conflictos de actividades grupales
          ...(groupActivities || []).map((activity) => ({
            id: activity.id,
            client_name: `👥 ${activity.name}`, // Prefijo para identificar actividades grupales
            start_time: activity.start_time,
            end_time: activity.end_time,
            professional_name:
              (activity.professional as any)?.name ||
              (activity.professional as any)?.email ||
              "Profesional desconocido",
            status: activity.status,
            type: "group_activity" as const,
          })),
        ]

        setConflicts(conflictList)
        return conflictList
      } catch (err) {
        setError("Error al verificar conflictos")
        setConflicts([])
        return []
      } finally {
        setLoading(false)
      }
    },
    [organizationId],
  )

  return {
    conflicts,
    loading,
    error,
    checkConflicts,
  }
}
