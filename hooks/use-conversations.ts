"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { ConversationWithLastMessage, ConversationTag } from "@/types/chat"

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

  // Caché local de tags por conversation_id para optimizar DELETE events
  const tagsCache = useRef<Map<string, ConversationTag[]>>(new Map())

  const fetchConversations = useCallback(async (skipLoading = false) => {
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

      const orgIdNumber = Number(organizationId)
      if (isNaN(orgIdNumber)) {
        if (isMounted.current) {
          setError("ID de organización inválido")
          setLoading(false)
        }
        return
      }

      // ✨ Usar la vista optimizada conversation_tags_view
      const query = supabase
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

      // Aplicar filtro de asignación si es necesario
      if (viewMode === "assigned" && currentUserId) {
        query.contains("assigned_user_ids", [currentUserId])
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

      const conversationIds = (conversationsData || []).map((conv) => conv.id)
      if (conversationIds.length === 0) {
        if (isMounted.current) {
          setConversations([])
          setError(null)
          setLoading(false)
        }
        return
      }

      // ✨ Cargar etiquetas usando la vista optimizada
      const { data: tagsData } = await supabase
        .from("conversation_tags_view")
        .select("*")
        .in("conversation_id", conversationIds)

      // ✨ Cargar últimos mensajes
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })

      const lastMessageMap = new Map()
      if (lastMessages) {
        for (const msg of lastMessages) {
          if (!lastMessageMap.has(msg.conversation_id)) {
            lastMessageMap.set(msg.conversation_id, msg)
          }
        }
      }

      // ✨ Agrupar etiquetas por conversación
      const tagsMap = new Map<string, ConversationTag[]>()
      if (tagsData) {
        for (const tagData of tagsData) {
          const conversationId = tagData.conversation_id
          if (!tagsMap.has(conversationId)) {
            tagsMap.set(conversationId, [])
          }
          
          // ✨ Mapear datos de la vista a la interfaz esperada con tipos correctos
          const tag: ConversationTag = {
            id: tagData.assignment_id,
            conversation_id: tagData.conversation_id,
            tag_name: tagData.tag_name,
            created_by: tagData.created_by || "", // ✅ Usar string vacío en lugar de null
            created_at: tagData.assigned_at
          }
          
          tagsMap.get(conversationId)!.push(tag)
        }
      }

      const conversationsWithMessages = (conversationsData || []).map((conversation) => {
        const conversationTags = tagsMap.get(conversation.id) || []
        
        // Actualizar caché de tags
        tagsCache.current.set(conversation.id, conversationTags)

        return {
          ...conversation,
          last_message: lastMessageMap.get(conversation.id) || null,
          conversation_tags: conversationTags,
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
  }, [organizationId, viewMode, currentUserId])

  const updateConversationTags = useCallback(async (conversationId: string) => {
    try {
      // ✨ Usar la vista optimizada para obtener etiquetas
      const { data: tagsData, error } = await supabase
        .from("conversation_tags_view")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("assigned_at", { ascending: true })

      if (error) {
        console.error("Error fetching tags:", error)
        return
      }

      // ✨ Mapear datos de la vista a la interfaz esperada con tipos correctos
      const tags: ConversationTag[] = (tagsData || []).map(tagData => ({
        id: tagData.assignment_id,
        conversation_id: tagData.conversation_id,
        tag_name: tagData.tag_name,
        created_by: tagData.created_by || "", // ✅ Usar string vacío en lugar de null
        created_at: tagData.assigned_at
      }))

      // Actualizar caché
      tagsCache.current.set(conversationId, tags)

      if (isMounted.current) {
        setConversations((prev) => {
          return prev.map((conv) =>
            conv.id === conversationId ? { ...conv, conversation_tags: tags } : conv,
          )
        })
      }
    } catch (err) {
      console.error("Error updating conversation tags:", err)
    }
  }, [])

  // Función optimizada para manejar DELETE events usando el caché
  const handleTagDelete = useCallback(
    (tagId: string) => {
      // Buscar en qué conversación estaba este tag usando el caché
      let targetConversationId: string | null = null
      for (const [conversationId, tags] of tagsCache.current.entries()) {
        if (tags.some((tag) => tag.id === tagId)) {
          targetConversationId = conversationId
          break
        }
      }

      if (targetConversationId) {
        // Actualizar caché local inmediatamente
        const currentTags = tagsCache.current.get(targetConversationId) || []
        const updatedTags = currentTags.filter((tag) => tag.id !== tagId)
        tagsCache.current.set(targetConversationId, updatedTags)

        // Actualizar estado inmediatamente (optimistic update)
        if (isMounted.current) {
          setConversations((prev) => {
            return prev.map((conv) =>
              conv.id === targetConversationId ? { ...conv, conversation_tags: updatedTags } : conv,
            )
          })
        }

        // Verificar con la DB después (para consistencia)
        setTimeout(() => {
          updateConversationTags(targetConversationId!)
        }, 500)
      } else {
        // Fallback: refetch completo solo si no encontramos la conversación
        setTimeout(() => {
          fetchConversations(true)
        }, 100)
      }
    },
    [updateConversationTags, fetchConversations],
  )

  useEffect(() => {
    isMounted.current = true
    fetchConversations()

    if (organizationId) {
      const orgIdNumber = Number(organizationId)
      if (!isNaN(orgIdNumber)) {
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
              const messageData = payload.new as any
              if (messageData && messageData.conversation_id) {
                setConversations((currentConversations) => {
                  const conversationExists = currentConversations.some((c) => c.id === messageData.conversation_id)
                  if (conversationExists) {
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
              event: "*",
              schema: "public",
              table: "conversation_tags",
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                const deletedTagId = (payload.old as any)?.id
                if (deletedTagId) {
                  handleTagDelete(deletedTagId)
                }
                return
              }

              // Para INSERT y UPDATE
              const tagData = payload.new as any
              if (tagData && tagData.conversation_id) {
                setTimeout(() => {
                  updateConversationTags(tagData.conversation_id)
                }, 100)
              }
            },
          )
          .subscribe()

        return () => {
          isMounted.current = false
          supabase.removeChannel(channel)
        }
      }
    }

    return () => {
      isMounted.current = false
    }
  }, [organizationId, fetchConversations, updateConversationTags, handleTagDelete])

  const refetch = useCallback(() => {
    fetchConversations()
  }, [fetchConversations])

  return { conversations, loading, error, refetch }
}