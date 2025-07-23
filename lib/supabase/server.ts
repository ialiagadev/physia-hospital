import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          const cookieStore = cookies()
          return cookieStore.get(key)?.value ?? null
        },
        setItem: (key: string, value: string) => {
          const cookieStore = cookies()
          cookieStore.set(key, value)
        },
        removeItem: (key: string) => {
          const cookieStore = cookies()
          cookieStore.delete(key)
        },
      },
    },
  })
}
