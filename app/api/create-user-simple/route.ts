// app/api/create-user-simple/route.ts
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: Request) {
  try {
    const { email, password, name, role = "user", organizationId } = await request.json()

    // Validación de entrada
    if (!email || !password || !name || !organizationId) {
      return NextResponse.json({ error: "Faltan datos requeridos." }, { status: 400 })
    }

    // Validar rol
    if (role && !["user", "admin"].includes(role)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 })
    }

    console.log("Creando usuario:", { email, name, organizationId })

    // Usar la Admin API directamente
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        organization_id: organizationId,
        role: role,
      },
    })

    if (error) {
      console.error("Error:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("Usuario creado:", data.user?.id)

    // Si el trigger no asigna la organización automáticamente,
    // actualizamos el registro después de la creación
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        organization_id: organizationId,
        name: name,
        role: role,
      })
      .eq("id", data.user?.id)

    if (updateError) {
      console.error("Error actualizando organización:", updateError)
      // No fallar completamente, solo logear el error
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        name: name,
        role: role,
        organization_id: organizationId,
        created_at: data.user?.created_at,
      },
    })
  } catch (err: any) {
    console.error("Error general:", err)
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 })
  }
}
