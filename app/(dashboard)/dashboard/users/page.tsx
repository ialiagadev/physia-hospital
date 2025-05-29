"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Mail, Calendar, Shield, RefreshCw } from 'lucide-react'
import { supabase } from "@/lib/supabase/client" // Asegúrate de que sea /client

interface User {
  id: string
  email: string
  name: string
  role: string
  is_physia_admin: boolean
  created_at: string
  organization_id: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔍 Verificando sesión en /dashboard/users...")
        setDebugInfo("Verificando sesión...")
        
        // 1. Obtener usuario actual - MÉTODO CORRECTO
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error("❌ Error obteniendo usuario:", userError)
          setDebugInfo(`Error: ${userError.message}`)
          setError("Error obteniendo usuario: " + userError.message)
          setLoading(false)
          return
        }
        
        if (!user) {
          console.log("⚠️ No hay usuario autenticado")
          setDebugInfo("No hay usuario autenticado")
          setError("No se pudo obtener el usuario actual")
          setLoading(false)
          return
        }
        
        console.log("✅ Usuario autenticado:", user.email)
        setDebugInfo(`Usuario: ${user.email}`)
        setCurrentUser(user)
        
        // 2. Obtener perfil del usuario
        console.log("🔍 Obteniendo perfil del usuario...")
        setDebugInfo(`Obteniendo perfil para ${user.id}...`)
        
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()
        
        if (profileError) {
          console.error("❌ Error obteniendo perfil:", profileError)
          setDebugInfo(`Error perfil: ${profileError.message}`)
          setError("Error obteniendo perfil: " + profileError.message)
          setLoading(false)
          return
        }
        
        if (!profile) {
          console.log("⚠️ Perfil no encontrado")
          setDebugInfo("Perfil no encontrado")
          setError("No se encontró el perfil del usuario")
          setLoading(false)
          return
        }
        
        console.log("✅ Perfil encontrado:", profile)
        setDebugInfo(`Perfil: ${profile.name}, Org: ${profile.organization_id}`)
        
        // 3. Verificar si es admin
        if (profile.role !== "admin") {
          console.log("⚠️ Usuario no es admin:", profile.role)
          setDebugInfo(`Rol: ${profile.role} - Acceso denegado`)
          setError("Solo los administradores pueden gestionar usuarios")
          setLoading(false)
          return
        }
        
        // 4. Obtener usuarios de la organización
        console.log("🔍 Obteniendo usuarios de la organización:", profile.organization_id)
        setDebugInfo(`Cargando usuarios para org ${profile.organization_id}...`)
        
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false })
        
        if (usersError) {
          console.error("❌ Error obteniendo usuarios:", usersError)
          setDebugInfo(`Error usuarios: ${usersError.message}`)
          setError("Error obteniendo usuarios: " + usersError.message)
          setLoading(false)
          return
        }
        
        console.log("✅ Usuarios obtenidos:", usersData?.length || 0)
        setDebugInfo(`${usersData?.length || 0} usuarios encontrados`)
        setUsers(usersData || [])
        
      } catch (err: any) {
        console.error("💥 Error general:", err)
        setDebugInfo(`Error general: ${err.message}`)
        setError("Error inesperado: " + err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [router])

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

  // Mostrar loading mientras se cargan los datos
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Cargando usuarios...</p>
          {debugInfo && (
            <p className="mt-2 text-xs text-blue-600">{debugInfo}</p>
          )}
        </div>
      </div>
    )
  }

  // Mostrar error si hay algún problema
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          {debugInfo && (
            <p className="mt-2 text-xs text-blue-600">{debugInfo}</p>
          )}
          <Button className="mt-4" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios de tu organización
            {debugInfo && (
              <span className="block text-xs text-blue-600 mt-1">{debugInfo}</span>
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/users/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <Button asChild>
                <Link href="/dashboard/users/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Primer Usuario
                </Link>
              </Button>
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
  )
}