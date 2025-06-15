"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Smile, ArrowDown, Phone, Video, MoreVertical, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMessages } from "@/hooks/useMessages"
import { useConversation } from "@/hooks/useConversation"
import { sendMessage } from "@/lib/chatActions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ContactInfoDialog } from "@/components/contact-info-dialog"
import { AssignUsersDialog } from "@/components/assign-users-dialog"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { Message, User, Client } from "@/types/chat"

interface ConversationWindowSimpleProps {
  chatId: string
  currentUser: User
  onBack?: () => void
}

export default function ConversationWindowSimple({ chatId, currentUser, onBack }: ConversationWindowSimpleProps) {
  // Estado local
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [showContactInfo, setShowContactInfo] = useState(false)

  // Referencias
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Hooks personalizados
  const { messages, loading: messagesLoading, error: messagesError } = useMessages(chatId)
  const {
    conversation,
    loading: conversationLoading,
    error: conversationError,
    refetch: refetchConversation,
  } = useConversation(chatId)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Estado combinado de carga y error
  const loading = messagesLoading || conversationLoading
  const error = messagesError || conversationError

  // Debug: Verificar si tenemos datos del cliente
  useEffect(() => {
    if (conversation?.client) {
      console.log("Cliente disponible:", conversation.client)
    } else {
      console.warn("Cliente no disponible en la conversación:", conversation)
    }
  }, [conversation])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom()
    }
  }, [messages, isNearBottom])

  // Check if user is near bottom of the scroll container
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const scrollPosition = scrollHeight - scrollTop - clientHeight
      const isNear = scrollPosition < 100
      setIsNearBottom(isNear)
      setShowScrollButton(!isNear)
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  // Format timestamp to readable time
  const formatTime = (dateStr: string | null | undefined) => {
    try {
      // Si es undefined o null, devolver una cadena vacía
      if (!dateStr) return ""

      // Crear una fecha a partir del string
      const date = new Date(dateStr)

      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) return ""

      return new Intl.DateTimeFormat("es", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date)
    } catch (error) {
      console.error("Error al formatear la fecha:", error)
      return ""
    }
  }

  // Get channel color
  const getChannelColor = (channel?: string) => {
    switch (channel) {
      case "whatsapp":
        return "bg-green-500"
      case "instagram":
        return "bg-pink-500"
      case "facebook":
        return "bg-blue-500"
      case "webchat":
        return "bg-gray-500"
      default:
        return "bg-green-500" // Default to WhatsApp green
    }
  }

  // Get online status text
  const getOnlineStatus = (client?: Client) => {
    if (!client) return ""

    if (client.last_interaction_at) {
      const lastInteraction = new Date(client.last_interaction_at)
      const now = new Date()
      const diffMinutes = Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60))

      if (diffMinutes < 5) return "en línea"
      if (diffMinutes < 60) return `últ. vez hace ${diffMinutes} min.`

      const diffHours = Math.floor(diffMinutes / 60)
      if (diffHours < 24) return `últ. vez hace ${diffHours} h`

      return `últ. vez ${lastInteraction.toLocaleDateString("es")}`
    }

    return ""
  }

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Send message function
  const handleSendMessage = async () => {
    if (message.trim() && currentUser && !sending) {
      const messageContent = message.trim()

      // Clear input and set sending state
      setMessage("")
      setSending(true)

      try {
        await sendMessage({
          conversationId: chatId,
          content: messageContent,
          userId: currentUser.id,
          messageType: "text",
        })
      } catch (error) {
        console.error("Error sending message:", error)
      } finally {
        setSending(false)
      }
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Add emoji to message
  const addEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
  }

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}

    messages.forEach((msg) => {
      // Usar created_at en lugar de timestamp
      const date = new Date(msg.created_at).toLocaleDateString("es")
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(msg)
    })

    return groups
  }

  // Get date display format
  const getDateDisplay = (dateStr: string) => {
    const today = new Date().toLocaleDateString("es")
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("es")

    if (dateStr === today) return "Hoy"
    if (dateStr === yesterday) return "Ayer"
    return dateStr
  }

  // Check if message is first in a group
  const isFirstInGroup = (index: number, messages: Message[]) => {
    if (index === 0) return true
    return messages[index].sender_type !== messages[index - 1].sender_type
  }

  // Check if message is last in a group
  const isLastInGroup = (index: number, messages: Message[]) => {
    if (index === messages.length - 1) return true
    return messages[index].sender_type !== messages[index + 1].sender_type
  }

  // Handle assignment change callback
  const handleAssignmentChange = () => {
    // Refrescar la conversación para obtener los usuarios asignados actualizados
    refetchConversation?.()
  }

  const messageGroups = groupMessagesByDate(messages)
  const client = conversation?.client

  // Función para abrir el modal de información de contacto
  const handleOpenContactInfo = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("Abriendo modal de contacto")
    setShowContactInfo(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Cargando conversación...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          <p className="font-medium">Error al cargar la conversación</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Nombre del cliente con fallback
  const clientName = client?.name || conversation?.title || "Contacto"

  return (
    <div className="flex flex-col h-full bg-[#e5ddd5] bg-opacity-30">
      {/* Header con información del contacto */}
      <div className="bg-white border-b p-2 flex items-center gap-3 shadow-sm">
        {isMobile && onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-1"
            onClick={(e) => {
              e.stopPropagation()
              onBack()
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Información del contacto - clickeable */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:bg-gray-50 rounded-lg p-1 transition-colors"
          onClick={handleOpenContactInfo}
        >
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={client?.avatar_url || "/placeholder.svg"} alt={clientName} />
              <AvatarFallback>{clientName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            {client?.channel && (
              <div
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white ${getChannelColor(client.channel)}`}
              ></div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{clientName}</h3>
            <p className="text-xs text-gray-500 truncate">{getOnlineStatus(client)}</p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-1">
          {/* Botón de asignar usuarios */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <AssignUsersDialog
                    conversationId={chatId}
                    assignedUserIds={conversation?.assigned_user_ids || []}
                    onAssignmentChange={handleAssignmentChange}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Asignar usuarios</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-4 w-4 text-gray-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Llamar</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Video className="h-4 w-4 text-gray-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Videollamada</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-gray-600" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Más opciones</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Área de mensajes mejorada */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.keys(messageGroups).length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white bg-opacity-80 p-4 rounded-lg text-center">
              <p className="text-gray-500">No hay mensajes en esta conversación</p>
              <p className="text-sm text-gray-400">Envía el primer mensaje para comenzar</p>
            </div>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date} className="space-y-2">
              <div className="flex justify-center">
                <div className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                  {getDateDisplay(date)}
                </div>
              </div>

              {dateMessages.map((msg, idx) => {
                const isFirst = isFirstInGroup(idx, dateMessages)
                const isLast = isLastInGroup(idx, dateMessages)

                // Renderizado especial para mensajes de sistema
                if (msg.message_type === "system") {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-xs font-medium shadow-sm border border-blue-200">
                        {msg.content}
                      </div>
                    </div>
                  )
                }

                // Renderizado normal para otros mensajes
                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === "agent" ? "justify-end" : "justify-start"} ${
                      isFirst ? "mt-2" : "mt-1"
                    }`}
                  >
                    <div
                      className={`relative p-3 max-w-[80%] ${
                        msg.sender_type === "agent"
                          ? "bg-[#dcf8c6] rounded-tl-lg rounded-bl-lg rounded-tr-lg"
                          : "bg-white rounded-tr-lg rounded-br-lg rounded-tl-lg"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {/* Usar created_at en lugar de timestamp */}
                        <span className="text-[10px] text-gray-500">{formatTime(msg.created_at)}</span>
                        {msg.sender_type === "agent" && (
                          <span>
                            {msg.is_read ? (
                              <svg
                                className="w-3 h-3 text-blue-500"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4.5 12.75L10.5 18.75L19.5 5.25"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M4.5 5.25L10.5 11.25"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-3 h-3 text-gray-400"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M4.5 12.75L10.5 18.75L19.5 5.25"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Message tail */}
                      <div
                        className={`absolute top-0 w-4 h-4 ${
                          msg.sender_type === "agent" ? "right-[-8px] bg-[#dcf8c6]" : "left-[-8px] bg-white"
                        }`}
                        style={{
                          clipPath:
                            msg.sender_type === "agent"
                              ? "polygon(0 0, 0% 100%, 100% 0)"
                              : "polygon(100% 0, 100% 100%, 0 0)",
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Botón de scroll */}
      {showScrollButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-20 right-6 rounded-full shadow-md"
                onClick={scrollToBottom}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ir al final</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Input de mensaje mejorado */}
      <div className="p-3 bg-white border-t">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-gray-500">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="grid grid-cols-8 gap-1">
                {["😀", "😂", "😍", "🥰", "😎", "🤔", "😊", "👍", "❤️", "👏", "🙏", "🔥", "✅", "🎉", "👌", "🤣"].map(
                  (emoji) => (
                    <button
                      key={emoji}
                      className="text-xl p-1 hover:bg-gray-100 rounded"
                      onClick={() => addEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ),
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="icon" className="rounded-full text-gray-500">
            <Paperclip className="h-5 w-5" />
          </Button>

          <Input
            placeholder="Escribe un mensaje"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1 rounded-full border-gray-300 focus-visible:ring-green-500"
          />

          <Button
            onClick={handleSendMessage}
            disabled={sending || !message.trim()}
            size="icon"
            className={`rounded-full ${
              message.trim() ? "bg-green-500 hover:bg-green-600" : "bg-gray-200 text-gray-500"
            }`}
          >
            {sending ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Diálogo de información del contacto */}
      {client && <ContactInfoDialog client={client} open={showContactInfo} onOpenChange={setShowContactInfo} />}
    </div>
  )
}
