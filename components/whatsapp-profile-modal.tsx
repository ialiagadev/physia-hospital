"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Settings, Upload, Loader2 } from "lucide-react"

interface WhatsAppProfile {
  about?: string
  address?: string
  description?: string
  vertical?: string
  email?: string
  profile_picture_url?: string
  websites?: string[]
}

interface WhatsAppProfileModalProps {
  organizationId: number
  trigger?: React.ReactNode
}

const BUSINESS_VERTICALS = [
  "UNDEFINED",
  "OTHER",
  "AUTO",
  "BEAUTY",
  "APPAREL",
  "EDU",
  "ENTERTAIN",
  "EVENT_PLAN",
  "FINANCE",
  "GROCERY",
  "GOVT",
  "HOTEL",
  "HEALTH",
  "NONPROFIT",
  "PROF_SERVICES",
  "RETAIL",
  "TRAVEL",
  "RESTAURANT",
  "NOT_A_BIZ",
]

function WhatsAppProfileModal({ organizationId, trigger }: WhatsAppProfileModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profile, setProfile] = useState<WhatsAppProfile>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { toast } = useToast()

  // Cargar perfil actual cuando se abre el modal
  useEffect(() => {
    if (open) {
      loadCurrentProfile()
    }
  }, [open])

  const loadCurrentProfile = async () => {
    setLoadingProfile(true)
    try {
      const response = await fetch(`/api/whatsapp/profile?organizationId=${organizationId}`)

      if (response.ok) {
        const data = await response.json()

        // 👇 el backend ya devuelve profile como objeto plano
        setProfile(data.profile || {})
      } else {
        const errorText = await response.text()
        console.error("Error loading profile:", errorText)
        toast({
          title: "Error",
          description: "No se pudo cargar el perfil actual",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      toast({
        title: "Error",
        description: "Error de conexión al cargar el perfil",
        variant: "destructive",
      })
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Actualizar imagen de perfil si se seleccionó una
      if (imageFile) {
        const formData = new FormData()
        formData.append("image", imageFile)
        formData.append("organizationId", organizationId.toString())

        const imageResponse = await fetch("/api/whatsapp/profile/picture", {
          method: "POST",
          body: formData,
        })

        if (!imageResponse.ok) {
          throw new Error("Error actualizando imagen de perfil")
        }
      }

      // 2. Actualizar detalles del perfil
      const profileResponse = await fetch("/api/whatsapp/profile/details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          ...profile,
        }),
      })

      if (!profileResponse.ok) {
        throw new Error("Error actualizando detalles del perfil")
      }

      toast({
        title: "Perfil actualizado",
        description: "El perfil de WhatsApp Business se ha actualizado correctamente.",
      })

      setOpen(false)
      setImageFile(null)
      setImagePreview(null)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error actualizando el perfil",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <Settings className="h-4 w-4" />
            Perfil WhatsApp
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualizar Perfil de WhatsApp Business</DialogTitle>
        </DialogHeader>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando perfil actual...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Imagen de perfil */}
            <div className="space-y-2">
              <Label>Imagen de Perfil</Label>
              <div className="flex items-center gap-4">
                {(imagePreview || profile.profile_picture_url) && (
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                    <img
                      src={imagePreview || profile.profile_picture_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="profile-image"
                  />
                  <Label htmlFor="profile-image" className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Seleccionar imagen
                      </span>
                    </Button>
                  </Label>
                </div>
              </div>
            </div>

            {/* Acerca de */}
            <div className="space-y-2">
              <Label htmlFor="about">Acerca de</Label>
              <Textarea
                id="about"
                placeholder="Descripción breve de tu negocio..."
                value={profile.about || ""}
                onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                maxLength={139}
              />
              <p className="text-xs text-muted-foreground">{(profile.about || "").length}/139 caracteres</p>
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                placeholder="Dirección de tu negocio..."
                value={profile.address || ""}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                maxLength={256}
              />
              <p className="text-xs text-muted-foreground">{(profile.address || "").length}/256 caracteres</p>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción detallada de tu negocio..."
                value={profile.description || ""}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                maxLength={512}
              />
              <p className="text-xs text-muted-foreground">{(profile.description || "").length}/512 caracteres</p>
            </div>

            {/* Categoría del negocio */}
            <div className="space-y-2">
              <Label htmlFor="vertical">Categoría del Negocio</Label>
              <Select
                value={profile.vertical || ""}
                onValueChange={(value) => setProfile({ ...profile, vertical: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_VERTICALS.map((vertical) => (
                    <SelectItem key={vertical} value={vertical}>
                      {vertical.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email de Contacto</Label>
              <Input
                id="email"
                type="email"
                placeholder="contacto@tunegocio.com"
                value={profile.email || ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                maxLength={128}
              />
              <p className="text-xs text-muted-foreground">{(profile.email || "").length}/128 caracteres</p>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Perfil"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default WhatsAppProfileModal
