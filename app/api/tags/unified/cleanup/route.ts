import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organization_id } = body

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('cleanup_unused_unified_tags', {
      p_organization_id: organization_id
    })

    if (error) {
      console.error('Error cleaning up tags:', error)
      return NextResponse.json(
        { error: 'Failed to cleanup tags' },
        { status: 500 }
      )
    }

    return NextResponse.json({ deleted_count: data })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
