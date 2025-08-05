"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import type { ConversationWithLastMessage } from "@/types/chat"

export function useConversation(conversationId: string) {
  const [conversation, setConversation] = useState<ConversationWithLastMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversation = async () => {
    if (!conversationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("conversations")
        .select(`
          *,
          client:clients(*),
          canales_organization:canales_organizations(
            *,
            canal:canales(*),
            waba:waba(*)
          )
        `)
        .eq("id", conversationId)
        .single()

      if (fetchError) {
        console.error("Error fetching conversation:", fetchError)
        setError(fetchError.message)
        return
      }

      setConversation(data)
    } catch (err) {
      console.error("Error in fetchConversation:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversation()
  }, [conversationId])

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("Conversation updated:", payload)
          fetchConversation()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return {
    conversation,
    loading,
    error,
    refetch: fetchConversation,
  }
}
