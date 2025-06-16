"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { markMessagesAsRead, getUnreadMessagesCount, getTotalUnreadCount } from "@/lib/chatActions"

export function useUnreadMessages(conversationId?: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Obtener conteo inicial
  useEffect(() => {
    if (!conversationId) return

    const fetchUnreadCount = async () => {
      setLoading(true)
      try {
        const count = await getUnreadMessagesCount(conversationId)
        setUnreadCount(count)
      } catch (error) {
        console.error("Error fetching unread count:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUnreadCount()
  }, [conversationId])

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Conversation updated:", payload)
          if (payload.new && typeof payload.new.unread_count === "number") {
            setUnreadCount(payload.new.unread_count)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("New message:", payload)
          // Si es un mensaje del contacto, incrementar contador
          if (payload.new && payload.new.sender_type === "contact") {
            setUnreadCount((prev) => prev + 1)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Función para marcar como leído
  const markAsRead = async () => {
    if (!conversationId) return

    try {
      await markMessagesAsRead(conversationId)
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  return {
    unreadCount,
    loading,
    markAsRead,
  }
}

export function useTotalUnreadMessages(organizationId?: number) {
  const [totalUnread, setTotalUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!organizationId) return

    const fetchTotalUnread = async () => {
      setLoading(true)
      try {
        const total = await getTotalUnreadCount(organizationId)
        setTotalUnread(total)
      } catch (error) {
        console.error("Error fetching total unread:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTotalUnread()

    // Suscribirse a cambios en todas las conversaciones de la organización
    const channel = supabase
      .channel(`org-conversations-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // Refrescar el conteo total cuando cambie cualquier conversación
          fetchTotalUnread()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId])

  return {
    totalUnread,
    loading,
  }
}
