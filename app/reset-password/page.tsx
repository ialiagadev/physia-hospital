"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    if (password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage("Contraseña actualizada exitosamente")
      setTimeout(() => router.push("/login"), 2000)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nueva contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          {message && <div className="mb-4 p-3 rounded bg-gray-100 text-sm">{message}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Nueva contraseña (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
