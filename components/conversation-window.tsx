"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Smile, ArrowDown, Phone, Video, MoreVertical, ArrowLeft, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMessages } from "@/hooks/useMessages"
import { useConversation } from "@/hooks/useChatWindow"
import { useUnreadMessages } from "@/hooks/use-unread-messages"
import { sendMessage } from "@/lib/chatActions"
import { uploadFile } from "@/lib/storage-service"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AssignUsersDialog } from "@/components/assign-users-dialog"
import { TemplateSelectorDialog } from "@/components/template-selector-dialog"
import { ConversationProfilePanel } from "@/components/conversation-profile-panel"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useToast } from "@/hooks/use-toast"
import type { Message, User, Client } from "@/types/chat"

interface Template {
  id: string
  name: string
  content: string
  category: string
  variables?: string[]
}

interface ConversationWindowSimpleProps {
  chatId: string
  currentUser: User
  onBack?: () => void
}

interface FilePreview {
  file: File
  url: string
  type: "image" | "document"
}

export default function ConversationWindowSimple({ chatId, currentUser, onBack }: ConversationWindowSimpleProps) {
  // Estado local
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [showProfilePanel, setShowProfilePanel] = useState(false)
  const [isWindowVisible, setIsWindowVisible] = useState(true)
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null)
  const [uploading, setUploading] = useState(false)

  // Referencias
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hooks personalizados
  const { messages, loading: messagesLoading, error: messagesError } = useMessages(chatId)
  const {
    conversation,
    loading: conversationLoading,
    error: conversationError,
    refetch: refetchConversation,
  } = useConversation(chatId)
  const { unreadCount, markAsRead } = useUnreadMessages(chatId)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { toast } = useToast()

  // Estado combinado de carga y error
  const loading = messagesLoading || conversationLoading
  const error = messagesError || conversationError

  // Auto-marcar como leído cuando se abre la conversación
  useEffect(() => {
    console.log(`ConversationWindow: chatId cambió a ${chatId}`)

    // Marcar como leído inmediatamente al abrir
    if (chatId && unreadCount > 0) {
      console.log(`Auto-marcando ${unreadCount} mensajes como leídos`)
      markAsRead()
    }
  }, [chatId, markAsRead, unreadCount])

  // Marcar como leído cuando la ventana está visible y hay mensajes no leídos
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsWindowVisible(!document.hidden)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  // Auto-marcar como leído cuando la ventana es visible y hay mensajes no leídos
  useEffect(() => {
    if (isWindowVisible && unreadCount > 0 && chatId) {
      console.log(`Ventana visible con ${unreadCount} mensajes no leídos - marcando como leído`)
      const timer = setTimeout(() => {
        markAsRead()
      }, 1000) // Delay de 1 segundo para mejor UX

      return () => clearTimeout(timer)
    }
  }, [isWindowVisible, unreadCount, chatId, markAsRead])

  // Marcar como leído cuando el usuario hace scroll hasta abajo
  useEffect(() => {
    if (isNearBottom && unreadCount > 0) {
      console.log(`Usuario en la parte inferior con ${unreadCount} mensajes no leídos - marcando como leído`)
      const timer = setTimeout(() => {
        markAsRead()
      }, 500) // Delay más corto cuando está en el fondo

      return () => clearTimeout(timer)
    }
  }, [isNearBottom, unreadCount, markAsRead])

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

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tamaño del archivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "El archivo no puede ser mayor a 10MB",
        variant: "destructive",
      })
      return
    }

    // Determinar tipo de archivo
    const isImage = file.type.startsWith("image/")
    const fileType = isImage ? "image" : "document"

    // Crear preview
    const url = URL.createObjectURL(file)
    setFilePreview({
      file,
      url,
      type: fileType,
    })

    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Remove file preview
  const removeFilePreview = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview.url)
      setFilePreview(null)
    }
  }

  // Send message function
  const handleSendMessage = async () => {
    if ((!message.trim() && !filePreview) || sending || uploading) return

    const messageContent = message.trim()
    let mediaUrl: string | undefined

    // Clear input and set sending state
    setMessage("")
    setSending(true)

    try {
      // Si hay archivo, subirlo primero
      if (filePreview) {
        setUploading(true)
        try {
          console.log("📤 Subiendo archivo:", filePreview.file.name)

          const uploadResult = await uploadFile(filePreview.file, "chat-media")
          mediaUrl = uploadResult.publicUrl

          console.log("✅ Archivo subido:", mediaUrl)
        } catch (uploadError) {
          console.error("❌ Error subiendo archivo:", uploadError)
          toast({
            title: "Error al subir archivo",
            description: "No se pudo subir el archivo. Inténtalo de nuevo.",
            variant: "destructive",
          })
          return
        } finally {
          setUploading(false)
        }
      }

      // Determinar tipo de mensaje
      let messageType: "text" | "image" | "document" = "text"
      if (filePreview) {
        messageType = filePreview.type === "image" ? "image" : "document"
      }

      await sendMessage({
        conversationId: chatId,
        content:
          messageContent || `${filePreview?.type === "image" ? "Imagen" : "Documento"}: ${filePreview?.file.name}`,
        userId: currentUser.id,
        messageType,
        mediaUrl,
      })

      // Limpiar preview
      removeFilePreview()
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error al enviar mensaje",
        description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  // Handle template selection
  const handleTemplateSelect = async (template: Template) => {
    if (currentUser && !sending) {
      setSending(true)

      try {
        await sendMessage({
          conversationId: chatId,
          content: template.content,
          userId: currentUser.id,
          messageType: "text",
        })
      } catch (error) {
        console.error("Error sending template:", error)
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

  // Render message content based on type
  const renderMessageContent = (msg: Message) => {
    switch (msg.message_type) {
      case "image":
        return (
          <div className="space-y-2">
            {msg.media_url && (
              <img
                src={msg.media_url || "/placeholder.svg"}
                alt="Imagen enviada"
                className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(msg.media_url, "_blank")}
              />
            )}
            {msg.content && msg.content !== `Imagen: ${msg.media_url?.split("/").pop()}` && (
              <div className="text-sm">{msg.content}</div>
            )}
          </div>
        )

      case "document":
        return (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg max-w-xs">
            <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">
                {msg.content.replace("Documento: ", "") || "Documento"}
              </div>
              {msg.media_url && (
                <a
                  href={msg.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Descargar
                </a>
              )}
            </div>
          </div>
        )

      default:
        return (
          <div className="whitespace-pre-wrap break-words text-[14px] leading-[1.3] text-gray-900 min-w-0 flex-1">
            {msg.content}
          </div>
        )
    }
  }

  const messageGroups = groupMessagesByDate(messages)
  const client = conversation?.client

  // Función para abrir el panel de perfil
  const handleOpenProfilePanel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("Abriendo panel de perfil")
    setShowProfilePanel(true)
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
          onClick={handleOpenProfilePanel}
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
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm truncate">{clientName}</h3>
              {/* Indicador de mensajes no leídos en el header */}
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                  {unreadCount > 99 ? "99+" : unreadCount} nuevos
                </span>
              )}
            </div>
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
                <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-medium text-gray-600 shadow-sm border border-gray-100">
                  {getDateDisplay(date)}
                </div>
              </div>

              {dateMessages.map((msg, idx) => {
                const isFirst = isFirstInGroup(idx, dateMessages)
                const isLast = isLastInGroup(idx, dateMessages)

                // Renderizado especial para mensajes de sistema con diseño mejorado
                if (msg.message_type === "system") {
                  return (
                    <div key={msg.id} className="flex justify-center my-3">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 px-4 py-2 rounded-full text-xs font-medium shadow-sm border border-blue-100 backdrop-blur-sm">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                }

                // Renderizado con diseño exacto de WhatsApp
                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === "agent" ? "justify-end" : "justify-start"} ${
                      isFirst ? "mt-2" : "mt-1"
                    }`}
                  >
                    <div
                      className={`relative px-2 py-1 max-w-[85%] ${
                        msg.sender_type === "agent"
                          ? "bg-[#dcf8c6] rounded-lg rounded-br-none"
                          : "bg-white rounded-lg rounded-bl-none shadow-sm"
                      }`}
                    >
                      {/* Contenedor flexible para texto y metadata */}
                      <div className="flex items-end gap-1">
                        {renderMessageContent(msg)}

                        {/* Hora y checkmarks */}
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2 pb-[1px]">
                          <span className="text-[11px] text-gray-500 font-normal whitespace-nowrap">
                            {formatTime(msg.created_at)}
                          </span>

                          {/* Doble checkmark solo para mensajes enviados */}
                          {msg.sender_type === "agent" && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 15" fill="none">
                                <path
                                  d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L3.724 9.587a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"
                                  fill="currentColor"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cola del mensaje estilo WhatsApp */}
                      <div
                        className={`absolute bottom-0 w-2 h-2 ${
                          msg.sender_type === "agent" ? "right-[-2px] bg-[#dcf8c6]" : "left-[-2px] bg-white"
                        }`}
                        style={{
                          clipPath:
                            msg.sender_type === "agent"
                              ? "polygon(0 0, 0 100%, 100% 100%)"
                              : "polygon(100% 0, 0 100%, 100% 100%)",
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

      {/* Preview de archivo */}
      {filePreview && (
        <div className="p-3 bg-gray-50 border-t">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="flex-shrink-0">
              {filePreview.type === "image" ? (
                <img
                  src={filePreview.url || "/placeholder.svg"}
                  alt="Preview"
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{filePreview.file.name}</p>
              <p className="text-xs text-gray-500">{(filePreview.file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <Button variant="ghost" size="icon" onClick={removeFilePreview} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
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

          {/* Input de archivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
            onChange={handleFileSelect}
            className="hidden"
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-gray-500"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Adjuntar archivo</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Botón de plantillas */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <TemplateSelectorDialog onTemplateSelect={handleTemplateSelect} disabled={sending} />
                </div>
              </TooltipTrigger>
              <TooltipContent>Enviar plantilla</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Input
            placeholder="Escribe un mensaje"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending || uploading}
            className="flex-1 rounded-full border-gray-300 focus-visible:ring-green-500"
          />

          <Button
            onClick={handleSendMessage}
            disabled={sending || uploading || (!message.trim() && !filePreview)}
            size="icon"
            className={`rounded-full ${
              message.trim() || filePreview ? "bg-green-500 hover:bg-green-600" : "bg-gray-200 text-gray-500"
            }`}
          >
            {sending || uploading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Panel de perfil de conversación */}
      <ConversationProfilePanel
        isOpen={showProfilePanel}
        onOpenChange={setShowProfilePanel}
        conversation={conversation}
        currentUser={currentUser}
        onAssignmentChange={handleAssignmentChange}
      />
    </div>
  )
}
