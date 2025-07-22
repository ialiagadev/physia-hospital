"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
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

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleInviteCallback = async () => {
      try {
        console.log("🔄 Procesando invitación de usuario...")
        console.log("🔍 URL:", window.location.href)

        setMessage("Confirmando invitación...")

        // Obtener tokens del hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")

        if (!accessToken) {
          setStatus("error")
          setMessage("Enlace de invitación inválido")
          return
        }

        // Establecer la sesión
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        })

        if (sessionError || !sessionData.user) {
          console.error("❌ Error estableciendo sesión:", sessionError)
          setStatus("error")
          setMessage("Error al procesar la invitación")
          return
        }

        const user = sessionData.user
        console.log("✅ SESIÓN ESTABLECIDA:")
        console.log("   - User ID:", user.id)
        console.log("   - Email:", user.email)
        console.log("   - Metadata:", user.user_metadata)

        setUserInfo(user)

        // Procesar invitación
        await processUserInvitation(user)
      } catch (error) {
        console.error("💥 Error:", error)
        setStatus("error")
        setMessage("Error al procesar la invitación")
      }
    }

    const processUserInvitation = async (user: any) => {
      try {
        setMessage("Configurando tu cuenta...")

        const userMetadata = user.user_metadata || {}
        const organizationId = userMetadata.organization_id
        const userName = userMetadata.full_name || user.email?.split("@")[0] || "Usuario"
        const userRole = userMetadata.role || "user"

        console.log("👤 DATOS DE LA INVITACIÓN:")
        console.log("   - Organization ID:", organizationId)
        console.log("   - Name:", userName)
        console.log("   - Role:", userRole)

        if (!organizationId) {
          setStatus("error")
          setMessage("Error: Invitación sin organización asociada")
          return
        }

        // Verificar si el usuario ya existe en la tabla users
        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id, organization_id")
          .eq("id", user.id)
          .single()

        if (userError && userError.code === "PGRST116") {
          // Usuario no existe - crearlo
          console.log("👤 Creando usuario en la tabla...")

          const { data: newUser, error: createError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              name: userName,
              role: userRole,
              organization_id: organizationId,
            })
            .select()
            .single()

          if (createError) {
            console.error("❌ Error creando usuario:", createError)
            setStatus("error")
            setMessage("Error al crear el usuario en la organización")
            return
          }

          console.log("✅ Usuario creado y asociado a organización:", organizationId)
        } else if (userError) {
          console.error("❌ Error consultando usuario:", userError)
          setStatus("error")
          setMessage("Error al verificar el usuario")
          return
        } else {
          // Usuario existe - actualizar organización si es necesario
          if (existingUser.organization_id !== organizationId) {
            console.log("👤 Actualizando organización del usuario...")

            const { error: updateError } = await supabase
              .from("users")
              .update({
                organization_id: organizationId,
                name: userName,
                role: userRole,
              })
              .eq("id", user.id)

            if (updateError) {
              console.error("❌ Error actualizando usuario:", updateError)
              setStatus("error")
              setMessage("Error al asociar usuario a la organización")
              return
            }

            console.log("✅ Usuario asociado a nueva organización:", organizationId)
          } else {
            console.log("✅ Usuario ya está en la organización correcta")
          }
        }

        console.log("✅ INVITACIÓN PROCESADA CORRECTAMENTE")

        // MOSTRAR FORMULARIO DE CONTRASEÑA
        setStatus("set-password")
        setMessage("¡Bienvenido al equipo! Ahora establece tu contraseña.")
        setShowPasswordForm(true)
      } catch (error) {
        console.error("💥 Error procesando invitación:", error)
        setStatus("error")
        setMessage("Error al procesar la invitación")
      }
    }

    handleInviteCallback()
  }, [router])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

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
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setPasswordError(error.message)
        return
      }

      console.log("✅ Contraseña establecida correctamente")

      setStatus("success")
      setMessage("¡Contraseña establecida! Redirigiendo al dashboard...")

      setTimeout(() => {
        console.log("🚀 REDIRIGIENDO A DASHBOARD...")
        router.push("/dashboard")
      }, 2000)
    } catch (error: any) {
      setPasswordError("Error al establecer contraseña: " + error.message)
    } finally {
      setPasswordLoading(false)
    }
  }

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
            {status === "success" && "Redirigiendo al dashboard..."}
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
