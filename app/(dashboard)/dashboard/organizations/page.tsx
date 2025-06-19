"use client"

import type React from "react"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Users, Mail, Calendar, Shield, RefreshCw, Building2, Eye, EyeOff, Shuffle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  // Estados para la pestaña de usuarios
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Estados para el modal de crear usuario
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [createUserLoading, setCreateUserLoading] = useState(false)
  const [createUserError, setCreateUserError] = useState("")
  const [createUserResult, setCreateUserResult] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "user" as "user" | "admin",
  })

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

        // Obtener organizaciones
        const { data: orgs, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false })

        if (orgsError) {
          console.error("Error obteniendo organizaciones:", orgsError)
          setError("Error al cargar organizaciones")
        } else {
          setOrganizations(orgs || [])
        }

        setLoading(false)
      } catch (err) {
        console.error("Error en getUser:", err)
        setError("Error inesperado")
        setLoading(false)
      }
    }

    getUser()
  }, [])

  // Función para cargar usuarios cuando se selecciona la pestaña
  const loadUsers = async () => {
    if (!profile || usersLoaded) return

    setUsersLoading(true)
    setUsersError(null)

    try {
      console.log("🔍 Verificando sesión en pestaña usuarios...")
      setDebugInfo("Verificando sesión...")

      // Verificar si es admin
      if (profile.role !== "admin") {
        console.log("⚠️ Usuario no es admin:", profile.role)
        setDebugInfo(`Rol: ${profile.role} - Acceso denegado`)
        setUsersError("Solo los administradores pueden gestionar usuarios")
        setUsersLoading(false)
        return
      }

      // Obtener usuarios de la organización
      console.log("🔍 Obteniendo usuarios de la organización:", profile.organization_id)
      setDebugInfo(`Cargando usuarios para org ${profile.organization_id}...`)

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })

      console.log("🔍 CONSULTA DETALLADA:")
      console.log("- Organization ID buscado:", profile.organization_id)
      console.log("- Usuarios encontrados:", usersData?.length || 0)
      console.log("- Datos completos:", usersData)
      console.log("- Error:", usersError)

      if (usersData) {
        usersData.forEach((user, index) => {
          console.log(`Usuario ${index + 1}:`, {
            id: user.id,
            email: user.email,
            name: user.name,
            organization_id: user.organization_id,
            role: user.role,
          })
        })
      }

      if (usersError) {
        console.error("❌ Error obteniendo usuarios:", usersError)
        setDebugInfo(`Error usuarios: ${usersError.message}`)
        setUsersError("Error obteniendo usuarios: " + usersError.message)
        setUsersLoading(false)
        return
      }

      console.log("✅ Usuarios obtenidos:", usersData?.length || 0)
      setDebugInfo(`${usersData?.length || 0} usuarios encontrados`)
      setUsers(usersData || [])
      setUsersLoaded(true)
    } catch (err: any) {
      console.error("💥 Error general:", err)
      setDebugInfo(`Error general: ${err.message}`)
      setUsersError("Error inesperado: " + err.message)
    } finally {
      setUsersLoading(false)
    }
  }

  // Función para generar contraseña
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setUserForm((prev) => ({ ...prev, password }))
  }

  // Función para crear usuario
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
          password: userForm.password,
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
      setUserForm({ email: "", password: "", name: "", role: "user" })

      // Recargar usuarios si están cargados
      if (usersLoaded) {
        setUsersLoaded(false)
        loadUsers()
      }
    } catch (err: any) {
      setCreateUserError(err.message)
    } finally {
      setCreateUserLoading(false)
    }
  }

  // Función para resetear el modal
  const resetCreateUserModal = () => {
    setCreateUserError("")
    setCreateUserResult(null)
    setUserForm({ email: "", password: "", name: "", role: "user" })
    setShowPassword(false)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "user":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div>Cargando organizaciones...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Gestiona tus organizaciones y usuarios
            {profile && (
              <span className="block text-sm">
                Usuario: {profile.name || user?.email} | Org: {profile.organization_id} | Rol: {profile.role}
              </span>
            )}
          </p>
        </div>
      </div>

      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizacion
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2" onClick={loadUsers}>
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Organizacion</h2>
              <p className="text-muted-foreground">Gestiona la información de tu empresa.</p>
            </div>
           
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>CIF/NIF</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations && organizations.length > 0 ? (
                  organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.tax_id}</TableCell>
                      <TableCell>{org.city || "-"}</TableCell>
                      <TableCell>{org.email || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={org.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                        >
                          {org.active ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/organizations/${org.id}`}>Ver</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay organizaciones registradas
                      <div className="text-xs text-gray-500 mt-2">
                        Debug: {organizations.length} organizaciones encontradas
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h2>
              <p className="text-muted-foreground">
                Administra los usuarios de tu organización
                {debugInfo && <span className="block text-xs text-blue-600 mt-1">{debugInfo}</span>}
              </p>
            </div>
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
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  <DialogDescription>
                    Crear usuario para:{" "}
                    <strong>
                      {organizations.find((org) => org.id === profile?.organization_id)?.name ||
                        `Organización ${profile?.organization_id}`}
                    </strong>
                  </DialogDescription>
                </DialogHeader>

                {profile?.role !== "admin" && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>Solo los administradores pueden crear usuarios y asignar roles.</AlertDescription>
                  </Alert>
                )}

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
                        onValueChange={(value: "user" | "admin") => setUserForm((prev) => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuario</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Los usuarios normales solo pueden ver sus propios datos. Los administradores pueden gestionar
                        toda la organización.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="user-password">Contraseña</Label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          id="user-password"
                          type={showPassword ? "text" : "password"}
                          value={userForm.password}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="Contraseña segura"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button type="button" variant="outline" onClick={generatePassword}>
                        <Shuffle className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Usa el botón de generar para crear una contraseña segura automáticamente.
                    </p>
                  </div>

                  {createUserError && (
                    <Alert variant="destructive">
                      <AlertDescription>{createUserError}</AlertDescription>
                    </Alert>
                  )}

                  {createUserResult && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-medium text-green-800">Usuario creado exitosamente:</p>
                          <div className="bg-white p-3 rounded border space-y-1 text-sm">
                            <p>
                              <strong>Email:</strong> {createUserResult.user.email}
                            </p>
                            <p>
                              <strong>Nombre:</strong> {createUserResult.user.name}
                            </p>
                            <p>
                              <strong>Rol:</strong> {userForm.role === "admin" ? "Administrador" : "Usuario"}
                            </p>
                            <Separator className="my-2" />
                            <p>
                              <strong>Contraseña temporal:</strong>{" "}
                              <code className="bg-gray-100 px-1 rounded">{userForm.password}</code>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Asegúrate de compartir esta contraseña de forma segura con el usuario.
                            </p>
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
                      {createUserLoading ? "Creando..." : "Crear Usuario"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Cargando usuarios...</p>
                {debugInfo && <p className="mt-2 text-xs text-blue-600">{debugInfo}</p>}
              </div>
            </div>
          ) : usersError ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error</h2>
                <p className="text-muted-foreground">{usersError}</p>
                {debugInfo && <p className="mt-2 text-xs text-blue-600">{debugInfo}</p>}
                <Button className="mt-4" onClick={loadUsers}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Estadísticas de usuarios */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
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
                    <CardTitle className="text-sm font-medium">Usuarios Regulares</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{users.filter((u) => u.role === "user").length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de usuarios */}
              <Card>
                <CardHeader>
                  <CardTitle>Lista de Usuarios</CardTitle>
                  <CardDescription>Todos los usuarios de tu organización</CardDescription>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No hay usuarios</h3>
                      <p className="text-muted-foreground mb-4">Comienza agregando tu primer usuario.</p>
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
                            Crear Primer Usuario
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                            <DialogDescription>
                              Crear usuario para:{" "}
                              <strong>
                                {organizations.find((org) => org.id === profile?.organization_id)?.name ||
                                  `Organización ${profile?.organization_id}`}
                              </strong>
                            </DialogDescription>
                          </DialogHeader>

                          {profile?.role !== "admin" && (
                            <Alert>
                              <Shield className="h-4 w-4" />
                              <AlertDescription>
                                Solo los administradores pueden crear usuarios y asignar roles.
                              </AlertDescription>
                            </Alert>
                          )}

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
                                  onValueChange={(value: "user" | "admin") =>
                                    setUserForm((prev) => ({ ...prev, role: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar rol" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">Usuario</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Los usuarios normales solo pueden ver sus propios datos. Los administradores pueden
                                  gestionar toda la organización.
                                </p>
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label htmlFor="user-password">Contraseña</Label>
                              <div className="flex space-x-2">
                                <div className="relative flex-1">
                                  <Input
                                    id="user-password"
                                    type={showPassword ? "text" : "password"}
                                    value={userForm.password}
                                    onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                                    placeholder="Contraseña segura"
                                    required
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <Button type="button" variant="outline" onClick={generatePassword}>
                                  <Shuffle className="h-4 w-4" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Usa el botón de generar para crear una contraseña segura automáticamente.
                              </p>
                            </div>

                            {createUserError && (
                              <Alert variant="destructive">
                                <AlertDescription>{createUserError}</AlertDescription>
                              </Alert>
                            )}

                            {createUserResult && (
                              <Alert>
                                <AlertDescription>
                                  <div className="space-y-2">
                                    <p className="font-medium text-green-800">Usuario creado exitosamente:</p>
                                    <div className="bg-white p-3 rounded border space-y-1 text-sm">
                                      <p>
                                        <strong>Email:</strong> {createUserResult.user.email}
                                      </p>
                                      <p>
                                        <strong>Nombre:</strong> {createUserResult.user.name}
                                      </p>
                                      <p>
                                        <strong>Rol:</strong> {userForm.role === "admin" ? "Administrador" : "Usuario"}
                                      </p>
                                      <Separator className="my-2" />
                                      <p>
                                        <strong>Contraseña temporal:</strong>{" "}
                                        <code className="bg-gray-100 px-1 rounded">{userForm.password}</code>
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Asegúrate de compartir esta contraseña de forma segura con el usuario.
                                      </p>
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
                                {createUserLoading ? "Creando..." : "Crear Usuario"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
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
                            <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                            {user.is_physia_admin && <Badge variant="outline">Super Admin</Badge>}
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
