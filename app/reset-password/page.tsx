"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handlePasswordReset = async () => {
      const code = searchParams.get("code")
      const type = searchParams.get("type")

      console.log("[v0] URL params:", { code: code?.substring(0, 10) + "...", type })

      if (!code || type !== "recovery") {
        setError("Enlace de recuperación inválido o expirado")
        return
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        console.log("[v0] Exchange result:", { hasSession: !!data.session, error: error?.message })

        if (error) {
          console.log("[v0] Exchange error:", error)
          if (error.message.includes("expired") || error.message.includes("invalid")) {
            setError("El enlace de recuperación ha expirado. Solicita uno nuevo.")
          } else {
            setError("Enlace de recuperación inválido o expirado")
          }
          return
        }

        if (data.session) {
          console.log("[v0] Session established successfully")
          setSessionReady(true)
        } else {
          setError("No se pudo establecer la sesión. Intenta solicitar un nuevo enlace.")
        }
      } catch (err: any) {
        console.log("[v0] Unexpected error:", err)
        setError("Error al verificar el enlace de recuperación")
      }
    }

    handlePasswordReset()
  }, [searchParams])

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
        console.log("[v0] Update password error:", error)
        setError(error.message)
      } else {
        console.log("[v0] Password updated successfully")
        setSuccess(true)
        await supabase.auth.signOut()
        setTimeout(() => {
          router.push("/login?message=Contraseña actualizada exitosamente")
        }, 3000)
      }
    } catch (err: any) {
      console.log("[v0] Unexpected error updating password:", err)
      setError("Error inesperado: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!sessionReady && !error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando enlace de recuperación...</p>
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
