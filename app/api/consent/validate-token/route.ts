import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 })
    }

    // Buscar el token en la base de datos
    const { data: tokenData, error: tokenError } = await supabase
      .from("consent_tokens")
      .select(`
        *,
        consent_forms(*),
        clients(id, name, tax_id)
      `)
      .eq("token", token)
      .eq("used_at", null)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Token no válido o expirado" }, { status: 404 })
    }

    // Verificar si el token ha expirado
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)

    if (now > expiresAt) {
      return NextResponse.json({ error: "El enlace ha expirado" }, { status: 410 })
    }

    // Verificar si ya fue usado
    if (tokenData.used_at) {
      return NextResponse.json({ error: "Este enlace ya ha sido utilizado" }, { status: 410 })
    }

    return NextResponse.json({
      success: true,
      data: {
        token: tokenData,
        consentForm: tokenData.consent_forms,
        client: tokenData.clients,
      },
    })
  } catch (error) {
    console.error("Error validating token:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
