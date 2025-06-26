"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Profesional } from "@/types/tasks"

export function useProfessionals() {
  const [profesionales, setProfesionales] = useState<Profesional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarProfesionales = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      const { data: userData } = await supabase.from("users").select("organization_id").eq("id", user.id).single()

      if (!userData?.organization_id) {
        throw new Error("Usuario sin organización")
      }

      // Consulta simplificada - solo campos que sabemos que existen
      const { data: professionalsData, error: professionalsError } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("organization_id", userData.organization_id)
        .order("name", { ascending: true })

      if (professionalsError) throw professionalsError

      const profesionalesTransformados: Profesional[] = (professionalsData || []).map((prof) => ({
        id: prof.id,
        nombre: prof.name || prof.email || "Usuario sin nombre",
        especialidad: "Profesional",
      }))

      setProfesionales(profesionalesTransformados)
    } catch (err) {
      console.error("Error cargando profesionales:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      toast.error("Error al cargar los profesionales")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarProfesionales()
  }, [cargarProfesionales])

  return {
    profesionales,
    loading,
    error,
    cargarProfesionales,
  }
}
