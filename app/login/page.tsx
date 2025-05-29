"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase/client" // Asegúrate de que sea /client
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState("")
  const [sessionData, setSessionData] = useState<any>(null)
  const router = useRouter()

  // Verificar sesión al cargar la página
  useEffect(() => {
    const checkExistingSession = async () => {
      console.log("🔍 Verificando sesión existente...")
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error("❌ Error obteniendo sesión:", error)
          setDebugInfo(`Error sesión: ${error.message}`)
          return
        }
        
        if (session) {
          console.log("✅ Sesión existente encontrada:", {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: new Date(session.expires_at! * 1000).toLocaleString()
          })
          setDebugInfo(`Sesión activa: ${session.user.email}`)
          setSessionData(session)
          // Quitamos la redirección automática
          // router.push("/dashboard")
        } else {
          console.log("ℹ️ No hay sesión activa")
          setDebugInfo("No hay sesión activa")
        }
      } catch (err) {
        console.error("💥 Error verificando sesión:", err)
        setDebugInfo(`Error: ${err}`)
      }
    }
    
    checkExistingSession()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setDebugInfo("Iniciando proceso de login...")
    setSessionData(null)

    try {
      console.log("🚀 Intentando login con:", { email })
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      console.log("📊 Respuesta de login:", { data, error })

      if (error) {
        console.error("❌ Error en login:", error)
        setError(error.message)
        setDebugInfo(`Error login: ${error.message}`)
        return
      }

      if (data.user && data.session) {
        console.log("✅ Login exitoso:", {
          userId: data.user.id,
          email: data.user.email,
          sessionId: data.session.access_token.substring(0, 10) + "...",
          expiresAt: new Date(data.session.expires_at! * 1000).toLocaleString()
        })
        
        setDebugInfo(`Login exitoso: ${data.user.email}`)
        setSessionData(data.session)
        
        // Verificar que la sesión se guardó correctamente
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          console.log("🔄 Verificación post-login:", session ? "Sesión guardada ✅" : "Sesión NO guardada ❌")
          
          if (session) {
            setDebugInfo(`Sesión verificada: ${session.user.email}`)
            setSessionData(session)
            // Quitamos la redirección automática
            // router.push("/dashboard")
          } else {
            setDebugInfo("⚠️ Sesión no se guardó correctamente")
            setError("La sesión no se guardó correctamente. Intenta de nuevo.")
          }
        }, 1000)
      } else {
        console.log("⚠️ Login sin datos de usuario o sesión")
        setDebugInfo("Login sin datos completos")
        setError("Login incompleto. Intenta de nuevo.")
      }
    } catch (err) {
      console.error("💥 Error inesperado:", err)
      setError("Error inesperado al iniciar sesión")
      setDebugInfo(`Error inesperado: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">Ingresa tus credenciales para acceder al sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Debug info */}
          {debugInfo && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <strong>Debug:</strong> {debugInfo}
              </p>
            </div>
          )}
          
          {/* Session data */}
          {sessionData && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-xs text-green-800 mb-2">
                <strong>Sesión activa:</strong>
              </p>
              <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded">
                {JSON.stringify({
                  user: {
                    id: sessionData.user.id,
                    email: sessionData.user.email,
                    role: sessionData.user.role,
                    last_sign_in: sessionData.user.last_sign_in_at
                  },
                  expires_at: new Date(sessionData.expires_at * 1000).toLocaleString(),
                  created_at: new Date(sessionData.created_at * 1000).toLocaleString()
                }, null, 2)}
              </pre>
              <Button 
                className="w-full mt-2" 
                onClick={() => router.push('/dashboard')}
              >
                Ir al Dashboard
              </Button>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}