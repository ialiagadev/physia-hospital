"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Phone, Video, Search, MoreVertical, Smile, Mic, Send, Plus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMessages } from "@/hooks/useMessages"
import { sendMessage } from "@/lib/chatActions"
import type { User } from "@/types/chat"
import { useConversation } from "@/hooks/use-conversations"
import ContactInfoDialog from "./contact-info-dialog"

interface ConversationWindowProps {
  chatId: string
  currentUser: User
}

export default function ConversationWindow({ chatId, currentUser }: ConversationWindowProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const { messages, loading, error } = useMessages(chatId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showContactInfo, setShowContactInfo] = useState(false)
  const { conversation, loading: conversationLoading, displayName } = useConversation(chatId)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  const scrollToBottomInstant = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  // Scroll automático cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0) {
      // Scroll instantáneo al cargar mensajes por primera vez
      setTimeout(() => {
        scrollToBottomInstant()
      }, 100)
    }
  }, [messages.length])

  // Scroll suave cuando se añade un nuevo mensaje
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  // Scroll instantáneo cuando cambia la conversación
  useEffect(() => {
    if (chatId) {
      setTimeout(() => {
        scrollToBottomInstant()
      }, 200)
    }
  }, [chatId])

  const handleSendMessage = async () => {
    if (message.trim() && currentUser && !sending) {
      setSending(true)
      try {
        await sendMessage({
          conversationId: chatId,
          content: message,
          userId: currentUser.id,
          messageType: "text",
        })
        setMessage("")
        // Scroll después de enviar mensaje
        setTimeout(() => {
          scrollToBottom()
        }, 100)
      } catch (error) {
        console.error("Error sending message:", error)
      } finally {
        setSending(false)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  }

  // Función para determinar si un mensaje es el primero de un grupo
  const isFirstInGroup = (currentIndex: number, currentMessage: any) => {
    if (currentIndex === 0) return true // Primer mensaje de la conversación

    const previousMessage = messages[currentIndex - 1]
    return previousMessage.sender_type !== currentMessage.sender_type
  }

  if (loading || conversationLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">
            <p>Error al cargar mensajes</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full relative">
      {/* Header de la conversación */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div
          className="flex items-center cursor-pointer hover:bg-gray-100 rounded-lg p-2 -m-2 transition-colors"
          onClick={() => setShowContactInfo(true)}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation?.client?.avatar_url || "/placeholder.svg"} alt={displayName} />
            <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <h2 className="font-medium text-gray-900">{displayName}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Área de mensajes */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50 min-h-0 pb-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23f0f0f0' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        <div className="space-y-1">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <p>No hay mensajes en esta conversación</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isFirst = isFirstInGroup(index, msg)
              const isAgent = msg.sender_type === "agent"

              return (
                <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"} mb-0.5`}>
                  <div
                    className={`inline-block px-2 py-1.5`}
                    style={{
                      backgroundColor: isAgent ? "#d9fdd2" : "white",
                      borderRadius: isFirst ? (isAgent ? "8px 8px 0 8px" : "8px 8px 8px 0") : "8px",
                      maxWidth: "65%",
                    }}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm">{msg.content}</span>
                      <div className="flex items-center gap-0.5 flex-shrink-0 translate-y-0.5">
                        <span className="text-[10px] text-gray-500">{formatTimestamp(msg.created_at)}</span>
                        {isAgent && (
                          <div className="flex">
                            <div className={`w-3 h-3 ${msg.is_read ? "text-blue-600" : "text-gray-600"}`}>
                              <svg viewBox="0 0 16 15" className="w-full h-full fill-current">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l3.61 3.463c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input de mensaje - Fijo abajo a la derecha */}
      <div className="absolute bottom-0 right-0 left-0 px-3 py-2 bg-gray-100 border-t border-gray-200">
        <div className="flex items-center gap-2 justify-end">
          {/* Botón Plus separado */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full text-gray-600 hover:bg-gray-200 flex-shrink-0"
          >
            <Plus className="h-5 w-5" />
          </Button>

          {/* Contenedor del input - más ancho y alineado a la derecha */}
          <div className="flex-1 max-w-2xl bg-white rounded-full border border-gray-200 shadow-sm ml-auto">
            <Input
              placeholder="Escribe un mensaje"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="border-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full h-8 px-3 text-sm text-gray-900 placeholder:text-gray-500"
            />
          </div>

          {/* Botones de la derecha separados */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full text-gray-600 hover:bg-gray-200 flex-shrink-0"
          >
            <Smile className="h-5 w-5" />
          </Button>

          {message.trim() ? (
            <Button
              onClick={handleSendMessage}
              disabled={sending}
              size="sm"
              className="h-8 w-8 p-0 rounded-full bg-green-500 hover:bg-green-600 text-white flex-shrink-0"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full text-gray-600 hover:bg-gray-200 flex-shrink-0"
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      {/* Diálogo de información del contacto */}
      <ContactInfoDialog
        client={conversation?.client || null}
        open={showContactInfo}
        onOpenChange={setShowContactInfo}
      />
    </div>
  )
}
