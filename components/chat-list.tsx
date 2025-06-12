"use client"

import type React from "react"

import { useState } from "react"
import { Search, MoreVertical, Users, MessageCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createConversation } from "@/lib/chatActions"
import { useConversations } from "@/hooks/use-conversations"
import { useClients } from "@/hooks/use-clients"
import { useAuth } from "@/app/contexts/auth-context"
import type { ConversationWithLastMessage } from "@/types/chat"

// Componente para mostrar el icono del canal con letra
function ChannelIcon({ channelName }: { channelName?: string }) {
  const getChannelConfig = (name: string) => {
    switch (name?.toLowerCase()) {
      case "whatsapp":
        return { letter: "W", bgColor: "bg-green-500", textColor: "text-white" }
      case "email":
        return { letter: "E", bgColor: "bg-blue-500", textColor: "text-white" }
      case "sms":
        return { letter: "S", bgColor: "bg-orange-500", textColor: "text-white" }
      case "webchat":
        return { letter: "C", bgColor: "bg-purple-500", textColor: "text-white" }
      case "facebook":
        return { letter: "F", bgColor: "bg-blue-600", textColor: "text-white" }
      case "instagram":
        return { letter: "I", bgColor: "bg-pink-500", textColor: "text-white" }
      case "telegram":
        return { letter: "T", bgColor: "bg-sky-500", textColor: "text-white" }
      default:
        return { letter: "?", bgColor: "bg-gray-500", textColor: "text-white" }
    }
  }

  const config = getChannelConfig(channelName || "")

  return (
    <div className={`w-5 h-5 rounded-full ${config.bgColor} flex items-center justify-center`}>
      <span className={`text-xs font-bold ${config.textColor}`}>{config.letter}</span>
    </div>
  )
}

function NewConversationDialog({ onConversationCreated }: { onConversationCreated: () => void }) {
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [initialMessage, setInitialMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const { userProfile } = useAuth()

  const organizationId = userProfile?.organization_id ? Number(userProfile.organization_id) : undefined
  const { clients, loading: clientsLoading, error: clientsError } = useClients(organizationId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId || !organizationId) return

    const selectedClient = clients.find((c) => c.id.toString() === selectedClientId)
    if (!selectedClient) return

    setLoading(true)
    try {
      await createConversation({
        organizationId,
        clientData: {
          name: selectedClient.name,
          phone: selectedClient.phone,
          email: selectedClient.email,
          external_id: selectedClient.external_id || `client-${selectedClient.id}`,
          avatar_url: selectedClient.avatar_url,
        },
        initialMessage: initialMessage || "¡Hola! ¿En qué puedo ayudarte?",
        existingClientId: selectedClient.id,
      })

      setSelectedClientId("")
      setInitialMessage("")
      setOpen(false)
      onConversationCreated()
    } catch (error) {
      console.error("Error creating conversation:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!organizationId) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MessageCircle className="h-4 w-4" />
            <span className="sr-only">Nueva conversación</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <p>No se pudo obtener la información de la organización.</p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MessageCircle className="h-4 w-4" />
          <span className="sr-only">Nueva conversación</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar conversación</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Seleccionar contacto</Label>
            {clientsLoading ? (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                <span className="ml-2">Cargando contactos...</span>
              </div>
            ) : clientsError ? (
              <div className="text-red-500 p-2">Error: {clientsError}</div>
            ) : clients.length === 0 ? (
              <div className="text-gray-500 p-2">No hay contactos disponibles</div>
            ) : (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un contacto existente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {client.avatar_url && (
                            <AvatarImage src={client.avatar_url || "/placeholder.svg"} alt={client.name} />
                          )}
                          <AvatarFallback className="text-xs">{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{client.name}</div>
                          {client.phone && <div className="text-xs text-gray-500">{client.phone}</div>}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensaje inicial (opcional)</Label>
            <Input
              id="message"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="¡Hola! ¿En qué puedo ayudarte?"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !selectedClientId || clientsLoading}>
              {loading ? "Creando..." : "Iniciar conversación"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ChatListProps {
  selectedChatId: string | null
  onChatSelect: (chatId: string) => void
}

export default function ChatList({ selectedChatId, onChatSelect }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"all" | "assigned">("all")
  const { userProfile } = useAuth()

  const organizationId = userProfile?.organization_id
  const { conversations, loading, error, refetch } = useConversations(organizationId, viewMode)

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message?.content.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return ""

    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 48) {
      return "Ayer"
    } else {
      return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    }
  }

  const getLastMessagePreview = (conversation: any) => {
    if (conversation.last_message) {
      return conversation.last_message.content
    }
    return "Nueva conversación"
  }

  const assignedCount = conversations.filter((conv) => conv.assigned_user_ids?.includes(userProfile?.id || "")).length

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">
            <p>Error al cargar conversaciones</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
        <div className="flex items-center gap-2">
          <NewConversationDialog onConversationCreated={refetch} />
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros principales */}
      <div className="bg-white border-b border-gray-200">
        <div
          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
            viewMode === "assigned" ? "bg-green-50 border-r-4 border-green-500" : ""
          }`}
          onClick={() => setViewMode("assigned")}
        >
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-gray-900">Asignados</span>
            <span className="ml-2 text-gray-500">({assignedCount})</span>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
            viewMode === "all" ? "bg-green-50 border-r-4 border-green-500" : ""
          }`}
          onClick={() => setViewMode("all")}
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-gray-900">Todos</span>
            <span className="ml-2 text-gray-500">({conversations.length})</span>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="p-3 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-none focus:bg-white"
          />
        </div>
      </div>

      {/* Lista de chats */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 p-4">
            <p className="text-center mb-2">No hay conversaciones</p>
            <p className="text-sm text-center">Haz clic en el botón de mensaje para iniciar una nueva conversación</p>
          </div>
        ) : (
          filteredConversations.map((conversation: ConversationWithLastMessage) => (
            <div
              key={conversation.id}
              onClick={() => onChatSelect(conversation.id)}
              className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${
                selectedChatId === conversation.id ? "bg-gray-100" : ""
              }`}
            >
              {/* Avatar con icono del canal en la esquina */}
              <div className="relative">
                <Avatar className="h-12 w-12">
                  {conversation.client?.avatar_url && (
                    <AvatarImage
                      src={conversation.client.avatar_url || "/placeholder.svg"}
                      alt={conversation.client?.name || "Usuario"}
                    />
                  )}
                  <AvatarFallback>{conversation.client?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>

                {/* Icono del canal en la esquina inferior derecha - SIEMPRE mostrar para debug */}
                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 border border-gray-200 shadow-sm">
                  <ChannelIcon channelName={conversation.canales_organization?.canal?.nombre || "whatsapp"} />
                </div>
              </div>

              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {conversation.client?.name || "Usuario desconocido"}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatTimestamp(conversation.last_message?.created_at || conversation.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate flex-1">{getLastMessagePreview(conversation)}</p>
                  {conversation.unread_count > 0 && (
                    <span className="ml-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
