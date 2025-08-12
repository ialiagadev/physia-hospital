"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import type { Message } from "@/types/chat"
import { toast } from "@/hooks/use-toast"

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userProfile } = useAuth()
  const processedMessageIds = useRef<Set<string>>(new Set())
  const channelRef = useRef<any>(null)
  const isSubscribedRef = useRef(false)
  const processedEvents = useRef<Set<string>>(new Set())

  // Función para generar un ID único para eventos
  const getEventId = (payload: any) => {
    return `${payload.eventType}-${payload.table}-${payload.new?.id || payload.old?.id}-${payload.commit_timestamp}`
  }

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })

        if (error) {
          console.error("❌ Error fetching messages:", error)
          setError(error.message)
        } else {
          // Filtrar mensajes de sistema que solo debe ver el usuario actual
          const filteredMessages =
            data?.filter((msg) => {
              // Si es un mensaje de sistema, verificar si el usuario actual puede verlo
              if (msg.message_type === "system" && msg.metadata?.system_message) {
                return msg.metadata.visible_to_user === userProfile?.id
              }
              // Todos los demás mensajes son visibles
              return true
            }) || []

          // Limpiar y repoblar los IDs procesados
          processedMessageIds.current.clear()
          filteredMessages.forEach((msg) => processedMessageIds.current.add(msg.id))

          setMessages(filteredMessages)
          setError(null)
        }
      } catch (err) {
        console.error("💥 Unexpected error:", err)
        setError("Error inesperado al cargar mensajes")
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Limpiar canal anterior si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`messages-${conversationId}-${Date.now()}`) // Nombre único
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message

          // Filtrar mensajes de sistema en tiempo real
          if (newMessage.message_type === "system" && newMessage.metadata?.system_message) {
            if (newMessage.metadata.visible_to_user !== userProfile?.id) {
              return // No mostrar este mensaje
            }
          }

          const eventId = getEventId(payload)

          // Evitar procesar eventos duplicados
          if (processedEvents.current.has(eventId)) {
            return
          }

          processedEvents.current.add(eventId)

          if (!processedMessageIds.current.has(newMessage.id)) {
            processedMessageIds.current.add(newMessage.id)
            setMessages((prev) => {
              // Verificar duplicados una vez más
              const exists = prev.some((msg) => msg.id === newMessage.id)
              if (exists) {
                return prev
              }

              // Agregar el mensaje y mantener orden cronológico
              const newMessages = [...prev, newMessage].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              )

              return newMessages
            })
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message

          const eventId = getEventId(payload)

          // Evitar procesar eventos duplicados
          if (processedEvents.current.has(eventId)) {
            return
          }

          processedEvents.current.add(eventId)

          // Aplicar el mismo filtro para mensajes actualizados
          if (updatedMessage.message_type === "system" && updatedMessage.metadata?.system_message) {
            if (updatedMessage.metadata.visible_to_user !== userProfile?.id) {
              return
            }
          }

          setMessages((prev) => prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const eventId = getEventId(payload)

          if (processedEvents.current.has(eventId)) {
            return
          }

          processedEvents.current.add(eventId)

          const deletedMessage = payload.old as Message

          // Remover de IDs procesados
          processedMessageIds.current.delete(deletedMessage.id)

          setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== deletedMessage.id))
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          isSubscribedRef.current = true
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Messages realtime channel error")
          isSubscribedRef.current = false
          toast({
            title: "Error de conexión",
            description: "Problemas con las actualizaciones de mensajes en tiempo real",
            variant: "destructive",
          })
        } else if (status === "TIMED_OUT") {
          console.error("⏰ Messages realtime connection timed out")
          isSubscribedRef.current = false
        } else if (status === "CLOSED") {
          isSubscribedRef.current = false
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      isSubscribedRef.current = false
      processedEvents.current.clear()
    }
  }, [conversationId, userProfile?.id])

  return { messages, loading, error }
}
