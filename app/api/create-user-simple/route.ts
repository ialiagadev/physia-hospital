import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Cliente normal para enviar Magic Link
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Cliente admin para operaciones posteriores
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: Request) {
  try {
    const { email, name, role = "user", organizationId } = await request.json()

    // Validación de entrada
    if (!email || !name || !organizationId) {
      return NextResponse.json({ error: "Faltan datos requeridos." }, { status: 400 })
    }

    // Validar rol
    if (role && !["user", "admin", "coordinador"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 })
    }

    console.log("🔄 Enviando Magic Link para nuevo usuario:", { email, name, organizationId, role })

    // 1. ENVIAR MAGIC LINK con callback específico para invitaciones
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/invite-callback`, // ← Callback específico
        data: {
          full_name: name,
          organization_id: organizationId,
          role: role,
          invite_type: "user_invitation", // ← Marcador para distinguir
        },
      },
    })

    if (error) {
      console.error("❌ Error enviando Magic Link:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("✅ Magic Link enviado exitosamente")
    console.log("📧 Email enviado a:", email)

    return NextResponse.json({
      success: true,
      message: `Magic Link enviado a ${email}. El usuario recibirá un email para acceder y unirse a la organización.`,
      user: {
        email: email,
        name: name,
        role: role,
        organization_id: organizationId,
      },
    })
  } catch (err: any) {
    console.error("💥 Error general:", err)
    return NextResponse.json({ error: "Error interno del servidor: " + err.message }, { status: 500 })
  }
}
