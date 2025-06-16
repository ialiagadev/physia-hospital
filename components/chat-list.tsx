"use client"

import type React from "react"

import { useState } from "react"
import { Search, MoreVertical, Users, MessageCircle, Plus, Phone } from "lucide-react"
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
import { useTotalUnreadMessages } from "@/hooks/use-unread-messages"

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

// Prefijos de países más comunes
const countryPrefixes = [
  { code: "ES", prefix: "+34", name: "España", flag: "🇪🇸" },
  { code: "US", prefix: "+1", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "MX", prefix: "+52", name: "México", flag: "🇲🇽" },
  { code: "AR", prefix: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "CO", prefix: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "PE", prefix: "+51", name: "Perú", flag: "🇵🇪" },
  { code: "CL", prefix: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "VE", prefix: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "EC", prefix: "+593", name: "Ecuador", flag: "🇪🇨" },
  { code: "UY", prefix: "+598", name: "Uruguay", flag: "🇺🇾" },
  { code: "PY", prefix: "+595", name: "Paraguay", flag: "🇵🇾" },
  { code: "BO", prefix: "+591", name: "Bolivia", flag: "🇧🇴" },
  { code: "BR", prefix: "+55", name: "Brasil", flag: "🇧🇷" },
  { code: "FR", prefix: "+33", name: "Francia", flag: "🇫🇷" },
  { code: "IT", prefix: "+39", name: "Italia", flag: "🇮🇹" },
  { code: "DE", prefix: "+49", name: "Alemania", flag: "🇩🇪" },
  { code: "GB", prefix: "+44", name: "Reino Unido", flag: "🇬🇧" },
]

// Plantillas de ejemplo (mock data)
const messageTemplates = [
  {
    id: "welcome",
    name: "Bienvenida",
    content: "¡Hola! 👋 Bienvenido/a a nuestro servicio. ¿En qué podemos ayudarte hoy?",
    category: "Saludo",
  },
  {
    id: "appointment",
    name: "Recordatorio de cita",
    content: "Hola, te recordamos que tienes una cita programada. ¿Necesitas confirmar o reprogramar?",
    category: "Citas",
  },
  {
    id: "promotion",
    name: "Promoción especial",
    content: "🎉 ¡Oferta especial! Aprovecha nuestros descuentos exclusivos. ¡No te lo pierdas!",
    category: "Marketing",
  },
  {
    id: "support",
    name: "Soporte técnico",
    content: "Hola, somos el equipo de soporte. Estamos aquí para ayudarte con cualquier consulta técnica.",
    category: "Soporte",
  },
  {
    id: "followup",
    name: "Seguimiento",
    content: "Hola, queremos saber cómo ha sido tu experiencia con nosotros. ¿Podrías compartir tu opinión?",
    category: "Seguimiento",
  },
]

// Reemplazar las dos funciones de modal (NewConversationModal y NewConversationDialog) con esta versión unificada:

