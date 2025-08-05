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

    if (isNaN(organizationId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    // Obtener profesionales activos (type = 1) de la organización
    const { data: professionals, error } = await supabaseAdmin
      .from("users")
      .select(`
        id,
        name,
        specialty,
        specialty_other,
        avatar_url
      `)
      .eq("organization_id", organizationId)
      .eq("type", 1) // Solo profesionales
      .eq("is_active", true) // Solo activos
      .not("name", "is", null) // Que tengan nombre
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching professionals:", error)
      return NextResponse.json({ error: "Error al obtener profesionales" }, { status: 500 })
    }

    // Formatear datos para la respuesta pública
    const formattedProfessionals = (professionals || []).map((prof) => ({
      id: prof.id,
      name: prof.name,
      specialty: prof.specialty_other || prof.specialty || "General",
      avatar_url: prof.avatar_url,
    }))

    return NextResponse.json(formattedProfessionals)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
