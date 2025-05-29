"use server"

import { supabaseAdmin } from "@/utils/supabase-admin"
import { revalidatePath } from "next/cache"

interface CreateUserResult {
  success: boolean
  error?: string
  message?: string
  user?: any
}

export async function createUser(formData: FormData): Promise<CreateUserResult> {
  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string
    const organizationId = formData.get("organization_id") as string
    const role = (formData.get("role") as string) || "user"

    // Validación de campos requeridos
    if (!email || !password) {
      return {
        error: "Email y contraseña son requeridos",
        success: false,
      }
    }

    if (password.length < 6) {
      return {
        error: "La contraseña debe tener al menos 6 caracteres",
        success: false,
      }
    }

    // Verificar si el usuario ya existe en auth.users
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers.users.find((user) => user.email === email)

    if (existingAuthUser) {
      return {
        error: `Ya existe un usuario con el email ${email}`,
        success: false,
      }
    }

    // Determinar la organización para el nuevo usuario
    let userOrganizationId = organizationId

    // Si no se especificó organización, usar la primera disponible
    if (!userOrganizationId) {
      const { data: orgs } = await supabaseAdmin.from("organizations").select("id").limit(1)
      if (orgs && orgs.length > 0) {
        userOrganizationId = orgs[0].id
      }
    }

    // Verificar que tenemos una organización
    if (!userOrganizationId) {
      return {
        error: "No se pudo determinar la organización para el nuevo usuario",
        success: false,
      }
    }

    // 1. Crear el usuario en auth.users
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || email.split("@")[0],
      },
    })

    if (error) {
      console.error("Error al crear usuario en auth:", error)
      return {
        error: `Error de Supabase Auth: ${error.message}`,
        success: false,
      }
    }

    if (!data.user) {
      return {
        error: "No se pudo crear el usuario en auth",
        success: false,
      }
    }

    // 2. Insertar el usuario en nuestra tabla personalizada
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id: data.user.id,
      email: data.user.email,
      name: name || data.user.email?.split("@")[0],
      organization_id: userOrganizationId,
      role: role || "user",
    })

    if (insertError) {
      console.error("Error al insertar usuario en tabla personalizada:", insertError)

      // Intentar eliminar el usuario de auth si falló la inserción en la tabla personalizada
      try {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      } catch (deleteError) {
        console.error("Error al eliminar usuario de auth:", deleteError)
      }

      return {
        error: `Error al guardar en la base de datos: ${insertError.message}`,
        success: false,
      }
    }

    // Obtener información de la organización para el mensaje
    const { data: orgData } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", userOrganizationId)
      .single()

    // Revalidamos la ruta para actualizar la UI
    revalidatePath("/admin/users")

    return {
      user: data.user,
      success: true,
      message: `Usuario ${data.user.email} creado exitosamente en la organización "${orgData?.name || userOrganizationId}"`,
    }
  } catch (error) {
    console.error("Error inesperado:", error)
    return {
      error: `Error inesperado: ${error instanceof Error ? error.message : "Error desconocido"}`,
      success: false,
    }
  }
}
