"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"   // 👈 añadido
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
  refreshUserProfile: () => Promise<void>
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

  const pathname = usePathname() // 👈 saber en qué ruta estamos

  const isInitializedRef = useRef(false)
  const currentUserIdRef = useRef<string | null>(null)
  const currentUserRef = useRef<User | null>(null)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    // 🚨 Excepción: no validar sesión inmediatamente en /reset-password
    if (pathname.startsWith("/reset-password")) {
      console.log("⏭ Saltando validación inicial en reset-password")
      setIsLoading(false)
      return
    }

    // 🚀 PREVENIR DOBLE INICIALIZACIÓN
    if (isInitializedRef.current) {
      console.log("⚠️ AuthProvider ya inicializado, saltando...")
      return
    }

    console.log("🔄 AuthProvider iniciado")
    isInitializedRef.current = true

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const newUser = session?.user ?? null

        console.log("📋 Sesión inicial:", newUser?.email || "sin usuario")

        setUser(newUser)
        currentUserRef.current = newUser

        if (newUser) {
          currentUserIdRef.current = newUser.id
          await getUserProfile(newUser.id)
        } else {
          currentUserIdRef.current = null
          setUserProfile(null)
          setIsLoading(false)
        }

        if (!subscriptionRef.current) {
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            const newUser = session?.user ?? null
            const newUserId = newUser?.id ?? null
            const previousUserId = currentUserIdRef.current
            const previousUser = currentUserRef.current

            const userChanged =
              (!previousUser && newUser) ||
              (previousUser && !newUser) ||
              previousUser?.id !== newUser?.id

            if (userChanged) {
              console.log("🔄 Usuario cambió:", {
                de: previousUser?.email || "null",
                a: newUser?.email || "null",
              })

              setUser(newUser)
              currentUserRef.current = newUser

              if (newUser && newUserId) {
                if (newUserId !== previousUserId) {
                  console.log("🧹 Limpiando perfil anterior")
                  setUserProfile(null)
                  setIsLoading(true)
                }
                currentUserIdRef.current = newUserId
                getUserProfile(newUserId)
              } else {
                currentUserIdRef.current = null
                setUserProfile(null)
                setIsLoading(false)
              }
            }
          })

          subscriptionRef.current = subscription
        }
      } catch (error) {
        console.error("💥 Error inicializando auth:", error)
        setIsLoading(false)
      }
    }

    initializeAuth()

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [pathname]) // 👈 dependemos también de la ruta

  const getUserProfile = async (userId: string) => {
    try {
      if (currentUserIdRef.current !== userId) {
        console.log("⚠️ Cancelando petición obsoleta")
        return
      }

      setIsLoading(true)
      console.log("📡 Obteniendo perfil...")

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single()

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

    currentUserIdRef.current = null
    currentUserRef.current = null
    setUser(null)
    setUserProfile(null)
    setIsLoading(false)
  }

  const refreshUserProfile = async () => {
    const currentUser = currentUserRef.current
    if (currentUser) {
      console.log("🔄 Forzando refresh del perfil...")
      await getUserProfile(currentUser.id)
    }
  }

  const value = {
    user,
    userProfile,
    isLoading,
    signOut,
    refreshUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
