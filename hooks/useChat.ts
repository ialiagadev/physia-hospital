"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Conversation, ConversationWithLastMessage, Message, User } from "@/types/chat"

// Hook para gestionar conversaciones
export function useConversations(organizationId: string | undefined) {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para cargar conversaciones
  const fetchConversations = useCallback(async () => {
    if (!organizationId) {
      setConversations([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Consulta optimizada - ahora incluimos los nuevos campos de teléfono
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          client:clients(
            *,
            phone_prefix,
            full_phone
          ),
          canales_organization:canales_organizations(
            id,
            canal:canales(id, nombre, descripcion, imagen)
          ),
          messages:messages(*)
        `)
        .eq("organization_id", organizationId)
        .order("last_message_at", { ascending: false })

      if (error) throw error

      // Procesar los datos
      const processedData = data.map(conv => {
        const messages = conv.messages || []
        const lastMessage = messages.length > 0 
          ? messages.sort((a: Message, b: Message) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]
          : null

        delete conv.messages
        return {
          ...conv,
          last_message: lastMessage
        }
      })

      setConversations(processedData)
      setError(null)
    } catch (err: any) {
      console.error("Error fetching conversations:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  // Cargar conversaciones iniciales
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Suscripción en tiempo real
  useEffect(() => {
    if (!organizationId) return

    const channelId = `conversations-${organizationId}-${Date.now()}`
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => fetchConversations()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const updatedConversation = payload.new as Conversation
          setConversations(prev => 
            prev.map(conv => 
              conv.id === updatedConversation.id 
                ? { ...conv, ...updatedConversation, last_message: conv.last_message }
                : conv
            )
          )
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any
          // Solo actualizar si el mensaje pertenece a una de nuestras conversaciones
          const conversationId = newMessage.conversation_id
          const conversationIndex = conversations.findIndex(c => c.id === conversationId)
          
          if (conversationIndex >= 0) {
            setConversations(prev => {
              const updated = [...prev]
              updated[conversationIndex] = {
                ...updated[conversationIndex],
                last_message: newMessage,
                last_message_at: newMessage.created_at,
                unread_count: newMessage.sender_type === 'contact' && !newMessage.is_read
                  ? (updated[conversationIndex].unread_count || 0) + 1
                  : updated[conversationIndex].unread_count
              }
              
              // Reordenar las conversaciones
              return updated.sort((a, b) => {
                const dateA = a.last_message_at ? new Date(a.last_message_at) : new Date(0)
                const dateB = b.last_message_at ? new Date(b.last_message_at) : new Date(0)
                return dateB.getTime() - dateA.getTime()
              })
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, conversations])

  // Función para filtrar conversaciones
  const filterConversations = useCallback((
    filter: 'all' | 'assigned' | 'unassigned',
    userId?: string
  ) => {
    if (filter === 'all') return conversations
    
    if (filter === 'assigned' && userId) {
      return conversations.filter(conv => 
        conv.assigned_user_ids && 
        Array.isArray(conv.assigned_user_ids) && 
        conv.assigned_user_ids.includes(userId)
      )
    }
    
    if (filter === 'unassigned') {
      return conversations.filter(conv => 
        !conv.assigned_user_ids || 
        !Array.isArray(conv.assigned_user_ids) || 
        conv.assigned_user_ids.length === 0
      )
    }
    
    return conversations
  }, [conversations])

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    filterConversations
  }
}

// Hook para gestionar una conversación específica
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
          client:clients(
            *,
            phone_prefix,
            full_phone
          ),
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

  // Suscripción en tiempo real
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
          setConversation(prev => 
            prev ? { ...prev, ...updatedConversation } : updatedConversation
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // Nombre a mostrar - ahora prioriza full_phone sobre phone
  const displayName = conversation?.client?.name || 
                     conversation?.client?.full_phone || 
                     conversation?.client?.phone || 
                     "Contacto desconocido"

  // Función para obtener el teléfono formateado
  const getFormattedPhone = useCallback(() => {
    if (!conversation?.client) return null
    
    // Priorizar full_phone (que incluye prefijo)
    if (conversation.client.full_phone) {
      return conversation.client.full_phone
    }
    
    // Si no hay full_phone pero hay phone y phone_prefix, combinarlos
    if (conversation.client.phone && conversation.client.phone_prefix) {
      return `${conversation.client.phone_prefix}${conversation.client.phone}`
    }
    
    // Fallback al phone original
    return conversation.client.phone
  }, [conversation?.client])

  return {
    conversation,
    loading,
    error,
    displayName,
    formattedPhone: getFormattedPhone(),
    refetch: fetchConversation,
    updateConversation: (updates: Partial<Conversation>) => {
      setConversation(prev => prev ? { ...prev, ...updates } : null)
    }
  }
}

// Hook para gestionar mensajes
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para cargar mensajes
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) throw error

      setMessages(data || [])
      setError(null)
    } catch (err: any) {
      console.error("Error fetching messages:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  // Cargar mensajes iniciales
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Suscripción en tiempo real
  useEffect(() => {
    if (!conversationId) return

    const channelId = `messages-${conversationId}-${Date.now()}`
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          // Verificar si el mensaje ya existe
          setMessages(prev => {
            if (prev.some(msg => msg.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
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
          const updatedMessage = payload.new as Message
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return {
    messages,
    loading,
    error,
    refetch: fetchMessages,
    addMessage: (message: Message) => setMessages(prev => [...prev, message]),
    updateMessage: (id: string, updates: Partial<Message>) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === id ? { ...msg, ...updates } : msg
        )
      )
    },
    markAsRead: (messageIds: string[]) => {
      if (messageIds.length === 0) return
      setMessages(prev => 
        prev.map(msg => 
          messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
        )
      )
    },
    setMessages
  }
}

// Hook para obtener usuarios de una organización
export function useOrganizationUsers(organizationId: string | undefined) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      if (!organizationId) {
        setUsers([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("is_active", true)
          .order("name")

        if (error) throw error

        setUsers(data || [])
        setError(null)
      } catch (err: any) {
        console.error("Error fetching organization users:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [organizationId])

  return { users, loading, error }
}
