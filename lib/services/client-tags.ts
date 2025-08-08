import { supabase } from '@/lib/supabase/client'
import { Client, ClientTag, OrganizationTag, TagWithColor } from '@/types/client-tags'

export class ClientTagsService {
  async getClients(organizationId: number, userProfile: any, searchTerm?: string): Promise<Client[]> {
    console.log('🔍 Obteniendo clientes para organización:', organizationId)
    console.log('👤 Perfil de usuario:', userProfile)
    console.log('🔍 Término de búsqueda:', searchTerm)
    
    try {
      // PASO 1: Construir consulta base para clientes con búsqueda desde servidor
      let clientsQuery = supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })

      // PASO 2: Aplicar filtros de organización
      if (!userProfile?.is_physia_admin) {
        if (userProfile?.organization_id) {
          clientsQuery = clientsQuery.eq('organization_id', userProfile.organization_id)
        }
      } else {
        clientsQuery = clientsQuery.eq('organization_id', organizationId)
      }

      // PASO 3: Aplicar búsqueda desde servidor si hay término
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim()
        clientsQuery = clientsQuery.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
      }

      console.log('🔍 Ejecutando consulta de clientes...')
      const { data: allClients, error: clientsError } = await clientsQuery

      if (clientsError) {
        console.error('❌ Error obteniendo clients:', clientsError)
        throw clientsError
      }

      console.log('✅ Todos los clientes de la organización:', allClients?.length || 0)

      if (!allClients || allClients.length === 0) {
        return []
      }

      // PASO 4: Obtener client_tags
      let clientTagsQuery = supabase
        .from('client_tags')
        .select('*')
        .in('client_id', allClients.map(c => c.id))

      if (!userProfile?.is_physia_admin) {
        if (userProfile?.organization_id) {
          clientTagsQuery = clientTagsQuery.eq('organization_id', userProfile.organization_id)
        }
      } else {
        clientTagsQuery = clientTagsQuery.eq('organization_id', organizationId)
      }

      const { data: clientTags, error: clientTagsError } = await clientTagsQuery

      if (clientTagsError) {
        console.error('❌ Error obteniendo client_tags:', clientTagsError)
        throw clientTagsError
      }

      // PASO 5: Obtener conversation_tags relacionadas con estos clientes
      const { data: conversationTags, error: convTagsError } = await supabase
        .from('conversation_tags')
        .select(`
          *,
          conversations!inner(client_id)
        `)
        .in('conversations.client_id', allClients.map(c => c.id))

      if (convTagsError) {
        console.error('❌ Error obteniendo conversation_tags:', convTagsError)
      }

      console.log('✅ Client tags:', clientTags?.length || 0)
      console.log('✅ Conversation tags:', conversationTags?.length || 0)

      // PASO 6: Combinar todas las etiquetas por cliente
      const clientsWithTags = allClients.map(client => {
        // Etiquetas directas del cliente
        const directTags = clientTags?.filter(tag => tag.client_id === client.id) || []
        
        // Etiquetas de conversaciones del cliente
        const convTags = conversationTags?.filter(tag => 
          tag.conversations?.client_id === client.id
        ).map(tag => ({
          id: tag.id,
          client_id: client.id,
          tag_name: tag.tag_name,
          created_by: tag.created_by,
          created_at: tag.created_at,
          updated_at: tag.created_at,
          source: 'conversation',
          organization_id: organizationId
        })) || []

        // Combinar y deduplicar etiquetas por nombre
        const allTags = [...directTags, ...convTags]
        const uniqueTags = allTags.filter((tag, index, self) => 
          index === self.findIndex(t => t.tag_name === tag.tag_name)
        )

        return {
          ...client,
          client_tags: uniqueTags
        }
      })

      // PASO 7: Si no hay término de búsqueda, filtrar solo clientes con etiquetas
      const result = searchTerm && searchTerm.trim() 
        ? clientsWithTags // Mostrar todos si hay búsqueda
        : clientsWithTags.filter(client => client.client_tags && client.client_tags.length > 0)

      console.log('🎯 Clientes finales:', result.length)
      return result

    } catch (error) {
      console.error('💥 Error inesperado:', error)
      throw error
    }
  }

  async getOrganizationTags(organizationId: number, userProfile: any): Promise<OrganizationTag[]> {
    try {
      let query = supabase
        .from('organization_tags')
        .select('*')
        .order('tag_name')

      // Aplicar filtros de organización
      if (!userProfile?.is_physia_admin) {
        if (userProfile?.organization_id) {
          query = query.eq('organization_id', userProfile.organization_id)
        }
      } else {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching organization tags:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getOrganizationTags:', error)
      throw error
    }
  }

  async createOrganizationTag(
    organizationId: number,
    tagName: string,
    color: string,
    userId?: string
  ): Promise<OrganizationTag> {
    const { data, error } = await supabase
      .from('organization_tags')
      .insert({
        organization_id: organizationId,
        tag_name: tagName,
        color: color,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating organization tag:', error)
      throw error
    }

    return data
  }

  async updateOrganizationTag(
    tagId: number,
    tagName: string,
    color: string
  ): Promise<void> {
    const { error } = await supabase
      .from('organization_tags')
      .update({
        tag_name: tagName,
        color: color,
        updated_at: new Date().toISOString()
      })
      .eq('id', tagId)

    if (error) {
      console.error('Error updating organization tag:', error)
      throw error
    }
  }

  async deleteOrganizationTag(tagId: number): Promise<void> {
    const { data: tag } = await supabase
      .from('organization_tags')
      .select('tag_name, organization_id')
      .eq('id', tagId)
      .single()

    if (!tag) return

    await supabase
      .from('client_tags')
      .delete()
      .eq('tag_name', tag.tag_name)
      .eq('organization_id', tag.organization_id)

    const { error } = await supabase
      .from('organization_tags')
      .delete()
      .eq('id', tagId)

    if (error) {
      console.error('Error deleting organization tag:', error)
      throw error
    }
  }

  async addClientTag(
    clientId: number, 
    tagName: string, 
    organizationId: number,
    userId?: string,
    syncToConversations: boolean = true
  ): Promise<void> {
    const { data, error } = await supabase
      .from('client_tags')
      .insert({
        client_id: clientId,
        tag_name: tagName,
        organization_id: organizationId,
        created_by: userId,
        source: 'manual'
      })
      .select()

    if (error && error.code !== '23505') { // Ignorar duplicados
      console.error('❌ Error adding client tag:', error)
      throw error
    }

    // Sincronizar a conversaciones si es necesario
    if (syncToConversations && !error) {
      await this.syncClientTagToConversations(clientId, tagName, organizationId, userId)
    }
  }

  async removeClientTag(clientId: number, tagName: string, organizationId: number): Promise<void> {
    const { error } = await supabase
      .from('client_tags')
      .delete()
      .eq('client_id', clientId)
      .eq('tag_name', tagName)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error removing client tag:', error)
      throw error
    }
  }

  async getTagsWithStats(organizationId: number, userProfile: any): Promise<TagWithColor[]> {
    try {
      // Obtener etiquetas de organización
      let orgTagsQuery = supabase
        .from('organization_tags')
        .select('id, tag_name, color')

      // Aplicar filtros
      if (!userProfile?.is_physia_admin) {
        if (userProfile?.organization_id) {
          orgTagsQuery = orgTagsQuery.eq('organization_id', userProfile.organization_id)
        }
      } else {
        orgTagsQuery = orgTagsQuery.eq('organization_id', organizationId)
      }

      const { data: orgTags, error: orgError } = await orgTagsQuery

      if (orgError) {
        console.error('❌ Error fetching organization tags:', orgError)
        throw orgError
      }

      // Obtener conteos
      let countQuery = supabase
        .from('client_tags')
        .select('tag_name')

      // Aplicar los mismos filtros
      if (!userProfile?.is_physia_admin) {
        if (userProfile?.organization_id) {
          countQuery = countQuery.eq('organization_id', userProfile.organization_id)
        }
      } else {
        countQuery = countQuery.eq('organization_id', organizationId)
      }

      const { data: tagCounts, error: countError } = await countQuery

      if (countError) {
        console.error('❌ Error fetching tag counts:', countError)
        throw countError
      }

      const counts = tagCounts.reduce((acc: Record<string, number>, tag) => {
        acc[tag.tag_name] = (acc[tag.tag_name] || 0) + 1
        return acc
      }, {})

      const result = orgTags.map(tag => ({
        id: tag.id,
        tag_name: tag.tag_name,
        color: tag.color,
        count: counts[tag.tag_name] || 0
      }))

      return result
    } catch (error) {
      console.error('Error in getTagsWithStats:', error)
      throw error
    }
  }

  async createClient(
    name: string,
    email: string,
    phone: string,
    organizationId: number
  ): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name,
        email,
        phone,
        organization_id: organizationId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      throw error
    }

    return data
  }

  async searchClients(
    organizationId: number,
    userProfile: any,
    query: string = '',
    tagFilter?: string
  ): Promise<Client[]> {
    // Usar búsqueda desde servidor
    let clients = await this.getClients(organizationId, userProfile, query)
    
    // Aplicar filtro de etiqueta si existe
    if (tagFilter && tagFilter !== 'all') {
      clients = clients.filter(client => 
        client.client_tags?.some(tag => tag.tag_name === tagFilter)
      )
    }

    return clients
  }

  async syncConversationTagToClient(
    conversationId: string,
    clientId: number,
    tagName: string,
    organizationId: number,
    userId?: string
  ): Promise<void> {
    try {
      // Agregar etiqueta al cliente si no existe
      await this.addClientTag(clientId, tagName, organizationId, userId)
      console.log('✅ Etiqueta sincronizada de conversación a cliente')
    } catch (error) {
      console.error('❌ Error sincronizando etiqueta:', error)
      throw error
    }
  }

  async syncClientTagToConversations(
    clientId: number,
    tagName: string,
    organizationId: number,
    userId?: string
  ): Promise<void> {
    try {
      // Obtener todas las conversaciones del cliente
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', clientId)

      if (error) {
        console.error('❌ Error obteniendo conversaciones:', error)
        return
      }

      // Agregar etiqueta a todas las conversaciones
      if (conversations && conversations.length > 0) {
        const conversationTags = conversations.map(conv => ({
          conversation_id: conv.id,
          tag_name: tagName,
          created_by: userId
        }))

        const { error: insertError } = await supabase
          .from('conversation_tags')
          .insert(conversationTags)

        if (insertError && insertError.code !== '23505') { // Ignorar duplicados
          console.error('❌ Error sincronizando a conversaciones:', insertError)
        } else {
          console.log('✅ Etiqueta sincronizada a conversaciones')
        }
      }
    } catch (error) {
      console.error('❌ Error sincronizando etiqueta a conversaciones:', error)
    }
  }
}

export const clientTagsService = new ClientTagsService()
