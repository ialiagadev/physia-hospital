"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Users, Mail, Calendar, Shield, RefreshCw, Edit2, Info, AlertTriangle, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

interface User {
  id: string
  email: string
  name: string
  role: string
  is_physia_admin: boolean
  created_at: string
  organization_id: number
  type: number
}

export default function ProfessionalsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [organizations, setOrganizations] = useState<any[]>([])

  // Estados para usuarios
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersLoaded, setUsersLoaded] = useState(false)

  // Estados para el modal de crear usuario
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [createUserLoading, setCreateUserLoading] = useState(false)
  const [createUserError, setCreateUserError] = useState("")
  const [createUserResult, setCreateUserResult] = useState<any>(null)
  const [userForm, setUserForm] = useState({
    email: "",
    name: "",
    role: "user" as "user" | "admin" | "coordinador",
  })

  // Estados para el modal de editar usuario
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editUserLoading, setEditUserLoading] = useState(false)
  const [editUserError, setEditUserError] = useState("")

  // Estados para el modal de eliminar usuario
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [deleteUserLoading, setDeleteUserLoading] = useState(false)
  const [deleteUserError, setDeleteUserError] = useState("")

  useEffect(() => {
    // Obtener usuario actual
    const getUser = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error("Error obteniendo usuario:", userError)
          setError("Error de autenticación")
          setLoading(false)
          return
        }

        if (!user) {
          setError("Usuario no autenticado")
          setLoading(false)
          return
        }

        setUser(user)

        // Obtener perfil del usuario
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()

        if (profileError) {
          console.error("Error obteniendo perfil:", profileError)
          setError("Error al cargar perfil de usuario")
          setLoading(false)
          return
        }

        setProfile(profile)

        // Obtener organizaciones para el modal
        const { data: orgs, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false })

        if (orgsError) {
          console.error("Error obteniendo organizaciones:", orgsError)
        } else {
          setOrganizations(orgs || [])
        }

        setLoading(false)

        // Cargar usuarios automáticamente
        loadUsers(profile)
      } catch (err) {
        console.error("Error en getUser:", err)
        setError("Error inesperado")
        setLoading(false)
      }
    }

    getUser()
  }, [])

  // Función para cargar usuarios
  const loadUsers = async (userProfile = profile) => {
    if (!userProfile || usersLoaded) return

    setUsersLoading(true)
    setUsersError(null)

    try {
      // Obtener usuarios de la organización con type=1
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .eq("type", 1) // Solo usuarios activos
        .neq("type", 5) // Excluir desactivados
        .order("created_at", { ascending: false })

      if (usersError) {
        console.error("Error obteniendo usuarios:", usersError)
        setUsersError("Error obteniendo usuarios: " + usersError.message)
        setUsersLoading(false)
        return
      }

      setUsers(usersData || [])
      setUsersLoaded(true)
    } catch (err: any) {
      console.error("Error general:", err)
      setUsersError("Error inesperado: " + err.message)
    } finally {
      setUsersLoading(false)
    }
  }

  // Función para crear usuario (SOLO MAGIC LINK)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateUserLoading(true)
    setCreateUserError("")
    setCreateUserResult(null)

    try {
      const response = await fetch("/api/create-user-simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userForm.email,
          name: userForm.name,
          role: profile?.role === "admin" ? userForm.role : "user",
          organizationId: profile?.organization_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error creando usuario")
      }

      setCreateUserResult(data)
      setUserForm({ email: "", name: "", role: "user" })

      // Recargar usuarios
      setUsersLoaded(false)
      loadUsers()
    } catch (err: any) {
      setCreateUserError(err.message)
    } finally {
      setCreateUserLoading(false)
    }
  }

  // Función para editar usuario
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setEditUserLoading(true)
    setEditUserError("")

    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          role: editingUser.role,
          name: editingUser.name,
        })
        .eq("id", editingUser.id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Actualizar la lista local
      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...data } : u)))
      setShowEditUserModal(false)
      setEditingUser(null)
    } catch (err: any) {
      setEditUserError(err.message)
    } finally {
      setEditUserLoading(false)
    }
  }

  // Función para desactivar usuario (cambiar type a 5)
  const handleDeactivateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deletingUser) return

    setDeleteUserLoading(true)
    setDeleteUserError("")

    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          type: 5, // Marcar como desactivado
        })
        .eq("id", deletingUser.id)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // Remover de la lista local
      setUsers(users.filter((u) => u.id !== deletingUser.id))
      setShowDeleteUserModal(false)
      setDeletingUser(null)
    } catch (err: any) {
      setDeleteUserError(err.message)
    } finally {
      setDeleteUserLoading(false)
    }
  }

  // Función para resetear el modal de crear
  const resetCreateUserModal = () => {
    setCreateUserError("")
    setCreateUserResult(null)
    setUserForm({ email: "", name: "", role: "user" })
  }

  // Función para resetear el modal de editar
  const resetEditUserModal = () => {
    setEditUserError("")
    setEditingUser(null)
  }

  // Función para resetear el modal de eliminar
  const resetDeleteUserModal = () => {
    setDeleteUserError("")
    setDeletingUser(null)
  }

  // Función para abrir modal de edición
  const openEditModal = (user: User) => {
    setEditingUser({ ...user })
    setShowEditUserModal(true)
  }

  // Función para abrir modal de eliminación
  const openDeleteModal = (user: User) => {
    setDeletingUser({ ...user })
    setShowDeleteUserModal(true)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "coordinador":
        return "bg-orange-100 text-orange-800"
      case "user":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador"
      case "coordinador":
        return "Coordinador"
      case "user":
        return "Usuario"
      default:
        return role
    }
  }

  if (loading) {
    return <div>Cargando profesionales...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Profesionales</h1>
          <p className="text-muted-foreground">
            {profile?.role === "admin"
              ? "Administra los profesionales de tu organización"
              : "Lista de profesionales de tu organización"}
          </p>
        </div>

        {profile?.role === "admin" && (
          <Dialog
            open={showCreateUserModal}
            onOpenChange={(open) => {
              setShowCreateUserModal(open)
              if (!open) resetCreateUserModal()
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Invitar Profesional
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Invitar Nuevo Profesional</DialogTitle>
                <DialogDescription>
                  Se enviará un Magic Link al email para que el profesional pueda acceder y establecer su contraseña.
                  <br />
                  <strong>
                    Organización:{" "}
                    {organizations.find((org) => org.id === profile?.organization_id)?.name ||
                      `Organización ${profile?.organization_id}`}
                  </strong>
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-name">Nombre completo</Label>
                  <Input
                    id="user-name"
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>

                {profile?.role === "admin" && (
                  <div className="space-y-2">
                    <Label htmlFor="user-role">Rol</Label>
                    <Select
                      value={userForm.role}
                      onValueChange={(value: "user" | "admin" | "coordinador") =>
                        setUserForm((prev) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuario</SelectItem>
                        <SelectItem value="coordinador">Coordinador</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Los usuarios normales solo pueden ver sus propios datos. Los coordinadores tienen acceso limitado.
                      Los administradores pueden gestionar toda la organización.
                    </p>
                  </div>
                )}

                {createUserError && (
                  <Alert variant="destructive">
                    <AlertDescription>{createUserError}</AlertDescription>
                  </Alert>
                )}

                {createUserResult && (
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium text-green-800">¡Invitación enviada exitosamente!</p>
                        <div className="bg-white p-3 rounded border space-y-1 text-sm">
                          <p>
                            <strong>Email:</strong> {createUserResult.user.email}
                          </p>
                          <p>
                            <strong>Nombre:</strong> {createUserResult.user.name}
                          </p>
                          <p>
                            <strong>Rol:</strong> {getRoleLabel(createUserResult.user.role)}
                          </p>
                          <Separator className="my-2" />
                          <div className="bg-blue-50 p-2 rounded">
                            <p className="text-blue-800 font-medium">📧 Magic Link enviado</p>
                            <p className="text-xs text-blue-600">
                              El profesional recibirá un email con un enlace para acceder y establecer su contraseña.
                            </p>
                          </div>
                          {/* NUEVO AVISO SOBRE SERVICIOS */}
                          <div className="bg-amber-50 p-2 rounded border border-amber-200">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-amber-800 font-medium text-xs">⚠️ Recordatorio importante</p>
                                <p className="text-xs text-amber-700">
                                  No olvides asignar los servicios correspondientes a este profesional en la sección de
                                  servicios o desde el calendario.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateUserModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createUserLoading}>
                    {createUserLoading ? "Enviando invitación..." : "Enviar Invitación"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* OPCIÓN ALTERNATIVA: Aviso general en la parte superior */}
      {profile?.role === "admin" && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Recordatorio:</strong> Después de crear nuevos profesionales, asegúrate de asignarles los servicios
            correspondientes en la sección de configuración para que puedan acceder a todas las funcionalidades
            necesarias.
          </AlertDescription>
        </Alert>
      )}

      {/* Sección de información de roles */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Info className="h-5 w-5" />
            Permisos por Rol
          </CardTitle>
          <CardDescription className="text-blue-700">
            Información sobre los permisos y accesos de cada tipo de usuario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Usuario */}
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-100 text-blue-800">Usuario</Badge>
              </div>

              {/* RESTRICCIONES PRIMERO */}
              <div className="mb-4">
                <h5 className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Restricciones:</h5>
                <ul className="text-sm space-y-1">
                  <li className="text-red-600">• No puede acceder a facturación</li>
                  <li className="text-red-600">• Solo tiene acceso a su calendario</li>
                  <li className="text-red-600">• No puede crear otros usuarios</li>
                  <li className="text-red-600">• No puede acceder a configuración avanzada</li>
                </ul>
              </div>

              {/* PERMISOS DESPUÉS */}
              <div>
                <h5 className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Permisos:</h5>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Acceso completo a información de clientes</li>
                  <li>• Incluye historial médico e informes</li>
                  <li>• En fichaje: solo ve sus propios registros</li>
                </ul>
              </div>
            </div>

            {/* Coordinador */}
            <div className="bg-white p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-orange-100 text-orange-800">Coordinador</Badge>
              </div>

              {/* RESTRICCIONES PRIMERO */}
              <div className="mb-4">
                <h5 className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Restricciones:</h5>
                <ul className="text-sm space-y-1">
                  <li className="text-red-600">•No accede a historial médico e informes</li>
                  <li className="text-red-600">• No puede crear otros usuarios</li>
                </ul>
              </div>

              {/* PERMISOS DESPUÉS */}
              <div>
                <h5 className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Permisos:</h5>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Acceso a información de clientes</li>
                  <li>• Acceso completo a facturación</li>
                  <li>• Acceso limitado a configuración</li>
                  <li>• En fichaje: solo ve sus propios registros</li>
                </ul>
              </div>
            </div>

            {/* Administrador */}
            <div className="bg-white p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-red-100 text-red-800">Administrador</Badge>
              </div>

              {/* SOLO PERMISOS (no tiene restricciones) */}
              <div>
                <h5 className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Permisos:</h5>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• Acceso completo a todas las funcionalidades</li>
                  <li>• Acceso completo a facturación</li>
                  <li>• Puede crear y gestionar otros usuarios</li>
                  <li>• Acceso a toda la información médica</li>
                  <li>• Puede configurar la organización</li>
                  <li>• En fichaje: ve todos los registros y puede aprobar/rechazar</li>
                  <li>• Gestión completa del sistema</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {usersLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando profesionales...</p>
          </div>
        </div>
      ) : usersError ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground">{usersError}</p>
            <Button className="mt-4" onClick={() => loadUsers()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Estadísticas de profesionales */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Profesionales</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.filter((u) => u.role === "admin").length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Coordinadores</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.filter((u) => u.role === "coordinador").length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios Regulares</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.filter((u) => u.role === "user").length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de profesionales */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Profesionales</CardTitle>
              <CardDescription>Todos los profesionales de tu organización</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay profesionales</h3>
                  <p className="text-muted-foreground mb-4">
                    {profile?.role === "admin"
                      ? "Comienza invitando tu primer profesional."
                      : "Aún no hay profesionales registrados en la organización."}
                  </p>
                  {profile?.role === "admin" && (
                    <Dialog
                      open={showCreateUserModal}
                      onOpenChange={(open) => {
                        setShowCreateUserModal(open)
                        if (!open) resetCreateUserModal()
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Invitar Primer Profesional
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">{user.name || "Sin nombre"}</h4>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getRoleBadgeColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                        {user.is_physia_admin && <Badge variant="outline">Super Admin</Badge>}
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        {profile?.role === "admin" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => openEditModal(user)} className="ml-2">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(user)}
                              className="ml-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de editar usuario */}
      <Dialog
        open={showEditUserModal}
        onOpenChange={(open) => {
          setShowEditUserModal(open)
          if (!open) resetEditUserModal()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Profesional</DialogTitle>
            <DialogDescription>Modificar información del profesional</DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-user-name">Nombre completo</Label>
                <Input
                  id="edit-user-name"
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-user-email">Email (solo lectura)</Label>
                <Input id="edit-user-email" type="email" value={editingUser.email} disabled className="bg-gray-50" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-user-role">Rol</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value: "user" | "admin" | "coordinador") =>
                    setEditingUser({ ...editingUser, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="coordinador">Coordinador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Los usuarios normales solo pueden ver sus propios datos. Los coordinadores tienen acceso limitado. Los
                  administradores pueden gestionar toda la organización.
                </p>
              </div>

              {editUserError && (
                <Alert variant="destructive">
                  <AlertDescription>{editUserError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditUserModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={editUserLoading}>
                  {editUserLoading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de eliminar usuario */}
      <Dialog
        open={showDeleteUserModal}
        onOpenChange={(open) => {
          setShowDeleteUserModal(open)
          if (!open) resetDeleteUserModal()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Desactivar Profesional</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres desactivar este profesional? Esta acción ocultará al usuario de la lista pero
              no eliminará sus datos.
            </DialogDescription>
          </DialogHeader>

          {deletingUser && (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-red-700">
                      {deletingUser.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900">{deletingUser.name || "Sin nombre"}</h4>
                    <p className="text-sm text-red-700">{deletingUser.email}</p>
                    <Badge className={getRoleBadgeColor(deletingUser.role)}>{getRoleLabel(deletingUser.role)}</Badge>
                  </div>
                </div>
              </div>

              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Importante:</strong> El usuario será desactivado pero sus datos se conservarán. Podrás
                  reactivarlo más tarde si es necesario.
                </AlertDescription>
              </Alert>

              {deleteUserError && (
                <Alert variant="destructive">
                  <AlertDescription>{deleteUserError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDeleteUserModal(false)}>
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" onClick={handleDeactivateUser} disabled={deleteUserLoading}>
                  {deleteUserLoading ? "Desactivando..." : "Desactivar Usuario"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
