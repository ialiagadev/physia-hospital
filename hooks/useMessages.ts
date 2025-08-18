"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import type { Message } from "@/types/chat"
import { toast } from "@/hooks/use-toast"

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { userProfile } = useAuth()

  const processedMessageIds = useRef<Set<string>>(new Set())
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const isSubscribedRef = useRef(false)
  const processedEvents = useRef<Set<string>>(new Set())
  const oldestMessageDate = useRef<string | null>(null)

  const MESSAGES_PER_PAGE = 50

  /** Generar un ID único para eventos */
  const getEventId = (payload: any) =>
    `${payload.eventType}-${payload.table}-${payload.new?.id || payload.old?.id}-${payload.commit_timestamp}`

  /** Filtrar mensajes de sistema */
  const filterMessages = (msgs: Message[]) =>
    msgs.filter((msg) => {
      if (msg.message_type === "system" && msg.metadata?.system_message) {
        return msg.metadata.visible_to_user === userProfile?.id
      }
      return true
    })

  /** Cargar más mensajes (paginación hacia atrás) */
  const loadMoreMessages = async () => {
    if (!conversationId || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      let query = supabase
        .from("messages")
        .select(
          `
          *,
          user:users!messages_user_id_fkey (
            id,
            name,
            avatar_url,
            type
          )
        `
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      if (oldestMessageDate.current) {
        query = query.lt("created_at", oldestMessageDate.current)
      }

      const { data, error } = await query
      if (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar más mensajes",
          variant: "destructive",
        })
        return
      }

      if (data?.length) {
        const filtered = filterMessages(data)

        if (filtered.length > 0) {
          oldestMessageDate.current = filtered[filtered.length - 1].created_at
        }

        filtered.forEach((msg) => processedMessageIds.current.add(msg.id))

        setMessages((prev) => {
          const newMessages = filtered.reverse()
          const existingIds = new Set(prev.map((m) => m.id))
          const uniqueNew = newMessages.filter((m) => !existingIds.has(m.id))
          return [...uniqueNew, ...prev]
        })

        setHasMore(data.length === MESSAGES_PER_PAGE)
      } else {
        setHasMore(false)
      }
    } catch {
      toast({
        title: "Error",
        description: "Error inesperado al cargar mensajes",
        variant: "destructive",
      })
    } finally {
      setLoadingMore(false)
    }
  }

  /** Efecto principal */
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setLoading(false)
      setHasMore(true)
      oldestMessageDate.current = null
      return
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select(
            `
            *,
            user:users!messages_user_id_fkey (
              id,
              name,
              avatar_url,
              type
            )
          `
          )
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(MESSAGES_PER_PAGE)

        if (error) {
          setError(error.message)
          return
        }

        const filtered = filterMessages(data || [])
        const ordered = filtered.reverse()

        if (ordered.length > 0) {
          oldestMessageDate.current = ordered[0].created_at
          setHasMore(data!.length === MESSAGES_PER_PAGE)
        } else {
          setHasMore(false)
        }

        processedMessageIds.current.clear()
        ordered.forEach((m) => processedMessageIds.current.add(m.id))

        setMessages(ordered)
        setError(null)
      } catch {
        setError("Error inesperado al cargar mensajes")
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`messages-${conversationId}-${Date.now()}`)
      /** INSERT con user expandido */
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const eventId = getEventId(payload)
          if (processedEvents.current.has(eventId)) return
          processedEvents.current.add(eventId)

          const { data: enriched } = await supabase
            .from("messages")
            .select(
              `
              *,
              user:users!messages_user_id_fkey (
                id,
                name,
                avatar_url,
                type
              )
            `
            )
            .eq("id", (payload.new as Message).id)
            .single()

          const newMessage = enriched as Message
          if (!newMessage) return

          if (newMessage.message_type === "system" && newMessage.metadata?.system_message) {
            if (newMessage.metadata.visible_to_user !== userProfile?.id) return
          }

          if (!processedMessageIds.current.has(newMessage.id)) {
            processedMessageIds.current.add(newMessage.id)
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) return prev
              return [...prev, newMessage].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            })
          }
        }
      )
      /** UPDATE */
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message
          const eventId = getEventId(payload)
          if (processedEvents.current.has(eventId)) return
          processedEvents.current.add(eventId)

          if (updated.message_type === "system" && updated.metadata?.system_message) {
            if (updated.metadata.visible_to_user !== userProfile?.id) return
          }

          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        }
      )
      /** DELETE */
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const eventId = getEventId(payload)
          if (processedEvents.current.has(eventId)) return
          processedEvents.current.add(eventId)

          const deleted = payload.old as Message
          processedMessageIds.current.delete(deleted.id)
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      isSubscribedRef.current = false
      processedEvents.current.clear()
    }
  }, [conversationId, userProfile?.id])

  return { messages, loading, loadingMore, hasMore, error, loadMoreMessages }
}
