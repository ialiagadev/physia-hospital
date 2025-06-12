"use client"

import { useState, useEffect } from "react"
import { Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useOrganizationUsers } from "@/hooks/use-organization-users"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"

interface AssignUsersDialogProps {
  conversationId: string
  assignedUserIds: string[]
}

export function AssignUsersDialog({ conversationId, assignedUserIds = [] }: AssignUsersDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(assignedUserIds || [])
  const [saving, setSaving] = useState(false)
  const { userProfile } = useAuth()

  // Cargar usuarios de la organización
  const { users, loading } = useOrganizationUsers(userProfile?.organization_id)

  // Actualizar selección cuando cambien los usuarios asignados
  useEffect(() => {
    setSelectedUserIds(assignedUserIds || [])
  }, [assignedUserIds])

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Actualizar la conversación con los usuarios seleccionados
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_user_ids: selectedUserIds })
        .eq("id", conversationId)

      if (error) {
        console.error("Error al asignar usuarios:", error)
        return
      }

      setOpen(false)
    } catch (err) {
      console.error("Error inesperado:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Users className="h-4 w-4" />
          <span className="sr-only">Asignar usuarios</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Usuarios asignados</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleUserToggle(user.id)}
                >
                  <Checkbox checked={selectedUserIds.includes(user.id)} />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.name || user.email} />
                    <AvatarFallback>{(user.name || user.email).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.name || user.email}</p>
                    {user.name && <p className="text-xs text-gray-500">{user.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
