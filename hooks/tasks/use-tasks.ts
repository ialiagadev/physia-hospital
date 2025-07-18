"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Tarea, EstadoTarea, PrioridadTarea } from "@/types/tasks"

export function useTasks() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar tareas con consulta simplificada
  const cargarTareas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Primero verificamos si la tabla tasks existe
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .order("orden", { ascending: true })

      if (tasksError) {
        console.error("Error en consulta de tareas:", tasksError)
        throw tasksError
      }

      // Si no hay datos, crear array vacío
      if (!tasksData) {
        setTareas([])
        return
      }

      // Transformar datos básicos sin relaciones complejas por ahora
      const tareasTransformadas: Tarea[] = tasksData.map((task) => ({
        id: task.id,
        titulo: task.titulo || "Sin título",
        descripcion: task.descripcion || "",
        estado: (task.estado as EstadoTarea) || "pendiente",
        prioridad: (task.prioridad as PrioridadTarea) || "media",
        asignadosA: task.assigned_to ? (Array.isArray(task.assigned_to) ? task.assigned_to : [task.assigned_to]) : [],
        fechaVencimiento: task.fecha_vencimiento ? new Date(task.fecha_vencimiento) : undefined,
        fechaCreacion: task.fecha_creacion ? new Date(task.fecha_creacion) : new Date(),
        fechaCompletada: task.fecha_completada ? new Date(task.fecha_completada) : undefined,
        fechaArchivada: task.fecha_archivada ? new Date(task.fecha_archivada) : undefined,
        fechaEliminada: task.fecha_eliminada ? new Date(task.fecha_eliminada) : undefined,
        creadoPor: "Usuario", // Valor por defecto hasta obtener relación
        etiquetas: [], // Array vacío por ahora
        comentarios: [], // Array vacío por ahora
        adjuntos: [], // Array vacío por ahora
        actividad: [], // Array vacío por ahora
        orden: task.orden || 0,
        centro_id: task.organization_id,
      }))

      setTareas(tareasTransformadas)
    } catch (err) {
      console.error("Error cargando tareas:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      // Si las tablas no existen, mostrar mensaje específico
      if (err instanceof Error && err.message.includes("does not exist")) {
        setError("Las tablas de tareas no están creadas. Ejecuta los scripts SQL primero.")
        toast.error("Tablas de tareas no encontradas")
      } else {
        toast.error("Error al cargar las tareas")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Crear nueva tarea
  const crearTarea = useCallback(
    async (nuevaTarea: {
      titulo: string
      descripcion: string
      prioridad: PrioridadTarea
      asignadosA?: string[]
      fechaVencimiento?: string
      etiquetas?: string[]
    }) => {
      try {
        // Obtener usuario actual
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) throw new Error("Usuario no autenticado")

        // Obtener organización del usuario
        const { data: userData } = await supabase.from("users").select("organization_id").eq("id", user.id).single()

        if (!userData?.organization_id) throw new Error("Usuario sin organización")

        // Obtener el orden máximo para el estado "pendiente"
        const { data: maxOrdenData } = await supabase
          .from("tasks")
          .select("orden")
          .eq("organization_id", userData.organization_id)
          .eq("estado", "pendiente")
          .order("orden", { ascending: false })
          .limit(1)

        const maxOrden = maxOrdenData?.[0]?.orden || 0

        // Crear la tarea con campos básicos
        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .insert({
            organization_id: userData.organization_id,
            created_by: user.id,
            assigned_to: nuevaTarea.asignadosA && nuevaTarea.asignadosA.length > 0 ? nuevaTarea.asignadosA : null,
            titulo: nuevaTarea.titulo,
            descripcion: nuevaTarea.descripcion,
            estado: "pendiente",
            prioridad: nuevaTarea.prioridad,
            fecha_vencimiento: nuevaTarea.fechaVencimiento || null,
            orden: maxOrden + 1,
          })
          .select()
          .single()

        if (taskError) throw taskError

        // Recargar tareas
        await cargarTareas()
        toast.success("Tarea creada correctamente")
        return taskData
      } catch (err) {
        console.error("Error creando tarea:", err)
        toast.error("Error al crear la tarea")
        throw err
      }
    },
    [cargarTareas],
  )

  // Actualizar estado de tarea
  const actualizarEstadoTarea = useCallback(
    async (id: number, nuevoEstado: EstadoTarea) => {
      try {
        const updates: any = { estado: nuevoEstado }

        if (nuevoEstado === "completada") {
          updates.fecha_completada = new Date().toISOString()
        } else if (nuevoEstado === "archivada") {
          updates.fecha_archivada = new Date().toISOString()
        }

        const { error } = await supabase.from("tasks").update(updates).eq("id", id)

        if (error) throw error

        await cargarTareas()
        toast.success("Estado actualizado")
      } catch (err) {
        console.error("Error actualizando estado:", err)
        toast.error("Error al actualizar el estado")
      }
    },
    [cargarTareas],
  )

  // Eliminar tarea (soft delete)
  const eliminarTarea = useCallback(
    async (id: number) => {
      try {
        const { error } = await supabase
          .from("tasks")
          .update({ fecha_eliminada: new Date().toISOString() })
          .eq("id", id)

        if (error) throw error

        await cargarTareas()
        toast.success("Tarea eliminada")
      } catch (err) {
        console.error("Error eliminando tarea:", err)
        toast.error("Error al eliminar la tarea")
      }
    },
    [cargarTareas],
  )

  // Actualizar tarea completa
  const actualizarTarea = useCallback(
    async (tarea: Tarea) => {
      try {
        const { error } = await supabase
          .from("tasks")
          .update({
            titulo: tarea.titulo,
            descripcion: tarea.descripcion,
            estado: tarea.estado,
            prioridad: tarea.prioridad,
            assigned_to: tarea.asignadosA && tarea.asignadosA.length > 0 ? tarea.asignadosA : null,
            fecha_vencimiento: tarea.fechaVencimiento?.toISOString() || null,
          })
          .eq("id", tarea.id)

        if (error) throw error

        await cargarTareas()
        toast.success("Tarea actualizada")
      } catch (err) {
        console.error("Error actualizando tarea:", err)
        toast.error("Error al actualizar la tarea")
      }
    },
    [cargarTareas],
  )

  // Reordenar tareas
  const reordenarTareas = useCallback(
    async (tareaId: number, nuevoOrden: number, nuevoEstado?: EstadoTarea) => {
      try {
        const updates: any = { orden: nuevoOrden }
        if (nuevoEstado) {
          updates.estado = nuevoEstado
        }

        const { error } = await supabase.from("tasks").update(updates).eq("id", tareaId)

        if (error) throw error

        await cargarTareas()
      } catch (err) {
        console.error("Error reordenando tarea:", err)
        toast.error("Error al reordenar la tarea")
      }
    },
    [cargarTareas],
  )

  // Restaurar tarea archivada
  const restaurarTarea = useCallback(
    async (id: number) => {
      try {
        const { error } = await supabase
          .from("tasks")
          .update({
            fecha_archivada: null,
            estado: "pendiente",
          })
          .eq("id", id)

        if (error) throw error

        await cargarTareas()
        toast.success("Tarea restaurada")
      } catch (err) {
        console.error("Error restaurando tarea:", err)
        toast.error("Error al restaurar la tarea")
      }
    },
    [cargarTareas],
  )

  // Cargar tareas al montar el componente
  useEffect(() => {
    cargarTareas()
  }, [cargarTareas])

  return {
    tareas,
    loading,
    error,
    cargarTareas,
    crearTarea,
    actualizarEstadoTarea,
    eliminarTarea,
    actualizarTarea,
    reordenarTareas,
    restaurarTarea,
  }
}
