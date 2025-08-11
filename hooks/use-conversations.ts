"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { ConversationWithLastMessage, ConversationTag } from "@/types/chat"

// ✅ Interface corregida para los datos que vienen de Supabase
interface SupabaseTagData {
  id: string
  conversation_id: string
  created_at: string
  created_by: string
  tag_id: string
  organization_tags: {
    id: string
    tag_name: string
    color: string
  } | null
}

// ✅ Type guard para verificar si organization_tags es válido
function isValidOrganizationTag(orgTag: any): orgTag is { id: string; tag_name: string; color: string } {
  return (
    orgTag && typeof orgTag.id === "string" && typeof orgTag.tag_name === "string" && typeof orgTag.color === "string"
  )
}

export function useConversations(
  organizationId: string | undefined,
  viewMode: "all" | "assigned" = "all",
  currentUserId?: string,
  selectedTags: string[] = [],
) {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const lastFetchRef = useRef<number>(0)

  // Caché local de tags por conversation_id para optimizar DELETE events
  const tagsCache = useRef<Map<string, ConversationTag[]>>(new Map())

  const fetchConversations = useCallback(
    async (skipLoading = false) => {
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

        let conversationIds: string[] = []

        if (viewMode === "assigned" && currentUserId) {
          const { data: assignedData, error: assignedError } = await supabase
            .from("users_conversations")
            .select(`
            conversation_id,
            conversations!inner(
              id,
              organization_id
            )
          `)
            .eq("user_id", currentUserId)
            .eq("conversations.organization_id", orgIdNumber)

          if (assignedError) {
            if (isMounted.current) {
              setError(assignedError.message)
            }
            return
          }

          conversationIds = (assignedData || []).map((item) => item.conversation_id)
        }

        if (selectedTags.length > 0) {
          const { data: taggedConversations, error: tagError } = await supabase
            .from("conversation_tags")
            .select("conversation_id")
            .eq("organization_id", orgIdNumber)
            .in("tag_id", selectedTags)
            .not("conversation_id", "is", null)

          if (tagError) {
            if (isMounted.current) {
              setError(tagError.message)
            }
            return
          }

          const taggedConversationIds = [...new Set((taggedConversations || []).map((item) => item.conversation_id))]

          if (viewMode === "assigned") {
            conversationIds = conversationIds.filter((id) => taggedConversationIds.includes(id))
          } else {
            conversationIds = taggedConversationIds
          }
        }

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
          )
        `)
          .eq("organization_id", orgIdNumber)

        if (viewMode === "assigned" || selectedTags.length > 0) {
          if (conversationIds.length === 0) {
            if (isMounted.current) {
              setConversations([])
              setError(null)
              setLoading(false)
            }
            return
          }
          query = query.in("id", conversationIds)
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

        const finalConversationIds = (conversationsData || []).map((conv) => conv.id)

        if (finalConversationIds.length === 0) {
          if (isMounted.current) {
            setConversations([])
            setError(null)
            setLoading(false)
          }
          return
        }

        const { data: tagsData } = await supabase
          .from("conversation_tags")
          .select(`
          id,
          conversation_id,
          created_at,
          created_by,
          tag_id,
          organization_tags!tag_id(
            id,
            tag_name,
            color
          )
        `)
          .in("conversation_id", finalConversationIds)
          .not("conversation_id", "is", null)
          .order("created_at", { ascending: true })

        const { data: lastMessages } = await supabase
          .from("messages")
          .select("*")
          .in("conversation_id", finalConversationIds)
          .order("created_at", { ascending: false })

        const lastMessageMap = new Map()
        if (lastMessages) {
          for (const msg of lastMessages) {
            if (!lastMessageMap.has(msg.conversation_id)) {
              lastMessageMap.set(msg.conversation_id, msg)
            }
          }
        }

        // ✅ Procesamiento corregido de tags con type guards
        const tagsMap = new Map<string, ConversationTag[]>()
        if (tagsData && Array.isArray(tagsData)) {
          for (const rawTagData of tagsData) {
            // ✅ Cast seguro con verificación
            const tagData = rawTagData as unknown as SupabaseTagData
            const conversationId = tagData.conversation_id

            if (!tagsMap.has(conversationId)) {
              tagsMap.set(conversationId, [])
            }

            // ✅ Verificar que organization_tags sea válido usando type guard
            if (isValidOrganizationTag(tagData.organization_tags)) {
              const tag: ConversationTag = {
                id: tagData.id,
                conversation_id: tagData.conversation_id,
                tag_name: tagData.organization_tags.tag_name,
                created_by: tagData.created_by || "",
                created_at: tagData.created_at,
                color: tagData.organization_tags.color || "#8B5CF6", // ✅ Valor por defecto
              }
              tagsMap.get(conversationId)!.push(tag)
            }
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
    },
    [organizationId, viewMode, currentUserId, selectedTags],
  )

  const updateConversationTags = useCallback(async (conversationId: string) => {
    try {
      const { data: tagsData, error } = await supabase
        .from("conversation_tags")
        .select(`
          id,
          conversation_id,
          created_at,
          created_by,
          tag_id,
          organization_tags!tag_id(
            id,
            tag_name,
            color
          )
        `)
        .eq("conversation_id", conversationId)
        .not("conversation_id", "is", null)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error updating conversation tags:", error)
        return
      }

      // ✅ Procesamiento seguro con type guards
      const tags: ConversationTag[] = []

      if (tagsData && Array.isArray(tagsData)) {
        for (const rawTagData of tagsData) {
          const tagData = rawTagData as unknown as SupabaseTagData

          if (isValidOrganizationTag(tagData.organization_tags)) {
            tags.push({
              id: tagData.id,
              conversation_id: tagData.conversation_id,
              tag_name: tagData.organization_tags.tag_name,
              created_by: tagData.created_by || "",
              created_at: tagData.created_at,
              color: tagData.organization_tags.color || "#8B5CF6",
            })
          }
        }
      }

      // Actualizar caché
      tagsCache.current.set(conversationId, tags)

      if (isMounted.current) {
        setConversations((prev) => {
          return prev.map((conv) => (conv.id === conversationId ? { ...conv, conversation_tags: tags } : conv))
        })
      }
    } catch (err) {
      console.error("Error updating conversation tags:", err)
    }
  }, [])

  const addTagToConversation = useCallback((conversationId: string, newTag: ConversationTag) => {
    if (isMounted.current) {
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === conversationId) {
            const currentTags = conv.conversation_tags || []
            const tagExists = currentTags.some((tag) => tag.id === newTag.id)
            if (!tagExists) {
              const updatedTags = [...currentTags, newTag]
              // Actualizar caché también
              tagsCache.current.set(conversationId, updatedTags)
              return { ...conv, conversation_tags: updatedTags }
            }
          }
          return conv
        })
      })
    }
  }, [])

  const removeTagFromConversation = useCallback((conversationId: string, tagId: string) => {
    if (isMounted.current) {
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv.id === conversationId) {
            const currentTags = conv.conversation_tags || []
            const updatedTags = currentTags.filter((tag) => tag.id !== tagId)
            // Actualizar caché también
            tagsCache.current.set(conversationId, updatedTags)
            return { ...conv, conversation_tags: updatedTags }
          }
          return conv
        })
      })
    }
  }, [])

  const handleTagDelete = useCallback(
    (tagId: string) => {
      let targetConversationId: string | null = null
      for (const [conversationId, tags] of tagsCache.current.entries()) {
        if (tags.some((tag) => tag.id === tagId)) {
          targetConversationId = conversationId
          break
        }
      }

      if (targetConversationId) {
        removeTagFromConversation(targetConversationId, tagId)

        // Verificar después para asegurar consistencia
        setTimeout(() => {
          updateConversationTags(targetConversationId!)
        }, 500)
      } else {
        setTimeout(() => {
          fetchConversations(true)
        }, 100)
      }
    },
    [updateConversationTags, fetchConversations, removeTagFromConversation],
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
              filter: `organization_id=eq.${orgIdNumber}`,
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                const deletedTagId = (payload.old as any)?.id
                if (deletedTagId) {
                  handleTagDelete(deletedTagId)
                }
                return
              }

              if (payload.eventType === "INSERT") {
                const tagData = payload.new as any
                if (tagData && tagData.conversation_id) {
                  // Actualización inmediata sin delay para INSERT
                  updateConversationTags(tagData.conversation_id)
                }
                return
              }

              if (payload.eventType === "UPDATE") {
                const tagData = payload.new as any
                if (tagData && tagData.conversation_id) {
                  // Actualización inmediata para UPDATE también
                  updateConversationTags(tagData.conversation_id)
                }
                return
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "users_conversations",
            },
            (payload) => {
              fetchConversations(true)
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

  return {
    conversations,
    loading,
    error,
    refetch,
    updateConversationTags,
    addTagToConversation,
    removeTagFromConversation,
  }
}
