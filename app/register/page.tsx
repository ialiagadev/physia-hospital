"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { modernSupabase } from "@/lib/supabase/modern-client"
import { Loader2, CheckCircle } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
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
      if (!email || !password || !name || !phone || !organizationName) {
        setError("Todos los campos son obligatorios")
        return
      }

      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres")
        return
      }

      // Validación de teléfono (ahora obligatorio)
      if (phone.length < 7) {
        setError("El número de teléfono debe tener al menos 7 dígitos")
        return
      }

      // Crear usuario usando el cliente moderno con PKCE
      const { data: authData, error: authError } = await modernSupabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
          data: {
            name: name.trim(),
            phone: phone.trim(),
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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>

          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900">¡Cuenta creada!</h1>
            <p className="text-gray-600">
              Revisa tu email <span className="font-medium text-gray-900">{email}</span> para confirmar tu cuenta
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Ir al login
            </Link>
            <button
              onClick={() => {
                setSuccess(false)
                setEmail("")
                setPassword("")
                setName("")
                setPhone("")
                setOrganizationName("")
                setError("")
              }}
              className="block w-full py-3 px-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Registrar otra cuenta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header con alegría */}
      <div className="text-center pt-16 pb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent tracking-tight">
          ¡Bienvenido a Physia! ✨
        </h1>
      </div>

      <div className="flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-20 items-center">
          {/* Imagen - Protagonista */}
          <div className="flex justify-center lg:justify-end order-2 lg:order-1">
            <div className="w-full max-w-lg">
              <img src="/images/physia-mascot.png" alt="Physia" className="w-full h-auto" />
            </div>
          </div>

          {/* Formulario Integrado */}
          <div className="flex justify-center lg:justify-start order-1 lg:order-2">
            <div className="w-full max-w-sm">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Crear cuenta</h2>
              </div>

              {error && (
                <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0 transition-all duration-200 bg-white hover:border-gray-300"
                    placeholder="Dr. Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0 transition-all duration-200 bg-white hover:border-gray-300"
                    placeholder="tu@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Teléfono
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0 transition-all duration-200 bg-white hover:border-gray-300"
                    placeholder="+34 600 123 456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0 transition-all duration-200 bg-white hover:border-gray-300"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700">
                    Nombre de tu clínica
                  </Label>
                  <Input
                    id="organizationName"
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12 px-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0 transition-all duration-200 bg-white hover:border-gray-300"
                    placeholder="Clínica San Rafael"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl transition-all duration-200 transform hover:-translate-y-0.5 mt-8"
                  disabled={isLoading || !email || !password || !name || !phone || !organizationName}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creando cuenta...
                    </div>
                  ) : (
                    "Crear cuenta"
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/login" className="text-purple-600 hover:text-purple-700 font-semibold transition-colors">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
