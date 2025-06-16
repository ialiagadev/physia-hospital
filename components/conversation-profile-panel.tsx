"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { AssignUsersDialog } from "@/components/assign-users-dialog"
import { Users, UserPlus, StickyNote, X, Bot, UserIcon, Sparkles, Tag } from "lucide-react"
import { useConversationNotes } from "@/hooks/use-conversation-notes"
import { useAssignedUsers } from "@/hooks/use-assigned-users"
import type { Conversation, User } from "@/types/chat"

interface ConversationProfilePanelProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  conversation: Conversation | null
  currentUser: User
  onAssignmentChange: () => void
}

interface ConversationTag {
  id: string
  name: string
  color: string
  isCustom: boolean
}

// Etiquetas predefinidas para conversaciones médicas
const predefinedTags: ConversationTag[] = [
  { id: "1", name: "Consulta General", color: "bg-blue-100 text-blue-800", isCustom: false },
  { id: "2", name: "Urgente", color: "bg-red-100 text-red-800", isCustom: false },
  { id: "3", name: "Seguimiento", color: "bg-green-100 text-green-800", isCustom: false },
  { id: "4", name: "Cita Pendiente", color: "bg-yellow-100 text-yellow-800", isCustom: false },
  { id: "5", name: "Tratamiento", color: "bg-purple-100 text-purple-800", isCustom: false },
  { id: "6", name: "Rehabilitación", color: "bg-indigo-100 text-indigo-800", isCustom: false },
  { id: "7", name: "Dolor Crónico", color: "bg-orange-100 text-orange-800", isCustom: false },
  { id: "8", name: "Primera Consulta", color: "bg-cyan-100 text-cyan-800", isCustom: false },
]

const getChannelIcon = (channel?: string) => {
  const iconClass =
    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold"

  switch (channel) {
    case "whatsapp":
      return <div className={`${iconClass} bg-green-500 text-white`}>W</div>
    case "instagram":
      return (
        <div className={`${iconClass} bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white`}>I</div>
      )
    case "facebook":
      return <div className={`${iconClass} bg-blue-600 text-white`}>F</div>
    case "webchat":
      return <div className={`${iconClass} bg-gray-600 text-white`}>W</div>
    default:
      return null
  }
}

const getAvatarFallback = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const getUserTypeInfo = (user: User) => {
  if (user.type === 2) {
    return {
      label: "Agente IA",
      icon: Bot,
      color: "bg-purple-500",
      badgeColor: "bg-purple-100 text-purple-800",
    }
  }
  return {
    label: "Usuario",
    icon: UserIcon,
    color: "bg-blue-500",
    badgeColor: "bg-blue-100 text-blue-800",
  }
}

