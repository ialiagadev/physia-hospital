"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/dashboard/sidebar"
import { supabase } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import Loading from "@/components/loading"

export default function FacturacionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUserAccess()
  }, [])

  const checkUserAccess = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Obtener usuario actual
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        console.error("Error de autenticación:", authError)
        router.push("/login")
        return
      }

      // Obtener datos del usuario desde la tabla users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, email")
        .eq("id", user.id)
        .single()

      if (userError) {
        console.error("Error obteniendo datos del usuario:", userError)
        setError("Error al verificar permisos")
        return
      }

      // Verificar si el usuario tiene acceso a facturación
      const allowedRoles = ["admin", "manager", "accountant"] // Ajusta según tus roles
      const userHasAccess = allowedRoles.includes(userData.role)

      if (!userHasAccess) {
        console.log(`Usuario ${userData.email} con rol ${userData.role} no tiene acceso a facturación`)
        // Redirigir después de un breve delay para mostrar el mensaje
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
        setHasAccess(false)
      } else {
        setHasAccess(true)
      }
    } catch (error) {
      console.error("Error verificando acceso:", error)
      setError("Error inesperado al verificar permisos")
    } finally {
      setIsLoading(false)
    }
  }

  // Estado de carga
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <Loading size="lg" text="Verificando permisos..." className="animate-in fade-in-0 duration-300" />
      </div>
    )
  }

  // Error al verificar permisos
  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}. Por favor, contacta al administrador.</AlertDescription>
        </Alert>
      </div>
    )
  }

  // Usuario sin acceso
  if (!hasAccess) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Alert className="max-w-md border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            No tienes permisos para acceder al módulo de facturación. Serás redirigido al dashboard principal...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Usuario con acceso - renderizar layout normal
  return (
    <div className="flex flex-1">
      {/* Sidebar de facturación (segundo sidebar) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Contenido de facturación */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
