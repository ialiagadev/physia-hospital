"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"

export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Confirmando email...")
  const router = useRouter()
  const hasProcessed = useRef(false)
  const { refreshUserProfile } = useAuth()

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleCallback = async () => {
      try {
        setMessage("Confirmando email...")

        // Obtener tokens del hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")

        if (!accessToken) {
          setStatus("error")
          setMessage("Enlace de confirmación inválido")
          return
        }

        // Establecer la sesión
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        })

        if (sessionError || !sessionData.user) {
          console.error("Error estableciendo sesión:", sessionError)
          setStatus("error")
          setMessage("Error al procesar la confirmación")
          return
        }

        const user = sessionData.user

        // Verificar cuenta en DB
        setMessage("Verificando cuenta...")
        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id, organization_id, name, email")
          .eq("id", user.id)
          .single()

        if (userError) {
          // Esperar a que el trigger cree el usuario
          await new Promise((resolve) => setTimeout(resolve, 3000))

          const { data: retryUser, error: retryError } = await supabase
            .from("users")
            .select("id, organization_id, name, email")
            .eq("id", user.id)
            .single()

          if (retryError) {
            console.error("Usuario no encontrado:", retryError.message)
            setStatus("error")
            setMessage("Error: Usuario no encontrado")
            return
          }

          if (retryUser.organization_id) {
            setStatus("success")
            setMessage("¡Cuenta configurada! Redirigiendo al login...")
            await refreshUserProfile() // Agregar esta línea
            setTimeout(() => {
              router.push("/login")
            }, 1500)
            return
          }
        } else {
          if (existingUser.organization_id) {
            setStatus("success")
            setMessage("¡Cuenta configurada! Redirigiendo al login...")
            await refreshUserProfile() // Agregar esta línea
            setTimeout(() => {
              router.push("/login")
            }, 1500)
            return
          }
        }

        // Crear organización si no existe
        await createOrganization(user, existingUser)
      } catch (error) {
        console.error("Error:", error)
        setStatus("error")
        setMessage("Error al procesar la confirmación")
      }
    }

    const createOrganization = async (user: any, existingUser: any) => {
      try {
        setMessage("Creando organización...")

        const userMetadata = user.user_metadata || {}
        const organizationName = userMetadata.organization_name || "Mi Organización"
        const userName = userMetadata.name || existingUser?.name || user.email?.split("@")[0] || "Usuario"

        const { data: orgResult, error: orgError } = await supabase.rpc("create_organization_during_registration", {
          p_name: organizationName,
          p_email: user.email,
          p_tax_id: "12345678A",
          p_address: "Dirección temporal",
          p_postal_code: "28001",
          p_city: "Madrid",
          p_province: "Madrid",
          p_country: "España",
        })

        if (orgError) {
          console.error("Error creating organization:", orgError)
          setStatus("error")
          setMessage("Error al crear la organización")
          return
        }

        const organizationId = orgResult[0]?.id

        if (!organizationId) {
          setStatus("error")
          setMessage("Error: No se pudo crear la organización")
          return
        }

        // Actualizar usuario
        setMessage("Finalizando configuración...")

        const { data: updateResult, error: userUpdateError } = await supabase
          .from("users")
          .update({
            name: userName,
            organization_id: organizationId,
            role: "admin",
          })
          .eq("id", user.id)
          .select()

        if (userUpdateError) {
          console.error("Error updating user:", userUpdateError)
          setStatus("error")
          setMessage("Error al actualizar el usuario: " + userUpdateError.message)
          return
        }

        if (!updateResult || updateResult.length === 0) {
          console.error("No se actualizó ningún registro")
          setStatus("error")
          setMessage("Error: No se pudo actualizar el usuario")
          return
        }

        // Verificar el estado final
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const { data: finalUser, error: finalError } = await supabase
          .from("users")
          .select("id, organization_id, name, email, role")
          .eq("id", user.id)
          .single()

        if (!finalUser?.organization_id) {
          console.error("El usuario aún no tiene organization_id")
          setStatus("error")
          setMessage("Error: La organización no se asignó correctamente al usuario")
          return
        }

        setStatus("success")
        setMessage("¡Cuenta creada! Redirigiendo al login...")
        await refreshUserProfile() // Agregar esta línea
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } catch (error) {
        console.error("Error creando organización:", error)
        setStatus("error")
        setMessage("Error al crear la organización")
      }
    }

    handleCallback()
  }, [router, refreshUserProfile])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
            {status === "loading" && "Configurando cuenta..."}
            {status === "success" && "¡Listo!"}
            {status === "error" && "Error"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Por favor espera mientras configuramos tu cuenta"}
            {status === "success" && "Redirigiendo al login..."}
            {status === "error" && "Hubo un problema al configurar tu cuenta"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p
            className={`text-sm ${
              status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-gray-600"
            }`}
          >
            {message}
          </p>
          {status === "error" && (
            <div className="mt-4 space-y-2">
              <button onClick={() => router.push("/login")} className="text-blue-600 hover:underline text-sm block">
                Ir al login
              </button>
              <button onClick={() => router.push("/register")} className="text-gray-600 hover:underline text-sm block">
                Registrarse de nuevo
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
