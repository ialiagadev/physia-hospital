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

    console.log("📨 Setting up messages for conversation:", conversationId)

    const fetchMessages = async () => {
      try {
        console.log("🔄 Fetching messages for conversation:", conversationId)

        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })

        if (error) {
          console.error("❌ Error fetching messages:", error)
          setError(error.message)
        } else {
          console.log("💬 Messages fetched:", data?.length || 0)

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
          console.log("✅ Messages updated:", filteredMessages.length)
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
      console.log("🧹 Cleaning up previous messages channel")
      supabase.removeChannel(channelRef.current)
    }

    console.log("🔌 Setting up realtime for messages:", conversationId)

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
          console.log("📨 New message received:", payload)
          const newMessage = payload.new as Message

          // Filtrar mensajes de sistema en tiempo real
          if (newMessage.message_type === "system" && newMessage.metadata?.system_message) {
            if (newMessage.metadata.visible_to_user !== userProfile?.id) {
              console.log("🚫 System message not visible to current user")
              return // No mostrar este mensaje
            }
          }

          const eventId = getEventId(payload)

          // Evitar procesar eventos duplicados
          if (processedEvents.current.has(eventId)) {
            console.log("🔄 Skipping duplicate INSERT event:", eventId)
            return
          }

          processedEvents.current.add(eventId)

          if (!processedMessageIds.current.has(newMessage.id)) {
            console.log("➕ Adding new message to list:", newMessage.id)
            processedMessageIds.current.add(newMessage.id)
            setMessages((prev) => {
              // Verificar duplicados una vez más
              const exists = prev.some((msg) => msg.id === newMessage.id)
              if (exists) {
                console.log("🔄 Message already exists in state:", newMessage.id)
                return prev
              }

              // Agregar el mensaje y mantener orden cronológico
              const newMessages = [...prev, newMessage].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              )

              console.log("✅ Message added successfully:", newMessage.id)
              return newMessages
            })
          } else {
            console.log("⚠️ Message already processed:", newMessage.id)
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
          console.log("📝 Message updated:", payload)
          const updatedMessage = payload.new as Message

          const eventId = getEventId(payload)

          // Evitar procesar eventos duplicados
          if (processedEvents.current.has(eventId)) {
            console.log("🔄 Skipping duplicate UPDATE event:", eventId)
            return
          }

          processedEvents.current.add(eventId)

          // Aplicar el mismo filtro para mensajes actualizados
          if (updatedMessage.message_type === "system" && updatedMessage.metadata?.system_message) {
            if (updatedMessage.metadata.visible_to_user !== userProfile?.id) {
              console.log("🚫 Updated system message not visible to current user")
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
            console.log("🔄 Skipping duplicate DELETE event:", eventId)
            return
          }

          processedEvents.current.add(eventId)
          console.log("🗑️ Message deleted:", payload.old)

          const deletedMessage = payload.old as Message

          // Remover de IDs procesados
          processedMessageIds.current.delete(deletedMessage.id)

          setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== deletedMessage.id))
        },
      )
      .subscribe((status) => {
        console.log("📡 Messages realtime subscription status:", status)
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to messages realtime")
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
          console.log("🔒 Messages realtime channel closed")
          isSubscribedRef.current = false
        }
      })

    channelRef.current = channel

    return () => {
      console.log("🧹 Cleaning up messages realtime subscription")
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
