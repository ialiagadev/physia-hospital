"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Usuario, Profesional } from "@/types/tasks"

export function useProfessionals() {
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      // Obtener datos del usuario actual
      const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single()

      if (!userData?.organization_id) {
        throw new Error("Usuario sin organización")
      }

      // Transformar usuario actual
      const usuarioActual: Usuario = {
        id: userData.id,
        created_at: userData.created_at ? new Date(userData.created_at) : undefined,
        email: userData.email,
        organization_id: userData.organization_id,
        role: userData.role,
        name: userData.name || userData.email || "Usuario sin nombre",
        avatar_url: userData.avatar_url,
        is_physia_admin: userData.is_physia_admin,
        type: userData.type || 1,
        prompt: userData.prompt,
      }

      setCurrentUser(usuarioActual)

      // Obtener todos los usuarios de la organización
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("organization_id", userData.organization_id)
        .order("name", { ascending: true })

      if (usersError) throw usersError

      // Transformar usuarios
      const usuariosTransformados: Usuario[] = (usersData || []).map((user) => ({
        id: user.id,
        created_at: user.created_at ? new Date(user.created_at) : undefined,
        email: user.email,
        organization_id: user.organization_id,
        role: user.role,
        name: user.name || user.email || "Usuario sin nombre",
        avatar_url: user.avatar_url,
        is_physia_admin: user.is_physia_admin,
        type: user.type || 1,
        prompt: user.prompt,
      }))

      setUsuarios(usuariosTransformados)

      // Transformar a formato Profesional para compatibilidad
      const profesionalesTransformados: Profesional[] = usuariosTransformados.map((user) => ({
        ...user,
        nombre: user.name,
        especialidad: user.role === "admin" ? "Administrador" : "Profesional",
      }))

      setProfesionales(profesionalesTransformados)
    } catch (err) {
      console.error("Error cargando datos:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      toast.error("Error al cargar los datos de usuarios")
    } finally {
      setLoading(false)
    }
  }, [])

  // Función para obtener solo usuarios tipo 1
  const getUsuariosTipo1 = useCallback(() => {
    return usuarios.filter((user) => user.type === 1)
  }, [usuarios])

  // Función para obtener solo usuarios tipo 2
  const getUsuariosTipo2 = useCallback(() => {
    return usuarios.filter((user) => user.type === 2)
  }, [usuarios])

  // Función para obtener profesionales tipo 1 (compatibilidad)
  const getProfesionalesTipo1 = useCallback(() => {
    return profesionales.filter((prof) => prof.type === 1)
  }, [profesionales])

  // Función para obtener usuario por ID
  const getUsuarioPorId = useCallback(
    (id: string) => {
      return usuarios.find((user) => user.id === id)
    },
    [usuarios],
  )

  // Función para obtener nombre de usuario
  const getNombreUsuario = useCallback(
    (id?: string) => {
      if (!id) return "Sin asignar"
      const usuario = usuarios.find((user) => user.id === id)
      return usuario ? usuario.name : "Usuario desconocido"
    },
    [usuarios],
  )

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  return {
    // Datos principales
    profesionales, // Para compatibilidad con código existente
    usuarios, // Nueva estructura de usuarios
    currentUser, // Usuario actual logueado

    // Estados
    loading,
    error,

    // Funciones de filtrado
    usuariosTipo1: getUsuariosTipo1(),
    usuariosTipo2: getUsuariosTipo2(),
    profesionalesTipo1: getProfesionalesTipo1(),

    // Funciones utilitarias
    getUsuarioPorId,
    getNombreUsuario,

    // Función de recarga
    refetch: cargarDatos,
    cargarProfesionales: cargarDatos, // Alias para compatibilidad
  }
}
