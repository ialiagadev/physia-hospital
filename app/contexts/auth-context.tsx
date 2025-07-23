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
  refreshUserProfile: () => Promise<void>
  forceRefresh: () => Promise<void>
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
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    console.log("🔄 AuthProvider iniciado")

    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    // Get initial session con delay para asegurar que esté completamente establecida
    const initializeAuth = async () => {
      // Pequeño delay para asegurar que la sesión esté lista
      await new Promise((resolve) => setTimeout(resolve, 100))

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
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state change:", event)

      const newUser = session?.user ?? null
      const newUserId = newUser?.id ?? null
      const previousUserId = currentUserIdRef.current
      const previousUser = currentUserRef.current

      console.log("🔄 Usuario cambió:", {
        event,
        de: previousUser?.email || "null",
        a: newUser?.email || "null",
      })

      setUser(newUser)
      currentUserRef.current = newUser

      if (newUser && newUserId) {
        // Siempre limpiar y recargar el perfil para asegurar datos frescos
        console.log("🧹 Limpiando perfil para recarga fresca")
        setUserProfile(null)
        setIsLoading(true)
        currentUserIdRef.current = newUserId

        // Pequeño delay para asegurar que la sesión esté completamente establecida
        await new Promise((resolve) => setTimeout(resolve, 200))
        await getUserProfile(newUserId)
      } else {
        // No hay usuario, limpiar todo
        currentUserIdRef.current = null
        setUserProfile(null)
        setIsLoading(false)
      }
    })

    subscriptionRef.current = subscription

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [])

  const getUserProfile = async (userId: string) => {
    try {
      // Verificar que este userId sigue siendo el actual antes de hacer la petición
      if (currentUserIdRef.current !== userId) {
        console.log("⚠️ Cancelando petición obsoleta")
        return
      }

      setIsLoading(true)
      console.log("📡 Obteniendo perfil para usuario:", userId)

      // Retry logic para manejar posibles errores temporales
      let retries = 3
      let data = null
      let error = null

      while (retries > 0 && !data) {
        const result = await supabase
          .from("users")
          .select("id, email, name, role, organization_id, is_physia_admin")
          .eq("id", userId)
          .maybeSingle()

        data = result.data
        error = result.error

        if (error && retries > 1) {
          console.log(`⚠️ Error obteniendo perfil, reintentando... (${retries - 1} intentos restantes)`)
          await new Promise((resolve) => setTimeout(resolve, 500))
        }

        retries--
      }

      // Verificar nuevamente que este userId sigue siendo el actual después de la petición
      if (currentUserIdRef.current !== userId) {
        console.log("⚠️ Ignorando resultado obsoleto")
        return
      }

      if (error) {
        console.error("❌ Error obteniendo perfil:", error)
        console.error("   - Code:", error.code)
        console.error("   - Message:", error.message)
        console.error("   - Details:", error.details)

        // Si es un error 406 o el usuario no existe, puede ser una invitación nueva
        if (error.code === "PGRST116" || error.message?.includes("406")) {
          console.log("🔄 Usuario no encontrado, puede ser una invitación nueva")
        }
        setUserProfile(null)
      } else if (data) {
        console.log("✅ Perfil obtenido:", data.name, "- Org:", data.organization_id)
        setUserProfile(data)
      } else {
        console.log("⚠️ No se encontró perfil para el usuario")
        setUserProfile(null)
      }
    } catch (error) {
      console.error("💥 Error inesperado obteniendo perfil:", error)
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
      // Limpiar suscripción antes del logout
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }

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

  const refreshUserProfile = async () => {
    const currentUser = currentUserRef.current
    if (currentUser) {
      console.log("🔄 Forzando refresh del perfil...")
      await getUserProfile(currentUser.id)
    }
  }

  const forceRefresh = async () => {
    console.log("🔄 Forzando refresh completo...")
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const newUser = session?.user ?? null

    if (newUser) {
      setUser(newUser)
      currentUserRef.current = newUser
      currentUserIdRef.current = newUser.id
      setUserProfile(null)
      setIsLoading(true)
      await getUserProfile(newUser.id)
    }
  }

  const value = {
    user,
    userProfile,
    isLoading,
    signOut,
    refreshUserProfile,
    forceRefresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
