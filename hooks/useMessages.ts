"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import type { Message } from "@/types/chat"

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userProfile } = useAuth()
  const processedMessageIds = useRef<Set<string>>(new Set())

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
          console.error("Error fetching messages:", error)
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

          filteredMessages.forEach((msg) => processedMessageIds.current.add(msg.id))
          setMessages(filteredMessages)
          setError(null)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setError("Error inesperado al cargar mensajes")
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    const channel = supabase
      .channel(`messages-${conversationId}`)
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

          if (!processedMessageIds.current.has(newMessage.id)) {
            processedMessageIds.current.add(newMessage.id)
            setMessages((prev) => [...prev, newMessage])
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

          // Aplicar el mismo filtro para mensajes actualizados
          if (updatedMessage.message_type === "system" && updatedMessage.metadata?.system_message) {
            if (updatedMessage.metadata.visible_to_user !== userProfile?.id) {
              return
            }
          }

          setMessages((prev) => prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, userProfile?.id])

  return { messages, loading, error }
}