// Modal unificado para nueva conversación
function UnifiedNewConversationModal({ onConversationCreated }: { onConversationCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"new" | "existing">("new")

  // Estados para nuevo contacto
  const [selectedPrefix, setSelectedPrefix] = useState("+34")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [contactName, setContactName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")

  // Estados para contacto existente
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [initialMessage, setInitialMessage] = useState("")

  const [loading, setLoading] = useState(false)
  const { userProfile } = useAuth()

  const organizationId = userProfile?.organization_id
  const organizationIdNumber = organizationId ? Number(organizationId) : undefined
  const { clients, loading: clientsLoading, error: clientsError } = useClients(organizationIdNumber)

  // Hook para conteo total de mensajes no leídos
  const { totalUnread } = useTotalUnreadMessages(organizationIdNumber)

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim() || !selectedTemplate || !contactName.trim()) return

    setLoading(true)
    try {
      // Aquí irá la lógica para crear la conversación con nuevo contacto
      console.log("Crear conversación con nuevo contacto:", {
        name: contactName,
        phone: selectedPrefix + phoneNumber,
        template: selectedTemplate,
      })

      // Simular delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Limpiar formulario y cerrar modal
      resetForm()
      setOpen(false)
      onConversationCreated()
    } catch (error) {
      console.error("Error creating conversation:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitExisting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId || !organizationIdNumber) return

    const selectedClient = clients.find((c) => c.id.toString() === selectedClientId)
    if (!selectedClient) return

    setLoading(true)
    try {
      await createConversation({
        organizationId: organizationIdNumber,
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

      resetForm()
      setOpen(false)
      onConversationCreated()
    } catch (error) {
      console.error("Error creating conversation:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setPhoneNumber("")
    setContactName("")
    setSelectedTemplate("")
    setSelectedClientId("")
    setInitialMessage("")
  }

  const selectedTemplateData = messageTemplates.find((t) => t.id === selectedTemplate)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all duration-200 hover:shadow-md rounded-lg h-9 font-medium">
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Nueva conversación
          </DialogTitle>
        </DialogHeader>

        {/* Pestañas */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "new"
                ? "border-green-500 text-green-600 bg-green-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Phone className="h-4 w-4 inline mr-2" />
            Nuevo contacto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("existing")}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "existing"
                ? "border-green-500 text-green-600 bg-green-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Contacto existente
          </button>
        </div>

        {/* Contenido de la pestaña "Nuevo contacto" */}
        {activeTab === "new" && (
          <form onSubmit={handleSubmitNew} className="space-y-4">
            {/* Nombre del contacto */}
            <div className="space-y-2">
              <Label htmlFor="contactName">Nombre del contacto</Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nombre completo"
                required
              />
            </div>

            {/* Número de teléfono */}
            <div className="space-y-2">
              <Label htmlFor="phone">Número de teléfono</Label>
              <div className="flex gap-2">
                <Select value={selectedPrefix} onValueChange={setSelectedPrefix}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryPrefixes.map((country) => (
                      <SelectItem key={country.code} value={country.prefix}>
                        <div className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.prefix}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Número de teléfono"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                  className="flex-1"
                  required
                />
              </div>
              <p className="text-sm text-gray-500">
                Número completo: {selectedPrefix}
                {phoneNumber}
              </p>
            </div>

            {/* Plantilla de mensaje */}
            <div className="space-y-2">
              <Label htmlFor="template">Plantilla de mensaje</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {messageTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-gray-500">{template.category}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vista previa de la plantilla */}
            {selectedTemplateData && (
              <div className="space-y-2">
                <Label>Vista previa del mensaje</Label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700">{selectedTemplateData.content}</p>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !phoneNumber.trim() || !selectedTemplate || !contactName.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Enviar mensaje
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Contenido de la pestaña "Contacto existente" */}
        {activeTab === "existing" && (
          <form onSubmit={handleSubmitExisting} className="space-y-4">
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedClientId || clientsLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Iniciar conversación
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
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
  const organizationIdNumber = organizationId ? Number(organizationId) : undefined
  const { conversations, loading, error, refetch } = useConversations(organizationId, viewMode)

  // Hook para conteo total de mensajes no leídos
  const { totalUnread } = useTotalUnreadMessages(organizationIdNumber)

  const filteredConversations = conversations
    .filter(
      (conv) =>
        conv.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message?.content.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      // Primero: conversaciones con mensajes no leídos
      if (a.unread_count > 0 && b.unread_count === 0) return -1
      if (a.unread_count === 0 && b.unread_count > 0) return 1

      // Segundo: por fecha del último mensaje
      const aTime = new Date(a.last_message_at || a.updated_at || 0).getTime()
      const bTime = new Date(b.last_message_at || b.updated_at || 0).getTime()
      return bTime - aTime
    })

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
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          Chats
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </h1>
        {/* En el componente principal ChatList, reemplazar las dos llamadas de modal por una sola:
        // Cambiar esta línea en el header: */}
        <div className="flex items-center gap-2">
          <UnifiedNewConversationModal onConversationCreated={refetch} />
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
              className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-all duration-200 ${
                selectedChatId === conversation.id
                  ? "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500 shadow-sm"
                  : conversation.unread_count > 0
                    ? "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500 shadow-sm"
                    : "hover:shadow-sm"
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
                    <div className="ml-2 flex items-center gap-1">
                      <span className="bg-green-500 text-white text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 flex-shrink-0 font-medium">
                        {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                      </span>
                    </div>
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
