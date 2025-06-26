"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log("🔄 Iniciando proceso de registro...")

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            organization_name: organizationName,
          },
        },
      })

      if (authError) {
        console.error("❌ Error en signUp:", authError)
        setError(authError.message)
        setIsLoading(false)
        return
      }

      console.log("✅ Usuario creado:", authData.user?.id)

      if (authData.user) {
        // Esperar a que el trigger cree el usuario en public.users
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // 2. Crear organización usando la función personalizada
        console.log("🏢 Creando organización con función personalizada...")

        const { data: orgResult, error: orgError } = await supabase.rpc("create_organization_during_registration", {
          p_name: organizationName,
          p_email: email,
          p_tax_id: "12345678A",
          p_address: "Dirección temporal",
          p_postal_code: "28001",
          p_city: "Madrid",
          p_province: "Madrid",
          p_country: "España",
        })

        if (orgError) {
          console.error("❌ Error creating organization:", orgError)
          setError(`Error al crear la organización: ${orgError.message}`)
          setIsLoading(false)
          return
        }

        console.log("✅ Organización creada:", orgResult)

        // 3. Actualizar perfil de usuario
        console.log("👤 Actualizando perfil de usuario...")
        const { error: userError } = await supabase
          .from("users")
          .update({
            name: name,
            organization_id: orgResult[0]?.id,
            role: "admin",
          })
          .eq("id", authData.user.id)

        if (userError) {
          console.error("❌ Error updating user profile:", userError)
          setError("Error al actualizar el perfil de usuario")
          setIsLoading(false)
          return
        }

        console.log("✅ Perfil de usuario actualizado")

        // Redirigir al login
        router.push("/login?message=Cuenta creada exitosamente")
      }
    } catch (err) {
      console.error("💥 Registration error:", err)
      setError("Error inesperado durante el registro")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="tu@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Tu nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationName">Nombre de tu empresa</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Mi Empresa S.L."
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email || !password || !name || !organizationName}
            >
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
