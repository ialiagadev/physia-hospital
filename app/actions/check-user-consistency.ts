"use server"

import { supabaseAdmin } from "@/utils/supabase-admin"

interface ConsistencyResult {
  success?: boolean
  error?: string
  authUsersCount?: number
  customUsersCount?: number
  missingInCustom?: Array<{ id: string; email?: string }>
  orphanedUsers?: Array<{ id: string; email: string }>
}

export async function checkUserConsistency(): Promise<ConsistencyResult> {
  try {
    // Obtener todos los usuarios de auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      return { error: `Error al obtener usuarios de auth: ${authError.message}` }
    }

    // Obtener todos los usuarios de nuestra tabla personalizada
    const { data: customUsers, error: customError } = await supabaseAdmin.from("users").select("id, email")

    if (customError) {
      return { error: `Error al obtener usuarios personalizados: ${customError.message}` }
    }

    const authUserIds = new Set(authUsers.users.map((user) => user.id))
    const customUserIds = new Set(customUsers?.map((user) => user.id) || [])

    // Usuarios que están en auth pero no en nuestra tabla
    const missingInCustom = authUsers.users.filter((user) => !customUserIds.has(user.id))

    // Usuarios que están en nuestra tabla pero no en auth (huérfanos)
    const orphanedUsers = customUsers?.filter((user) => !authUserIds.has(user.id)) || []

    return {
      success: true,
      authUsersCount: authUsers.users.length,
      customUsersCount: customUsers?.length || 0,
      missingInCustom,
      orphanedUsers,
    }
  } catch (error) {
    return {
      error: `Error inesperado: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}
