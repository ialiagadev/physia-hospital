"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@/types/database"
import { UserIcon, Mail, Edit3, Save, X, Phone } from "lucide-react"

// Extender el tipo User para incluir campos adicionales de la base de datos
interface ExtendedUser extends User {
  phone?: string | null
  specialty?: string | null
  specialty_other?: string | null
}

export default function ProfilePage() {
  const [user, setUser] = useState<ExtendedUser | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  })

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setIsLoading(true)
      // Obtener usuario actual
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        toast({
          title: "Error",
          description: "No se pudo obtener la información del usuario",
          variant: "destructive",
        })
        return
      }

      // Obtener datos del usuario desde la tabla users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single()

      if (userError) {
        console.error("Error fetching user:", userError)
        toast({
          title: "Error",
          description: "No se pudo cargar la información del usuario",
          variant: "destructive",
        })
        return
      }

      setUser(userData as ExtendedUser)
      setFormData({
        name: userData.name || "",
        phone: userData.phone || "",
      })
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from("users")
        .update({
          name: formData.name || null,
          phone: formData.phone || null,
        })
        .eq("id", user.id)

      if (error) {
        console.error("Error updating user:", error)
        toast({
          title: "Error",
          description: "No se pudo actualizar el perfil",
          variant: "destructive",
        })
        return
      }

      // Actualizar el estado local
      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: formData.name || null,
              phone: formData.phone || null,
            }
          : null,
      )

      setIsEditing(false)
      toast({
        title: "Perfil actualizado",
        description: "Los cambios se han guardado correctamente",
      })
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (!user) return
    setFormData({
      name: user.name || "",
      phone: user.phone || "",
    })
    setIsEditing(false)
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando perfil...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground">No se pudo cargar la información del usuario</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="w-4 h-4 mr-2" />
              Editar Perfil
            </Button>
          )}
        </div>
      </div>

      {/* Información Personal - Card única */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Información Personal
          </CardTitle>
          <CardDescription>Tu información básica y datos de contacto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar y nombre */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ingresa tu nombre completo"
                  />
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold">{user.name || "Sin nombre"}</h3>
                  <p className="text-sm text-muted-foreground">{user.email || "Sin email"}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Email (no editable) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input value={user.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">El email no se puede modificar por seguridad</p>
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Teléfono
            </Label>
            {isEditing ? (
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Ingresa tu número de teléfono"
              />
            ) : (
              <Input value={user.phone || "Sin teléfono"} disabled className="bg-muted" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
