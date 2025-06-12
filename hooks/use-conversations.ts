"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Conversation, ConversationWithLastMessage } from "@/types/chat"

export function useConversations(organizationId: string | undefined, viewMode: "all" | "assigned" = "all") {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Función para cargar conversaciones con el último mensaje
    const fetchConversations = async () => {
      try {
        setLoading(true)

        if (!organizationId) {
          setConversations([])
          setLoading(false)
          return
        }

        // Convertir string a number para la consulta
        const orgIdNumber = Number(organizationId)
        if (isNaN(orgIdNumber)) {
          console.error("Invalid organization ID:", organizationId)
          setError("ID de organización inválido")
          setLoading(false)
          return
        }

        // Primero obtenemos las conversaciones con sus clientes
        const { data: conversationsData, error: conversationsError } = await supabase
          .from("conversations")
          .select(`
            *,
            client:clients(*),
            canales_organization:canales_organizations(
              id,
              canal:canales(
                id,
                nombre,
                descripcion,
                imagen
              )
            )
          `)
          .eq("organization_id", orgIdNumber)
          .order("last_message_at", { ascending: false, nullsFirst: false })

        if (conversationsError) {
          console.error("Error fetching conversations:", conversationsError)
          setError(conversationsError.message)
          return
        }

        // Para cada conversación, obtenemos su último mensaje
        const conversationsWithMessages = await Promise.all(
          (conversationsData || []).map(async (conversation) => {
            const { data: lastMessage } = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single()

            return {
              ...conversation,
              last_message: lastMessage || null,
            }
          }),
        )

        setConversations(conversationsWithMessages)
        setError(null)
      } catch (err) {
        setError("Error inesperado al cargar conversaciones")
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()

    if (organizationId) {
      const orgIdNumber = Number(organizationId)
      if (!isNaN(orgIdNumber)) {
        // Suscribirse a cambios en tiempo real
        const channel = supabase
          .channel("conversations-changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "conversations",
              filter: `organization_id=eq.${orgIdNumber}`,
            },
            (payload) => {
              fetchConversations()
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
            },
            (payload) => {
              fetchConversations()
            },
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    }
  }, [organizationId, viewMode])

  const refetch = () => {
    setLoading(true)
  }

  return { conversations, loading, error, refetch }
}

// Hook para obtener conversaciones filtradas por asignación
export function useFilteredConversations(
  organizationId: string | undefined,
  currentUserId: string | undefined,
  viewMode: "all" | "assigned" = "all",
) {
  const { conversations, loading, error, refetch } = useConversations(organizationId, viewMode)

  const filteredConversations = useMemo(() => {
    if (viewMode === "all") {
      return conversations
    }

    if (viewMode === "assigned" && currentUserId) {
      return conversations.filter((conv) => conv.assigned_user_ids && conv.assigned_user_ids.includes(currentUserId))
    }

    return conversations
  }, [conversations, viewMode, currentUserId])

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    loading,
    error,
    refetch,
  }
}

// Hook para obtener una conversación específica
export function useConversation(conversationId: string | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conversationId) {
      setConversation(null)
      setLoading(false)
      return
    }

    const fetchConversation = async () => {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from("conversations")
          .select(`
            *,
            client:clients(*),
            canales_organization:canales_organizations(
              id,
              canal:canales(
                id,
                nombre,
                descripcion,
                imagen
              )
            )
          `)
          .eq("id", conversationId)
          .single()

        if (error) {
          console.error("Error fetching conversation:", error)
          setError(error.message)
        } else {
          setConversation(data)
          setError(null)
        }
      } catch (err) {
        setError("Error inesperado al cargar conversación")
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()

    // Suscribirse a cambios en tiempo real
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
          fetchConversation()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Función para obtener el nombre a mostrar
  const getDisplayName = () => {
    if (!conversation?.client) return "Contacto desconocido"

    // Si tiene nombre, mostrarlo
    if (conversation.client.name && conversation.client.name.trim() !== "") {
      return conversation.client.name
    }

    // Si no tiene nombre pero tiene teléfono, mostrar el número
    if (conversation.client.phone) {
      return conversation.client.phone
    }

    // Si no tiene ni nombre ni teléfono
    return "Contacto desconocido"
  }

  return {
    conversation,
    loading,
    error,
    displayName: getDisplayName(),
  }
}
