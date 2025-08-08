import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') || '1' // Por defecto 1

    const { data, error } = await supabase
      .from('organization_tags')
      .select('*')
      .eq('organization_id', parseInt(organizationId))
      .order('tag_name')

    if (error) {
      console.error('Error fetching organization tags:', error)
      return NextResponse.json({ 
        error: 'Error fetching organization tags',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ tags: data || [] })

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
    const { tag_name, color, organization_id = 1 } = body

    const { data, error } = await supabase
      .from('organization_tags')
      .insert({
        organization_id: organization_id,
        tag_name: tag_name,
        color: color
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating organization tag:', error)
      return NextResponse.json({ 
        error: 'Error creating organization tag',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ tag: data })

  } catch (error) {
    console.error('POST API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, tag_name, color } = body

    const { data, error } = await supabase
      .from('organization_tags')
      .update({
        tag_name: tag_name,
        color: color,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization tag:', error)
      return NextResponse.json({ 
        error: 'Error updating organization tag',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ tag: data })

  } catch (error) {
    console.error('PUT API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    // Primero obtener información de la etiqueta
    const { data: tag } = await supabase
      .from('organization_tags')
      .select('tag_name, organization_id')
      .eq('id', id)
      .single()

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Eliminar todas las referencias a esta etiqueta en client_tags
    await supabase
      .from('client_tags')
      .delete()
      .eq('tag_name', tag.tag_name)
      .eq('organization_id', tag.organization_id)

    // Eliminar la etiqueta de la organización
    const { error } = await supabase
      .from('organization_tags')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting organization tag:', error)
      return NextResponse.json({ 
        error: 'Error deleting organization tag',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('DELETE API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
