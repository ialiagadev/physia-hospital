"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/app/contexts/auth-context"
import { RecurrenceService } from "@/lib/services/recurrence-service"
import { addWeeks, addMonths } from "date-fns"

// ✅ FUNCIÓN AUXILIAR PARA CALCULAR DURACIÓN
function calculateDurationInMinutes(startTime: string, endTime: string): number {
  const [startHours, startMinutes] = startTime.split(":").map(Number)
  const [endHours, endMinutes] = endTime.split(":").map(Number)

  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes

  return endTotalMinutes - startTotalMinutes
}

// ✅ FUNCIÓN PARA TRANSFORMAR LA CONFIG DE RECURRENCIA
function transformRecurrenceConfig(
  groupConfig: any,
  startDate: Date,
): { type: "weekly" | "monthly"; interval: number; endDate: Date } {
  if (!groupConfig) {
    throw new Error("No recurrence configuration provided")
  }

  let endDate: Date

  if (groupConfig.endType === "date") {
    // Si es por fecha, usar directamente la fecha especificada
    endDate = new Date(groupConfig.endDate)
  } else if (groupConfig.endType === "count") {
    // Si es por cantidad, calcular la fecha final
    const count = groupConfig.count || 1
    let calculatedEndDate = new Date(startDate)

    // Calcular la fecha final basándose en el tipo y cantidad
    if (groupConfig.type === "weekly") {
      calculatedEndDate = addWeeks(startDate, (count - 1) * groupConfig.interval)
    } else if (groupConfig.type === "monthly") {
      calculatedEndDate = addMonths(startDate, (count - 1) * groupConfig.interval)
    }

    endDate = calculatedEndDate
  } else {
    throw new Error("Invalid endType in recurrence configuration")
  }

  return {
    type: groupConfig.type,
    interval: groupConfig.interval,
    endDate: endDate,
  }
}

export interface GroupActivity {
  id: string
  organization_id: number
  name: string
  description: string | null
  date: string
  start_time: string
  end_time: string
  service_id: number | null
  professional_id: string
  consultation_id: string | null
  max_participants: number
  current_participants: number
  status: "active" | "completed" | "cancelled"
  color: string
  created_at: string
  updated_at: string
  professional?: {
    id: string
    name: string
  }
  consultation?: {
    id: string
    name: string
  }
  participants?: GroupActivityParticipant[]
}

export interface GroupActivityParticipant {
  id: string
  group_activity_id: string
  client_id: number
  status: "registered" | "attended" | "no_show" | "cancelled"
  registration_date: string
  notes: string | null
  client?: {
    id: number
    name: string
    phone: string | null
    email: string | null
  }
}

export interface GroupActivityInsert {
  organization_id: number
  name: string
  description?: string
  date: string | Date
  start_time: string
  end_time: string
  professional_id: string
  consultation_id?: string | null
  max_participants: number
  color?: string
  service_id: number | null
  recurrence?: {
    type: "weekly" | "monthly"
    interval: number
    endDate: Date
  } | null
}

export interface GroupActivityUpdate {
  name?: string
  description?: string
  date?: string
  start_time?: string
  end_time?: string
  professional_id?: string
  consultation_id?: string | null
  max_participants?: number
  status?: "active" | "completed" | "cancelled"
  color?: string
}

