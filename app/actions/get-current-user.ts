"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/utils/supabase-admin"

interface UserProfile {
  role: string
  organization_id: string
  name: string
  email: string
}

interface CurrentUserResult {
  success: boolean
  user?: UserProfile
  error?: string
}

export async function getCurrentUserProfile(): Promise<CurrentUserResult> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options })
          },
        },
      },
    )

    // Obtener el usuario actual
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      return {
        success: false,
        error: `Error de autenticación: ${authError.message}`,
      }
    }

    if (!user) {
      return {
        success: false,
        error: "No hay sesión activa",
      }
    }

    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role, organization_id, name, email")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return {
        success: false,
        error: `Error al obtener perfil: ${profileError.message}`,
      }
    }

    return {
      success: true,
      user: profile,
    }
  } catch (error) {
    return {
      success: false,
      error: `Error inesperado: ${error instanceof Error ? error.message : "Error desconocido"}`,
    }
  }
}
