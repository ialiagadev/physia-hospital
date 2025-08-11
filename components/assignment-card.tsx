"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Users, Plus, X, MessageCircle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface UserAssignment {
  waba_id: number
  user_id: string
  user: User
}

interface AssignmentCardProps {
  waba: {
    id: number
    numero: string
    nombre: string
    descripcion?: string
  }
  organizationId: number
  onAssignmentsChange: () => void
}

// Función para obtener usuarios de la organización
const getOrganizationUsers = async (organizationId: number): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("organization_id", organizationId)
      .in("type", [1, 2])
      .order("name")

    if (error) {
      console.error("❌ Error fetching users:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("💥 Error inesperado obteniendo usuarios:", error)
    return []
  }
}

// Función para obtener asignaciones de usuarios
const getUserAssignments = async (wabaId: number): Promise<UserAssignment[]> => {
  try {
    const { data, error } = await supabase
      .from("users_waba")
      .select(`
        waba_id,
        user_id,
        users:user_id (
          id,
          name,
          email,
          role
        )
      `)
      .eq("waba_id", wabaId)

    if (error) {
      console.error("❌ Error fetching user assignments:", error)
      return []
    }

    // Transform the data to match our interface
    const transformedData: UserAssignment[] = (data || [])
      .filter((item) => item.users)
      .map((item) => ({
        waba_id: item.waba_id,
        user_id: item.user_id,
        user: Array.isArray(item.users) ? item.users[0] : item.users,
      }))

    return transformedData
  } catch (error) {
    console.error("💥 Error inesperado obteniendo asignaciones:", error)
    return []
  }
}

export function AssignmentCard({ waba, organizationId, onAssignmentsChange }: AssignmentCardProps) {
  const [assignments, setAssignments] = useState<UserAssignment[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Cargar datos iniciales
  useEffect(() => {
    loadAssignments()
  }, [waba.id, organizationId])

  const loadAssignments = async () => {
    setLoading(true)
    try {
      const [assignmentsData, usersData] = await Promise.all([
        getUserAssignments(waba.id),
        getOrganizationUsers(organizationId),
      ])

      setAssignments(assignmentsData)
      setAllUsers(usersData)

      // Establecer usuarios seleccionados
      const assignedUserIds = assignmentsData.map((a) => a.user_id)
      setSelectedUsers(assignedUserIds)
    } catch (error) {
      console.error("Error loading assignments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    // Restaurar selección original
    const assignedUserIds = assignments.map((a) => a.user_id)
    setSelectedUsers(assignedUserIds)
  }

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Obtener asignaciones actuales
      const currentAssignedIds = assignments.map((a) => a.user_id)

      // Usuarios a agregar
      const usersToAdd = selectedUsers.filter((userId) => !currentAssignedIds.includes(userId))

      // Usuarios a remover
      const usersToRemove = currentAssignedIds.filter((userId) => !selectedUsers.includes(userId))

      // Agregar nuevas asignaciones
      if (usersToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("users_waba")
          .insert(usersToAdd.map((userId) => ({ waba_id: waba.id, user_id: userId })))

        if (insertError) {
          throw insertError
        }
      }

      // Remover asignaciones
      if (usersToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("users_waba")
          .delete()
          .eq("waba_id", waba.id)
          .in("user_id", usersToRemove)

        if (deleteError) {
          throw deleteError
        }
      }

      // Recargar asignaciones
      await loadAssignments()
      onAssignmentsChange()

      toast({
        title: "Asignaciones actualizadas",
        description: `Usuarios asignados correctamente a ${waba.nombre}`,
      })

      setIsModalOpen(false)
    } catch (error) {
      console.error("Error saving assignments:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar las asignaciones",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    try {
      const { error } = await supabase.from("users_waba").delete().eq("waba_id", waba.id).eq("user_id", userId)

      if (error) {
        throw error
      }

      // Recargar asignaciones
      await loadAssignments()
      onAssignmentsChange()

      toast({
        title: "Usuario removido",
        description: "El usuario ha sido removido de las asignaciones",
      })
    } catch (error) {
      console.error("Error removing user:", error)
      toast({
        title: "Error",
        description: "No se pudo remover el usuario",
        variant: "destructive",
      })
    }
  }

  const getInitials = (name: string) => {
    if (!name) return "??"

    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{waba.nombre}</CardTitle>
                <p className="text-sm text-gray-600 font-mono">{waba.numero}</p>
              </div>
            </div>
            <Button onClick={handleOpenModal} size="sm" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Gestionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-blue-600"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-4">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Sin usuarios asignados</p>
              <Button onClick={handleOpenModal} size="sm" variant="ghost" className="mt-2">
                <Plus className="h-4 w-4 mr-1" />
                Asignar usuarios
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Usuarios asignados ({assignments.length})</p>
              </div>
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div key={assignment.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          {getInitials(assignment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{assignment.user.name}</p>
                        <p className="text-xs text-gray-500">{assignment.user.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRemoveUser(assignment.user_id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de asignación */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Usuarios</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Selecciona los usuarios para: {waba.nombre} ({waba.numero})
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {allUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No hay usuarios disponibles para asignar</p>
              ) : (
                allUsers.map((user) => (
                  <div key={user.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleUserToggle(user.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Label htmlFor={user.id} className="text-sm font-medium cursor-pointer">
                        {user.name}
                      </Label>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              className="flex-1 bg-transparent"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading} className="flex-1">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
