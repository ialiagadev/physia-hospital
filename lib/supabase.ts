import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente para el lado del cliente (componentes React)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Cliente para el servidor - IMPORTANTE: Usar Service Role para bypasear RLS
export const createServerSupabaseClient = () => {
  // Si tienes Service Role Key, úsala para operaciones del servidor
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (serviceRoleKey) {
    return createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  // Fallback a anon key (pero puede tener limitaciones de RLS)
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}

export { createClient }
