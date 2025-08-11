"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Users, User, Bot, Check } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useOrganizationUsers } from "@/hooks/use-organization-users"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

interface AssignUsersDialogProps {
  conversationId: string
  onAssignmentChange?: () => void
  trigger?: React.ReactNode
}

export function AssignUsersDialog({ conversationId, onAssignmentChange, trigger }: AssignUsersDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const { userProfile } = useAuth()
  const { users, loading, error } = useOrganizationUsers(userProfile?.organization_id?.toString())

  // Cargar usuarios ya asignados cuando se abre el modal
  const loadAssignedUsers = async () => {
    if (!conversationId) return

    try {
      setLoadingAssignments(true)
      const { data, error } = await supabase
        .from("users_conversations")
        .select("user_id")
        .eq("conversation_id", conversationId)

      if (error) {
        console.error("Error loading assigned users:", error)
        return
      }

      const assignedIds = data?.map((item) => item.user_id) || []
      setAssignedUserIds(assignedIds)
      setSelectedUserIds(assignedIds)
    } catch (err) {
      console.error("Error loading assigned users:", err)
    } finally {
      setLoadingAssignments(false)
    }
  }

  // Cargar usuarios asignados cuando se abre el modal
  useEffect(() => {
    if (open) {
      loadAssignedUsers()
    }
  }, [open, conversationId])

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const getAssignmentChanges = () => {
    const originalSet = new Set(assignedUserIds)
    const newSet = new Set(selectedUserIds)

    const toAssign = selectedUserIds.filter((id) => !originalSet.has(id))
    const toUnassign = assignedUserIds.filter((id) => !newSet.has(id))

    return { toAssign, toUnassign }
  }

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    return user?.name || user?.email || "Usuario desconocido"
  }

  const getUserType = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    return user?.type === 2 ? "Agente IA" : "Usuario"
  }

  const createSystemMessage = async (content: string) => {
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_type: "system",
        message_type: "system",
        content: content,
        user_id: null,
        is_read: false,
      })

      if (error) {
        console.error("Error creating system message:", error)
      }
    } catch (err) {
      console.error("Error creating system message:", err)
    }
  }

  const handleSave = async () => {
    if (!userProfile?.id) return

    const { toAssign, toUnassign } = getAssignmentChanges()

    // Si no hay cambios, cerrar modal
    if (toAssign.length === 0 && toUnassign.length === 0) {
      setOpen(false)
      return
    }

    try {
      setSaving(true)

      // Asignar nuevos usuarios
      if (toAssign.length > 0) {
        const newAssignments = toAssign.map((userId) => ({
          conversation_id: conversationId,
          user_id: userId,
        }))

        const { error: insertError } = await supabase.from("users_conversations").insert(newAssignments)

        if (insertError) {
          throw insertError
        }

        // Crear mensaje del sistema para usuarios asignados
        const assignedDetails = toAssign.map((userId) => {
          const name = getUserName(userId)
          const type = getUserType(userId)
          return `${name} (${type})`
        })

        const assignedMessage =
          toAssign.length === 1
            ? `✅ ${assignedDetails[0]} ha sido asignado a la conversación`
            : `✅ Los siguientes usuarios han sido asignados a la conversación: ${assignedDetails.join(", ")}`

        await createSystemMessage(assignedMessage)
      }

      // Desasignar usuarios
      if (toUnassign.length > 0) {
        const { error: deleteError } = await supabase
          .from("users_conversations")
          .delete()
          .eq("conversation_id", conversationId)
          .in("user_id", toUnassign)

        if (deleteError) {
          throw deleteError
        }

        // Crear mensaje del sistema para usuarios desasignados
        const unassignedDetails = toUnassign.map((userId) => {
          const name = getUserName(userId)
          const type = getUserType(userId)
          return `${name} (${type})`
        })

        const unassignedMessage =
          toUnassign.length === 1
            ? `❌ ${unassignedDetails[0]} ha sido desasignado de la conversación`
            : `❌ Los siguientes usuarios han sido desasignados de la conversación: ${unassignedDetails.join(", ")}`

        await createSystemMessage(unassignedMessage)
      }

      // Mostrar toast de éxito
      if (toAssign.length > 0 && toUnassign.length > 0) {
        toast({
          title: "✅ Asignaciones actualizadas",
          description: `Se asignaron ${toAssign.length} y se desasignaron ${toUnassign.length} usuarios`,
        })
      } else if (toAssign.length > 0) {
        toast({
          title: "✅ Usuarios asignados",
          description: `${toAssign.map(getUserName).join(", ")} ${toAssign.length === 1 ? "ha sido asignado" : "han sido asignados"}`,
        })
      } else if (toUnassign.length > 0) {
        toast({
          title: "❌ Usuarios desasignados",
          description: `${toUnassign.map(getUserName).join(", ")} ${toUnassign.length === 1 ? "ha sido desasignado" : "han sido desasignados"}`,
        })
      }

      onAssignmentChange?.()
      setOpen(false)
    } catch (err: any) {
      toast({
        title: "Error al actualizar asignaciones",
        description: err.message || "No se pudieron actualizar las asignaciones de usuarios",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getUserTypeIcon = (userType?: number | null) => {
    if (userType === 2) {
      return <Bot className="h-3 w-3" />
    }
    return <User className="h-3 w-3" />
  }

  const getUserTypeBadge = (userType?: number | null) => {
    if (userType === 2) {
      return (
        <Badge variant="secondary" className="text-xs">
          Agente IA
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-xs">
        Usuario
      </Badge>
    )
  }

  // Filtrar usuarios de tipo 1 y 2 solamente
  const filteredUsers = users.filter((user) => user.type === 1 || user.type === 2)

  // Trigger por defecto si no se proporciona uno personalizado
  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Asignar usuarios">
      <Users className="h-4 w-4" />
      <span className="sr-only">Asignar usuarios</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Asignar usuarios a la conversación
          </DialogTitle>
          <DialogDescription>
            Selecciona los usuarios que pueden ver y responder esta conversación. Los cambios aparecerán como mensajes
            del sistema en la conversación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading || loadingAssignments ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          ) : error ? (
            <div className="text-center p-4 text-red-500">
              <p>Error al cargar usuarios</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              <p>No hay usuarios disponibles</p>
              <p className="text-xs">Solo se muestran usuarios de tipo 1 y 2</p>
            </div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto space-y-2">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id)
                  const isCurrentlyAssigned = assignedUserIds.includes(user.id)

                  return (
                    <div
                      key={user.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                        isSelected
                          ? "bg-green-50 border-green-200 hover:bg-green-100"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                      onClick={() => handleUserToggle(user.id)}
                    >
                      <div className="relative">
                        <Checkbox checked={isSelected} onChange={() => handleUserToggle(user.id)} />
                        {isSelected && <Check className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />}
                      </div>

                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} alt={user.name || user.email} />
                        <AvatarFallback>{getUserTypeIcon(user.type)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                          {getUserTypeBadge(user.type)}
                          {isCurrentlyAssigned && (
                            <Badge variant="default" className="text-xs bg-blue-600">
                              Ya asignado
                            </Badge>
                          )}
                        </div>
                        {user.name && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
                        {user.type === 2 && user.prompt && (
                          <p className="text-xs text-blue-600 truncate mt-1">
                            Prompt: {user.prompt.substring(0, 50)}...
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <div className="flex justify-between">
                  <span>
                    <strong>Usuarios disponibles:</strong> {filteredUsers.length}
                  </span>
                  <span>
                    <strong>Seleccionados:</strong> {selectedUserIds.length}
                  </span>
                </div>
                {assignedUserIds.length > 0 && (
                  <div className="mt-1 text-blue-600">
                    <strong>Ya asignados:</strong> {assignedUserIds.map(getUserName).join(", ")}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading || loadingAssignments} className="min-w-[140px]">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                "Guardar asignación"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AssignUsersDialog
