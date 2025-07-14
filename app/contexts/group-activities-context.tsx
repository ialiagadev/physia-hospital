"use client"

import type React from "react"
import { createContext, useContext, useReducer, useCallback, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/app/contexts/auth-context"
import { RecurrenceService } from "@/lib/services/recurrence-service"
import { addWeeks, addMonths } from "date-fns"
import { toast } from "sonner"

// ✅ TIPOS
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

// ✅ ACCIONES DEL REDUCER
type GroupActivitiesAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_ACTIVITIES"; payload: GroupActivity[] }
  | { type: "ADD_ACTIVITY"; payload: GroupActivity }
  | { type: "ADD_ACTIVITIES"; payload: GroupActivity[] }
  | { type: "UPDATE_ACTIVITY"; payload: { id: string; updates: Partial<GroupActivity> } }
  | { type: "DELETE_ACTIVITY"; payload: string }
  | { type: "ADD_PARTICIPANT"; payload: { activityId: string; participant: GroupActivityParticipant } }
  | { type: "REMOVE_PARTICIPANT"; payload: { activityId: string; participantId: string } }
  | { type: "UPDATE_PARTICIPANT_STATUS"; payload: { activityId: string; participantId: string; status: string } }

// ✅ ESTADO INICIAL
interface GroupActivitiesState {
  activities: GroupActivity[]
  loading: boolean
  error: string | null
}

const initialState: GroupActivitiesState = {
  activities: [],
  loading: true,
  error: null,
}

// ✅ REDUCER CON ACTUALIZACIONES OPTIMISTAS
function groupActivitiesReducer(state: GroupActivitiesState, action: GroupActivitiesAction): GroupActivitiesState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload }

    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false }

    case "SET_ACTIVITIES":
      return { ...state, activities: action.payload, loading: false, error: null }

    case "ADD_ACTIVITY":
      return {
        ...state,
        activities: [...state.activities, action.payload].sort(
          (a, b) => new Date(a.date + " " + a.start_time).getTime() - new Date(b.date + " " + b.start_time).getTime(),
        ),
      }

    case "ADD_ACTIVITIES":
      return {
        ...state,
        activities: [...state.activities, ...action.payload].sort(
          (a, b) => new Date(a.date + " " + a.start_time).getTime() - new Date(b.date + " " + b.start_time).getTime(),
        ),
      }

    case "UPDATE_ACTIVITY":
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === action.payload.id ? { ...activity, ...action.payload.updates } : activity,
        ),
      }

    case "DELETE_ACTIVITY":
      return {
        ...state,
        activities: state.activities.filter((activity) => activity.id !== action.payload),
      }

    case "ADD_PARTICIPANT":
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === action.payload.activityId
            ? {
                ...activity,
                participants: [...(activity.participants || []), action.payload.participant],
                current_participants: activity.current_participants + 1,
              }
            : activity,
        ),
      }

    case "REMOVE_PARTICIPANT":
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === action.payload.activityId
            ? {
                ...activity,
                participants: activity.participants?.filter((p) => p.id !== action.payload.participantId) || [],
                current_participants: Math.max(0, activity.current_participants - 1),
              }
            : activity,
        ),
      }

    case "UPDATE_PARTICIPANT_STATUS":
      return {
        ...state,
        activities: state.activities.map((activity) =>
          activity.id === action.payload.activityId
            ? {
                ...activity,
                participants:
                  activity.participants?.map((participant) =>
                    participant.id === action.payload.participantId
                      ? { ...participant, status: action.payload.status as any }
                      : participant,
                  ) || [],
              }
            : activity,
        ),
      }

    default:
      return state
  }
}

// ✅ CONTEXTO
interface GroupActivitiesContextType {
  activities: GroupActivity[]
  loading: boolean
  error: string | null
  createActivity: (data: any) => Promise<void>
  updateActivity: (id: string, updates: any) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
  addParticipant: (activityId: string, clientId: number, notes?: string) => Promise<void>
  removeParticipant: (participantId: string) => Promise<void>
  updateParticipantStatus: (participantId: string, status: string) => Promise<void>
  refetch: () => Promise<void>
}

const GroupActivitiesContext = createContext<GroupActivitiesContextType | undefined>(undefined)

// ✅ PROVIDER
interface GroupActivitiesProviderProps {
  children: React.ReactNode
  organizationId: number
  users: any[]
}

