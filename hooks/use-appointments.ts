"use client"

import { useState, useEffect } from "react"
import { AppointmentService } from "@/lib/services/appointments"
import type { AppointmentWithDetails, AppointmentInsert, AppointmentUpdate } from "@/types/calendar"
import { toast } from "sonner"

export function useAppointments(
  organizationId?: number,
  startDate?: string,
  endDate?: string,
  professionalIds?: string[],
) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!organizationId) {
        setAppointments([])
        setLoading(false)
        return
      }

      const data = await AppointmentService.getAppointmentsWithDetails(startDate, endDate, professionalIds)
      setAppointments(data)
    } catch (err) {
      console.error("Error fetching appointments:", err)
      setError(err instanceof Error ? err.message : "Error inesperado al cargar citas")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [organizationId, startDate, endDate, professionalIds?.join(",")])

  const createAppointment = async (appointment: AppointmentInsert) => {
    try {
      // 🆕 Log para debug de campos de recurrencia
      if (appointment.is_recurring) {
        console.log("Creating recurring appointment with data:", {
          is_recurring: appointment.is_recurring,
          recurrence_type: appointment.recurrence_type,
          recurrence_interval: appointment.recurrence_interval,
          recurrence_end_date: appointment.recurrence_end_date,
        })
      }

      await AppointmentService.createAppointment(appointment)
      await fetchAppointments()

      // 🆕 Mensaje diferente para citas recurrentes
      if (appointment.is_recurring) {
        toast.success("Serie de citas recurrentes creada correctamente")
      } else {
        toast.success("Cita creada correctamente")
      }
    } catch (err) {
      console.error("Error creating appointment:", err)
      toast.error("Error al crear la cita")
      throw err
    }
  }

  const updateAppointment = async (id: string, updates: AppointmentUpdate) => {
    try {
      await AppointmentService.updateAppointment(id, updates)
      await fetchAppointments()
      toast.success("Cita actualizada correctamente")
    } catch (err) {
      toast.error("Error al actualizar la cita")
      throw err
    }
  }

  const deleteAppointment = async (id: string) => {
    try {
      await AppointmentService.deleteAppointment(id)
      toast.success("Cita eliminada correctamente")
    } catch (err) {
      toast.error("Error al eliminar la cita")
      throw err
    } finally {
      // Siempre refrescar los datos, incluso si hay error
      await fetchAppointments()
    }
  }

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  }
}
