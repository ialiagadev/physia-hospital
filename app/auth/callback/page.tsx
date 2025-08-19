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
        console.log("📩 Iniciando callback...")

        // Obtener tokens del hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        console.log("🔑 Tokens obtenidos:", { accessToken, refreshToken })

        if (!accessToken) {
          setStatus("error")
          setMessage("Enlace de confirmación inválido")
          console.error("❌ No se encontró access_token en la URL")
          return
        }

        // Establecer la sesión
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        })

        console.log("📡 Resultado setSession:", { sessionData, sessionError })

        if (sessionError || !sessionData.user) {
          console.error("❌ Error estableciendo sesión:", sessionError)
          setStatus("error")
          setMessage("Error al procesar la confirmación")
          return
        }

        const user = sessionData.user
        console.log("👤 Usuario de Supabase (objeto crudo):", user)
        console.log("👤 Usuario de Supabase (JSON):", JSON.stringify(user, null, 2))
        console.log("📎 Metadata del usuario (JSON):", JSON.stringify(user.user_metadata, null, 2))

        const userMetadata = user.user_metadata || {}
        const userPhone = userMetadata.phone || null

        // Verificar cuenta en DB
        setMessage("Verificando cuenta...")
        console.log("🔍 Buscando usuario en tabla users con id:", user.id)

        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id, organization_id, name, email")
          .eq("id", user.id)
          .single()

        console.log("📄 Resultado búsqueda usuario:", { existingUser, userError })

        if (userError) {
          console.warn("⚠️ Usuario no encontrado, reintentando en 3s...")
          await new Promise((resolve) => setTimeout(resolve, 3000))

          const { data: retryUser, error: retryError } = await supabase
            .from("users")
            .select("id, organization_id, name, email")
            .eq("id", user.id)
            .single()

          console.log("🔄 Resultado reintento usuario:", { retryUser, retryError })

          if (retryError) {
            console.error("❌ Usuario no encontrado tras reintento:", retryError.message)
            setStatus("error")
            setMessage("Error: Usuario no encontrado")
            return
          }

          if (retryUser.organization_id) {
            console.log("✅ Usuario ya tenía organización asignada:", retryUser.organization_id)
            setMessage("Actualizando información...")
            await supabase.from("users").update({ phone: userPhone }).eq("id", user.id)

            setStatus("success")
            setMessage("¡Cuenta configurada! Redirigiendo al login...")
            await refreshUserProfile()
            setTimeout(() => {
              router.push("/login")
            }, 1500)
            return
          }
        } else {
          if (existingUser.organization_id) {
            console.log("✅ Usuario ya tenía organización asignada:", existingUser.organization_id)
            setMessage("Actualizando información...")
            await supabase.from("users").update({ phone: userPhone }).eq("id", user.id)

            setStatus("success")
            setMessage("¡Cuenta configurada! Redirigiendo al login...")
            await refreshUserProfile()
            setTimeout(() => {
              router.push("/login")
            }, 1500)
            return
          }
        }

        // Crear organización si no existe
        console.log("🏗️ Usuario sin organización → creando organización...")
        await createOrganization(user, existingUser)
      } catch (error) {
        console.error("💥 Error general en handleCallback:", error)
        setStatus("error")
        setMessage("Error al procesar la confirmación")
      }
    }

    const createOrganization = async (user: any, existingUser: any) => {
      try {
        setMessage("Creando organización...")
        console.log("🏗️ Iniciando creación de organización...")

        const userMetadata = user.user_metadata || {}
        console.log("📎 Metadata completa antes de RPC:", JSON.stringify(userMetadata, null, 2))

        const organizationName = userMetadata.organization_name || "Mi Organización"
        const userName = userMetadata.name || existingUser?.name || user.email?.split("@")[0] || "Usuario"
        const userPhone = userMetadata.phone || null

        // Stripe & plan metadata
        const stripeCustomerId = userMetadata.stripe_customer_id || null
        const stripeSubscriptionId = userMetadata.stripe_subscription_id || null
        const selectedPlan = userMetadata.selected_plan || "free"
        const trialEnd = userMetadata.trial_end || null

        console.log("📦 Payload RPC:", {
          organizationName,
          email: user.email,
          stripeCustomerId,
          stripeSubscriptionId,
          selectedPlan,
          trialEnd,
        })

        // 1️⃣ Crear organización con RPC incluyendo Stripe
        const { data: orgResult, error: orgError } = await supabase.rpc("create_organization_during_registration", {
          p_name: organizationName,
          p_email: user.email,
          p_tax_id: "12345678A",
          p_address: "Dirección temporal",
          p_postal_code: "28001",
          p_city: "Madrid",
          p_province: "Madrid",
          p_country: "España",
          p_stripe_customer_id: stripeCustomerId,
          p_stripe_subscription_id: stripeSubscriptionId,
          p_subscription_tier: selectedPlan,
          p_subscription_expires: trialEnd,
          p_subscription_status: trialEnd ? "trialing" : "active",
        })

        console.log("📡 Resultado RPC:", { orgResult, orgError })

        if (orgError) {
          console.error("❌ Error creando organización:", orgError)
          setStatus("error")
          setMessage("Error al crear la organización")
          return
        }

        const organizationId = orgResult[0]?.id
        console.log("🏢 Organización creada con id:", organizationId)

        if (!organizationId) {
          console.error("❌ No se obtuvo id de la organización")
          setStatus("error")
          setMessage("Error: No se pudo crear la organización")
          return
        }

        // 2️⃣ Actualizar usuario
        setMessage("Finalizando configuración...")
        console.log("✏️ Actualizando usuario con organization_id:", organizationId)

        const { data: updateResult, error: userUpdateError } = await supabase
          .from("users")
          .update({
            name: userName,
            phone: userPhone,
            organization_id: organizationId,
            role: "admin",
          })
          .eq("id", user.id)
          .select()

        console.log("📡 Resultado update usuario:", { updateResult, userUpdateError })

        if (userUpdateError) {
          console.error("❌ Error actualizando usuario:", userUpdateError)
          setStatus("error")
          setMessage("Error al actualizar el usuario: " + userUpdateError.message)
          return
        }

        if (!updateResult || updateResult.length === 0) {
          console.error("❌ No se actualizó ningún registro de usuario")
          setStatus("error")
          setMessage("Error: No se pudo actualizar el usuario")
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))

        const { data: finalUser } = await supabase
          .from("users")
          .select("id, organization_id, name, email, role")
          .eq("id", user.id)
          .single()

        console.log("✅ Usuario final tras update:", finalUser)

        if (!finalUser?.organization_id) {
          console.error("❌ El usuario aún no tiene organization_id")
          setStatus("error")
          setMessage("Error: La organización no se asignó correctamente al usuario")
          return
        }

        setStatus("success")
        setMessage("¡Cuenta creada! Redirigiendo al login...")
        await refreshUserProfile()
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } catch (error) {
        console.error("💥 Error creando organización:", error)
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
