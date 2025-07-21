"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import Link from "next/link"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    const message = searchParams.get("message")
    if (message) {
      setSuccessMessage(message)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setError("Por favor confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.")
        } else {
          setError(error.message)
        }
        return
      }

      if (data.user) {
        console.log("Login exitoso:", data.user.email)
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError("Error inesperado: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full">
        <div className="flex items-center justify-center lg:justify-center lg:gap-8">
          {/* Left Side - Login Form */}
          <div className="w-full max-w-lg">
            {/* Logo centrado arriba */}
            <div className="flex justify-center mb-8">
              <Image
                src="/images/physia-logo.png"
                alt="PHYSIA Logo"
                width={150}
                height={150}
                className="w-32 h-32 lg:w-36 lg:h-36"
                priority
              />
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-5xl font-bold text-gray-900 mb-2">Iniciar Sesión</h1>
              <p className="text-gray-600 text-sm">Bienvenido de vuelta al Sistema Médico PHYSIA</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-14 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  placeholder=""
                />
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-14 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  placeholder=""
                />
              </div>

              <div className="text-left">
                <Link href="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {successMessage && (
                <Alert className="border-green-200 bg-green-50 mb-4">
                  <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Iniciando sesión...
                  </div>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                ¿No tienes una cuenta?{" "}
                <a href="/register" className="text-purple-600 hover:text-purple-700 font-medium">
                  Regístrate
                </a>
              </p>
            </div>
          </div>

          {/* Right Side - Mascot Illustration */}
          <div className="hidden lg:block lg:flex-shrink-0">
            <div className="flex justify-center items-center">
              <Image
                src="/images/mascota-physia2.png"
                alt="Mascota PHYSIA"
                width={600}
                height={600}
                className="w-full max-w-lg h-auto"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
