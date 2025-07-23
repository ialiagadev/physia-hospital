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
import { Loader2, CheckCircle, XCircle, Users, Eye, EyeOff } from 'lucide-react'

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
  const { user, refreshUserProfile } = useAuth()

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleInviteCallback = async () => {
      try {
        console.log("🔄 INICIANDO PROCESAMIENTO DE INVITACIÓN")
        console.log("   - URL actual:", window.location.href)
        console.log("   - Hash:", window.location.hash)
        console.log("   - Search:", window.location.search)
        
        setMessage("Confirmando invitación...")

        // Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        
        const token = urlParams.get('token')
        const type = urlParams.get('type')
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        console.log("🔑 PARÁMETROS ENCONTRADOS:")
        console.log("   - Token (query):", token ? "✅ Presente" : "❌ Ausente")
        console.log("   - Type:", type)
        console.log("   - Access Token (hash):", accessToken ? "✅ Presente" : "❌ Ausente")
        console.log("   - Refresh Token (hash):", refreshToken ? "✅ Presente" : "❌ Ausente")

        // Método 1: Si tenemos access_token y refresh_token en el hash
        if (accessToken && refreshToken) {
          console.log("🔄 Método 1: Estableciendo sesión con tokens del hash...")
          setMessage("Estableciendo tu sesión...")

          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (sessionError) {
            console.error("❌ Error estableciendo sesión:", sessionError)
            setStatus("error")
            setMessage(`Error al procesar la invitación: ${sessionError.message}`)
            return
          }

          const currentUser = sessionData.session?.user
          if (currentUser) {
            console.log("✅ Sesión establecida con tokens del hash")
            await processUser(currentUser)
            return
          }
        }

        // Método 2: Si tenemos token en query params
        if (token && type === 'invite') {
          console.log("🔄 Método 2: Verificando token de invitación...")
          setMessage("Verificando tu invitación...")

          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'invite'
          })
          if (error) {
            console.error("❌ Error verificando invitación:", error)
            setStatus("error")
            setMessage("El enlace de invitación es inválido o ha expirado. Solicita una nueva invitación.")
            return
          }

          const currentUser = data.user
          if (currentUser) {
            console.log("✅ Token verificado correctamente")
            await processUser(currentUser)
            return
          }
        }

        // Método 3: Esperar a que Supabase procese automáticamente
        console.log("🔄 Método 3: Esperando procesamiento automático...")
        setMessage("Procesando automáticamente...")
        
        // Esperar un momento para que Supabase procese la URL
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("❌ Error obteniendo sesión:", sessionError)
          setStatus("error")
          setMessage(`Error al procesar la invitación: ${sessionError.message}`)
          return
        }

        if (session?.user) {
          console.log("✅ Sesión obtenida automáticamente")
          await processUser(session.user)
          return
        }

        // Método 4: Intentar refresh
        console.log("🔄 Método 4: Intentando refresh de sesión...")
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        
        if (!refreshError && refreshData.session?.user) {
          console.log("✅ Sesión obtenida después del refresh")
          await processUser(refreshData.session.user)
          return
        }

        // Si llegamos aquí, no pudimos obtener la sesión
        console.error("❌ No se pudo obtener sesión con ningún método")
        setStatus("error")
        setMessage("Error: El enlace de invitación es inválido o ha expirado. Solicita una nueva invitación.")

      } catch (error) {
        console.error("💥 Error en handleInviteCallback:", error)
        setStatus("error")
        setMessage(`Error al procesar la invitación: ${error instanceof Error ? error.message : "Error desconocido"}`)
      }
    }

    const processUser = async (currentUser: any) => {
      try {
        console.log("✅ PROCESANDO USUARIO:")
        console.log("   - User ID:", currentUser.id)
        console.log("   - Email:", currentUser.email)
        console.log("   - Email confirmed:", currentUser.email_confirmed_at)
        console.log("   - Metadata:", currentUser.user_metadata)

        setUserInfo(currentUser)

        // Verificar si el usuario ya existe en la tabla users
        console.log("🔍 Verificando usuario en base de datos...")
        setMessage("Configurando tu cuenta...")

        const { data: existingUser, error: userError } = await supabase
          .from("users")
          .select("id, organization_id, name, role")
          .eq("id", currentUser.id)
          .maybeSingle()

        console.log("📊 RESULTADO DE CONSULTA DE USUARIO:")
        console.log("   - Error:", userError)
        console.log("   - Usuario existente:", existingUser)

        if (existingUser) {
          console.log("✅ Usuario ya existe en la tabla con organización:", existingUser.organization_id)
        } else {
          // Crear usuario usando los metadatos de la invitación
          console.log("🔄 Creando usuario en la tabla...")
          await createUserFromInvitation(currentUser)
        }

        // Actualizar el contexto de autenticación
        console.log("🔄 Actualizando contexto de autenticación...")
        try {
          await refreshUserProfile()
          console.log("✅ Contexto actualizado")
        } catch (refreshError) {
          console.warn("⚠️ Error actualizando contexto:", refreshError)
        }

        // Mostrar formulario de contraseña
        console.log("🔄 Mostrando formulario de contraseña...")
        setStatus("set-password")
        setMessage("¡Bienvenido al equipo! Ahora establece tu contraseña.")
        setShowPasswordForm(true)

      } catch (error) {
        console.error("💥 Error procesando usuario:", error)
        setStatus("error")
        setMessage(`Error al procesar el usuario: ${error instanceof Error ? error.message : "Error desconocido"}`)
      }
    }

    const createUserFromInvitation = async (currentUser: any) => {
      try {
        const userMetadata = currentUser.user_metadata || {}
        const organizationId = userMetadata.organization_id
        const userName = userMetadata.full_name || currentUser.email?.split("@")[0] || "Usuario"
        const userRole = userMetadata.role || "user"

        console.log("👤 DATOS DE LA INVITACIÓN:")
        console.log("   - Organization ID:", organizationId)
        console.log("   - Name:", userName)
        console.log("   - Role:", userRole)

        if (!organizationId) {
          console.error("❌ No se encontró organization_id en metadata")
          setStatus("error")
          setMessage("Error: Invitación sin organización asociada. Contacta al administrador.")
          return
        }

        // Crear usuario en la tabla
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            id: currentUser.id,
            email: currentUser.email,
            name: userName,
            role: userRole,
            organization_id: organizationId,
            type: 1,
            is_physia_admin: false,
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
      } catch (error) {
        console.error("💥 Error creando usuario:", error)
        setStatus("error")
        setMessage(`Error al crear el usuario: ${error instanceof Error ? error.message : "Error desconocido"}`)
      }
    }

    handleInviteCallback()
  }, [refreshUserProfile])

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

      // Actualizar contexto final
      console.log("🔄 Actualizando contexto final...")
      try {
        await refreshUserProfile()
        console.log("✅ Contexto final actualizado")
      } catch (refreshError) {
        console.warn("⚠️ Error en refresh final:", refreshError)
      }

      setStatus("success")
      setMessage("¡Contraseña establecida! Redirigiendo al dashboard...")
      
      console.log("✅ PROCESO COMPLETADO - Redirigiendo al dashboard...")
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)

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
  console.log("   - User from context:", user?.email)

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
              status === "success" 
                ? "text-green-600" 
                : status === "error" 
                ? "text-red-600" 
                : "text-gray-600"
            }`}
          >
            {message}
          </p>
          {status === "error" && (
            <div className="mt-4 space-y-2">
              <button 
                onClick={() => router.push("/login")} 
                className="text-blue-600 hover:underline text-sm block"
              >
                Ir al login
              </button>
              <button 
                onClick={() => router.push("/register")} 
                className="text-gray-600 hover:underline text-sm block"
              >
                Crear cuenta nueva
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}