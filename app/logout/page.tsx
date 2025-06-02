"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function LogoutPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      setError(null)

      // 1. Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("Error en signOut:", error)
        // Continuar con la limpieza aunque haya error
      }

      // 2. Limpiar almacenamiento local
      localStorage.clear()
      sessionStorage.clear()

      // 3. Limpiar cookies manualmente
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })

      // 4. Limpiar cookies específicas de Supabase
      const cookiesToClear = ["sb-access-token", "sb-refresh-token", "supabase-auth-token", "supabase.auth.token"]

      cookiesToClear.forEach((cookieName) => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      })

      // 5. Forzar redirección completa (no usar router.push)
      window.location.href = "/login"
    } catch (err: any) {
      console.error("Error al cerrar sesión:", err)
      setError(err.message || "Error al cerrar sesión")

      // Incluso si hay error, intentar limpiar y redirigir
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = "/login"
    }
  }

  const handleForceLogout = () => {
    // Logout forzado sin esperar respuesta de Supabase
    localStorage.clear()
    sessionStorage.clear()

    // Limpiar todas las cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })

    window.location.href = "/login"
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Cerrar sesión</CardTitle>
          <CardDescription>¿Estás seguro de que quieres cerrar sesión?</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
              <Button
                variant="link"
                className="text-red-700 p-0 h-auto font-normal underline ml-2"
                onClick={handleForceLogout}
              >
                Forzar cierre de sesión
              </Button>
            </div>
          )}

          {isLoggingOut && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4 flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cerrando sesión y limpiando datos...
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()} disabled={isLoggingOut}>
            Cancelar
          </Button>
          <Button onClick={handleLogout} disabled={isLoggingOut} variant="destructive">
            {isLoggingOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cerrando sesión...
              </>
            ) : (
              "Cerrar sesión"
            )}
          </Button>
        </CardFooter>

        {/* Botón de emergencia */}
        <CardFooter className="pt-0">
          <Button variant="ghost" size="sm" onClick={handleForceLogout} className="w-full text-xs text-gray-500">
            🚨 Logout forzado (si hay problemas)
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
