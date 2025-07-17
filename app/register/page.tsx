"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { modernSupabase } from "@/lib/supabase/modern-client"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [organizationName, setOrganizationName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log("🔄 Iniciando proceso de registro...")

      // Validaciones básicas
      if (!email || !password || !name || !organizationName) {
        setError("Todos los campos son obligatorios")
        return
      }

      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres")
        return
      }

      // Crear usuario usando el cliente moderno con PKCE
      const { data: authData, error: authError } = await modernSupabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: name.trim(),
            organization_name: organizationName.trim(),
          },
        },
      })

      if (authError) {
        console.error("❌ Error en signUp:", authError)
        // Manejar errores específicos
        if (authError.message.includes("already registered")) {
          setError("Este email ya está registrado. ¿Quieres iniciar sesión?")
        } else if (authError.message.includes("invalid email")) {
          setError("El formato del email no es válido")
        } else if (authError.message.includes("weak password")) {
          setError("La contraseña es muy débil. Debe tener al menos 6 caracteres")
        } else {
          setError(authError.message)
        }
        return
      }

      if (authData.user) {
        console.log("✅ Usuario creado:", authData.user.email)
        console.log("📧 Necesita confirmación:", !authData.session)

        // Si el usuario necesita confirmar email
        if (!authData.session) {
          console.log("📧 Email de confirmación enviado")
          setSuccess(true)
          return
        }

        // Si no necesita confirmación (caso raro), redirigir directamente
        console.log("⚠️ Usuario confirmado automáticamente, redirigiendo...")
        router.push("/auth/callback")
      }
    } catch (err: any) {
      console.error("💥 Registration error:", err)
      setError("Error inesperado durante el registro: " + (err.message || "Inténtalo de nuevo"))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-green-600">¡Cuenta creada!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-600">Hemos enviado un email de confirmación a:</p>
            <p className="font-medium text-gray-900">{email}</p>
            <p className="text-sm text-gray-500">
              Haz clic en el enlace del email para confirmar tu cuenta. Una vez confirmada, crearemos automáticamente tu
              organización <strong>{organizationName}</strong>.
            </p>
            <div className="pt-4 space-y-2">
              <Link href="/login" className="text-blue-600 hover:underline block">
                Ir al login
              </Link>
              <button
                onClick={() => {
                  setSuccess(false)
                  setEmail("")
                  setPassword("")
                  setName("")
                  setOrganizationName("")
                  setError("")
                }}
                className="text-gray-600 hover:underline text-sm"
              >
                Registrar otra cuenta
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                placeholder="tu@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Tu nombre *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationName">Nombre de tu empresa *</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder="Mi Empresa S.L."
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email || !password || !name || !organizationName}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </div>
              ) : (
                "Crear cuenta"
              )}
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