export function GroupActivitiesProvider({ children, organizationId, users }: GroupActivitiesProviderProps) {
  const [state, dispatch] = useReducer(groupActivitiesReducer, initialState)
  const { userProfile } = useAuth()

  // ✅ FUNCIÓN PARA TRANSFORMAR CONFIG DE RECURRENCIA
  const transformRecurrenceConfig = useCallback((groupConfig: any, startDate: Date) => {
    if (!groupConfig) throw new Error("No recurrence configuration provided")

    let endDate: Date
    if (groupConfig.endType === "date") {
      endDate = new Date(groupConfig.endDate)
    } else if (groupConfig.endType === "count") {
      const count = groupConfig.count || 1
      let calculatedEndDate = new Date(startDate)
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
  }, [])

  // ✅ FETCH INICIAL
  const fetchActivities = useCallback(async () => {
    if (!organizationId || !userProfile) return

    try {
      dispatch({ type: "SET_LOADING", payload: true })

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

      if (activitiesError) throw activitiesError

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

      dispatch({ type: "SET_ACTIVITIES", payload: processedActivities })
    } catch (err) {
      console.error("Error fetching group activities:", err)
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message : "Error desconocido" })
    }
  }, [organizationId, userProfile, users])

  // ✅ CREAR ACTIVIDAD CON ACTUALIZACIÓN OPTIMISTA
  const createActivity = useCallback(
    async (activityData: any) => {
      try {
        if (activityData.recurrence) {
          // Para actividades recurrentes, crear múltiples
          const startDate = typeof activityData.date === "string" ? new Date(activityData.date) : activityData.date
          const transformedConfig = transformRecurrenceConfig(activityData.recurrence, startDate)
          const recurringDates = RecurrenceService.generateRecurringDates(startDate, transformedConfig)

          const activitiesToInsert = recurringDates.map((date, index) => ({
            id: `temp-${Date.now()}-${index}`, // ID temporal
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            professional: users.find((u) => u.id === activityData.professional_id)
              ? {
                  id: activityData.professional_id,
                  name: users.find((u) => u.id === activityData.professional_id)?.name,
                }
              : undefined,
            participants: [],
          }))

          // ✅ ACTUALIZACIÓN OPTIMISTA - Mostrar inmediatamente
          dispatch({ type: "ADD_ACTIVITIES", payload: activitiesToInsert })

          // ✅ INSERTAR EN BASE DE DATOS
          const dbActivities = activitiesToInsert.map(({ id, professional, participants, ...rest }) => rest)
          const { data, error: insertError } = await supabase.from("group_activities").insert(dbActivities).select()

          if (insertError) throw insertError

          // ✅ ACTUALIZAR CON IDs REALES
          dispatch({
            type: "SET_ACTIVITIES",
            payload: [
              ...state.activities.filter((a) => !a.id.startsWith("temp-")),
              ...data.map((activity, index) => ({
                ...activitiesToInsert[index],
                id: activity.id,
              })),
            ],
          })
        } else {
          // Actividad única
          const tempActivity: GroupActivity = {
            id: `temp-${Date.now()}`,
            organization_id: activityData.organization_id,
            name: activityData.name,
            description: activityData.description,
            date:
              typeof activityData.date === "string" ? activityData.date : activityData.date.toISOString().split("T")[0],
            start_time: activityData.start_time,
            end_time: activityData.end_time,
            professional_id: activityData.professional_id,
            consultation_id: activityData.consultation_id || null,
            max_participants: activityData.max_participants,
            current_participants: 0,
            status: "active",
            color: activityData.color || "#3B82F6",
            service_id: activityData.service_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            professional: users.find((u) => u.id === activityData.professional_id)
              ? {
                  id: activityData.professional_id,
                  name: users.find((u) => u.id === activityData.professional_id)?.name,
                }
              : undefined,
            participants: [],
          }

          // ✅ ACTUALIZACIÓN OPTIMISTA
          dispatch({ type: "ADD_ACTIVITY", payload: tempActivity })

          // ✅ INSERTAR EN BASE DE DATOS
          const { recurrence, ...dataWithoutRecurrence } = activityData
          const { data, error: insertError } = await supabase
            .from("group_activities")
            .insert({
              ...dataWithoutRecurrence,
              date:
                typeof activityData.date === "string"
                  ? activityData.date
                  : activityData.date.toISOString().split("T")[0],
              consultation_id: activityData.consultation_id || null,
            })
            .select()
            .single()

          if (insertError) throw insertError

          // ✅ ACTUALIZAR CON ID REAL
          dispatch({ type: "UPDATE_ACTIVITY", payload: { id: tempActivity.id, updates: { id: data.id } } })
        }

        toast.success("Actividad creada correctamente")
      } catch (err) {
        console.error("Error creating activity:", err)
        toast.error("Error al crear la actividad")
        // ✅ REVERTIR CAMBIOS OPTIMISTAS
        await fetchActivities()
        throw err
      }
    },
    [users, transformRecurrenceConfig, state.activities, fetchActivities],
  )

  // ✅ ACTUALIZAR ACTIVIDAD
  const updateActivity = useCallback(
    async (id: string, updates: any) => {
      try {
        // ✅ ACTUALIZACIÓN OPTIMISTA
        dispatch({ type: "UPDATE_ACTIVITY", payload: { id, updates } })

        // ✅ ACTUALIZAR EN BASE DE DATOS
        const cleanUpdates = { ...updates }
        if (cleanUpdates.consultation_id === "") {
          cleanUpdates.consultation_id = null
        }

        const { error: updateError } = await supabase.from("group_activities").update(cleanUpdates).eq("id", id)

        if (updateError) throw updateError

        toast.success("Actividad actualizada correctamente")
      } catch (err) {
        console.error("Error updating activity:", err)
        toast.error("Error al actualizar la actividad")
        // ✅ REVERTIR CAMBIOS
        await fetchActivities()
        throw err
      }
    },
    [fetchActivities],
  )

  // ✅ ELIMINAR ACTIVIDAD
  const deleteActivity = useCallback(
    async (id: string) => {
      try {
        // ✅ ACTUALIZACIÓN OPTIMISTA
        dispatch({ type: "DELETE_ACTIVITY", payload: id })

        // ✅ ELIMINAR DE BASE DE DATOS
        const { error: deleteError } = await supabase.from("group_activities").delete().eq("id", id)

        if (deleteError) throw deleteError

        toast.success("Actividad eliminada correctamente")
      } catch (err) {
        console.error("Error deleting activity:", err)
        toast.error("Error al eliminar la actividad")
        // ✅ REVERTIR CAMBIOS
        await fetchActivities()
        throw err
      }
    },
    [fetchActivities],
  )

  // ✅ AÑADIR PARTICIPANTE
  const addParticipant = useCallback(
    async (activityId: string, clientId: number, notes?: string) => {
      try {
        const tempParticipant: GroupActivityParticipant = {
          id: `temp-${Date.now()}`,
          group_activity_id: activityId,
          client_id: clientId,
          status: "registered",
          registration_date: new Date().toISOString(),
          notes: notes || null,
          client: { id: clientId, name: "Cargando...", phone: null, email: null },
        }

        // ✅ ACTUALIZACIÓN OPTIMISTA
        dispatch({ type: "ADD_PARTICIPANT", payload: { activityId, participant: tempParticipant } })

        // ✅ INSERTAR EN BASE DE DATOS
        const { error: insertError } = await supabase.from("group_activity_participants").insert({
          group_activity_id: activityId,
          client_id: clientId,
          notes: notes || null,
        })

        if (insertError) throw insertError

        // ✅ REFRESCAR SOLO ESA ACTIVIDAD
        await fetchActivities()
        toast.success("Participante añadido correctamente")
      } catch (err) {
        console.error("Error adding participant:", err)
        toast.error("Error al añadir participante")
        // ✅ REVERTIR CAMBIOS
        await fetchActivities()
        throw err
      }
    },
    [fetchActivities],
  )

  // ✅ ELIMINAR PARTICIPANTE
  const removeParticipant = useCallback(
    async (participantId: string) => {
      try {
        const activity = state.activities.find((a) => a.participants?.some((p) => p.id === participantId))
        if (!activity) throw new Error("Actividad no encontrada")

        // ✅ ACTUALIZACIÓN OPTIMISTA
        dispatch({ type: "REMOVE_PARTICIPANT", payload: { activityId: activity.id, participantId } })

        // ✅ ELIMINAR DE BASE DE DATOS
        const { error: deleteError } = await supabase
          .from("group_activity_participants")
          .delete()
          .eq("id", participantId)

        if (deleteError) throw deleteError

        toast.success("Participante eliminado correctamente")
      } catch (err) {
        console.error("Error removing participant:", err)
        toast.error("Error al eliminar participante")
        // ✅ REVERTIR CAMBIOS
        await fetchActivities()
        throw err
      }
    },
    [state.activities, fetchActivities],
  )

  // ✅ ACTUALIZAR ESTADO DE PARTICIPANTE
  const updateParticipantStatus = useCallback(
    async (participantId: string, status: string) => {
      try {
        const activity = state.activities.find((a) => a.participants?.some((p) => p.id === participantId))
        if (!activity) throw new Error("Actividad no encontrada")

        // ✅ ACTUALIZACIÓN OPTIMISTA
        dispatch({ type: "UPDATE_PARTICIPANT_STATUS", payload: { activityId: activity.id, participantId, status } })

        // ✅ ACTUALIZAR EN BASE DE DATOS
        const { error: updateError } = await supabase
          .from("group_activity_participants")
          .update({ status })
          .eq("id", participantId)

        if (updateError) throw updateError

        toast.success("Estado actualizado correctamente")
      } catch (err) {
        console.error("Error updating participant status:", err)
        toast.error("Error al actualizar estado")
        // ✅ REVERTIR CAMBIOS
        await fetchActivities()
        throw err
      }
    },
    [state.activities, fetchActivities],
  )

  // ✅ EFECTO INICIAL
  useEffect(() => {
    if (organizationId && userProfile && users.length > 0) {
      fetchActivities()
    }
  }, [organizationId, userProfile, users.length, fetchActivities])

  const value: GroupActivitiesContextType = {
    activities: state.activities,
    loading: state.loading,
    error: state.error,
    createActivity,
    updateActivity,
    deleteActivity,
    addParticipant,
    removeParticipant,
    updateParticipantStatus,
    refetch: fetchActivities,
  }

  return <GroupActivitiesContext.Provider value={value}>{children}</GroupActivitiesContext.Provider>
}

// ✅ HOOK PERSONALIZADO
export function useGroupActivitiesContext() {
  const context = useContext(GroupActivitiesContext)
  if (context === undefined) {
    throw new Error("useGroupActivitiesContext must be used within a GroupActivitiesProvider")
  }
  return context
}
