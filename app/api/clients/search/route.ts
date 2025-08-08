import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const tag = searchParams.get('tag')
    const withTagsOnly = searchParams.get('withTagsOnly') === 'true'
    
    // Por ahora, usar un organizationId fijo o obtenerlo del usuario autenticado
    const organizationId = 1 // Cambia esto por el ID real de tu organización

    console.log('Search params:', { q, tag, withTagsOnly, organizationId })

    // Consulta base para clientes
    let clientsQuery = supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        phone,
        channel,
        created_at,
        client_tags!inner (
          tag_name,
          created_at
        )
      `)
      .eq('organization_id', organizationId)

    // Si hay búsqueda por texto
    if (q && q.trim()) {
      clientsQuery = clientsQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    }

    // Si solo queremos clientes con etiquetas, usar inner join
    if (withTagsOnly) {
      // La consulta ya tiene inner join con client_tags, así que solo clientes con etiquetas
    } else {
      // Si queremos todos los clientes, cambiar a left join
      clientsQuery = supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          phone,
          channel,
          created_at,
          client_tags (
            tag_name,
            created_at
          )
        `)
        .eq('organization_id', organizationId)

      if (q && q.trim()) {
        clientsQuery = clientsQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      }
    }

    const { data: clients, error: clientsError } = await clientsQuery
      .order('name')
      .limit(100) // Limitar resultados para evitar sobrecarga

    if (clientsError) {
      console.error('Error fetching clients:', clientsError)
      return NextResponse.json({ 
        error: 'Error fetching clients',
        details: clientsError.message 
      }, { status: 500 })
    }

    console.log('Clients found:', clients?.length || 0)

    // Procesar los datos para el formato esperado
    const processedClients = (clients || []).map(client => ({
      ...client,
      client_tags: Array.isArray(client.client_tags) 
        ? client.client_tags.map(tag => ({
            tag_name: tag.tag_name,
            color: '#3B82F6' // Color por defecto
          }))
        : []
    }))

    // Filtrar por etiqueta específica si se proporciona
    let filteredClients = processedClients
    if (tag && tag !== 'all') {
      filteredClients = processedClients.filter(client => 
        client.client_tags.some((clientTag: any) => clientTag.tag_name === tag)
      )
    }

    // Obtener etiquetas de la organización
    const { data: organizationTags, error: tagsError } = await supabase
      .from('organization_tags')
      .select('*')
      .eq('organization_id', organizationId)
      .order('tag_name')

    if (tagsError) {
      console.error('Error fetching organization tags:', tagsError)
    }

    // Obtener estadísticas básicas
    const { data: allClientTags, error: statsError } = await supabase
      .from('client_tags')
      .select('tag_name, client_id')
      .eq('organization_id', organizationId)

    let tagStats: any[] = []
    if (!statsError && allClientTags) {
      const tagCounts = allClientTags.reduce((acc: any, tag) => {
        acc[tag.tag_name] = (acc[tag.tag_name] || 0) + 1
        return acc
      }, {})

      tagStats = Object.entries(tagCounts).map(([tagName, count]) => ({
        organization_id: organizationId,
        tag_name: tagName,
        tag_color: '#3B82F6',
        client_count: count,
        clients_with_email: 0,
        clients_with_phone: 0
      }))
    }

    return NextResponse.json({
      clients: filteredClients,
      organizationTags: organizationTags || [],
      tagStats: tagStats
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, tagName, action, color = '#3B82F6' } = body
    
    // Por ahora, usar un organizationId fijo
    const organizationId = 1 // Cambia esto por el ID real de tu organización

    console.log('POST request:', { clientId, tagName, action, organizationId })

    if (action === 'add') {
      // Primero, asegurar que la etiqueta existe en organization_tags
      const { data: existingOrgTag } = await supabase
        .from('organization_tags')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('tag_name', tagName)
        .single()

      if (!existingOrgTag) {
        // Crear la etiqueta en organization_tags si no existe
        const { error: createTagError } = await supabase
          .from('organization_tags')
          .insert({
            organization_id: organizationId,
            tag_name: tagName,
            color: color
          })

        if (createTagError) {
          console.error('Error creating organization tag:', createTagError)
          return NextResponse.json({ 
            error: 'Error creating organization tag',
            details: createTagError.message 
          }, { status: 500 })
        }
      }

      // Añadir la etiqueta al cliente
      const { error } = await supabase
        .from('client_tags')
        .insert({
          client_id: clientId,
          tag_name: tagName,
          organization_id: organizationId,
          source: 'manual'
        })

      if (error && error.code !== '23505') { // Ignorar duplicados
        console.error('Error adding tag:', error)
        return NextResponse.json({ 
          error: 'Error adding tag',
          details: error.message 
        }, { status: 500 })
      }

    } else if (action === 'remove') {
      const { error } = await supabase
        .from('client_tags')
        .delete()
        .eq('client_id', clientId)
        .eq('tag_name', tagName)
        .eq('organization_id', organizationId)

      if (error) {
        console.error('Error removing tag:', error)
        return NextResponse.json({ 
          error: 'Error removing tag',
          details: error.message 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('POST API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
