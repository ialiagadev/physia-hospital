"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Session, User } from "@supabase/supabase-js"

// Definir el tipo para el perfil de usuario
type UserProfile = {
  id: string
  email: string
  name: string
  role: string
  organization_id: string
  is_physia_admin: boolean
  organizations?: any
}

// Definir el tipo del contexto
type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
  userProfile: UserProfile | null
  refreshUserProfile: () => Promise<void>
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | null>(null)

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getUserProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("users")
        .select("*, organizations(*)")
        .eq("id", userId)
        .single()

      if (error) {
        setUserProfile(null)
      } else {
        setUserProfile(profile)
      }
    } catch (err) {
      setUserProfile(null)
    }
  }, [])

  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await getUserProfile(user.id)
    }
  }, [user, getUserProfile])

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUserProfile(null)
      setSession(null)
      setUser(null)
      window.location.href = "/login"
    } catch (err) {
      console.error("Error en signOut:", err)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          setIsLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await getUserProfile(session.user.id)
        } else {
          setUserProfile(null)
        }

        setIsLoading(false)
      } catch (err) {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (event !== "INITIAL_SESSION") {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await getUserProfile(session.user.id)
        } else {
          setUserProfile(null)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [getUserProfile])

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signOut,
    userProfile,
    refreshUserProfile,
  }

  if (isLoading) {
    return (
      <AuthContext.Provider value={value}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Cargando...</p>
          </div>
        </div>
      </AuthContext.Provider>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
