"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
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
  const { user, refreshUserProfile } = useAuth()

  // Mover la función fuera del useEffect para que sea accesible desde handleSetPassword
  const createUserFromInvitation = useCallback(async (currentUser: any, urlOrganizationId?: string | null) => {
    try {
      console.log("👤 DATOS COMPLETOS DEL USUARIO:", currentUser)

      // Obtener parámetros de la URL como fallback
      const urlParams = new URLSearchParams(window.location.search)
      const urlRole = urlParams.get("role")

      // Los metadatos pueden estar en diferentes lugares dependiendo de cómo llegue la invitación
      const userMetadata = currentUser.user_metadata || {}
      const appMetadata = currentUser.app_metadata || {}

      console.log("👤 METADATOS COMPLETOS:")
      console.log("   - user_metadata:", userMetadata)
      console.log("   - app_metadata:", appMetadata)
      console.log("   - URL role:", urlRole)

      // Buscar organization_id en diferentes lugares
      const organizationId = userMetadata.organization_id || appMetadata.organization_id || urlOrganizationId

      // Buscar el nombre - CORREGIDO: buscar en más lugares y usar fallbacks
      const userName =
        userMetadata.full_name ||
        userMetadata.name ||
        appMetadata.full_name ||
        appMetadata.name ||
        userMetadata.display_name ||
        appMetadata.display_name ||
        currentUser.email?.split("@")[0] ||
        "Usuario"

      // Buscar el rol - CORREGIDO: usar URL como fallback y validar
      let userRole = userMetadata.role || appMetadata.role || urlRole || "user"

      // Validar que el rol sea válido
      const validRoles = ["user", "admin", "coordinador"]
      if (!validRoles.includes(userRole)) {
        console.warn("⚠️ Rol inválido encontrado:", userRole, "- usando 'user' por defecto")
        userRole = "user"
      }

      console.log("👤 DATOS EXTRAÍDOS FINALES:")
      console.log("   - Organization ID:", organizationId)
      console.log("   - Name:", userName)
      console.log("   - Role:", userRole)

      if (!organizationId) {
        console.error("❌ No se encontró organization_id en ninguna parte")
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
        // Verificar si es un error de duplicado
        if (createError.code === "23505") {
          // Código de error de duplicado en PostgreSQL
          console.log("⚠️ El usuario ya existe, intentando actualizar...")
          // Intentar actualizar en lugar de insertar
          const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update({
              name: userName,
              role: userRole,
              organization_id: organizationId,
            })
            .eq("id", currentUser.id)
            .select()
            .single()

          if (updateError) {
            console.error("❌ Error actualizando usuario:", updateError)
            setStatus("error")
            setMessage(`Error al actualizar el usuario: ${updateError.message}`)
            return
          }

          console.log("✅ Usuario actualizado exitosamente:", updatedUser)
          return
        }

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
  }, [])

  // Función para procesar el usuario
  const processUser = useCallback(
    async (currentUser: any, urlOrganizationId?: string | null) => {
      try {
        console.log("✅ PROCESANDO USUARIO:")
        console.log("   - User ID:", currentUser.id)
        console.log("   - Email:", currentUser.email)
        console.log("   - Email confirmed:", currentUser.email_confirmed_at)
        console.log("   - User Metadata:", currentUser.user_metadata)
        console.log("   - App Metadata:", currentUser.app_metadata)
        console.log("   - URL Organization ID:", urlOrganizationId)

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

          // Obtener datos actualizados de los metadatos
          const urlParams = new URLSearchParams(window.location.search)
          const urlRole = urlParams.get("role")
          const userMetadata = currentUser.user_metadata || {}
          const appMetadata = currentUser.app_metadata || {}

          const userName =
            userMetadata.full_name ||
            userMetadata.name ||
            appMetadata.full_name ||
            appMetadata.name ||
            userMetadata.display_name ||
            appMetadata.display_name ||
            currentUser.email?.split("@")[0] ||
            "Usuario"

          let userRole = userMetadata.role || appMetadata.role || urlRole || "user"

          // Validar que el rol sea válido según la tabla
          const validRoles = ["user", "admin", "coordinador"]
          if (!validRoles.includes(userRole)) {
            console.warn("⚠️ Rol inválido encontrado:", userRole, "- usando 'user' por defecto")
            userRole = "user"
          }

          // ✅ SIEMPRE actualizar name y role, y organización si es necesario
          const shouldUpdateOrg =
            urlOrganizationId && (!existingUser.organization_id || existingUser.organization_id === "null")

          console.log("🔄 Actualizando usuario existente con:")
          console.log("   - Organization ID actual:", existingUser.organization_id)
          console.log("   - Organization ID nuevo:", shouldUpdateOrg ? urlOrganizationId : "sin cambios")
          console.log("   - Name actual:", existingUser.name)
          console.log("   - Name nuevo:", userName)
          console.log("   - Role actual:", existingUser.role)
          console.log("   - Role nuevo:", userRole)

          // ✅ SIEMPRE actualizar name y role
          const updateData: any = {
            name: userName,
            role: userRole,
          }

          // Solo actualizar organización si es necesario
          if (shouldUpdateOrg) {
            updateData.organization_id = urlOrganizationId
          }

          console.log("📝 Datos que se van a actualizar:", updateData)

          const { data: updatedUser, error: updateError } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", currentUser.id)
            .select()
            .single()

          if (updateError) {
            console.error("❌ Error actualizando usuario:", updateError)
          } else {
            console.log("✅ Usuario actualizado completamente:", updatedUser)
          }
        } else {
          // Crear usuario usando los metadatos de la invitación
          console.log("🔄 Creando usuario en la tabla...")
          await createUserFromInvitation(currentUser, urlOrganizationId)
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
    },
    [createUserFromInvitation, refreshUserProfile],
  )

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
        const token = urlParams.get("token")
        const type = urlParams.get("type")
        const organizationId = urlParams.get("organization_id")
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")

        console.log("🔑 PARÁMETROS ENCONTRADOS:")
        console.log("   - Token (query):", token ? "✅ Presente" : "❌ Ausente")
        console.log("   - Type:", type)
        console.log("   - Organization ID:", organizationId)
        console.log("   - Access Token (hash):", accessToken ? "✅ Presente" : "❌ Ausente")
        console.log("   - Refresh Token (hash):", refreshToken ? "✅ Presente" : "❌ Ausente")

        // Método 1: Si tenemos access_token y refresh_token en el hash
        if (accessToken && refreshToken) {
          console.log("🔄 Método 1: Estableciendo sesión con tokens del hash...")
          setMessage("Estableciendo tu sesión...")

          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
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
            await processUser(currentUser, organizationId)
            return
          }
        }

       // Método 2: Si tenemos token en query params
if (token && type === "invite") {
  console.log("🔄 Método 2: Verificando token de invitación...")
  setMessage("Verificando tu invitación...")

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: "invite",
  })

  if (error) {
    console.error("❌ Error verificando invitación:", error)
    setStatus("error")
    setMessage("El enlace de invitación es inválido o ha expirado. Solicita una nueva invitación.")
    return
  }

  const currentUser = data?.user
  if (currentUser) {
    console.log("✅ Token verificado correctamente (aunque no haya sesión activa)")
    // ⚡️ Forzar procesamiento aunque no exista sesión todavía
    await processUser(currentUser, organizationId)
    return
  }

  console.warn("⚠️ No se recibió user en verifyOtp, continuando con otros métodos...")
}


        // Método 3: Esperar a que Supabase procese automáticamente
        console.log("🔄 Método 3: Esperando procesamiento automático...")
        setMessage("Procesando automáticamente...")

        // Esperar un momento para que Supabase procese la URL
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("❌ Error obteniendo sesión:", sessionError)
          setStatus("error")
          setMessage(`Error al procesar la invitación: ${sessionError.message}`)
          return
        }

        if (session?.user) {
          console.log("✅ Sesión obtenida automáticamente")
          await processUser(session.user, organizationId)
          return
        }

        // Método 4: Intentar refresh
        console.log("🔄 Método 4: Intentando refresh de sesión...")
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

        if (!refreshError && refreshData.session?.user) {
          console.log("✅ Sesión obtenida después del refresh")
          await processUser(refreshData.session.user, organizationId)
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

    handleInviteCallback()
  }, [processUser])

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

      // Verificar que el usuario existe en la tabla
      const { data: userCheck, error: userCheckError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userInfo.id)
        .single()

      console.log("📊 VERIFICACIÓN FINAL DE USUARIO:")
      console.log("   - Error:", userCheckError)
      console.log("   - Usuario:", userCheck)

      if (!userCheck) {
        console.error("❌ Usuario no encontrado en la tabla después de establecer contraseña")
        // Intentar crear el usuario una última vez
        const urlParams = new URLSearchParams(window.location.search)
        const organizationId = urlParams.get("organization_id")
        await createUserFromInvitation(userInfo, organizationId)
      }

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
