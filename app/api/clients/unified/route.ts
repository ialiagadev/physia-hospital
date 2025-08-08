import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Obtener el usuario autenticado
    const supabaseServer = createServerComponentClient({ cookies })
    const { data: { session }, error: sessionError } = await supabaseServer.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el perfil del usuario para conseguir el organization_id
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", session.user.id)
      .single()

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json({ error: "No se pudo obtener la organización del usuario" }, { status: 400 })
    }

    const organizationId = userProfile.organization_id

    // Obtener clientes de la organización
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select(`
        id,
        name,
        email,
        phone,
        channel,
        created_at
      `)
      .eq("organization_id", organizationId)
      .order("name")

    if (clientsError) {
      console.error("Error fetching clients:", clientsError)
      return NextResponse.json({ error: clientsError.message }, { status: 400 })
    }

    if (!clientsData || clientsData.length === 0) {
      return NextResponse.json({ clients: [] })
    }

    const clientIds = clientsData.map(c => c.id)

    // Obtener las etiquetas de los clientes
    const { data: clientTagsData, error: clientTagsError } = await supabase
      .from("client_tags")
      .select("client_id, tag_name")
      .in("client_id", clientIds)

    if (clientTagsError) {
      console.error("Error fetching client tags:", clientTagsError)
      return NextResponse.json({ error: clientTagsError.message }, { status: 400 })
    }

    // Obtener los colores de las etiquetas de organización
    const uniqueTagNames = Array.from(new Set(
      clientTagsData?.map(ct => ct.tag_name) || []
    ))

    if (uniqueTagNames.length === 0) {
      return NextResponse.json({ clients: [] })
    }

    const { data: orgTagsData, error: orgTagsError } = await supabase
      .from("organization_tags")
      .select("tag_name, color")
      .eq("organization_id", organizationId)
      .in("tag_name", uniqueTagNames)

    if (orgTagsError) {
      console.error("Error fetching organization tags:", orgTagsError)
      return NextResponse.json({ error: orgTagsError.message }, { status: 400 })
    }

    // Crear mapa de colores por tag_name
    const tagColorMap = new Map<string, string>()
    orgTagsData?.forEach(tag => {
      tagColorMap.set(tag.tag_name, tag.color)
    })

    // Agrupar etiquetas por cliente
    const clientTagsMap = new Map<number, Array<{tag_name: string, color: string}>>()
    clientTagsData?.forEach(ct => {
      if (!clientTagsMap.has(ct.client_id)) {
        clientTagsMap.set(ct.client_id, [])
      }
      clientTagsMap.get(ct.client_id)?.push({
        tag_name: ct.tag_name,
        color: tagColorMap.get(ct.tag_name) || '#6B7280'
      })
    })

    // Combinar datos y filtrar solo clientes con etiquetas
    const clientsWithTags = clientsData
      .map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        channel: client.channel,
        created_at: client.created_at,
        client_tags: clientTagsMap.get(client.id) || []
      }))
      .filter(client => client.client_tags.length > 0)

    return NextResponse.json({ clients: clientsWithTags })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
