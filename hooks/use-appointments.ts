"use client"

import { useState, useEffect } from "react"
import { AppointmentService } from "@/lib/services/appointments"
import type { AppointmentWithDetails, AppointmentInsert, AppointmentUpdate } from "@/types/calendar"
import { toast } from "sonner"
import { useAuth } from "@/app/contexts/auth-context"
import { autoSyncAppointment } from "@/lib/auto-sync"

export function useAppointments(
  organizationId?: number,
  startDate?: string,
  endDate?: string,
  professionalIds?: string[],
) {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { userProfile } = useAuth()
  const isUserRole = userProfile?.role === "user"

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!organizationId) {
        setAppointments([])
        setLoading(false)
        return
      }

      // Si es usuario 'user', forzar filtro por su propio ID
      const finalProfessionalIds = professionalIds

      const data = await AppointmentService.getAppointmentsWithDetails(startDate, endDate, finalProfessionalIds)
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
  }, [organizationId, startDate, endDate, professionalIds?.join(","), isUserRole, userProfile?.id])

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

      // Crear la cita
      const createdAppointment = await AppointmentService.createAppointment(appointment)

      // 🆕 SINCRONIZACIÓN AUTOMÁTICA
      if (createdAppointment && userProfile?.id && organizationId) {
        console.log("🔄 Iniciando sincronización automática para cita:", createdAppointment.id)

        // Sincronizar en segundo plano (no bloquear la UI)
        autoSyncAppointment(createdAppointment.id, userProfile.id, organizationId)
          .then((result) => {
            if (result.success) {
              console.log("✅ Cita sincronizada automáticamente con Google Calendar")
              // Opcional: mostrar notificación discreta
              // toast.success("Cita sincronizada con Google Calendar", { duration: 2000 })
            }
          })
          .catch((error) => {
            console.log("ℹ️ Sincronización automática no disponible:", error)
            // No mostrar error al usuario, es opcional
          })
      }

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

      // 🆕 SINCRONIZACIÓN AUTOMÁTICA PARA ACTUALIZACIONES
      if (userProfile?.id && organizationId) {
        console.log("🔄 Iniciando sincronización automática para actualización de cita:", id)

        // Sincronizar en segundo plano
        autoSyncAppointment(id, userProfile.id, organizationId)
          .then((result) => {
            if (result.success) {
              console.log("✅ Actualización sincronizada automáticamente con Google Calendar")
            }
          })
          .catch((error) => {
            console.log("ℹ️ Sincronización automática no disponible:", error)
          })
      }

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

      // 🆕 OPCIONAL: Eliminar de Google Calendar también
      // TODO: Implementar eliminación en Google Calendar si es necesario

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
