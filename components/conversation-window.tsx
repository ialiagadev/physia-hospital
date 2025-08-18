"use client"

import type React from "react"
import { useState, useRef, useEffect, useLayoutEffect } from "react"
import {
  Send,
  Smile,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  FileText,
  Sparkles,
  Music,
  Mic,
  Square,
  Trash2,
  Paperclip,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMessages } from "@/hooks/useMessages"
import { useConversation } from "@/hooks/useChatWindow"
import { useUnreadMessages } from "@/hooks/use-unread-messages"
import { sendMessage } from "@/lib/chatActions"
import { uploadFile } from "@/lib/storage-service"
import { supabase } from "@/lib/supabase/client"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AssignUsersDialog } from "@/components/assign-users-dialog"
import { TemplateSelectorDialog } from "@/components/template-selector-dialog"
import { ConversationProfilePanel } from "@/components/conversation-profile-panel"
import { ConversationSummaryModal } from "@/components/conversation-summary-modal"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
import type { Message, User, Client } from "@/types/chat"

import EmojiPicker from "emoji-picker-react"

interface TemplateWithVariables {
  id: string
  name: string
  status: string
  language: string
  category: string
  components?: Array<{
    text?: string
    type?: string
  }>
  variableValues?: Record<string, string>
  finalContent?: string
}

interface ConversationWindowSimpleProps {
  chatId: string
  currentUser: User
  onBack?: () => void
  onTagsChange?: () => void
}

interface FilePreview {
  file: File
  url: string
  type: "image" | "document" | "audio" | "video"
}

interface VoiceRecording {
  isRecording: boolean
  duration: number
  audioBlob: Blob | null
  audioUrl: string | null
  mimeType: string
  fileExtension: string
}

