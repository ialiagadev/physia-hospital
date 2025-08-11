"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import type { WabaProject } from "@/lib/database"

export function useWabaProject() {
  const { user, userProfile, isLoading: authLoading } = useAuth()
  const [wabaProject, setWabaProject] = useState<WabaProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWabaProject = async () => {
    if (!user || !userProfile?.organization_id) {
      setWabaProject(null)
      setLoading(false)
      setError("No tienes organización asignada")
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 Fetching WABA for organization:", userProfile.organization_id)

      // Buscar el canal de WhatsApp para esta organización
      const { data: canalData, error: canalError } = await supabase
        .from("canales_organizations")
        .select("id")
        .eq("id_organization", userProfile.organization_id)
        .eq("estado", true)
        .single()

      if (canalError || !canalData) {
        console.error("❌ Error fetching organization channel:", canalError)
        setError("No se encontró configuración de canal para tu organización")
        return
      }

      console.log("✅ Organization channel found:", canalData.id)

      // Buscar el WABA asociado a este canal
      const { data: wabaData, error: wabaError } = await supabase
        .from("waba")
        .select("*")
        .eq("id_canales_organization", canalData.id)
        .eq("estado", 1) // Solo proyectos activos
        .single()

      if (wabaError || !wabaData) {
        console.error("❌ Error fetching WABA project:", wabaError)
        setError("No se encontró configuración de WhatsApp Business para tu organización")
        return
      }

      console.log("✅ WABA project found:", wabaData.nombre)
      setWabaProject(wabaData)
    } catch (err) {
      console.error("💥 Error in fetchWabaProject:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      setWabaProject(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user && userProfile?.organization_id) {
      fetchWabaProject()
    } else if (!authLoading && (!user || !userProfile?.organization_id)) {
      setWabaProject(null)
      setLoading(false)
      setError("No tienes organización asignada")
    }
  }, [user, userProfile?.organization_id, authLoading])

  return {
    wabaProject,
    loading: loading || authLoading,
    error,
    fetchWabaProject,
  }
}
