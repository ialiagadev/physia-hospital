"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

export function useTaskComments(taskId: number) {
  const [loading, setLoading] = useState(false)

  // Añadir comentario
  const añadirComentario = useCallback(
    async (texto: string) => {
      try {
        setLoading(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error("Usuario no autenticado")

        const { error } = await supabase.from("task_comments").insert({
          task_id: taskId,
          user_id: user.id,
          texto: texto,
        })

        if (error) throw error

        toast.success("Comentario añadido")
      } catch (err) {
        console.error("Error añadiendo comentario:", err)
        toast.error("Error al añadir comentario")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [taskId],
  )

  // Editar comentario
  const editarComentario = useCallback(async (comentarioId: number, nuevoTexto: string) => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from("task_comments")
        .update({
          texto: nuevoTexto,
          editado: true,
        })
        .eq("id", comentarioId)

      if (error) throw error

      toast.success("Comentario actualizado")
    } catch (err) {
      console.error("Error editando comentario:", err)
      toast.error("Error al editar comentario")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Eliminar comentario
  const eliminarComentario = useCallback(async (comentarioId: number) => {
    try {
      setLoading(true)

      const { error } = await supabase.from("task_comments").delete().eq("id", comentarioId)

      if (error) throw error

      toast.success("Comentario eliminado")
    } catch (err) {
      console.error("Error eliminando comentario:", err)
      toast.error("Error al eliminar comentario")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    añadirComentario,
    editarComentario,
    eliminarComentario,
  }
}
