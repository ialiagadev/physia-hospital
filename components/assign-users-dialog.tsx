"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Users, User, Bot } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { useOrganizationUsers } from "@/hooks/use-organization-users"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"

interface AssignUsersDialogProps {
  conversationId: string
  assignedUserIds: string[]
  onAssignmentChange?: () => void
  trigger?: React.ReactNode
}

export function AssignUsersDialog({
  conversationId,
  assignedUserIds = [],
  onAssignmentChange,
  trigger,
}: AssignUsersDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(assignedUserIds || [])
  const [saving, setSaving] = useState(false)
  const { userProfile } = useAuth()

  const { users, loading, error } = useOrganizationUsers(userProfile?.organization_id?.toString())

  useEffect(() => {
    setSelectedUserIds(assignedUserIds || [])
  }, [assignedUserIds])

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleSave = async () => {
    if (!userProfile?.id) return

    try {
      setSaving(true)

      // Determinar qué usuarios fueron añadidos y cuáles removidos
      const previousIds = new Set(assignedUserIds)
      const newIds = new Set(selectedUserIds)

      const addedUsers = selectedUserIds.filter((id) => !previousIds.has(id))
      const removedUsers = assignedUserIds.filter((id) => !newIds.has(id))

      // Eliminar asignaciones existentes que ya no están seleccionadas
      if (removedUsers.length > 0) {
        const { error: deleteError } = await supabase
          .from("users_conversations")
          .delete()
          .eq("conversation_id", conversationId)
          .in("user_id", removedUsers)

        if (deleteError) {
          console.error("Error eliminando asignaciones:", deleteError)
          throw deleteError
        }
      }

      // Añadir nuevas asignaciones
      if (addedUsers.length > 0) {
        const newAssignments = addedUsers.map(userId => ({
          conversation_id: conversationId,
          user_id: userId
        }))

        const { error: insertError } = await supabase
          .from("users_conversations")
          .insert(newAssignments)

        if (insertError) {
          console.error("Error añadiendo asignaciones:", insertError)
          throw insertError
        }
      }

      onAssignmentChange?.()
      setOpen(false)
    } catch (err) {
      console.error("Error inesperado:", err)
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
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          ) : error ? (
            <div className="text-center p-4 text-red-500">
              <p>Error al cargar usuarios</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              <p>No hay usuarios disponibles</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-3">
                Selecciona los usuarios que pueden ver y responder esta conversación:
              </div>
              <div className="max-h-80 overflow-y-auto space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100"
                    onClick={() => handleUserToggle(user.id)}
                  >
                    <Checkbox checked={selectedUserIds.includes(user.id)} onChange={() => handleUserToggle(user.id)} />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name || user.email} />
                      <AvatarFallback>{getUserTypeIcon(user.type)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                        {getUserTypeBadge(user.type)}
                      </div>
                      {user.name && <p className="text-xs text-gray-500 truncate">{user.email}</p>}
                      {user.type === 2 && user.prompt && (
                        <p className="text-xs text-blue-600 truncate mt-1">Prompt: {user.prompt.substring(0, 50)}...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <strong>Usuarios seleccionados:</strong> {selectedUserIds.length}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
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

// Export por defecto para compatibilidad
export default AssignUsersDialog
