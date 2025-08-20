import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente admin que bypasea RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Clave de servicio, no la pública
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId: orgIdRaw } = body

    const organizationId = Number.parseInt(orgIdRaw)

    if (isNaN(organizationId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    // Verificar que la organización existe y está activa
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    // Obtener servicios activos de la organización
    const { data: services, error } = await supabaseAdmin
      .from("services")
      .select(`
        id,
        name,
        description,
        price,
        duration,
        category,
        color
      `)
      .eq("organization_id", organizationId)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching services:", error)
      return NextResponse.json({ error: "Error al obtener servicios" }, { status: 500 })
    }

    // Formatear datos para la respuesta pública
    const formattedServices = (services || []).map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      category: service.category,
      color: service.color || "#3B82F6",
    }))

    return NextResponse.json({ services: formattedServices })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
