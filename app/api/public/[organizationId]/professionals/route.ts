import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente admin que bypasea RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const organizationId = Number.parseInt(params.organizationId)
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')

    if (isNaN(organizationId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    // Verificar que la organización existe
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    let professionals: any[] = []

    if (serviceId) {
      // Obtener profesionales que pueden hacer el servicio específico
      const { data: professionalsData, error } = await supabaseAdmin
        .from("user_services")
        .select(`
          user_id,
          users!inner (
            id,
            name,
            specialty,
            specialty_other,
            avatar_url,
            is_active,
            type
          )
        `)
        .eq("service_id", serviceId)
        .eq("users.organization_id", organizationId)
        .eq("users.is_active", true)
        .eq("users.type", 1)

      if (error) {
        console.error("Error fetching professionals by service:", error)
        return NextResponse.json({ error: "Error al obtener profesionales" }, { status: 500 })
      }

      // Extraer los datos de usuarios de la respuesta
      professionals = (professionalsData || []).map((item: any) => item.users).filter(Boolean)
    } else {
      // Obtener todos los profesionales activos si no se especifica servicio
      const { data: professionalsData, error } = await supabaseAdmin
        .from("users")
        .select(`
          id,
          name,
          specialty,
          specialty_other,
          avatar_url
        `)
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .eq("type", 1)
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching professionals:", error)
        return NextResponse.json({ error: "Error al obtener profesionales" }, { status: 500 })
      }

      professionals = professionalsData || []
    }

    // Formatear datos para la respuesta pública
    const formattedProfessionals = professionals.map((professional: any) => ({
      id: professional.id,
      name: professional.name || "Sin nombre",
      specialty: professional.specialty === "otros" ? professional.specialty_other : professional.specialty,
      avatar_url: professional.avatar_url,
    }))

    if (formattedProfessionals.length === 0) {
      return NextResponse.json({ error: "No se encontraron profesionales para el servicio especificado" }, { status: 404 })
    }

    return NextResponse.json({ professionals: formattedProfessionals })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
