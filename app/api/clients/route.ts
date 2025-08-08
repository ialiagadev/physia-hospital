import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = parseInt(searchParams.get('organization_id') || '0')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search')
    const tagFilter = searchParams.get('tag_filter')
    const tagType = searchParams.get('tag_type')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Usar la función SQL optimizada
    const { data, error } = await supabase.rpc('get_clients_paginated_unified', {
      p_organization_id: organizationId,
      p_page: page,
      p_limit: limit,
      p_search: search,
      p_tag_filter: tagFilter,
      p_tag_type: tagType
    })

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    // Procesar los resultados
    const clients = data.map((row: any) => row.client_data)
    const totalCount = data[0]?.total_count || 0
    const totalPages = data[0]?.total_pages || 1

    return NextResponse.json({
      data: clients,
      total: totalCount,
      page,
      limit,
      totalPages
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, organization_id } = body

    if (!name || !email || !organization_id) {
      return NextResponse.json(
        { error: 'Name, email, and organization_id are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        name,
        email,
        phone,
        organization_id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      return NextResponse.json(
        { error: 'Failed to create client' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
