import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Cliente admin para invitar usuarios
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

    console.log("🔄 Enviando invitación para nuevo usuario:", {
      email,
      name,
      organizationId,
      role,
    })

    // URL base del sitio
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

    // ✅ CORREGIDO: Quité "/auth" y agregué role
    const redirectUrl = `${siteUrl}/invite-callback?type=invite&organization_id=${organizationId}&role=${role}`

    // 1. ENVIAR INVITACIÓN con inviteUserByEmail
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: name,
        organization_id: organizationId,
        role: role,
        invite_type: "user_invitation",
      },
      redirectTo: redirectUrl,
    })

    if (error) {
      console.error("❌ Error enviando invitación:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("✅ Invitación enviada exitosamente")
    console.log("📧 Email enviado a:", email)
    console.log("👤 Usuario creado con ID:", data.user?.id)
    console.log("🔗 URL de redirección:", redirectUrl)

    // 2. CREAR USUARIO EN LA TABLA INMEDIATAMENTE
    if (data.user?.id) {
      console.log("🔄 Creando usuario en la tabla users...")
      const { data: newUser, error: createUserError } = await supabaseAdmin
        .from("users")
        .insert({
          id: data.user.id,
          email: email,
          name: name,
          role: role,
          organization_id: organizationId,
          type: 1,
          is_physia_admin: false,
        })
        .select()
        .single()

      if (createUserError) {
        console.error("❌ Error creando usuario en tabla:", createUserError)
        // No fallar la invitación por esto, solo loggear
        console.warn("⚠️ La invitación se envió pero no se pudo crear el registro en la tabla")
      } else {
        console.log("✅ Usuario creado en tabla exitosamente:", newUser)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Invitación enviada a ${email}. El usuario recibirá un email para establecer su contraseña y unirse a la organización.`,
      user: {
        id: data.user?.id,
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
