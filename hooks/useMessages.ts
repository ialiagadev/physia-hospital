"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Message } from "@/types/chat"

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    // Función para cargar mensajes
    const fetchMessages = async () => {
      try {
        console.log("=== FETCHING MESSAGES ===")
        console.log("Conversation ID:", conversationId)
        console.log("Type of conversationId:", typeof conversationId)

        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })

        console.log("Messages query result:", { data, error, count: data?.length })

        if (error) {
          console.error("Error fetching messages:", error)
          setError(error.message)
        } else {
          console.log("Messages loaded successfully:", data)
          setMessages(data || [])
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

    // Suscribirse a nuevos mensajes en tiempo real
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
          console.log("New message:", payload)
          setMessages((prev) => [...prev, payload.new as Message])
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
          console.log("Message updated:", payload)
          setMessages((prev) => prev.map((msg) => (msg.id === payload.new.id ? (payload.new as Message) : msg)))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return { messages, loading, error }
}
