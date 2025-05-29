import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseAdmin } from "./supabase-admin"

export async function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
  })
}

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Error getting user:", error)
      return null
    }

    return user
  } catch (error) {
    console.error("Error in getCurrentUser:", error)
    return null
  }
}

export async function getCurrentUserWithProfile() {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from("users")
      .select("role, organization_id, name, email")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Error getting user profile:", error)
      return { user, profile: null }
    }

    return { user, profile }
  } catch (error) {
    console.error("Error in getCurrentUserWithProfile:", error)
    return { user, profile: null }
  }
}
