"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { ConversationWithLastMessage, ConversationTag } from "@/types/chat"

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
  selectedChatId?: string | null // 👈 añadido

) {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)
  const lastFetchRef = useRef<number>(0)
  const channelRef = useRef<any>(null)
  const tagsCache = useRef<Map<string, ConversationTag[]>>(new Map())
  const selectedChatIdRef = useRef<string | null | undefined>(selectedChatId)


  const fetchConversations = useCallback(
    async (skipLoading = false) => {
      const now = Date.now()
      if (now - lastFetchRef.current < 500) return
      lastFetchRef.current = now

      try {
        if (!skipLoading) setLoading(true)

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
            .select("conversation_id")
            .eq("user_id", currentUserId)

          if (assignedError) {
            console.error("❌ Error fetching assigned conversations:", assignedError)
            if (isMounted.current) setError(assignedError.message)
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
            console.error("❌ Error fetching tagged conversations:", tagError)
            if (isMounted.current) setError(tagError.message)
            return
          }

          const taggedConversationIds = [...new Set((taggedConversations || []).map((item) => item.conversation_id))]

          if (viewMode === "assigned") {
            conversationIds = conversationIds.filter((id) => taggedConversationIds.includes(id))
          } else {
            conversationIds = taggedConversationIds
          }
        }

        // 🔹 Query principal
        let query
        if (viewMode === "assigned" && currentUserId) {
          if (conversationIds.length === 0) {
            if (isMounted.current) {
              setConversations([])
              setError(null)
              setLoading(false)
            }
            return
          }

          query = supabase
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
              users_conversations!inner(
                user_id,
                unread_count
              )
            `)
            .eq("organization_id", orgIdNumber)
            .eq("users_conversations.user_id", currentUserId)
            .in("id", conversationIds)
            .order("last_message_at", { ascending: false, nullsFirst: false })
          } else {
            query = supabase
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
                users_conversations(
                  user_id,
                  unread_count
                )
              `) // 👈 OJO: sin !inner, porque si no, filtra solo las que tienen relación
              .eq("organization_id", orgIdNumber)
          
            if (conversationIds.length > 0) {
              query = query.in("id", conversationIds)
            }
          
            query = query.order("last_message_at", { ascending: false, nullsFirst: false })
          }
          

        const { data: conversationsData, error: conversationsError } = await query
        if (conversationsError) {
          console.error("❌ Error fetching conversations:", conversationsError)
          if (isMounted.current) setError(conversationsError.message)
          return
        }

        const finalConversationIds = (conversationsData || []).map((conv: any) => conv.id)
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

        const tagsMap = new Map<string, ConversationTag[]>()
        if (tagsData && Array.isArray(tagsData)) {
          for (const rawTagData of tagsData) {
            const tagData = rawTagData as unknown as SupabaseTagData
            if (!tagsMap.has(tagData.conversation_id)) {
              tagsMap.set(tagData.conversation_id, [])
            }
            if (isValidOrganizationTag(tagData.organization_tags)) {
              const tag: ConversationTag = {
                id: tagData.id,
                conversation_id: tagData.conversation_id,
                tag_name: tagData.organization_tags.tag_name,
                created_by: tagData.created_by || "",
                created_at: tagData.created_at,
                color: tagData.organization_tags.color || "#8B5CF6",
              }
              tagsMap.get(tagData.conversation_id)!.push(tag)
            }
          }
        }

        // 🔹 Unificación de formato
        const conversationsWithMessages = (conversationsData || []).map((conv: any) => {
          let unreadCount = 0
          if (Array.isArray(conv.users_conversations) && conv.users_conversations.length > 0) {
            unreadCount = conv.users_conversations[0].unread_count || 0
          }
          

          const conversationTags = tagsMap.get(conv.id) || []
          tagsCache.current.set(conv.id, conversationTags)

          return {
            ...conv,
            unread_count: unreadCount,
            last_message: lastMessageMap.get(conv.id) || null,
            conversation_tags: conversationTags,
          }
        })

        if (isMounted.current) {
          setConversations(conversationsWithMessages)
          setError(null)
        }
      } catch (err) {
        console.error("💥 Unexpected error fetching conversations:", err)
        if (isMounted.current) setError("Error inesperado al cargar conversaciones")
      } finally {
        if (isMounted.current) setLoading(false)
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
            tagsCache.current.set(conversationId, updatedTags)
            return { ...conv, conversation_tags: updatedTags }
          }
          return conv
        })
      })
    }
  }, [])

  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!currentUserId) return

      try {
        const { error } = await supabase
          .from("users_conversations")
          .update({
            unread_count: 0,
            last_read_at: new Date().toISOString(),
          })
          .eq("conversation_id", conversationId)
          .eq("user_id", currentUserId)

        if (error) {
          console.error("Error marking conversation as read:", error)
          return
        }

        // Actualizar el estado local inmediatamente
        if (isMounted.current) {
          setConversations((prev) => {
            return prev.map((conv) => (conv.id === conversationId ? { ...conv, unread_count: 0 } : conv))
          })
        }
      } catch (err) {
        console.error("Error marking conversation as read:", err)
      }
    },
    [currentUserId],
  )

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
    selectedChatIdRef.current = selectedChatId
  }, [selectedChatId])
  
  // 🔥 CLAVE: Mejorar el manejo de realtime para actualizar cuando llegan mensajes
  useEffect(() => {
    isMounted.current = true
    fetchConversations()

    if (organizationId) {
      const orgIdNumber = Number(organizationId)
      if (!isNaN(orgIdNumber)) {
        // Limpiar canal anterior si existe
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
        }

        const channel = supabase
          .channel(`conversations-org-${orgIdNumber}-${Date.now()}`) // Nombre único
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "conversations",
              filter: `organization_id=eq.${orgIdNumber}`,
            },
            (payload) => {
              // 🔥 CLAVE: Actualizar inmediatamente cuando cambia una conversación
              if (payload.eventType === "UPDATE") {
                const updatedConv = payload.new as any
                if (updatedConv) {
                  setConversations((prev) => {
                    return prev.map((conv) => {
                      if (conv.id === updatedConv.id) {
                        return {
                          ...conv,
                          ...updatedConv,
                          // Mantener los datos relacionados existentes
                          client: conv.client,
                          canales_organization: conv.canales_organization,
                          conversation_tags: conv.conversation_tags,
                        }
                      }
                      return conv
                    })
                  })
                }
              }

              // También hacer fetch completo para asegurar consistencia
              setTimeout(() => fetchConversations(true), 1000)
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
                    // Actualizar la conversación con el nuevo mensaje
                    const updatedConversations = currentConversations.map((conv) => {
                      if (conv.id === messageData.conversation_id) {
                        return {
                          ...conv,
                          last_message: messageData,
                          last_message_at: messageData.created_at,
                          // Incrementar unread_count si el mensaje no es del usuario actual
                          unread_count:
  messageData.sender_type !== "user" &&
  messageData.conversation_id !== selectedChatIdRef.current
    ? (conv.unread_count || 0) + 1
    : conv.unread_count || 0,



                        }
                      }
                      return conv
                    })

                    // Reordenar por fecha del último mensaje
                    return updatedConversations.sort((a, b) => {
                      const aTime = new Date(a.last_message_at || a.updated_at || 0).getTime()
                      const bTime = new Date(b.last_message_at || b.updated_at || 0).getTime()
                      return bTime - aTime
                    })
                  }

                  return currentConversations
                })

                if (
                  selectedChatIdRef.current &&
                  messageData.conversation_id === selectedChatIdRef.current
                ) {
                  markAsRead(selectedChatIdRef.current)
                }
                
                

                // También hacer un fetch completo después de un tiempo para asegurar consistencia
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
                  updateConversationTags(tagData.conversation_id)
                }
                return
              }

              if (payload.eventType === "UPDATE") {
                const tagData = payload.new as any
                if (tagData && tagData.conversation_id) {
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
              filter: currentUserId ? `user_id=eq.${currentUserId}` : undefined,
            },
            (payload) => {
              const userData = (payload.new as any) || (payload.old as any)
              if (userData && userData.user_id === currentUserId) {
                fetchConversations(true)
              }
            },
          )
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR") {
              console.error("❌ Realtime channel error")
            } else if (status === "TIMED_OUT") {
              console.error("⏰ Realtime subscription timed out")
            }
          })

        channelRef.current = channel

        return () => {
          isMounted.current = false
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
          }
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
    markAsRead, // Exportar la función markAsRead
  }
}
