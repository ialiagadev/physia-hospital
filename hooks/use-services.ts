"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Service, ServiceInsert } from "@/types/services"
import { toast } from "sonner"

export function useServices(organizationId?: number) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para obtener servicios
  const fetchServices = useCallback(async () => {
    if (!organizationId) {
      console.log("❌ useServices: No organizationId provided")
      setServices([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 useServices: Fetching services for organizationId:", organizationId)

      // Consulta simple sin JOINs problemáticos
      const { data, error: fetchError } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })

      console.log("🎯 useServices: Services fetched:", data)
      console.log("❌ useServices: Error:", fetchError)

      if (fetchError) {
        console.error("Error fetching services:", fetchError)
        throw fetchError
      }

      setServices(data || [])
      console.log("✅ useServices: Services set successfully:", data?.length || 0, "services")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al cargar servicios"
      setError(errorMessage)
      console.error("💥 useServices: Error in fetchServices:", err)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Función para crear servicio
  const createService = useCallback(async (serviceData: ServiceInsert): Promise<Service> => {
    try {
      console.log("➕ useServices: Creating service:", serviceData)

      const { data, error } = await supabase.from("services").insert(serviceData).select().single()

      if (error) throw error

      console.log("✅ useServices: Service created:", data)

      // Actualizar la lista local
      setServices((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)))

      toast.success("Servicio creado correctamente")
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear servicio"
      console.error("💥 useServices: Error creating service:", err)
      toast.error(errorMessage)
      throw err
    }
  }, [])

  // Función para actualizar servicio
  const updateService = useCallback(async (id: number, updates: Partial<ServiceInsert>): Promise<Service> => {
    try {
      console.log("✏️ useServices: Updating service:", id, updates)

      const { data, error } = await supabase
        .from("services")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      console.log("✅ useServices: Service updated:", data)

      // Actualizar la lista local
      setServices((prev) =>
        prev
          .map((service) => (service.id === id ? data : service))
          .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
      )

      toast.success("Servicio actualizado correctamente")
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar servicio"
      console.error("💥 useServices: Error updating service:", err)
      toast.error(errorMessage)
      throw err
    }
  }, [])

  // Función para eliminar servicio
  const deleteService = useCallback(async (id: number): Promise<void> => {
    try {
      console.log("🗑️ useServices: Deleting service:", id)

      const { error } = await supabase.from("services").delete().eq("id", id)

      if (error) throw error

      console.log("✅ useServices: Service deleted")

      // Actualizar la lista local
      setServices((prev) => prev.filter((service) => service.id !== id))

      toast.success("Servicio eliminado correctamente")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar servicio"
      console.error("💥 useServices: Error deleting service:", err)
      toast.error(errorMessage)
      throw err
    }
  }, [])

  // Función para obtener servicios de un usuario específico
  const getUserServices = useCallback(
    async (userId: string) => {
      if (!organizationId) return []

      try {
        console.log("👤 useServices: Fetching user services for:", userId)

        // Consulta corregida: obtener servicios del usuario a través de user_services
        const { data, error } = await supabase
          .from("user_services")
          .select(`
            id,
            user_id,
            service_id,
            created_at,
            services!inner (
              id,
              name,
              description,
              price,
              vat_rate,
              irpf_rate,
              retention_rate,
              active,
              category,
              duration,
              color,
              icon,
              sort_order,
              organization_id,
              created_at,
              updated_at
            )
          `)
          .eq("user_id", userId)
          .eq("services.organization_id", organizationId)
          .eq("services.active", true)

        console.log("✅ useServices: User services:", data)

        if (error) throw error

        // Transformar los datos para que sean más fáciles de usar
        const userServices =
          data?.map((item) => ({
            ...item,
            service: item.services,
          })) || []

        return userServices
      } catch (err) {
        console.error("💥 useServices: Error fetching user services:", err)
        return []
      }
    },
    [organizationId],
  )

  // Función para obtener todos los servicios disponibles para un usuario
  const getAvailableServicesForUser = useCallback(
    async (userId: string) => {
      if (!organizationId) return []

      try {
        console.log("🔍 useServices: Fetching available services for user:", userId)

        // Obtener servicios ya asignados al usuario
        const { data: assignedServices, error: assignedError } = await supabase
          .from("user_services")
          .select("service_id")
          .eq("user_id", userId)

        if (assignedError) throw assignedError

        const assignedServiceIds = assignedServices?.map((item) => item.service_id) || []

        // Obtener todos los servicios activos de la organización que NO están asignados
        const { data: availableServices, error: availableError } = await supabase
          .from("services")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("active", true)
          .not("id", "in", `(${assignedServiceIds.length > 0 ? assignedServiceIds.join(",") : "0"})`)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })

        if (availableError) throw availableError

        console.log("✅ useServices: Available services:", availableServices)
        return availableServices || []
      } catch (err) {
        console.error("💥 useServices: Error fetching available services:", err)
        return []
      }
    },
    [organizationId],
  )

  // Función para asignar servicio a usuario
  const assignServiceToUser = useCallback(async (userId: string, serviceId: number): Promise<void> => {
    try {
      console.log("🔗 useServices: Assigning service to user:", { userId, serviceId })

      const { error } = await supabase.from("user_services").insert({
        user_id: userId,
        service_id: serviceId,
      })

      if (error) throw error

      console.log("✅ useServices: Service assigned to user")
      toast.success("Servicio asignado al usuario correctamente")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al asignar servicio"
      console.error("💥 useServices: Error assigning service:", err)
      toast.error(errorMessage)
      throw err
    }
  }, [])

  // Función para desasignar servicio de usuario
  const unassignServiceFromUser = useCallback(async (userId: string, serviceId: number): Promise<void> => {
    try {
      console.log("🔗 useServices: Unassigning service from user:", { userId, serviceId })

      const { error } = await supabase.from("user_services").delete().eq("user_id", userId).eq("service_id", serviceId)

      if (error) throw error

      console.log("✅ useServices: Service unassigned from user")
      toast.success("Servicio desasignado del usuario correctamente")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al desasignar servicio"
      console.error("💥 useServices: Error unassigning service:", err)
      toast.error(errorMessage)
      throw err
    }
  }, [])

  // Cargar servicios al montar el componente o cambiar organizationId
  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
    createService,
    updateService,
    deleteService,
    getUserServices,
    getAvailableServicesForUser,
    assignServiceToUser,
    unassignServiceFromUser,
  }
}