export default function ConversationWindowSimple({
  chatId,
  currentUser,
  onBack,
  onTagsChange,
}: ConversationWindowSimpleProps) {
  // Estado local
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [showProfilePanel, setShowProfilePanel] = useState(false)
  const [isWindowVisible, setIsWindowVisible] = useState(true)
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const [voiceRecording, setVoiceRecording] = useState<VoiceRecording>({
    isRecording: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    mimeType: "audio/webm;codecs=opus",
    fileExtension: "webm",
  })

  // Referencias
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Hooks personalizados
  const {
    messages,
    loading: messagesLoading,
    loadingMore,
    hasMore,
    error: messagesError,
    loadMoreMessages,
  } = useMessages(chatId)
  const {
    conversation,
    loading: conversationLoading,
    error: conversationError,
    refetch: refetchConversation,
  } = useConversation(chatId)
  const { unreadCount, markAsRead } = useUnreadMessages(chatId)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { toast } = useToast()
  const { userProfile } = useAuth()

  // Estado combinado de carga y error
  const loading = messagesLoading || conversationLoading
  const error = messagesError || conversationError

  const getAisensyToken = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.from("waba").select("token_proyecto").eq("estado", 1).single()

      if (error) {
        console.error("Error getting Aisensy token:", error)
        return null
      }

      return data?.token_proyecto || null
    } catch (error) {
      console.error("Error fetching Aisensy token:", error)
      return null
    }
  }

  const getMessageType = (fileType: string): "image" | "audio" | "video" | "document" => {
    if (fileType.startsWith("image/")) return "image"
    if (fileType.startsWith("audio/")) return "audio"
    if (fileType.startsWith("video/")) return "video"
    return "document"
  }

  // Auto-marcar como leído cuando se abre la conversación
  useEffect(() => {
    if (chatId && unreadCount > 0) {
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
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 1000) // Delay de 1 segundo para mejor UX

      return () => clearTimeout(timer)
    }
  }, [isWindowVisible, unreadCount, chatId, markAsRead])

  // Marcar como leído cuando el usuario hace scroll hasta abajo
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const scrollPosition = scrollHeight - scrollTop - clientHeight
      const isNear = scrollPosition < 100

      setIsNearBottom(isNear)

      // Load more messages when scrolling near the top
      if (scrollTop < 100 && hasMore && !loadingMore && !messagesLoading) {
        const previousScrollHeight = scrollHeight
        loadMoreMessages().then(() => {
          // Maintain scroll position after loading more messages
          setTimeout(() => {
            if (container) {
              const newScrollHeight = container.scrollHeight
              const scrollDifference = newScrollHeight - previousScrollHeight
              container.scrollTop = scrollTop + scrollDifference
            }
          }, 50)
        })
      }
    }

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [hasMore, loadingMore, messagesLoading, loadMoreMessages])

  useLayoutEffect(() => {
    if (conversation?.client && isInitialLoad && messagesContainerRef.current) {
      // Scroll inmediato sin setTimeout para evitar pestañeo
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      setIsInitialLoad(false)
    }
  }, [conversation, isInitialLoad])

  useEffect(() => {
    if (!isInitialLoad && isNearBottom && messages.length > 0) {
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [messages.length, isNearBottom, isInitialLoad])

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

  const scrollToBottomInstant = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 16 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        description: "El archivo no puede ser mayor a 16MB",
        variant: "destructive",
      })
      return
    }

    let fileType: "image" | "document" | "audio" | "video" = "document"
    if (file.type.startsWith("image/")) fileType = "image"
    else if (file.type.startsWith("audio/")) fileType = "audio"
    else if (file.type.startsWith("video/")) fileType = "video"

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
          console.log("🔄 Iniciando subida de archivo:", filePreview.file.name, "Tamaño:", filePreview.file.size)
          const uploadResult = await uploadFile(filePreview.file)
          console.log("📤 Resultado completo de subida:", JSON.stringify(uploadResult, null, 2))

          if (uploadResult.success && uploadResult.publicUrl) {
            mediaUrl = uploadResult.publicUrl
            console.log("✅ URL obtenida exitosamente:", mediaUrl)
          } else {
            console.error("❌ Error en subida - success:", uploadResult.success, "error:", uploadResult.error)
            throw new Error(uploadResult.error || "Upload failed")
          }
        } catch (uploadError) {
          console.error("💥 Error crítico subiendo archivo:", uploadError)
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
      let messageType: "text" | "image" | "document" | "audio" | "video" = "text"
      if (filePreview) {
        messageType = getMessageType(filePreview.file.type)
      }

      if (filePreview && !mediaUrl) {
        console.error("❌ No se obtuvo URL del archivo subido")
        toast({
          title: "Error",
          description: "No se pudo obtener la URL del archivo subido.",
          variant: "destructive",
        })
        return
      }

      await sendMessage({
        conversationId: chatId,
        content:
          messageContent ||
          (filePreview?.type === "image"
            ? "" // Send empty content for images
            : `${
                filePreview?.type === "audio" ? "Audio" : filePreview?.type === "video" ? "Video" : "Documento"
              }: ${filePreview?.file.name}`),
        userId: currentUser.id,
        messageType,
        mediaUrl,
      })

      // Limpiar preview
      removeFilePreview()
    } catch (error) {
      toast({
        title: "Error al enviar mensaje",
        description: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  // Handle template sent - Updated to show template with variables replaced
  const handleTemplateSent = async (template: TemplateWithVariables) => {
    try {
      // Use the final content if available, otherwise build it
      let templateContent = template.finalContent

      if (!templateContent) {
        // Fallback: build content from components
        const bodyComponent = template.components?.find((c) => c.type === "BODY")
        const headerComponent = template.components?.find((c) => c.type === "HEADER")
        const footerComponent = template.components?.find((c) => c.type === "FOOTER")

        templateContent = ""

        if (headerComponent?.text) {
          templateContent += `*${headerComponent.text}*\n\n`
        }

        if (bodyComponent?.text) {
          templateContent += bodyComponent.text
        }

        if (footerComponent?.text) {
          templateContent += `\n\n_${footerComponent.text}_`
        }

        // Fallback if no content found
        if (!templateContent.trim()) {
          templateContent = `Plantilla "${template.name}" enviada`
        }
      }

      // Add the template content as a message in the chat
      await sendMessage({
        conversationId: chatId,
        content: templateContent,
        userId: currentUser.id,
        messageType: "text",
      })

      // Refrescar la conversación para actualizar last_message_at
      refetchConversation?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "La plantilla se envió pero no se pudo mostrar en el chat",
        variant: "destructive",
      })
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

  const onEmojiClick = (emojiObject: any) => {
    setMessage((prev) => prev + emojiObject.emoji)
    setShowEmojiPicker(false)
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
  const current = messages[index]
  const prev = messages[index - 1]

  // Nuevo: si cambia el tipo de emisor o cambia el usuario (ej: otro agente)
  return (
    current.sender_type !== prev.sender_type ||
    current.user?.id !== prev.user?.id
  )
}

// Check if message is last in a group
const isLastInGroup = (index: number, messages: Message[]) => {
  if (index === messages.length - 1) return true
  const current = messages[index]
  const next = messages[index + 1]

  // Nuevo: si cambia el tipo de emisor o cambia el usuario
  return (
    current.sender_type !== next.sender_type ||
    current.user?.id !== next.user?.id
  )
}


  // Handle assignment change callback
  const handleAssignmentChange = () => {
    // Refrescar la conversación para obtener los usuarios asignados actualizados
    refetchConversation?.()
  }

  const sendVoiceNote = async () => {
    if (!voiceRecording.audioBlob) return

    setSending(true)
    setUploading(true)

    try {
      const fileName = `nota-voz-${Date.now()}`
      const audioFile = new File([voiceRecording.audioBlob], `${fileName}.${voiceRecording.fileExtension}`, {
        type: voiceRecording.mimeType,
      })

      console.log(
        "🎤 Enviando nota de voz:",
        audioFile.name,
        "Tipo:",
        audioFile.type,
        "Duración:",
        voiceRecording.duration,
        "s",
      )

      const uploadResult = await uploadFile(audioFile)

      if (uploadResult.success && uploadResult.publicUrl) {
        await sendMessage({
          conversationId: chatId,
          content: `Nota de voz (${voiceRecording.duration}s)`,
          userId: currentUser.id,
          messageType: "document", // Cambiar de "audio" a "document" para WhatsApp
          mediaUrl: uploadResult.publicUrl,
        })

        // Limpiar grabación
        cancelVoiceRecording()

        toast({
          title: "Nota de voz enviada",
          description: "Tu nota de voz se ha enviado correctamente por WhatsApp",
        })
      } else {
        throw new Error(uploadResult.error || "Error al subir nota de voz")
      }
    } catch (error) {
      console.error("Error enviando nota de voz:", error)
      toast({
        title: "Error al enviar nota de voz",
        description: "No se pudo enviar la nota de voz. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
      setUploading(false)
    }
  }

  // Format timestamp to readable time
  const formatRecordingDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (voiceRecording.audioUrl) {
        URL.revokeObjectURL(voiceRecording.audioUrl)
      }
    }
  }, [voiceRecording.audioUrl])

  const VoiceNoteMessage = ({ msg }: { msg: any }) => {
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef<HTMLAudioElement>(null)

    // Determinar si es mensaje enviado o recibido
    const isSent = msg.sender_type === "agent"

    const togglePlay = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause()
        } else {
          audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
      }
    }

    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg max-w-xs ${isSent ? "bg-[#d9fdd2]" : "bg-white"}`}>
        {/* Botón de play mejorado */}
        <button
          onClick={togglePlay}
          className="w-12 h-12 bg-transparent rounded-full flex items-center justify-center hover:bg-black/5 transition-colors flex-shrink-0"
        >
          {isPlaying ? (
            // Ícono de pausa (dos barras verticales más grandes)
            <div className="flex gap-1">
              <div className="w-1.5 h-5 bg-gray-700 rounded-full" />
              <div className="w-1.5 h-5 bg-gray-700 rounded-full" />
            </div>
          ) : (
            <div className="w-0 h-0 border-l-[12px] border-l-gray-700 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1" />
          )}
        </button>

        {/* Círculo indicador de progreso */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSent ? "bg-gray-600" : "bg-blue-500"}`} />

        {/* Ondas de audio más realistas */}
        <div className="flex-1 min-w-0 flex items-center">
          <div className="flex items-center gap-[1px]">
            {/* Patrón de ondas más realista basado en las imágenes de WhatsApp */}
            {[1, 3, 2, 4, 1, 3, 5, 2, 4, 1, 3, 2, 5, 3, 1, 4, 2, 3, 1, 4, 2, 5, 3, 1, 4, 2, 3, 5, 1, 3].map(
              (height, i) => (
                <div key={i} className="w-[2px] bg-gray-400 rounded-full" style={{ height: `${height * 2 + 2}px` }} />
              ),
            )}
          </div>
        </div>

        <audio ref={audioRef} src={msg.media_url} onEnded={() => setIsPlaying(false)} className="hidden" />
      </div>
    )
  }

  const renderMessageContent = (msg: any) => {
    switch (msg.message_type) {
      case "text":
        return <div className="whitespace-pre-wrap break-words">{msg.content}</div>
      case "image":
        return (
          <div className="max-w-xs">
            <img src={msg.media_url || "/placeholder.svg"} alt="Imagen" className="rounded-lg max-w-full h-auto" />
          </div>
        )
      case "video":
        return (
          <div className="max-w-xs">
            <video src={msg.media_url} controls className="rounded-lg max-w-full h-auto" preload="metadata">
              Tu navegador no soporta el elemento video.
            </video>
          </div>
        )
      case "document":
        if (isVoiceNote(msg)) {
          return <VoiceNoteMessage msg={msg} />
        }
        // Renderizar como documento normal
        return (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg max-w-xs">
            <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Documento</div>
              {msg.media_url && (
                <a
                  href={msg.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Descargar archivo
                </a>
              )}
            </div>
          </div>
        )
      case "audio":
        return <VoiceNoteMessage msg={msg} />

      default:
        return (
          <div className="whitespace-pre-wrap break-words text-[14px] leading-[1.3] text-gray-900 min-w-0 flex-1">
            {msg.content}
          </div>
        )
    }
  }

  const isVoiceNote = (msg: any) => {
    if (msg.message_type === "audio") return true
    if (msg.message_type !== "document" || !msg.media_url) return false

    const fileName = msg.media_url.toLowerCase()
    return fileName.endsWith(".ogg") || fileName.endsWith(".mp3")
  }

  const messageGroups = groupMessagesByDate(messages)
  const client = conversation?.client

  // Función para abrir el panel de perfil
  const handleOpenProfilePanel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowProfilePanel(true)
  }

  // Get recipient phone number for template selector
  const getRecipientPhone = () => {
    // Try to get phone from client data
    if (client?.phone) {
      return client.phone
    }

    // Try to get from conversation title if it looks like a phone number
    if (conversation?.title && /^\+?\d{10,15}$/.test(conversation.title.replace(/\D/g, ""))) {
      return conversation.title
    }

    // Fallback - you might want to handle this differently
    return client?.name || conversation?.title || "unknown"
  }

  // Check if conversation is closed (more than 24 hours since last contact message)
  const isConversationClosed = () => {
    if (!messages || messages.length === 0) return false

    const lastContactMessage = [...messages]
      .filter((m) => m.sender_type === "contact")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    if (!lastContactMessage) return false

    const lastMessageTime = new Date(lastContactMessage.created_at).getTime()
    const now = new Date().getTime()
    const hoursDiff = (now - lastMessageTime) / (1000 * 60 * 60)

    return hoursDiff > 24
  }

  const conversationClosed = isConversationClosed()

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      let mimeType = "audio/webm"
      let fileExtension = "webm"

      // Probar formatos en orden de preferencia para WhatsApp
      const preferredFormats = [
        { mime: "audio/ogg; codecs=opus", ext: "ogg" },
        { mime: "audio/ogg", ext: "ogg" },
        { mime: "audio/webm; codecs=opus", ext: "webm" },
        { mime: "audio/webm", ext: "webm" },
        { mime: "audio/mp4", ext: "mp4" },
      ]

      for (const format of preferredFormats) {
        if (MediaRecorder.isTypeSupported(format.mime)) {
          mimeType = format.mime
          fileExtension = format.ext
          console.log("Formato soportado encontrado:", mimeType)
          break
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" })
        const audioUrl = URL.createObjectURL(audioBlob)

        setVoiceRecording((prev) => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
          mimeType: "audio/ogg; codecs=opus", // Siempre reportar como OGG para WhatsApp
          fileExtension: "ogg", // Siempre usar extensión OGG
        }))

        // Detener todas las pistas de audio
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setVoiceRecording((prev) => ({
        ...prev,
        isRecording: true,
        duration: 0,
      }))

      // Iniciar contador de duración
      recordingTimerRef.current = setInterval(() => {
        setVoiceRecording((prev) => ({
          ...prev,
          duration: prev.duration + 1,
        }))
      }, 1000)

      toast({
        title: "Grabando nota de voz",
        description: "Presiona el botón rojo para detener la grabación",
      })
    } catch (error) {
      console.error("Error accessing microphone:", error)
      toast({
        title: "Error de micrófono",
        description: "No se pudo acceder al micrófono. Verifica los permisos.",
        variant: "destructive",
      })
    }
  }

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && voiceRecording.isRecording) {
      mediaRecorderRef.current.stop()

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && voiceRecording.isRecording) {
      mediaRecorderRef.current.stop()

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }

    // Limpiar estado de grabación
    if (voiceRecording.audioUrl) {
      URL.revokeObjectURL(voiceRecording.audioUrl)
    }

    setVoiceRecording({
      isRecording: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      mimeType: "audio/webm;codecs=opus",
      fileExtension: "webm",
    })
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
                  <AssignUsersDialog conversationId={chatId} onAssignmentChange={handleAssignmentChange} />
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
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={{ scrollBehavior: "auto" }}
      >
        {/* Loading indicator for older messages */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              Cargando mensajes anteriores...
            </div>
          </div>
        )}

        {/* No more messages indicator */}
        {!hasMore && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Inicio de la conversación</div>
          </div>
        )}

        {Object.keys(messageGroups).length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg text-center">
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
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
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
                    className={`flex ${msg.user?.type === 2 ? "justify-end" : "justify-start"} ${
                      isFirst ? "mt-2" : "mt-1"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-2 ${
                        msg.user?.type === 2 || msg.sender_type === "agent"
                          ? "flex-row-reverse max-w-[85%] ml-auto"
                          : "max-w-[85%]"
                      }`}
                    >
                    {/* Avatar: 
  - Siempre para IA (user?.type === 2) 
  - Para agentes humanos solo si es el primero del grupo (isFirst) */}
{(msg.user?.type === 2 || (msg.sender_type === "agent" && isFirst)) && (
  <div className="flex-shrink-0">
    {msg.user?.type === 2 ? (
      // IA
      <Avatar className="h-8 w-8">
        <AvatarImage src="/images/IA.jpeg" alt="IA" />
        <AvatarFallback className="bg-purple-100 text-purple-600">
          IA
        </AvatarFallback>
      </Avatar>
    ) : (
      // Agente humano
      <Avatar className="h-8 w-8">
        <AvatarImage
          src={msg.user?.avatar_url || undefined}
          alt={msg.user?.name || "U"}
        />
        <AvatarFallback>
          {msg.user?.name?.charAt(0).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
    )}
  </div>
)}


                      <div
                        className={`relative px-2 py-1 ${
                          msg.user?.type === 2
                            ? "bg-[#F3E8FF] rounded-lg rounded-br-none" // 💜 Lila suave para IA
                            : msg.sender_type === "agent"
                              ? "bg-[#d9fdd2] rounded-lg rounded-br-none" // Verde para agente humano
                              : "bg-white rounded-lg rounded-bl-none shadow-sm" // Blanco para contactos
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
                            {(msg.sender_type === "agent" || msg.user?.type === 2) && (
                              <div className="flex items-center ml-1">
                                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 15" fill="none">
                                  <path
                                    d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"
                                    fill="currentColor"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`absolute bottom-0 w-2 h-2 ${
                            msg.user?.type === 2
                              ? "right-[-2px] bg-[#F3E8FF]" // Cola lila para IA a la derecha
                              : msg.sender_type === "agent"
                                ? "right-[-2px] bg-[#d9fdd2]" // Cola verde para agente humano a la derecha
                                : "left-[-2px] bg-white" // Cola blanca para contactos a la izquierda
                          }`}
                          style={{
                            clipPath:
                              msg.user?.type === 2 || msg.sender_type === "agent"
                                ? "polygon(0 0, 0 100%, 100% 100%)"
                                : "polygon(100% 0, 0 100%, 100% 100%)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        {conversationClosed && (
          <div className="flex justify-center my-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 px-6 py-3 rounded-lg text-sm font-medium shadow-sm border border-amber-200 backdrop-blur-sm max-w-md text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                <span className="font-semibold">Conversación cerrada</span>
              </div>
              <p className="text-xs text-amber-600">
                Esta conversación se cerró automáticamente después de 24 horas de inactividad. Para reanudar la
                conversación, envía una plantilla de WhatsApp.
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Botón de scroll siempre visible */}
      <div className="fixed bottom-24 right-6 z-10">
        <button
          onClick={scrollToBottom}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors opacity-60 hover:opacity-100"
          title="Ir al final"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

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
              ) : filePreview.type === "audio" ? (
                <div className="w-12 h-12 bg-green-100 rounded flex items-center justify-center">
                  <Music className="h-6 w-6 text-green-600" />
                </div>
              ) : filePreview.type === "video" ? (
                <div className="w-12 h-12 bg-purple-100 rounded flex items-center justify-center">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
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
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview de nota de voz */}
      {voiceRecording.audioUrl && !voiceRecording.isRecording && (
        <div className="p-3 bg-green-50 border-t border-green-200">
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Music className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Nota de voz grabada</p>
              <p className="text-xs text-green-600">Duración: {formatRecordingDuration(voiceRecording.duration)}</p>
              {voiceRecording.audioUrl && (
                <audio controls className="mt-2 w-full h-8">
                  <source src={voiceRecording.audioUrl} type="audio/webm" />
                </audio>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelVoiceRecording}
                className="text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                onClick={sendVoiceNote}
                disabled={sending || uploading}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                {sending || uploading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input de mensaje mejorado */}
      <div className="p-3 bg-white border-t">
        {conversationClosed ? (
          // Input deshabilitado con mensaje
          <div className="flex items-center gap-2 opacity-60">
            <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-gray-500 text-sm">
              Conversación cerrada - Envía una plantilla para reanudar
            </div>

            {/* Solo el botón de plantillas habilitado */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <TemplateSelectorDialog
                      recipientPhone={getRecipientPhone()}
                      onTemplateSent={handleTemplateSent}
                      disabled={sending}
                      trigger={
                        <Button
                          size="icon"
                          className="rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2 border-green-400"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Enviar plantilla para reanudar conversación</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : (
          // Input normal cuando la conversación está activa
          <div className="flex items-center gap-2">
            {voiceRecording.isRecording ? (
              // Interfaz de grabación activa
              <div className="flex-1 flex items-center gap-3 bg-red-50 rounded-full px-4 py-2 border-2 border-red-200">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-600 font-medium text-sm">
                    Grabando... {formatRecordingDuration(voiceRecording.duration)}
                  </span>
                </div>
                <div className="flex-1"></div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cancelVoiceRecording}
                  className="text-red-500 hover:bg-red-100 rounded-full"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={stopVoiceRecording}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full"
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              // Interfaz normal
              <>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  title="Emojis"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.rtf,.odt,.ods,.odp,.zip,.rar,.7z,.tar,.gz,.json,.xml,.html,.css,.js,.ts,.jsx,.py,.java,.cpp,.c,.h,.sql,.md,.yaml,.yml,.ini,.cfg,.log,.epub,.mobi,.azw,.azw3,.fb2,.lit,.pdb,.tcr,.woff,.woff2,.ttf,.otf,.eot,.svg,.dwg,.dxf,.step,.stp,.iges,.igs,.stl,.obj,.3ds,.max,.blend,.fbx,.dae,.x3d,.ply,.off"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Botón de plantillas */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <TemplateSelectorDialog
                          recipientPhone={getRecipientPhone()}
                          onTemplateSent={handleTemplateSent}
                          disabled={sending}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Enviar plantilla</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-gray-500 hover:bg-gray-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={sending || uploading}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Adjuntar archivo</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Input
                  placeholder="Escribe un mensaje"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      if (message.trim() || filePreview) {
                        handleSendMessage()
                      }
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={sending || uploading}
                  className="flex-1 rounded-full border-gray-300 focus-visible:ring-green-500"
                />

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-blue-600 hover:bg-blue-50"
                        onClick={startVoiceRecording}
                        disabled={sending || uploading || voiceRecording.audioBlob !== null}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Grabar nota de voz</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Botón de resumen IA */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-purple-600 hover:bg-purple-50"
                        onClick={() => setShowSummaryModal(true)}
                        disabled={!messages.length}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Generar resumen IA</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

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
              </>
            )}
          </div>
        )}

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4 z-50">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              width={350}
              height={400}
              searchDisabled={false}
              skinTonesDisabled={false}
              previewConfig={{
                showPreview: false,
              }}
            />
          </div>
        )}
      </div>

      {/* Modal de Resumen IA */}
      <ConversationSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        conversationId={chatId}
        clientName={clientName}
      />

      {/* Panel de perfil de conversación */}
      <ConversationProfilePanel
        isOpen={showProfilePanel}
        onOpenChange={setShowProfilePanel}
        conversation={conversation}
        currentUser={currentUser}
        onAssignmentChange={handleAssignmentChange}
        onTagsChange={onTagsChange}
      />
    </div>
  )
}
