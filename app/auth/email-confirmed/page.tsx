"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export default function EmailConfirmed() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("Verificando cuenta...")
  const router = useRouter()
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) return
    hasProcessed.current = true

    const handleEmailConfirmation = async () => {
      try {
        // Verificar que hay una sesión activa
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          console.error("❌ No hay sesión activa:", sessionError)
          setStatus("error")
          setMessage("Error: No se encontró una sesión válida")
          return
        }

        const user = session.user
        console.log("✅ Procesando confirmación para:", user.email)

        // Aquí puedes agregar tu lógica de confirmación de email
        // Por ahora, simplemente redirigimos al login
        setStatus("success")
        setMessage("¡Email confirmado! Redirigiendo al login...")

        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } catch (error) {
        console.error("❌ Error:", error)
        setStatus("error")
        setMessage("Error al procesar la confirmación")
      }
    }

    handleEmailConfirmation()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === "loading" && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
            {status === "loading" && "Procesando..."}
            {status === "success" && "¡Listo!"}
            {status === "error" && "Error"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Confirmando tu email"}
            {status === "success" && "Email confirmado exitosamente"}
            {status === "error" && "Hubo un problema"}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
