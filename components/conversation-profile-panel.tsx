"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { AssignUsersDialog } from "@/components/assign-users-dialog"
import { Users, UserPlus, StickyNote, X, Bot, UserIcon, Sparkles, Tag, Copy, Download, FileText } from "lucide-react"
import { useAssignedUsers } from "@/hooks/use-assigned-users"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import type { Conversation, User, ConversationNote } from "@/types/chat"
import { DynamicTagBadge } from "@/components/dynamic-tag-badge"

interface ConversationProfilePanelProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  conversation: Conversation | null
  currentUser: User
  onAssignmentChange: () => void
  onTagsChange?: () => void
}

interface ConversationTagWithDetails {
  id: string
  tag_id: string
  tag_name: string
  color: string
  created_at: string
}

const predefinedTags = [
  { name: "Consulta General", color: "#3B82F6" },
  { name: "Urgente", color: "#EF4444" },
  { name: "Seguimiento", color: "#10B981" },
  { name: "Cita Pendiente", color: "#F59E0B" },
  { name: "Tratamiento", color: "#8B5CF6" },
  { name: "Rehabilitación", color: "#6366F1" },
  { name: "Dolor Crónico", color: "#F97316" },
  { name: "Primera Consulta", color: "#06B6D4" },
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

const adaptAssignedUserToUser = (assignedUser: any): User => {
  return {
    ...assignedUser,
    avatar_url: assignedUser.avatar_url || undefined,
  }
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

const formatTime = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch (error) {
    return dateStr
  }
}

export function ConversationProfilePanel({
  isOpen,
  onOpenChange,
  conversation,
  currentUser,
  onAssignmentChange,
  onTagsChange,
}: ConversationProfilePanelProps) {
  const [newTagName, setNewTagName] = useState("")
  const [selectedTags, setSelectedTags] = useState<ConversationTagWithDetails[]>([])
  const [availableOrgTags, setAvailableOrgTags] = useState<any[]>([])
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [tagsLoading, setTagsLoading] = useState(false)
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])
  const [conversationSummary, setConversationSummary] = useState<string>("")
  const [summaryStats, setSummaryStats] = useState<any>(null)
  const [showSummaryModal, setShowSummaryModal] = useState(false)

  // Estados para notas
  const [notes, setNotes] = useState<ConversationNote[]>([])
  const [newNote, setNewNote] = useState("")
  const [notesLoading, setNotesLoading] = useState(false)

  const { userProfile } = useAuth()

  const { users: assignedUsersRaw, loading: usersLoading, error: usersError } = useAssignedUsers(conversation?.id || "")

  const assignedUsers: User[] = assignedUsersRaw.map(adaptAssignedUserToUser)

  // Cargar datos cuando cambia la conversación
  useEffect(() => {
    if (conversation?.id) {
      loadConversationTags()
      loadConversationNotes()
      loadAvailableOrgTags()
      loadAssignedUserIds()
    }
  }, [conversation?.id])

  const loadAssignedUserIds = async () => {
    if (!conversation?.id) return

    try {
      const { data, error } = await supabase
        .from("users_conversations")
        .select("user_id")
        .eq("conversation_id", conversation.id)

      if (error) throw error

      const userIds = data?.map((item) => item.user_id) || []
      setAssignedUserIds(userIds)
    } catch (error) {
      console.error("Error loading assigned user IDs:", error)
    }
  }

  const loadConversationTags = async () => {
    if (!conversation?.id) return

    setTagsLoading(true)
    try {
      const { data, error } = await supabase
        .from("conversation_tags_view")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("assigned_at", { ascending: false })

      if (error) throw error

      const tagsWithDetails: ConversationTagWithDetails[] = (data || []).map((item) => ({
        id: item.assignment_id,
        tag_id: item.tag_id,
        tag_name: item.tag_name,
        color: item.color,
        created_at: item.assigned_at,
      }))

      setSelectedTags(tagsWithDetails)
    } catch (error) {
      console.error("Error loading tags:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las etiquetas",
        variant: "destructive",
      })
    } finally {
      setTagsLoading(false)
    }
  }

  const loadAvailableOrgTags = async () => {
    if (!userProfile?.organization_id) return

    try {
      const { data, error } = await supabase
        .from("organization_tags")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("tag_name", { ascending: true })

      if (error) throw error

      setAvailableOrgTags(data || [])
    } catch (error) {
      console.error("Error loading organization tags:", error)
    }
  }

  const loadConversationNotes = async () => {
    if (!conversation?.id) return

    setNotesLoading(true)
    try {
      const { data, error } = await supabase
        .from("conversation_notes")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setNotes(data || [])
    } catch (error) {
      console.error("Error loading notes:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las notas",
        variant: "destructive",
      })
    } finally {
      setNotesLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim() || !conversation?.id) return

    const noteContent = newNote.trim()

    setNotesLoading(true)
    try {
      const { data, error } = await supabase
        .from("conversation_notes")
        .insert({
          conversation_id: conversation.id,
          content: noteContent,
          created_by: currentUser.id,
        })
        .select("*")
        .single()

      if (error) throw error

      setNotes((prev) => [data, ...prev])
      setNewNote("")

      toast({
        title: "Nota guardada",
        description: "La nota se ha guardado correctamente",
      })
    } catch (error) {
      console.error("Error adding note:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la nota",
        variant: "destructive",
      })
    } finally {
      setNotesLoading(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    setNotesLoading(true)
    try {
      const { error } = await supabase.from("conversation_notes").delete().eq("id", noteId)

      if (error) throw error

      setNotes((prev) => prev.filter((note) => note.id !== noteId))

      toast({
        title: "Nota eliminada",
        description: "La nota se ha eliminado correctamente",
      })
    } catch (error) {
      console.error("Error deleting note:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la nota",
        variant: "destructive",
      })
    } finally {
      setNotesLoading(false)
    }
  }

  const handleAddTag = async () => {
    if (!newTagName.trim() || !conversation?.id || !userProfile?.organization_id) return

    const tagName = newTagName.trim()

    if (selectedTags.some((tag) => tag.tag_name === tagName)) {
      toast({
        title: "Etiqueta duplicada",
        description: "Esta etiqueta ya existe en la conversación",
        variant: "destructive",
      })
      return
    }

    setTagsLoading(true)
    try {
      let orgTag = availableOrgTags.find((tag) => tag.tag_name === tagName)

      if (!orgTag) {
        const { data: newOrgTag, error: orgError } = await supabase
          .from("organization_tags")
          .insert({
            organization_id: userProfile.organization_id,
            tag_name: tagName,
            color: "#8B5CF6",
            created_by: currentUser.id,
          })
          .select()
          .single()

        if (orgError) throw orgError
        orgTag = newOrgTag
        setAvailableOrgTags((prev) => [...prev, orgTag])
      }

      const { data: existing, error: checkError } = await supabase
        .from("conversation_tags")
        .select("id")
        .eq("tag_id", orgTag.id)
        .eq("conversation_id", conversation.id)
        .eq("organization_id", userProfile.organization_id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existing) {
        toast({
          title: "Etiqueta duplicada",
          description: "Esta etiqueta ya existe en la conversación",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase
        .from("conversation_tags")
        .insert({
          tag_id: orgTag.id,
          conversation_id: conversation.id,
          organization_id: userProfile.organization_id,
          created_by: currentUser.id,
        })
        .select()
        .single()

      if (error) throw error

      const newTagWithDetails: ConversationTagWithDetails = {
        id: data.id,
        tag_id: orgTag.id,
        tag_name: orgTag.tag_name,
        color: orgTag.color,
        created_at: data.created_at,
      }

      setSelectedTags((prev) => [newTagWithDetails, ...prev])
      setNewTagName("")

      if (onTagsChange) {
        onTagsChange()
      }

      toast({
        title: "Etiqueta agregada",
        description: `Se agregó la etiqueta "${tagName}" a la conversación`,
      })
    } catch (error) {
      console.error("Error adding tag:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar la etiqueta",
        variant: "destructive",
      })
    } finally {
      setTagsLoading(false)
    }
  }

  const handleAddPredefinedTag = async (tagName: string) => {
    if (!conversation?.id || !userProfile?.organization_id) return

    if (selectedTags.some((tag) => tag.tag_name === tagName)) {
      toast({
        title: "Etiqueta duplicada",
        description: "Esta etiqueta ya existe en la conversación",
        variant: "destructive",
      })
      return
    }

    setTagsLoading(true)
    try {
      let orgTag = availableOrgTags.find((tag) => tag.tag_name === tagName)

      if (!orgTag) {
        const predefinedTag = predefinedTags.find((t) => t.name === tagName)
        const tagColor = predefinedTag?.color || "#8B5CF6"

        const { data: newOrgTag, error: orgError } = await supabase
          .from("organization_tags")
          .insert({
            organization_id: userProfile.organization_id,
            tag_name: tagName,
            color: tagColor,
            created_by: currentUser.id,
          })
          .select()
          .single()

        if (orgError) throw orgError
        orgTag = newOrgTag
        setAvailableOrgTags((prev) => [...prev, orgTag])
      }

      const { data: existing, error: checkError } = await supabase
        .from("conversation_tags")
        .select("id")
        .eq("tag_id", orgTag.id)
        .eq("organization_id", userProfile.organization_id)
        .eq("conversation_id", conversation.id)
        .maybeSingle()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existing) {
        toast({
          title: "Etiqueta duplicada",
          description: "Esta etiqueta ya existe en la conversación",
          variant: "destructive",
        })
        return
      }

      const { data, error } = await supabase
        .from("conversation_tags")
        .insert({
          tag_id: orgTag.id,
          conversation_id: conversation.id,
          organization_id: userProfile.organization_id,
          created_by: currentUser.id,
        })
        .select()
        .single()

      if (error) throw error

      const newTagWithDetails: ConversationTagWithDetails = {
        id: data.id,
        tag_id: orgTag.id,
        tag_name: orgTag.tag_name,
        color: orgTag.color,
        created_at: data.created_at,
      }

      setSelectedTags((prev) => [newTagWithDetails, ...prev])

      if (onTagsChange) {
        onTagsChange()
      }

      toast({
        title: "Etiqueta agregada",
        description: `Se agregó la etiqueta "${tagName}" a la conversación`,
      })
    } catch (error) {
      console.error("Error adding predefined tag:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar la etiqueta",
        variant: "destructive",
      })
    } finally {
      setTagsLoading(false)
    }
  }

  const handleRemoveTag = async (assignmentId: string) => {
    setTagsLoading(true)
    try {
      const { error } = await supabase.from("conversation_tags").delete().eq("id", assignmentId)

      if (error) throw error

      setSelectedTags((prev) => prev.filter((tag) => tag.id !== assignmentId))

      if (onTagsChange) {
        onTagsChange()
      }

      toast({
        title: "Etiqueta eliminada",
        description: "La etiqueta ha sido eliminada de la conversación",
      })
    } catch (error) {
      console.error("Error removing tag:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la etiqueta",
        variant: "destructive",
      })
    } finally {
      setTagsLoading(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (!conversation?.id || !userProfile?.organization_id) return

    setIsGeneratingSummary(true)
    try {
      console.log("Generando resumen para conversación:", conversation.id)

      const response = await fetch("/api/generate-conversation-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          organizationId: userProfile.organization_id,
        }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log("API Result:", result)

      if (!result.success) {
        throw new Error(result.error || "Error al generar resumen")
      }

      setConversationSummary(result.summary)
      setSummaryStats(result.statistics)
      setShowSummaryModal(true)

      toast({
        title: "Resumen generado",
        description: "El resumen de la conversación se ha generado correctamente",
      })
    } catch (error) {
      console.error("Error generando resumen:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el resumen",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const handleCopySummary = () => {
    if (conversationSummary) {
      navigator.clipboard.writeText(conversationSummary)
      toast({
        title: "Copiado",
        description: "El resumen ha sido copiado al portapapeles",
      })
    }
  }

  const handleDownloadSummary = () => {
    if (conversationSummary && summaryStats) {
      const content = `RESUMEN DE CONVERSACIÓN
Cliente: ${summaryStats.clientName}
Fecha: ${summaryStats.conversationDate}
Duración: ${summaryStats.durationMinutes} minutos
Total mensajes: ${summaryStats.totalMessages}
Mensajes analizados: ${summaryStats.analyzedMessages}

${conversationSummary}`

      const blob = new Blob([content], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `resumen-${summaryStats.clientName}-${summaryStats.conversationDate}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Descargado",
        description: "El resumen ha sido descargado como archivo de texto",
      })
    }
  }

  const handleRemoveUser = (userId: string) => {
    toast({
      title: "Usuario desasignado",
      description: "El usuario ha sido desasignado de la conversación",
    })
    onAssignmentChange()
  }

  const handleAssignmentChangeInternal = () => {
    loadAssignedUserIds()
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
                onAssignmentChange={handleAssignmentChangeInternal}
                trigger={
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
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
              <Button size="sm" className="w-full" disabled={!newNote.trim() || notesLoading} onClick={handleAddNote}>
                {notesLoading ? "Guardando..." : "Guardar Nota"}
              </Button>

              {notes.length > 0 && (
                <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
                  {notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="p-2 bg-gray-50 rounded text-xs relative group">
                      <p className="text-gray-800 pr-6">{note.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-gray-500">{formatTime(note.created_at)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <X className="w-3 h-3" />
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
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleGenerateSummary}
              disabled={isGeneratingSummary}
            >
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
              <h4 className="font-medium">Etiquetas de Conversación</h4>
            </div>

            {/* Etiquetas seleccionadas */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedTags.map((tag) => (
                  <DynamicTagBadge
                    key={tag.id}
                    tagName={tag.tag_name}
                    color={tag.color}
                    className="text-xs rounded-xl font-medium cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm"
                    onClick={() => handleRemoveTag(tag.id)}
                  >
                    <X className="w-3 h-3 ml-1" />
                  </DynamicTagBadge>
                ))}
              </div>
            )}

            {/* Input para nueva etiqueta */}
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Nueva etiqueta..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="text-sm"
                disabled={tagsLoading}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddTag()
                  }
                }}
              />
              <Button size="sm" onClick={handleAddTag} disabled={!newTagName.trim() || tagsLoading}>
                {tagsLoading ? (
                  <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Tag className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Etiquetas predefinidas disponibles */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Etiquetas disponibles:</p>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {availableOrgTags
                  .filter((orgTag) => !selectedTags.some((tag) => tag.tag_id === orgTag.id))
                  .map((orgTag) => (
                    <DynamicTagBadge
                      key={orgTag.id}
                      tagName={orgTag.tag_name}
                      color={orgTag.color}
                      className="text-xs cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm rounded-lg font-medium border-2 border-transparent hover:border-gray-200"
                      onClick={() => handleAddPredefinedTag(orgTag.tag_name)}
                    />
                  ))}

                {predefinedTags
                  .filter(
                    (predefinedTag) =>
                      !availableOrgTags.some((orgTag) => orgTag.tag_name === predefinedTag.name) &&
                      !selectedTags.some((tag) => tag.tag_name === predefinedTag.name),
                  )
                  .map((predefinedTag) => (
                    <DynamicTagBadge
                      key={predefinedTag.name}
                      tagName={predefinedTag.name}
                      color={predefinedTag.color}
                      className="text-xs cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm rounded-lg font-medium border-2 border-transparent hover:border-gray-200 opacity-75"
                      onClick={() => handleAddPredefinedTag(predefinedTag.name)}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Resumen IA - Idéntico al del conversation-window */}
        {showSummaryModal && conversationSummary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header con gradiente */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 sm:p-6 text-white flex-shrink-0">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-white bg-opacity-20 rounded-lg flex-shrink-0">
                      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg sm:text-xl font-semibold truncate">Resumen de Conversación</h3>
                      <p className="text-purple-100 text-sm">Generado con IA</p>
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopySummary}
                      className="text-white hover:bg-white hover:bg-opacity-20 h-8 w-8 sm:h-10 sm:w-10"
                      title="Copiar resumen"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownloadSummary}
                      className="text-white hover:bg-white hover:bg-opacity-20 h-8 w-8 sm:h-10 sm:w-10"
                      title="Descargar resumen"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSummaryModal(false)}
                      className="text-white hover:bg-white hover:bg-opacity-20 h-8 w-8 sm:h-10 sm:w-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Contenido del modal */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                {/* Estadísticas con cards coloridas */}
                {summaryStats && (
                  <div className="mb-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200">
                        <div className="text-blue-600 text-xs sm:text-sm font-medium">Cliente</div>
                        <div
                          className="text-blue-900 font-semibold text-sm sm:text-base truncate"
                          title={summaryStats.clientName}
                        >
                          {summaryStats.clientName}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-4 rounded-lg border border-green-200">
                        <div className="text-green-600 text-xs sm:text-sm font-medium">Fecha</div>
                        <div className="text-green-900 font-semibold text-sm sm:text-base">
                          {summaryStats.conversationDate}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 sm:p-4 rounded-lg border border-orange-200">
                        <div className="text-orange-600 text-xs sm:text-sm font-medium">Duración</div>
                        <div className="text-orange-900 font-semibold text-sm sm:text-base">
                          {summaryStats.durationMinutes} min
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 rounded-lg border border-purple-200">
                        <div className="text-purple-600 text-xs sm:text-sm font-medium">Mensajes</div>
                        <div className="text-purple-900 font-semibold text-sm sm:text-base">
                          {summaryStats.totalMessages}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumen con diseño mejorado */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 border border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-800">Resumen Detallado</h4>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <div
                      className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base"
                      style={{
                        lineHeight: "1.6",
                      }}
                    >
                      {
                        conversationSummary
                          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove **bold**
                          .replace(/\*(.*?)\*/g, "$1") // Remove *italic*
                          .replace(/_(.*?)_/g, "$1") // Remove _underline_
                          .replace(/`(.*?)`/g, "$1") // Remove `code`
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer con botones */}
              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCopySummary}
                    className="border-purple-200 text-purple-700 hover:bg-purple-50 bg-transparent w-full sm:w-auto"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadSummary}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 bg-transparent w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                  <Button
                    onClick={() => setShowSummaryModal(false)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 w-full sm:w-auto"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