export function useGroupActivities(organizationId?: number, users: any[] = []) {
  const [activities, setActivities] = useState<GroupActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userProfile, isLoading: authLoading } = useAuth()

  // ✅ REFS PARA EVITAR BUCLES INFINITOS
  const fetchingRef = useRef(false)
  const lastFetchRef = useRef<string>("")
  const mountedRef = useRef(true)

  // ✅ FUNCIÓN DE FETCH OPTIMIZADA CON useCallback
  const fetchActivities = useCallback(async () => {
    if (!organizationId || !userProfile || fetchingRef.current) {
      return
    }

    // ✅ EVITAR FETCH DUPLICADOS
    const fetchKey = `${organizationId}-${users.length}-${JSON.stringify(users.map((u) => u.id).sort())}`
    if (fetchKey === lastFetchRef.current) {
      return
    }

    try {
      fetchingRef.current = true
      setLoading(true)
      setError(null)
      lastFetchRef.current = fetchKey

      const { data: activitiesData, error: activitiesError } = await supabase
        .from("group_activities")
        .select(`
          id,
          organization_id,
          name,
          description,
          date,
          start_time,
          end_time,
          professional_id,
          consultation_id,
          max_participants,
          current_participants,
          status,
          color,
          service_id,
          created_at,
          updated_at,
          consultations!consultation_id(
            id,
            name
          ),
          group_activity_participants(
            id,
            group_activity_id,
            client_id,
            status,
            registration_date,
            notes,
            clients!client_id(
              id,
              name,
              phone,
              email
            )
          )
        `)
        .eq("organization_id", organizationId)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })

      if (activitiesError) {
        throw activitiesError
      }

      // ✅ VERIFICAR SI EL COMPONENTE SIGUE MONTADO
      if (!mountedRef.current) return

      const processedActivities: GroupActivity[] = (activitiesData || []).map((activity: any) => {
        const professional = users.find((user) => user.id === activity.professional_id)
        return {
          ...activity,
          professional: professional ? { id: professional.id, name: professional.name } : undefined,
          consultation: Array.isArray(activity.consultations) ? activity.consultations[0] : activity.consultations,
          participants:
            activity.group_activity_participants?.map((participant: any) => ({
              ...participant,
              client: Array.isArray(participant.clients) ? participant.clients[0] : participant.clients,
            })) || [],
        }
      })

      if (mountedRef.current) {
        setActivities(processedActivities)
      }
    } catch (err) {
      console.error("Error fetching group activities:", err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Error desconocido")
      }
    } finally {
      fetchingRef.current = false
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [organizationId, userProfile, users])

  // ✅ FUNCIÓN DE ELIMINACIÓN OPTIMIZADA
  const deleteActivity = useCallback(
    async (id: string): Promise<void> => {
      if (!id || !mountedRef.current) {
        throw new Error("ID de actividad no válido")
      }

      try {
        // ✅ ACTUALIZACIÓN OPTIMISTA - Actualizar UI inmediatamente
        setActivities((prev) => prev.filter((activity) => activity.id !== id))

        // ✅ ELIMINAR DE LA BASE DE DATOS
        const { error: deleteError } = await supabase.from("group_activities").delete().eq("id", id)

        if (deleteError) {
          // ✅ REVERTIR CAMBIOS SI HAY ERROR
          console.error("Error deleting activity:", deleteError)
          await fetchActivities() // Recargar datos
          throw deleteError
        }

        // ✅ NO HACER FETCH ADICIONAL - Ya actualizamos optimísticamente
      } catch (err) {
        console.error("Error in deleteActivity:", err)
        throw err
      }
    },
    [fetchActivities],
  )

  const createActivity = useCallback(
    async (activityData: GroupActivityInsert): Promise<GroupActivity> => {
      try {
        if (activityData.recurrence) {
          return await createRecurringActivity(activityData)
        }

        const { recurrence, ...dataWithoutRecurrence } = activityData
        const { data, error: insertError } = await supabase
          .from("group_activities")
          .insert({
            ...dataWithoutRecurrence,
            date:
              typeof activityData.date === "string" ? activityData.date : activityData.date.toISOString().split("T")[0],
            consultation_id: activityData.consultation_id || null, // ✅ Asegurar null en lugar de string vacío
          })
          .select(`
            id,
            organization_id,
            name,
            description,
            date,
            start_time,
            end_time,
            professional_id,
            consultation_id,
            max_participants,
            current_participants,
            status,
            color,
            service_id,
            created_at,
            updated_at,
            consultations!consultation_id(
              id,
              name
            )
          `)
          .single()

        if (insertError) throw insertError

        const professional = users.find((user) => user.id === data.professional_id)
        const newActivity: GroupActivity = {
          ...data,
          professional: professional ? { id: professional.id, name: professional.name } : undefined,
          consultation: Array.isArray(data.consultations) ? data.consultations[0] : data.consultations,
          participants: [],
        }

        if (mountedRef.current) {
          setActivities((prev) => [...prev, newActivity])
        }

        return newActivity
      } catch (err) {
        console.error("Error creating group activity:", err)
        throw err
      }
    },
    [users],
  )

  const createRecurringActivity = useCallback(
    async (activityData: GroupActivityInsert): Promise<GroupActivity> => {
      if (!activityData.recurrence) {
        throw new Error("Recurrence configuration is required")
      }

      try {
        const startDate = typeof activityData.date === "string" ? new Date(activityData.date) : activityData.date

        // ✅ TRANSFORMAR LA CONFIG ANTES DE PASARLA AL SERVICIO
        const transformedConfig = transformRecurrenceConfig(activityData.recurrence, startDate)

        const recurringDates = RecurrenceService.generateRecurringDates(startDate, transformedConfig)

        const activitiesToInsert = recurringDates.map((date) => ({
          organization_id: activityData.organization_id,
          name: activityData.name,
          description: activityData.description,
          date: date.toISOString().split("T")[0],
          start_time: activityData.start_time,
          end_time: activityData.end_time,
          professional_id: activityData.professional_id,
          consultation_id: activityData.consultation_id || null,
          max_participants: activityData.max_participants,
          current_participants: 0,
          status: "active" as const,
          color: activityData.color || "#3B82F6",
          service_id: activityData.service_id,
        }))

        const { data, error: insertError } = await supabase
          .from("group_activities")
          .insert(activitiesToInsert)
          .select(`
            id,
            organization_id,
            name,
            description,
            date,
            start_time,
            end_time,
            professional_id,
            consultation_id,
            max_participants,
            current_participants,
            status,
            color,
            service_id,
            created_at,
            updated_at,
            consultations!consultation_id(
              id,
              name
            )
          `)

        if (insertError) throw insertError

        const professional = users.find((user) => user.id === activityData.professional_id)
        const newActivities: GroupActivity[] = data.map((activity) => ({
          ...activity,
          professional: professional ? { id: professional.id, name: professional.name } : undefined,
          consultation: Array.isArray(activity.consultations) ? activity.consultations[0] : activity.consultations,
          participants: [],
        }))

        if (mountedRef.current) {
          setActivities((prev) => [...prev, ...newActivities])
        }

        return newActivities[0]
      } catch (err) {
        console.error("Error creating recurring group activities:", err)
        throw err
      }
    },
    [users],
  )

  const updateActivity = useCallback(
    async (id: string, updates: GroupActivityUpdate): Promise<void> => {
      try {
        // ✅ LIMPIAR VALORES VACÍOS
        const cleanUpdates = { ...updates }
        if (cleanUpdates.consultation_id === "") {
          cleanUpdates.consultation_id = null
        }

        const { error: updateError } = await supabase.from("group_activities").update(cleanUpdates).eq("id", id)

        if (updateError) throw updateError

        // ✅ SOLO REFETCH SI ES NECESARIO
        await fetchActivities()
      } catch (err) {
        console.error("Error updating group activity:", err)
        throw err
      }
    },
    [fetchActivities],
  )

  const addParticipant = useCallback(
    async (activityId: string, clientId: number, notes?: string): Promise<void> => {
      try {
        const { error: insertError } = await supabase.from("group_activity_participants").insert({
          group_activity_id: activityId,
          client_id: clientId,
          notes: notes || null,
        })

        if (insertError) throw insertError

        await fetchActivities()
      } catch (err) {
        console.error("Error adding participant:", err)
        throw err
      }
    },
    [fetchActivities],
  )

  const removeParticipant = useCallback(
    async (participantId: string): Promise<void> => {
      try {
        const { error: deleteError } = await supabase
          .from("group_activity_participants")
          .delete()
          .eq("id", participantId)

        if (deleteError) throw deleteError

        await fetchActivities()
      } catch (err) {
        console.error("Error removing participant:", err)
        throw err
      }
    },
    [fetchActivities],
  )

  const updateParticipantStatus = useCallback(
    async (participantId: string, status: "registered" | "attended" | "no_show" | "cancelled"): Promise<void> => {
      try {
        const { error: updateError } = await supabase
          .from("group_activity_participants")
          .update({ status })
          .eq("id", participantId)

        if (updateError) throw updateError

        if (mountedRef.current) {
          setActivities((prev) =>
            prev.map((activity) => ({
              ...activity,
              participants: activity.participants?.map((participant) =>
                participant.id === participantId ? { ...participant, status } : participant,
              ),
            })),
          )
        }
      } catch (err) {
        console.error("Error updating participant status:", err)
        throw err
      }
    },
    [],
  )

  // ✅ EFECTO OPTIMIZADO - Solo se ejecuta cuando es necesario
  useEffect(() => {
    if (!authLoading && organizationId && userProfile && users.length > 0) {
      fetchActivities()
    }
  }, [organizationId, userProfile, authLoading, users.length, fetchActivities])

  // ✅ CLEANUP AL DESMONTAR
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      fetchingRef.current = false
    }
  }, [])

  return {
    activities,
    loading: loading || authLoading,
    error,
    refetch: fetchActivities,
    createActivity,
    createRecurringActivity,
    updateActivity,
    deleteActivity,
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
  }
}
