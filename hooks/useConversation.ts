"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Conversation } from "@/types/chat"

export function useConversation(conversationId: string | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversation = useCallback(async () => {
    if (!conversationId) {
      setConversation(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          client:clients(*),
          canales_organization:canales_organizations(
            id,
            canal:canales(id, nombre, descripcion, imagen)
          )
        `)
        .eq("id", conversationId)
        .single()

      if (error) throw error
      
      setConversation(data)
      setError(null)
    } catch (err: any) {
      console.error("Error fetching conversation:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    fetchConversation()
  }, [fetchConversation])

  // Suscripción en tiempo real para una sola conversación
  useEffect(() => {
    if (!conversationId) return
    
    const channelId = `conversation-${conversationId}-${Date.now()}`
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedConversation = payload.new as Conversation
          setConversation(prev => prev ? { ...prev, ...updatedConversation } : updatedConversation)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Función para obtener el nombre a mostrar
  const displayName = conversation?.client?.name || 
                      conversation?.client?.phone || 
                      "Contacto desconocido"

  // Función para actualizar la conversación localmente
  const updateConversation = useCallback((updates: Partial<Conversation>) => {
    setConversation(prev => prev ? { ...prev, ...updates } : null)
  }, [])

  return {
    conversation,
    loading,
    error,
    displayName,
    refetch: fetchConversation,
    updateConversation
  }
}