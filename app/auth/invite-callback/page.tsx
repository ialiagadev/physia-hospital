"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Users, Eye, EyeOff } from "lucide-react"

export default function InviteCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error" | "set-password">("loading")
  const [message, setMessage] = useState("Procesando invitación...")
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const router = useRouter()
  const hasProcessed = useRef(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const { refreshUserProfile } = useAuth()

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleInviteCallback = async () => {
      try {
        console.log("🔄 INICIANDO PROCESAMIENTO DE INVITACIÓN")
        console.log("   - URL actual:", window.location.href)
        console.log("   - Hash:", window.location.hash)

        setMessage("Confirmando invitación...")

        // Obtener tokens del hash
        const searchParams = new URLSearchParams(window.location.search)
const accessToken = searchParams.get("access_token")
const refreshToken = searchParams.get("refresh_token")
      

        console.log("🔑 TOKENS OBTENIDOS:")
        console.log("   - Access Token:", accessToken ? "✅ Presente" : "❌ Ausente")
        console.log("   - Refresh Token:", refreshToken ? "✅ Presente" : "❌ Ausente")
      
        if (!accessToken) {
          console.error("❌ No se encontró access_token en la URL")
          setStatus("error")
          setMessage("Enlace de invitación inválido - Token faltante")
          return
        }

        // Establecer la sesión
        console.log("🔄 Estableciendo sesión...")
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        })

        if (sessionError) {
          console.error("❌ Error estableciendo sesión:", sessionError)
          setStatus("error")
          setMessage(`Error al procesar la invitación: ${sessionError.message}`)
          return
        }

        if (!sessionData.user) {
          console.error("❌ No se obtuvo usuario de la sesión")
          setStatus("error")
          setMessage("Error: No se pudo obtener información del usuario")
          return
        }

        const user = sessionData.user
        console.log("✅ SESIÓN ESTABLECIDA:")
        console.log("   - User ID:", user.id)
        console.log("   - Email:", user.email)
        console.log("   - Email confirmed:", user.email_confirmed_at)
        console.log("   - Metadata:", user.user_metadata)

        setUserInfo(user)

        // Procesar invitación
        await processUserInvitation(user)
      } catch (error) {
        console.error("💥 Error en handleInviteCallback:", error)
        setStatus("error")
        setMessage(`Error al procesar la invitación: ${error instanceof Error ? error.message : "Error desconocido"}`)
      }
    }

    const processUserInvitation = async (user: any) => {
      try {
        console.log("🔄 PROCESANDO INVITACIÓN DE USUARIO")
        setMessage("Configurando tu cuenta...")

        const userMetadata = user.user_metadata || {}
        const organizationId = userMetadata.organization_id
        const userName = userMetadata.full_name || user.email?.split("@")[0] || "Usuario"
        const userRole = userMetadata.role || "user"

        console.log("👤 DATOS DE LA INVITACIÓN:")
        console.log("   - Organization ID:", organizationId)
        console.log("   - Name:", userName)
        console.log("   - Role:", userRole)
        console.log("   - Invite Type:", userMetadata.invite_type)

        if (!organizationId) {
          console.error("❌ No se encontró organization_id en metadata")
          setStatus("error")
          setMessage("Error: Invitación sin organización asociada")
          return
        }

        // Verificar si el usuario ya existe en la tabla users
        console.log("🔍 Verificando usuario en base de datos...")
        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id, organization_id, name, role")
          .eq("id", user.id)
          .single()

        console.log("📊 RESULTADO DE CONSULTA DE USUARIO:")
        console.log("   - Error:", userError)
        console.log("   - Usuario existente:", existingUser)

        if (userError && userError.code === "PGRST116") {
          // Usuario no existe - crearlo
          console.log("👤 Usuario no existe, creándolo...")

          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              name: userName,
              role: userRole,
              organization_id: organizationId,
              type: 1, // Asegurar que sea tipo 1
            })
            .select()
            .single()

          if (createError) {
            console.error("❌ Error creando usuario:", createError)
            setStatus("error")
            setMessage(`Error al crear el usuario: ${createError.message}`)
            return
          }

          console.log("✅ Usuario creado exitosamente:", newUser)
        } else if (userError) {
          console.error("❌ Error consultando usuario:", userError)
          setStatus("error")
          setMessage(`Error al verificar el usuario: ${userError.message}`)
          return
        } else {
          // Usuario existe - actualizar organización si es necesario
          console.log("👤 Usuario existe, verificando organización...")

          if (existingUser.organization_id !== organizationId) {
            console.log("🔄 Actualizando organización del usuario...")

            const { error: updateError } = await supabase
              .from("users")
              .update({
                organization_id: organizationId,
                name: userName,
                role: userRole,
                type: 1, // Asegurar que sea tipo 1
              })
              .eq("id", user.id)

            if (updateError) {
              console.error("❌ Error actualizando usuario:", updateError)
              setStatus("error")
              setMessage(`Error al asociar usuario a la organización: ${updateError.message}`)
              return
            }

            console.log("✅ Usuario actualizado con nueva organización")
          } else {
            console.log("✅ Usuario ya está en la organización correcta")
          }
        }

        console.log("✅ INVITACIÓN PROCESADA CORRECTAMENTE")

        // FORZAR REFRESH DEL AUTH CONTEXT
        console.log("🔄 Actualizando contexto de autenticación...")
        try {
          await refreshUserProfile()
          console.log("✅ Contexto actualizado")
        } catch (refreshError) {
          console.warn("⚠️ Error actualizando contexto:", refreshError)
        }

        // MOSTRAR FORMULARIO DE CONTRASEÑA
        console.log("🔄 Mostrando formulario de contraseña...")
        setStatus("set-password")
        setMessage("¡Bienvenido al equipo! Ahora establece tu contraseña.")
        setShowPasswordForm(true)

        console.log("✅ FORMULARIO DE CONTRASEÑA MOSTRADO")
      } catch (error) {
        console.error("💥 Error procesando invitación:", error)
        setStatus("error")
        setMessage(`Error al procesar la invitación: ${error instanceof Error ? error.message : "Error desconocido"}`)
      }
    }

    handleInviteCallback()
  }, [router, refreshUserProfile])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    console.log("🔄 ESTABLECIENDO CONTRASEÑA...")

    if (password !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    setPasswordLoading(true)

    try {
      // Actualizar contraseña del usuario
      console.log("🔄 Actualizando contraseña en Supabase...")
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        console.error("❌ Error actualizando contraseña:", error)
        setPasswordError(`Error al establecer contraseña: ${error.message}`)
        return
      }

      console.log("✅ Contraseña establecida correctamente")

      // FORZAR REFRESH FINAL DEL AUTH CONTEXT
      console.log("🔄 Refresh final del contexto...")
      try {
        await refreshUserProfile()
        console.log("✅ Contexto final actualizado")
      } catch (refreshError) {
        console.warn("⚠️ Error en refresh final:", refreshError)
      }

      setStatus("success")
      setMessage("¡Contraseña establecida! Redirigiendo al login...")

      console.log("✅ PROCESO COMPLETADO - Redirigiendo al login...")
     
    } catch (error: any) {
      console.error("💥 Error estableciendo contraseña:", error)
      setPasswordError(`Error al establecer contraseña: ${error.message}`)
    } finally {
      setPasswordLoading(false)
    }
  }

  // Debug: Mostrar estado actual
  console.log("🎯 ESTADO ACTUAL DEL COMPONENTE:")
  console.log("   - Status:", status)
  console.log("   - ShowPasswordForm:", showPasswordForm)
  console.log("   - Message:", message)

  if (showPasswordForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              ¡Bienvenido al equipo!
            </CardTitle>
            <CardDescription>
              Tu cuenta ha sido configurada. Ahora establece tu contraseña para futuros accesos.
              <br />
              <strong>Email:</strong> {userInfo?.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
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
                    className="pr-10"
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
                    className="pr-10"
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

              {passwordError && (
                <Alert variant="destructive">
                  <AlertDescription>{passwordError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={passwordLoading}>
                {passwordLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Estableciendo contraseña...
                  </div>
                ) : (
                  "Establecer contraseña"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
            {status === "loading" && "Procesando invitación..."}
            {status === "success" && "¡Listo!"}
            {status === "error" && "Error"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Configurando tu acceso a la organización"}
            {status === "success" && "Redirigiendo al login..."}
            {status === "error" && "Hubo un problema al procesar tu invitación"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Users className="h-12 w-12 text-blue-500" />
          </div>
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
                Crear cuenta nueva
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
