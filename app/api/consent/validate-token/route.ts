import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token es requerido" }, { status: 400 })
    }

    // Buscar el token con todos los datos relacionados
    const { data: tokenData, error: tokenError } = await supabase
      .from("consent_tokens")
      .select(`
        *,
        consent_forms (*),
        clients (id, name, tax_id)
      `)
      .eq("token", token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Token no encontrado o inválido" }, { status: 404 })
    }

    // Verificar si el token ya fue usado
    if (tokenData.used_at) {
      return NextResponse.json({ error: "Este consentimiento ya ha sido firmado" }, { status: 400 })
    }

    // Verificar si el token ha expirado
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: "El enlace ha expirado" }, { status: 400 })
    }

    // Verificar que el formulario de consentimiento esté activo
    if (!tokenData.consent_forms.is_active) {
      return NextResponse.json({ error: "Este formulario de consentimiento ya no está disponible" }, { status: 400 })
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
    console.error("Error validating consent token:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
