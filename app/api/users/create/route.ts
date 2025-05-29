import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"

// Cliente admin de Supabase con service role key
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    console.log("API route /api/users/create iniciada")
    const { email, firstName, lastName, role = "user", password } = await request.json()

    // Validar datos requeridos
    if (!email || !password || !firstName || !lastName) {
      console.log("Datos incompletos:", { email, firstName, lastName, password: "***" })
      return NextResponse.json({ error: "Email, contraseña, nombre y apellido son requeridos" }, { status: 400 })
    }

    // Verificar autenticación del usuario actual
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("Token de autorización no proporcionado")
      return NextResponse.json({ error: "Token de autorización requerido" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verificar el token del usuario actual
    console.log("Verificando token del usuario actual")
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !currentUser) {
      console.error("Error verificando token:", authError)
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Verificar que el usuario actual es admin
    console.log("Obteniendo perfil del usuario actual:", currentUser.id)
    const { data: currentUserProfile, error: profileError } = await supabase
      .from("users")
      .select("role, organization_id")
      .eq("id", currentUser.id)
      .single()

    if (profileError) {
      console.error("Error obteniendo perfil:", profileError)
      return NextResponse.json({ error: "Error obteniendo perfil de usuario" }, { status: 500 })
    }

    if (currentUserProfile?.role !== "admin") {
      console.log("Usuario no es admin:", currentUserProfile?.role)
      return NextResponse.json({ error: "Solo los administradores pueden crear usuarios" }, { status: 403 })
    }

    // Crear usuario usando Supabase Admin API
    console.log("Creando usuario en Auth:", { email, firstName, lastName })
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        must_change_password: true, // Forzar cambio de contraseña en primer login
      },
    })

    if (createUserError) {
      console.error("Error creando usuario en Auth:", createUserError)
      return NextResponse.json({ error: createUserError.message }, { status: 400 })
    }

    if (!newUser?.user) {
      console.error("Usuario no creado (respuesta vacía)")
      return NextResponse.json({ error: "Error: Usuario no creado" }, { status: 500 })
    }

    console.log("Usuario creado en Auth:", newUser.user.id)

    // Crear perfil en la tabla users
    console.log("Creando perfil en tabla users:", {
      id: newUser.user.id,
      email: newUser.user.email,
      organization_id: currentUserProfile.organization_id,
    })

    const { error: insertProfileError } = await supabaseAdmin.from("users").insert({
      id: newUser.user.id,
      email: newUser.user.email,
      name: `${firstName} ${lastName}`,
      role,
      organization_id: currentUserProfile.organization_id,
      is_physia_admin: false,
    })

    if (insertProfileError) {
      console.error("Error creando perfil:", insertProfileError)

      // Si falla la creación del perfil, eliminar el usuario de Auth
      console.log("Eliminando usuario de Auth debido a error:", newUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)

      return NextResponse.json({ error: "Error creando perfil de usuario" }, { status: 500 })
    }

    console.log("Usuario creado exitosamente:", {
      id: newUser.user.id,
      email: newUser.user.email,
      name: `${firstName} ${lastName}`,
      role,
    })

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        name: `${firstName} ${lastName}`,
        role,
        temporaryPassword: password,
      },
    })
  } catch (error) {
    console.error("Error inesperado en creación de usuario:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
