"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Conversation, ConversationWithLastMessage, ConversationTag } from "@/types/chat"

export function useConversations(
  organizationId: string | undefined,
  viewMode: "all" | "assigned" = "all",
  currentUserId?: string,
) {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const lastFetchRef = useRef<number>(0)

  // Memoizar la función fetchConversations para evitar recreaciones
  const fetchConversations = useCallback(
    async (skipLoading = false) => {
      // Evitar múltiples llamadas simultáneas
      const now = Date.now()
      if (now - lastFetchRef.current < 500) {
        return
      }
      lastFetchRef.current = now

      try {
        if (!skipLoading) {
          setLoading(true)
        }

        if (!organizationId) {
          if (isMounted.current) {
            setConversations([])
            setLoading(false)
          }
          return
        }

        // Convertir string a number para la consulta
        const orgIdNumber = Number(organizationId)
        if (isNaN(orgIdNumber)) {
          if (isMounted.current) {
            setError("ID de organización inválido")
            setLoading(false)
          }
          return
        }

        // Primero obtenemos las conversaciones con sus clientes y etiquetas
        let query = supabase
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
            ),
            conversation_tags(
              id,
              conversation_id,
              tag_name,
              created_by,
              created_at
            )
          `)
          .eq("organization_id", orgIdNumber)

        // Agregar filtro por usuario asignado si es necesario
        if (viewMode === "assigned" && currentUserId) {
          query = query.contains("assigned_user_ids", [currentUserId])
        }

        const { data: conversationsData, error: conversationsError } = await query.order("last_message_at", {
          ascending: false,
          nullsFirst: false,
        })

        if (conversationsError) {
          if (isMounted.current) {
            setError(conversationsError.message)
          }
          return
        }

        // Optimización: Obtener todos los últimos mensajes en una sola consulta
        const conversationIds = (conversationsData || []).map((conv) => conv.id)

        if (conversationIds.length === 0) {
          if (isMounted.current) {
            setConversations([])
            setError(null)
            setLoading(false)
          }
          return
        }

        const { data: lastMessages } = await supabase
          .from("messages")
          .select("*")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })

        // Crear un mapa de los últimos mensajes por conversation_id
        const lastMessageMap = new Map()
        if (lastMessages) {
          for (const msg of lastMessages) {
            if (!lastMessageMap.has(msg.conversation_id)) {
              lastMessageMap.set(msg.conversation_id, msg)
            }
          }
        }

        // Combinar conversaciones con sus últimos mensajes
        const conversationsWithMessages = (conversationsData || []).map((conversation) => {
          return {
            ...conversation,
            last_message: lastMessageMap.get(conversation.id) || null,
          }
        })

        if (isMounted.current) {
          setConversations(conversationsWithMessages)
          setError(null)
        }
      } catch (err) {
        if (isMounted.current) {
          setError("Error inesperado al cargar conversaciones")
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    },
    [organizationId, currentUserId, viewMode],
  )

  // Función optimizada para actualizar solo las etiquetas de una conversación específica
  const updateConversationTags = useCallback(async (conversationId: string) => {
    try {
      console.log("🔍 Fetching updated tags for conversation:", conversationId)

      const { data: tags, error } = await supabase
        .from("conversation_tags")
        .select("id, conversation_id, tag_name, created_by, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching tags:", error)
        return
      }

      console.log("📊 Fetched tags from DB:", tags)

      if (isMounted.current) {
        setConversations((prev) => {
          console.log(
            "🔄 Before update - conversation tags:",
            prev.find((c) => c.id === conversationId)?.conversation_tags,
          )
          const updated = prev.map((conv) =>
            conv.id === conversationId ? { ...conv, conversation_tags: (tags || []) as ConversationTag[] } : conv,
          )
          console.log(
            "🔄 After update - conversation tags:",
            updated.find((c) => c.id === conversationId)?.conversation_tags,
          )
          return updated
        })
      }
    } catch (err) {
      console.error("Error updating conversation tags:", err)
    }
  }, [])

  useEffect(() => {
    isMounted.current = true
    fetchConversations()

    if (organizationId) {
      const orgIdNumber = Number(organizationId)
      if (!isNaN(orgIdNumber)) {
        // Suscribirse a cambios en tiempo real con optimización
        const channel = supabase
          .channel(`conversations-changes-${orgIdNumber}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "conversations",
              filter: `organization_id=eq.${orgIdNumber}`,
            },
            (payload) => {
              console.log("📢 Conversation change detected:", payload)
              // Actualizar de forma optimista sin mostrar el indicador de carga
              fetchConversations(true)
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
              console.log("💬 Message change detected:", payload)
              // Solo actualizar si el mensaje pertenece a una conversación que ya tenemos
              const messageData = payload.new as any
              if (messageData && messageData.conversation_id) {
                // Usar una función para acceder al estado actual
                setConversations((currentConversations) => {
                  const conversationExists = currentConversations.some((c) => c.id === messageData.conversation_id)
                  if (conversationExists) {
                    console.log("🔄 Updating conversations due to message change")
                    fetchConversations(true)
                  }
                  return currentConversations
                })
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*", // Escuchar INSERT, UPDATE y DELETE
              schema: "public",
              table: "conversation_tags",
            },
            (payload) => {
              console.log("🏷️ Tag change detected:", payload)
              console.log("🏷️ Event type:", payload.eventType)
              console.log("🏷️ New data:", payload.new)
              console.log("🏷️ Old data:", payload.old)

              // Para eventos DELETE, necesitamos hacer un refetch completo
              // porque Supabase no incluye conversation_id en payload.old
              if (payload.eventType === "DELETE") {
                console.log("🔄 DELETE event detected, doing full refetch")
                setTimeout(() => {
                  fetchConversations(true)
                }, 100)
                return
              }

              // Para INSERT y UPDATE, podemos actualizar solo la conversación específica
              const tagData = payload.new as any
              if (tagData && tagData.conversation_id) {
                console.log("🔄 Will update tags for conversation:", tagData.conversation_id)
                setTimeout(() => {
                  updateConversationTags(tagData.conversation_id)
                }, 100)
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "conversation_notes",
            },
            (payload) => {
              console.log("📝 Note change detected:", payload)
              // Para las notas, solo necesitamos un log ya que no se muestran en el ChatList
              const noteData = (payload.new as any) || (payload.old as any)
              if (noteData && noteData.conversation_id) {
                console.log("📝 Note change detected for conversation:", noteData.conversation_id)
                // Las notas no se muestran en ChatList, pero podrían usarse para otros propósitos
              }
            },
          )
          .subscribe((status) => {
            console.log("📡 Realtime subscription status:", status)
          })

        return () => {
          console.log("🔌 Cleaning up realtime subscriptions")
          isMounted.current = false
          supabase.removeChannel(channel)
        }
      }
    }

    return () => {
      isMounted.current = false
    }
  }, [organizationId, currentUserId, viewMode, fetchConversations, updateConversationTags])

  const refetch = useCallback(() => {
    fetchConversations()
  }, [fetchConversations])

  return { conversations, loading, error, refetch }
}

// El resto del código permanece igual
export function useFilteredConversations(
  organizationId: string | undefined,
  currentUserId: string | undefined,
  viewMode: "all" | "assigned" = "all",
) {
  const { conversations, loading, error, refetch } = useConversations(organizationId, viewMode, currentUserId)

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
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true

    if (!conversationId) {
      if (isMounted.current) {
        setConversation(null)
        setLoading(false)
      }
      return
    }

    const fetchConversation = async () => {
      try {
        if (isMounted.current) {
          setLoading(true)
        }

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
          if (isMounted.current) {
            setError(error.message)
          }
        } else if (isMounted.current) {
          setConversation(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted.current) {
          setError("Error inesperado al cargar conversación")
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
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
      isMounted.current = false
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Función para obtener el nombre a mostrar
  const getDisplayName = useCallback(() => {
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
  }, [conversation])

  return {
    conversation,
    loading,
    error,
    displayName: getDisplayName(),
  }
}
