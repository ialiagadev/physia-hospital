"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/app/contexts/auth-context"

export interface GroupActivity {
  id: string
  organization_id: number
  name: string
  description: string | null
  date: string
  start_time: string
  end_time: string
  service_id: number | null // 🆕 Añadido
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
  date: string
  start_time: string
  end_time: string
  professional_id: string
  consultation_id?: string
  max_participants: number
  color?: string
  service_id: number | null // 🆕 Añadido

}

export interface GroupActivityUpdate {
  name?: string
  description?: string
  date?: string
  start_time?: string
  end_time?: string
  professional_id?: string
  consultation_id?: string
  max_participants?: number
  status?: "active" | "completed" | "cancelled"
  color?: string
}

export function useGroupActivities(organizationId?: number, users: any[] = []) {
  const [activities, setActivities] = useState<GroupActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userProfile, isLoading: authLoading } = useAuth()

  const fetchActivities = async () => {
    if (!organizationId || !userProfile) return

    try {
      setLoading(true)
      setError(null)

      // Obtener las actividades con consultations y participants
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

      // Combinar los datos usando los users que vienen como prop
      const processedActivities: GroupActivity[] = (activitiesData || []).map((activity: any) => {
        // Buscar el profesional en los users que vienen como prop
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

      setActivities(processedActivities)
    } catch (err) {
      console.error("Error fetching group activities:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const createActivity = async (activityData: GroupActivityInsert): Promise<GroupActivity> => {
    try {
      const { data, error: insertError } = await supabase
        .from("group_activities")
        .insert(activityData)
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
          created_at,
          updated_at,
          consultations!consultation_id(
            id,
            name
          )
        `)
        .single()

      if (insertError) throw insertError

      // Buscar el profesional en los users que vienen como prop
      const professional = users.find((user) => user.id === data.professional_id)

      const newActivity: GroupActivity = {
          ...data,
          professional: professional ? { id: professional.id, name: professional.name } : undefined,
          consultation: Array.isArray(data.consultations) ? data.consultations[0] : data.consultations,
          participants: [],
          service_id: null
      }

      setActivities((prev) => [...prev, newActivity])
      return newActivity
    } catch (err) {
      console.error("Error creating group activity:", err)
      throw err
    }
  }

  const updateActivity = async (id: string, updates: GroupActivityUpdate): Promise<void> => {
    try {
      const { error: updateError } = await supabase.from("group_activities").update(updates).eq("id", id)

      if (updateError) throw updateError

      await fetchActivities()
    } catch (err) {
      console.error("Error updating group activity:", err)
      throw err
    }
  }

  const deleteActivity = async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase.from("group_activities").delete().eq("id", id)

      if (deleteError) throw deleteError

      setActivities((prev) => prev.filter((activity) => activity.id !== id))
    } catch (err) {
      console.error("Error deleting group activity:", err)
      throw err
    }
  }

  const addParticipant = async (activityId: string, clientId: number, notes?: string): Promise<void> => {
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
  }

  const removeParticipant = async (participantId: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase.from("group_activity_participants").delete().eq("id", participantId)

      if (deleteError) throw deleteError

      await fetchActivities()
    } catch (err) {
      console.error("Error removing participant:", err)
      throw err
    }
  }

  const updateParticipantStatus = async (
    participantId: string,
    status: "registered" | "attended" | "no_show" | "cancelled",
  ): Promise<void> => {
    try {
      const { error: updateError } = await supabase
        .from("group_activity_participants")
        .update({ status })
        .eq("id", participantId)

      if (updateError) throw updateError

      setActivities((prev) =>
        prev.map((activity) => ({
          ...activity,
          participants: activity.participants?.map((participant) =>
            participant.id === participantId ? { ...participant, status } : participant,
          ),
        })),
      )
    } catch (err) {
      console.error("Error updating participant status:", err)
      throw err
    }
  }

  useEffect(() => {
    if (!authLoading && users.length > 0) {
      fetchActivities()
    }
  }, [organizationId, userProfile, authLoading, users])

  return {
    activities,
    loading: loading || authLoading,
    error,
    refetch: fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
  }
}
