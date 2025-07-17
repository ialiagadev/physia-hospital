"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Mail } from "lucide-react"
import Image from "next/image"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setSent(true)
      }
    } catch (err: any) {
      setError("Error inesperado: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Email enviado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600">Hemos enviado un enlace de recuperación de contraseña a:</p>
            <p className="font-medium text-gray-900">{email}</p>
            <p className="text-sm text-gray-500">
              Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
            </p>
            <div className="pt-4">
              <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                Volver al login
              </Link>
            </div>
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
            <div className="flex items-center space-x-2 mb-2">
              <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
            </div>
            <p className="text-gray-600 text-sm">
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
            </p>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-purple-600 hover:bg-purple-700"
                disabled={loading || !email}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Enviando...
                  </div>
                ) : (
                  "Enviar enlace de recuperación"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                Volver al login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
