"use client"

import { useState, useEffect } from "react"
import { GroupActivityService } from "@/lib/services/group-activities"
import type {
  GroupAppointmentParticipant,
  GroupAppointmentParticipantInsert,
  GroupAppointmentParticipantUpdate,
  GroupAppointmentWithDetails,
  GroupActivityStats,
} from "@/types/group-activities"
import { toast } from "sonner"

export function useGroupActivity(appointmentId?: string) {
  const [participants, setParticipants] = useState<GroupAppointmentParticipant[]>([])
  const [stats, setStats] = useState<GroupActivityStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchParticipants = async () => {
    if (!appointmentId) return

    try {
      setLoading(true)
      setError(null)

      const [participantsData, statsData] = await Promise.all([
        GroupActivityService.getParticipants(appointmentId),
        GroupActivityService.getActivityStats(appointmentId),
      ])

      setParticipants(participantsData)
      setStats(statsData)
    } catch (err) {
      console.error("Error fetching group activity data:", err)
      setError(err instanceof Error ? err.message : "Error al cargar datos de la actividad")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParticipants()
  }, [appointmentId])

  const addParticipant = async (participant: GroupAppointmentParticipantInsert) => {
    try {
      await GroupActivityService.addParticipant(participant)
      await fetchParticipants()
      toast.success("Participante añadido correctamente")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al añadir participante"
      toast.error(message)
      throw err
    }
  }

  const updateParticipant = async (id: string, updates: GroupAppointmentParticipantUpdate) => {
    try {
      await GroupActivityService.updateParticipant(id, updates)
      await fetchParticipants()
      toast.success("Participante actualizado correctamente")
    } catch (err) {
      toast.error("Error al actualizar participante")
      throw err
    }
  }

  const removeParticipant = async (id: string) => {
    try {
      await GroupActivityService.removeParticipant(id)
      await fetchParticipants()

      // Intentar promover a alguien de la lista de espera
      if (appointmentId) {
        await GroupActivityService.promoteFromWaitingList(appointmentId)
        await fetchParticipants() // Refrescar para mostrar cambios
      }

      toast.success("Participante eliminado correctamente")
    } catch (err) {
      toast.error("Error al eliminar participante")
      throw err
    }
  }

  return {
    participants,
    stats,
    loading,
    error,
    addParticipant,
    updateParticipant,
    removeParticipant,
    refetch: fetchParticipants,
  }
}

export function useGroupActivityWithDetails(appointmentId?: string) {
  const [groupActivity, setGroupActivity] = useState<GroupAppointmentWithDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGroupActivity = async () => {
    if (!appointmentId) return

    try {
      setLoading(true)
      setError(null)

      const data = await GroupActivityService.getGroupActivityWithParticipants(appointmentId)
      setGroupActivity(data)
    } catch (err) {
      console.error("Error fetching group activity:", err)
      setError(err instanceof Error ? err.message : "Error al cargar actividad grupal")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroupActivity()
  }, [appointmentId])

  return {
    groupActivity,
    loading,
    error,
    refetch: fetchGroupActivity,
  }
}
