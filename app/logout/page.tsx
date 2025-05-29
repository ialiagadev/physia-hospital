"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"

export default function LogoutPage() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      setError(null)

      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      // Redirigir al login después de un breve delay
      setTimeout(() => {
        router.push("/login")
      }, 1500)
    } catch (err: any) {
      console.error("Error al cerrar sesión:", err)
      setError(err.message || "Error al cerrar sesión")
      setIsLoggingOut(false)
    }
  }

  // Opción para cerrar sesión automáticamente
  // useEffect(() => {
  //   handleLogout()
  // }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Cerrar sesión</CardTitle>
          <CardDescription>¿Estás seguro de que quieres cerrar sesión?</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          {isLoggingOut && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
              Cerrando sesión...
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.back()} disabled={isLoggingOut}>
            Cancelar
          </Button>
          <Button onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