export function ConversationProfilePanel({
  isOpen,
  onOpenChange,
  conversation,
  currentUser,
  onAssignmentChange,
}: ConversationProfilePanelProps) {
  const [availableTags, setAvailableTags] = useState<ConversationTag[]>(predefinedTags)
  const [newTagName, setNewTagName] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  // Hook para obtener usuarios asignados REALES
  const {
    users: assignedUsers,
    loading: usersLoading,
    error: usersError,
  } = useAssignedUsers(conversation?.assigned_user_ids)

  // Hook para gestión de notas
  const {
    notes,
    newNote,
    setNewNote,
    isLoading: notesLoading,
    addNote,
    deleteNote,
  } = useConversationNotes(conversation?.id || "")

  // Cargar etiquetas de la conversación
  useEffect(() => {
    if (conversation) {
      const savedTags = localStorage.getItem(`conversation_${conversation.id}_tags`)
      if (savedTags) {
        setSelectedTags(JSON.parse(savedTags))
      } else {
        setSelectedTags([])
      }
    }
  }, [conversation])

  const handleAddTag = () => {
    if (newTagName.trim() && conversation) {
      const newTag: ConversationTag = {
        id: Date.now().toString(),
        name: newTagName.trim(),
        color: "bg-orange-100 text-orange-800",
        isCustom: true,
      }

      setAvailableTags([...availableTags, newTag])
      const newTags = [...selectedTags, newTag.name]
      setSelectedTags(newTags)
      setNewTagName("")

      localStorage.setItem(`conversation_${conversation.id}_tags`, JSON.stringify(newTags))

      toast({
        title: "Etiqueta agregada",
        description: `Se agregó la etiqueta "${newTag.name}" a la conversación`,
      })
    }
  }

  const handleToggleTag = (tagName: string) => {
    if (!conversation) return

    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName]

    setSelectedTags(newTags)
    localStorage.setItem(`conversation_${conversation.id}_tags`, JSON.stringify(newTags))
  }

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({
        title: "Resumen generado",
        description: "El resumen de la conversación ha sido generado exitosamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el resumen",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const handleRemoveUser = (userId: string) => {
    console.log("Removing user:", userId)
    toast({
      title: "Usuario desasignado",
      description: "El usuario ha sido desasignado de la conversación",
    })
    onAssignmentChange()
  }

  const handleAssignmentChangeInternal = () => {
    // Llamar al callback padre para refrescar la conversación
    onAssignmentChange()
  }

  if (!conversation) return null

  const client = conversation.client
  const clientName = client?.name || conversation.title || "Contacto"

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96 overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={client?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-green-500 text-white">{getAvatarFallback(clientName)}</AvatarFallback>
              </Avatar>
              {client?.channel && getChannelIcon(client.channel)}
            </div>
            <div>
              <h3 className="font-medium">{clientName}</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500 font-normal">Chat individual</p>
                {client?.channel && (
                  <Badge variant="outline" className="text-xs">
                    {client.channel}
                  </Badge>
                )}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Sección de Participantes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium">Participantes</h4>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {/* Cliente/Paciente */}
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={client?.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback className="bg-green-500 text-white text-xs">
                      {getAvatarFallback(clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{clientName}</p>
                    <p className="text-xs text-gray-500">Cliente</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Cliente
                </Badge>
              </div>

              {/* Estado de carga de usuarios */}
              {usersLoading && (
                <div className="flex items-center justify-center p-4">
                  <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-sm text-gray-500">Cargando usuarios...</span>
                </div>
              )}

              {/* Error al cargar usuarios */}
              {usersError && <div className="p-2 bg-red-50 text-red-600 rounded-md text-sm">Error: {usersError}</div>}

              {/* Usuarios asignados REALES */}
              {!usersLoading &&
                !usersError &&
                assignedUsers.map((user) => {
                  const userInfo = getUserTypeInfo(user)
                  const IconComponent = userInfo.icon
                  const displayName = user.name || user.email || "Usuario sin nombre"

                  return (
                    <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback className={`${userInfo.color} text-white text-xs`}>
                            <IconComponent className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{displayName}</p>
                          <p className="text-xs text-gray-500">{userInfo.label}</p>
                          {user.type === 2 && user.prompt && (
                            <p className="text-xs text-gray-400 truncate mt-1">{user.prompt.slice(0, 50)}...</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={userInfo.badgeColor}>
                          {userInfo.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleRemoveUser(user.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}

              {/* Mensaje cuando no hay usuarios asignados */}
              {!usersLoading && !usersError && assignedUsers.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No hay usuarios asignados a esta conversación
                </div>
              )}
            </div>

            {/* Botón para añadir participantes */}
            <div className="mt-2">
              <AssignUsersDialog
                conversationId={conversation.id}
                assignedUserIds={conversation.assigned_user_ids || []}
                onAssignmentChange={handleAssignmentChangeInternal}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Añadir participante
                  </Button>
                }
              />
            </div>
          </div>

          {/* Sección de Notas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium">Notas</h4>
            </div>
            <div className="space-y-2">
              <Textarea
                rows={3}
                className="resize-none"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Agregar una nota sobre esta conversación..."
                disabled={notesLoading}
              />
              <Button size="sm" className="w-full" disabled={!newNote.trim() || notesLoading} onClick={addNote}>
                {notesLoading ? "Guardando..." : "Guardar Nota"}
              </Button>

              {notes.length > 0 && (
                <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                  {notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="p-2 bg-gray-50 rounded text-xs relative group">
                      <p className="text-gray-800 pr-6">{note.content}</p>
                      <p className="text-gray-500 mt-1">{note.timestamp}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteNote(note.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {notes.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">+{notes.length - 3} notas más</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sección de Resumen IA */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h4 className="font-medium">Resumen IA</h4>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
              {isGeneratingSummary ? (
                <>
                  <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Generando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generar Resumen
                </>
              )}
            </Button>
          </div>

          {/* Sección de Etiquetas */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-5 h-5 text-green-600" />
              <h4 className="font-medium">Etiquetas</h4>
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTags.map((tagName) => {
                  const tag = availableTags.find((t) => t.name === tagName)
                  return (
                    <Badge
                      key={tagName}
                      variant="secondary"
                      className={`text-xs ${tag?.color || "bg-gray-100 text-gray-800"} cursor-pointer`}
                      onClick={() => handleToggleTag(tagName)}
                    >
                      {tagName}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Nueva etiqueta..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="text-sm"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddTag()
                  }
                }}
              />
              <Button size="sm" onClick={handleAddTag} disabled={!newTagName.trim()}>
                <Tag className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Etiquetas disponibles:</p>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {availableTags
                  .filter((tag) => !selectedTags.includes(tag.name))
                  .map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-gray-50"
                      onClick={() => handleToggleTag(tag.name)}
                    >
                      {tag.name}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
