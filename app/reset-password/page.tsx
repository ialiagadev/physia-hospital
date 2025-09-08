"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, CheckCircle } from "lucide-react"
import Image from "next/image"

function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const handlePasswordResetSession = async () => {
      try {
        console.log("[v0] Checking password reset session...")

        // Obtener tokens del hash de la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        console.log("[v0] URL hash params:", { accessToken: !!accessToken, refreshToken: !!refreshToken, type })

        // Verificar si es un enlace de recovery
        if (type !== "recovery" || !accessToken) {
          console.log("[v0] Invalid recovery link - missing tokens or wrong type")
          setError("Enlace de recuperación inválido o expirado")
          setIsCheckingSession(false)
          return
        }

        // Establecer la sesión con los tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        })

        console.log("[v0] Set session result:", { sessionData: !!sessionData.session, sessionError })

        if (sessionError || !sessionData.session) {
          console.error("[v0] Error setting session:", sessionError)
          setError("Error al procesar el enlace de recuperación")
          setIsCheckingSession(false)
          return
        }

        // Verificar que la sesión es válida
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        console.log("[v0] Current user after session:", { user: !!user, userError })

        if (userError || !user) {
          console.error("[v0] Error getting user:", userError)
          setError("Sesión inválida")
          setIsCheckingSession(false)
          return
        }

        console.log("[v0] Password reset session established successfully")
        setIsValidSession(true)
        setIsCheckingSession(false)

        // Limpiar la URL del hash para mejor UX
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (error) {
        console.error("[v0] Unexpected error in password reset:", error)
        setError("Error inesperado al procesar el enlace")
        setIsCheckingSession(false)
      }
    }

    handlePasswordResetSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      setLoading(false)
      return
    }

    try {
      console.log("[v0] Updating password...")

      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error("[v0] Error updating password:", error)
        setError(error.message)
      } else {
        console.log("[v0] Password updated successfully")
        setSuccess(true)
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          router.push("/login?message=Contraseña actualizada exitosamente")
        }, 3000)
      }
    } catch (err: any) {
      console.error("[v0] Unexpected error updating password:", err)
      setError("Error inesperado: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras verificamos la sesión
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Verificando enlace...</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Por favor espera mientras verificamos tu enlace de recuperación.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mostrar error si la sesión no es válida
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enlace inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="text-gray-600">El enlace de recuperación puede haber expirado o ya haber sido usado.</p>
            <Button
              onClick={() => router.push("/forgot-password")}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              Solicitar nuevo enlace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">¡Contraseña actualizada!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Tu contraseña ha sido actualizada exitosamente.</p>
            <p className="text-sm text-gray-500">Redirigiendo al login en unos segundos...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/physia-logo.png"
            alt="PHYSIA Logo"
            width={80}
            height={80}
            className="w-20 h-20"
            priority
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Nueva contraseña</CardTitle>
            <p className="text-gray-600 text-sm text-center">Ingresa tu nueva contraseña</p>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-purple-600 hover:bg-purple-700"
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Actualizando...
                  </div>
                ) : (
                  "Actualizar contraseña"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
