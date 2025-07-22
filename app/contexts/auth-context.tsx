"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

type UserProfile = {
  id: string
  email: string
  name: string
  role: string
  organization_id: number
  is_physia_admin: boolean
}

type AuthContextType = {
  user: User | null
  userProfile: UserProfile | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Ref para rastrear el userId actual y evitar condiciones de carrera
  const currentUserIdRef = useRef<string | null>(null)
  const currentUserRef = useRef<User | null>(null)

  useEffect(() => {
    console.log("🔄 AuthProvider iniciado")

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const newUser = session?.user ?? null
      console.log("📋 Sesión inicial:", newUser?.email || "sin usuario")

      setUser(newUser)
      currentUserRef.current = newUser

      if (newUser) {
        currentUserIdRef.current = newUser.id
        getUserProfile(newUser.id)
      } else {
        currentUserIdRef.current = null
        setUserProfile(null)
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null
      const newUserId = newUser?.id ?? null
      const previousUserId = currentUserIdRef.current
      const previousUser = currentUserRef.current

      // Solo actualizar si realmente cambió el usuario
      const userChanged = (!previousUser && newUser) || (previousUser && !newUser) || previousUser?.id !== newUser?.id

      if (userChanged) {
        console.log("🔄 Usuario cambió:", {
          de: previousUser?.email || "null",
          a: newUser?.email || "null",
        })

        setUser(newUser)
        currentUserRef.current = newUser

        if (newUser && newUserId) {
          // Si es un usuario diferente, limpiar el perfil anterior inmediatamente
          if (newUserId !== previousUserId) {
            console.log("🧹 Limpiando perfil anterior")
            setUserProfile(null)
            setIsLoading(true)
          }

          currentUserIdRef.current = newUserId
          getUserProfile(newUserId)
        } else {
          // No hay usuario, limpiar todo
          currentUserIdRef.current = null
          setUserProfile(null)
          setIsLoading(false)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const getUserProfile = async (userId: string) => {
    try {
      // Verificar que este userId sigue siendo el actual antes de hacer la petición
      if (currentUserIdRef.current !== userId) {
        console.log("⚠️ Cancelando petición obsoleta")
        return
      }

      setIsLoading(true)
      console.log("📡 Obteniendo perfil...")

      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

      // Verificar nuevamente que este userId sigue siendo el actual después de la petición
      if (currentUserIdRef.current !== userId) {
        console.log("⚠️ Ignorando resultado obsoleto")
        return
      }

      if (error) {
        console.error("❌ Error obteniendo perfil:", error)
        setUserProfile(null)
      } else {
        console.log("✅ Perfil obtenido:", data?.name)
        setUserProfile(data)
      }
    } catch (error) {
      console.error("💥 Error inesperado:", error)
      if (currentUserIdRef.current === userId) {
        setUserProfile(null)
      }
    } finally {
      if (currentUserIdRef.current === userId) {
        setIsLoading(false)
      }
    }
  }

  const signOut = async () => {
    console.log("🚪 Cerrando sesión...")
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("❌ Error en logout:", error)
    }

    // Limpiar estado local
    currentUserIdRef.current = null
    currentUserRef.current = null
    setUser(null)
    setUserProfile(null)
    setIsLoading(false)
  }

  const value = {
    user,
    userProfile,
    isLoading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
