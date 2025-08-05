import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const organizationId = Number.parseInt(params.organizationId)

    if (isNaN(organizationId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    // Obtener consultas activas de la organización
    const { data: consultations, error } = await supabase
      .from("consultations")
      .select(`
        id,
        name,
        description,
        color
      `)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching consultations:", error)
      return NextResponse.json({ error: "Error al obtener consultas" }, { status: 500 })
    }

    return NextResponse.json(consultations || [])
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
