"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Service, ServiceInsert } from "@/types/services"
import { toast } from "sonner"

export function useServices(organizationId?: number) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para obtener servicios (todos, no solo activos para la página de administración)
  const fetchServices = useCallback(async () => {
    if (!organizationId) {
      setServices([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Consulta simple sin JOINs problemáticos - obtener TODOS los servicios
      const { data, error: fetchError } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .order("active", { ascending: false }) // Activos primero
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })

      if (fetchError) {
        console.error("Error fetching services:", fetchError)
        throw fetchError
      }

      setServices(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al cargar servicios"
      setError(errorMessage)
      console.error("💥 useServices: Error in fetchServices:", err)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Función para obtener solo servicios activos (para formularios y selecciones)
  const fetchActiveServices = useCallback(async () => {
    if (!organizationId) return []

    try {
      const { data, error: fetchError } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })

      if (fetchError) {
        console.error("Error fetching active services:", fetchError)
        throw fetchError
      }

      return data || []
    } catch (err) {
      console.error("💥 useServices: Error in fetchActiveServices:", err)
      return []
    }
  }, [organizationId])

  // Función para crear servicio
  const createService = useCallback(async (serviceData: ServiceInsert): Promise<Service> => {
    try {
      const { data, error } = await supabase.from("services").insert(serviceData).select().single()

      if (error) throw error

      // Actualizar la lista local
      setServices((prev) =>
        [...prev, data].sort((a, b) => {
          // Activos primero
          if (a.active !== b.active) return b.active ? 1 : -1
          // Luego por sort_order
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
          // Finalmente por nombre
          return a.name.localeCompare(b.name)
        }),
      )

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
      const { data, error } = await supabase
        .from("services")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      // Actualizar la lista local
      setServices((prev) =>
        prev
          .map((service) => (service.id === id ? data : service))
          .sort((a, b) => {
            // Activos primero
            if (a.active !== b.active) return b.active ? 1 : -1
            // Luego por sort_order
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
            // Finalmente por nombre
            return a.name.localeCompare(b.name)
          }),
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

  // Función para "eliminar" servicio (soft delete - mantener compatibilidad con nombre anterior)
  const deleteService = useCallback(async (id: number): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("services")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      // Actualizar la lista local
      setServices((prev) =>
        prev
          .map((service) => (service.id === id ? data : service))
          .sort((a, b) => {
            // Activos primero
            if (a.active !== b.active) return b.active ? 1 : -1
            // Luego por sort_order
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
            // Finalmente por nombre
            return a.name.localeCompare(b.name)
          }),
      )

      toast.success("Servicio desactivado correctamente")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al desactivar servicio"
      console.error("💥 useServices: Error deactivating service:", err)
      toast.error(errorMessage)
      throw err
    }
  }, [])

  // Función para desactivar servicio (alias más claro)
  const deactivateService = useCallback(
    async (id: number): Promise<void> => {
      return deleteService(id)
    },
    [deleteService],
  )

  // Función para reactivar servicio
  const reactivateService = useCallback(async (id: number): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("services")
        .update({ active: true, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      // Actualizar la lista local
      setServices((prev) =>
        prev
          .map((service) => (service.id === id ? data : service))
          .sort((a, b) => {
            // Activos primero
            if (a.active !== b.active) return b.active ? 1 : -1
            // Luego por sort_order
            if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
            // Finalmente por nombre
            return a.name.localeCompare(b.name)
          }),
      )

      toast.success("Servicio reactivado correctamente")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al reactivar servicio"
      console.error("💥 useServices: Error reactivating service:", err)
      toast.error(errorMessage)
      throw err
    }
  }, [])

  // Función para obtener servicios de un usuario específico (solo activos)
  const getUserServices = useCallback(
    async (userId: string) => {
      if (!organizationId) return []

      try {
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

  // Obtener usuarios asignados a un servicio
  const getServiceUsers = useCallback(
    async (serviceId: string, users: any[]) => {
      if (!organizationId || !serviceId) {
        return users.filter((user) => user.type === 1) // Solo profesionales
      }

      try {
        const { data, error } = await supabase
          .from("user_services")
          .select(`
          user_id,
          users!inner (
            id,
            name,
            email,
            role,
            organization_id,
            type
          )
        `)
          .eq("service_id", serviceId)

        if (error) {
          return users.filter((user) => user.type === 1)
        }

        const serviceUsers: any[] = []
        if (data) {
          for (const item of data) {
            if (item.users && typeof item.users === "object" && !Array.isArray(item.users)) {
              const user = item.users as any
              if (user.organization_id === organizationId && user.type === 1) {
                serviceUsers.push(user)
              }
            }
          }
        }

        return serviceUsers
      } catch (err) {
        return users.filter((user) => user.type === 1)
      }
    },
    [organizationId],
  )

  // Función para obtener todos los servicios disponibles para un usuario (solo activos)
  const getAvailableServicesForUser = useCallback(
    async (userId: string) => {
      if (!organizationId) return []

      try {
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
      const { error } = await supabase.from("user_services").insert({
        user_id: userId,
        service_id: serviceId,
      })

      if (error) throw error

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
      const { error } = await supabase.from("user_services").delete().eq("user_id", userId).eq("service_id", serviceId)

      if (error) throw error

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
    fetchActiveServices,
    createService,
    updateService,
    deleteService, // Mantener para compatibilidad (hace soft delete)
    deactivateService, // Alias más claro
    reactivateService,
    getUserServices,
    getAvailableServicesForUser,
    assignServiceToUser,
    unassignServiceFromUser,
    getServiceUsers,
  }
}
