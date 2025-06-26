"use client"

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

export function useTaskAttachments(taskId: number) {
  const [loading, setLoading] = useState(false)

  // Añadir adjunto
  const añadirAdjunto = useCallback(
    async (archivo: File) => {
      try {
        setLoading(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error("Usuario no autenticado")

        // TODO: Implementar subida de archivo a Vercel Blob
        // Por ahora, simularemos con una URL temporal
        const url = URL.createObjectURL(archivo)

        const { error } = await supabase.from("task_attachments").insert({
          task_id: taskId,
          nombre: archivo.name,
          tipo: archivo.type,
          tamaño: archivo.size,
          url: url, // En producción, sería la URL de Vercel Blob
        })

        if (error) throw error

        toast.success("Archivo adjuntado")
      } catch (err) {
        console.error("Error añadiendo adjunto:", err)
        toast.error("Error al adjuntar archivo")
        throw err
      } finally {
        setLoading(false)
      }
    },
    [taskId],
  )

  // Eliminar adjunto
  const eliminarAdjunto = useCallback(async (adjuntoId: number) => {
    try {
      setLoading(true)

      const { error } = await supabase.from("task_attachments").delete().eq("id", adjuntoId)

      if (error) throw error

      toast.success("Archivo eliminado")
    } catch (err) {
      console.error("Error eliminando adjunto:", err)
      toast.error("Error al eliminar archivo")
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    añadirAdjunto,
    eliminarAdjunto,
  }
}
