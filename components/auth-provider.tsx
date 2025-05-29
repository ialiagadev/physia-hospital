"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
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

// Crear el contexto con valores por defecto
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
  userProfile: null,
  refreshUserProfile: async () => {},
})

// Hook para usar el contexto
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const getUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("users")
        .select("*, organizations(*)")
        .eq("id", userId)
        .single()

      if (error) {
        console.log("Error obteniendo perfil:", error)
        if (error.code === "PGRST116") {
          console.warn(
            "Perfil no encontrado para el usuario. Esto puede indicar un problema en el flujo de registro/invitación.",
          )
          setUserProfile(null)
        } else {
          setUserProfile(null)
        }
      } else {
        setUserProfile(profile)
      }
    } catch (err) {
      console.log("Error en getUserProfile:", err)
      setUserProfile(null)
    }
  }

  const refreshUserProfile = async () => {
    if (user) {
      await getUserProfile(user.id)
    }
  }

  useEffect(() => {
    // Listener para cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.email)

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await getUserProfile(session.user.id)
      } else {
        setUserProfile(null)
      }

      setIsLoading(false)
    })

    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.log("Error obteniendo sesión inicial:", error)
          setIsLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await getUserProfile(session.user.id)
        }

        setIsLoading(false)
      } catch (err) {
        console.log("Error en getInitialSession:", err)
        setIsLoading(false)
      }
    }

    getInitialSession()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUserProfile(null)
      setSession(null)
      setUser(null)
      window.location.href = "/login"
    } catch (err) {
      console.log("Error en signOut:", err)
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signOut,
    userProfile,
    refreshUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
