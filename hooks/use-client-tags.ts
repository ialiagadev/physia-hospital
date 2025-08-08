import { useState, useEffect } from 'react'
import { toast } from '@/hooks/use-toast'

// Interfaces locales para el hook
interface ClientTag {
  id: string
  client_id: number
  tag_name: string
  color: string
  created_by: string
  created_at: string
  updated_at: string
  source: 'manual' | 'conversation' | 'automated'
  user?: {
    id: string
    name?: string
    email?: string
  }
}

interface TagStats {
  organization_id: number
  tag_name: string
  client_count: number
  whatsapp_clients: number
  instagram_clients: number
  facebook_clients: number
  webchat_clients: number
  clients_with_email: number
  clients_with_phone: number
}

interface MarketingCampaignTarget {
  client_id: number
  client_name: string
  client_email?: string
  client_phone?: string
  client_channel?: string
  tags_count: number
  matching_tags: string[]
}

// Servicio simplificado con llamadas a API
class ClientTagsService {
  static async getClientTags(clientId: number): Promise<ClientTag[]> {
    try {
      const response = await fetch(`/api/clients/${clientId}/tags`)
      if (!response.ok) {
        throw new Error('Error al cargar las etiquetas del cliente')
      }
      const data = await response.json()
      return data.tags || []
    } catch (error) {
      console.error('Error fetching client tags:', error)
      throw error
    }
  }

  static async addTagToClient(
    clientId: number, 
    tagName: string, 
    createdBy: string, 
    source: 'manual' | 'conversation' | 'automated' = 'manual'
  ): Promise<ClientTag> {
    try {
      const response = await fetch(`/api/clients/${clientId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_name: tagName,
          created_by: createdBy,
          source: source
        })
      })

      if (!response.ok) {
        throw new Error('Error al añadir la etiqueta')
      }

      const data = await response.json()
      return data.tag
    } catch (error) {
      console.error('Error adding tag to client:', error)
      throw error
    }
  }

  static async removeTagFromClient(clientId: number, tagName: string): Promise<void> {
    try {
      const response = await fetch(`/api/clients/${clientId}/tags/${encodeURIComponent(tagName)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Error al eliminar la etiqueta')
      }
    } catch (error) {
      console.error('Error removing tag from client:', error)
      throw error
    }
  }

  static async getTagStats(organizationId: number): Promise<TagStats[]> {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/tag-stats`)
      if (!response.ok) {
        throw new Error('Error al cargar las estadísticas de etiquetas')
      }
      const data = await response.json()
      return data.stats || []
    } catch (error) {
      console.error('Error fetching tag stats:', error)
      throw error
    }
  }

  static async getClientsByTags(
    organizationId: number, 
    tagNames: string[], 
    matchAll: boolean = false
  ): Promise<MarketingCampaignTarget[]> {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/clients-by-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_names: tagNames,
          match_all: matchAll
        })
      })

      if (!response.ok) {
        throw new Error('Error al buscar clientes por etiquetas')
      }

      const data = await response.json()
      return data.clients || []
    } catch (error) {
      console.error('Error fetching clients by tags:', error)
      throw error
    }
  }
}

// Hook para manejar etiquetas de un cliente específico
export function useClientTags(clientId?: number) {
  const [tags, setTags] = useState<ClientTag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTags = async () => {
    if (!clientId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await ClientTagsService.getClientTags(clientId)
      setTags(data)
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
      console.error('Error loading client tags:', err)
    } finally {
      setLoading(false)
    }
  }

  const addTag = async (
    tagName: string, 
    createdBy: string, 
    source: 'manual' | 'conversation' | 'automated' = 'manual'
  ) => {
    if (!clientId) return

    try {
      const newTag = await ClientTagsService.addTagToClient(clientId, tagName, createdBy, source)
      setTags(prev => [newTag, ...prev])
      toast({
        title: "Etiqueta añadida",
        description: `Se añadió la etiqueta "${tagName}" al cliente`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Error al añadir la etiqueta',
        variant: "destructive",
      })
    }
  }

  const removeTag = async (tagName: string) => {
    if (!clientId) return

    try {
      await ClientTagsService.removeTagFromClient(clientId, tagName)
      setTags(prev => prev.filter(tag => tag.tag_name !== tagName))
      toast({
        title: "Etiqueta eliminada",
        description: `Se eliminó la etiqueta "${tagName}" del cliente`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || 'Error al eliminar la etiqueta',
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadTags()
  }, [clientId])

  return {
    tags,
    loading,
    error,
    addTag,
    removeTag,
    refetch: loadTags
  }
}

// Hook para estadísticas de etiquetas de una organización
export function useTagStats(organizationId?: number) {
  const [stats, setStats] = useState<TagStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = async () => {
    if (!organizationId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await ClientTagsService.getTagStats(organizationId)
      setStats(data)
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
      console.error('Error loading tag stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [organizationId])

  return {
    stats,
    loading,
    error,
    refetch: loadStats
  }
}

// Hook para obtener clientes objetivo para campañas de marketing
export function useMarketingTargets(organizationId?: number) {
  const [targets, setTargets] = useState<MarketingCampaignTarget[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getTargetsByTags = async (tagNames: string[], matchAll: boolean = false) => {
    if (!organizationId) return []
    
    setLoading(true)
    setError(null)
    
    try {
      const data = await ClientTagsService.getClientsByTags(organizationId, tagNames, matchAll)
      setTargets(data)
      return data
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
      console.error('Error loading marketing targets:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  return {
    targets,
    loading,
    error,
    getTargetsByTags
  }
}
