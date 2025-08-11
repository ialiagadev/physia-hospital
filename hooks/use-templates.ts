"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import type { AisensyTemplate, CreateTemplateData } from "@/lib/aisensy-api"

export function useTemplates() {
  const { user, userProfile, isLoading: authLoading } = useAuth()
  const [templates, setTemplates] = useState<AisensyTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wabaProject, setWabaProject] = useState<any>(null)

  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error("No estás autenticado")
    }
    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    }
  }

  const fetchWabaProject = async () => {
    if (!user || !userProfile?.organization_id) return null

    try {
      // 1. Buscar canales de la organización del usuario
      const { data: orgChannels, error: channelsError } = await supabase
        .from("canales_organizations")
        .select(`
          id,
          id_canal,
          canales (
            id,
            name
          )
        `)
        .eq("id_organization", userProfile.organization_id)

      if (channelsError || !orgChannels || orgChannels.length === 0) {
        console.log("❌ No channels found for organization:", channelsError)
        return null
      }

      // 2. Buscar canal de WhatsApp
      const whatsappChannel = orgChannels.find(
        (ch) => ch.canales?.name?.toLowerCase().includes("whatsapp") || ch.id_canal === 1,
      )

      if (!whatsappChannel) {
        console.log("❌ WhatsApp channel not found")
        return null
      }

      // 3. Buscar proyecto WABA vinculado al canal (SIN filtrar por estado)
      const { data: wabaProjects, error: wabaError } = await supabase
        .from("waba")
        .select("*")
        .eq("id_canales_organization", whatsappChannel.id)

      if (wabaError || !wabaProjects || wabaProjects.length === 0) {
        console.log("❌ No WABA projects found:", wabaError)
        return null
      }

      // 4. Preferir el proyecto que tenga token
      const projectWithToken = wabaProjects.find((p) => p.token_proyecto)
      const selectedProject = projectWithToken || wabaProjects[0]

      console.log("✅ WABA project found:", {
        id: selectedProject.id,
        nombre: selectedProject.nombre,
        estado: selectedProject.estado,
        hasToken: !!selectedProject.token_proyecto,
      })

      return selectedProject
    } catch (err) {
      console.error("Error fetching WABA project:", err)
      return null
    }
  }

  const fetchTemplates = async () => {
    console.log("🔍 fetchTemplates called", {
      user: !!user,
      userProfile: !!userProfile,
      wabaProject: !!wabaProject,
    })

    if (!user || !userProfile) {
      console.log("❌ No user or profile, skipping fetch")
      setTemplates([])
      setLoading(false)
      setError("No estás autenticado")
      return
    }

    if (!wabaProject || !wabaProject.token_proyecto) {
      console.log("❌ No WABA project or token, skipping fetch")
      setTemplates([])
      setLoading(false)
      setError("No se encontró configuración de WhatsApp Business")
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("📡 Fetching templates from /api/templates")
      const headers = await getAuthHeaders()

      const response = await fetch("/api/templates", {
        headers,
      })

      console.log("📡 Response status:", response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.log("❌ Response error:", errorText)

        if (response.status === 401) {
          throw new Error("No estás autenticado")
        }
        if (response.status === 404) {
          throw new Error("No se encontró configuración de WhatsApp Business")
        }
        throw new Error(`Error al cargar plantillas: ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Templates received:", data.length || 0)
      setTemplates(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("💥 Error in fetchTemplates:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async (data: CreateTemplateData) => {
    if (!user || !userProfile) {
      throw new Error("No estás autenticado")
    }

    if (!wabaProject || !wabaProject.token_proyecto) {
      throw new Error("No se encontró configuración de WhatsApp Business")
    }

    try {
      const headers = await getAuthHeaders()

      const response = await fetch("/api/templates", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear plantilla")
      }

      const newTemplate = await response.json()
      setTemplates((prev) => [...prev, newTemplate])
      return newTemplate
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al crear plantilla")
    }
  }

  const updateTemplate = async (id: string, data: Partial<CreateTemplateData>) => {
    if (!user || !userProfile) {
      throw new Error("No estás autenticado")
    }

    if (!wabaProject || !wabaProject.token_proyecto) {
      throw new Error("No se encontró configuración de WhatsApp Business")
    }

    try {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar plantilla")
      }

      const updatedTemplate = await response.json()
      setTemplates((prev) => prev.map((template) => (template.id === id ? updatedTemplate : template)))
      return updatedTemplate
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al actualizar plantilla")
    }
  }

  const deleteTemplate = async (id: string, name: string) => {
    if (!user || !userProfile) {
      throw new Error("No estás autenticado")
    }

    if (!wabaProject || !wabaProject.token_proyecto) {
      throw new Error("No se encontró configuración de WhatsApp Business")
    }

    try {
      const headers = await getAuthHeaders()

      const response = await fetch(`/api/templates/${name}`, {
        method: "DELETE",
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar plantilla")
      }

      setTemplates((prev) => prev.filter((template) => template.id !== id))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Error al eliminar plantilla")
    }
  }

  const duplicateTemplate = async (template: AisensyTemplate) => {
    const duplicatedData: CreateTemplateData = {
      name: `${template.name}_copy`,
      category: template.category,
      language: template.language,
      components: template.components,
    }

    return createTemplate(duplicatedData)
  }

  // Efecto para cargar el proyecto WABA y luego las plantillas
  useEffect(() => {
    console.log("🔄 useTemplates useEffect", {
      authLoading,
      user: !!user,
      userProfile: !!userProfile,
      organizationId: userProfile?.organization_id,
    })

    if (!authLoading && user && userProfile?.organization_id) {
      fetchWabaProject().then((waba) => {
        setWabaProject(waba)
        if (waba && waba.token_proyecto) {
          fetchTemplates()
        } else {
          setTemplates([])
          setLoading(false)
          setError("No se encontró configuración de WhatsApp Business")
        }
      })
    } else if (!authLoading) {
      if (!user || !userProfile) {
        setTemplates([])
        setLoading(false)
        setError("No estás autenticado")
      }
    }
  }, [user, userProfile, authLoading])

  // Efecto separado para cargar plantillas cuando el WABA project cambie
  useEffect(() => {
    if (wabaProject && wabaProject.token_proyecto && user && userProfile) {
      fetchTemplates()
    }
  }, [wabaProject])

  return {
    templates,
    loading: loading || authLoading,
    error,
    wabaProject,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  }
}
