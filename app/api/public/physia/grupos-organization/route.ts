import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format, startOfToday } from "date-fns"

// Cliente admin para bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    const { organizationId } = body

    const orgId = Number.parseInt(organizationId)
    if (isNaN(orgId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    const today = startOfToday()

    // 🔎 Obtener todas las actividades futuras
    const { data, error } = await supabaseAdmin
      .from("group_activities")
      .select("name, description")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .gte("date", format(today, "yyyy-MM-dd"))
      .order("date", { ascending: true })

    if (error) {
      console.error("❌ Error fetching group activities:", error)
      return NextResponse.json({ error: "Error al obtener actividades" }, { status: 500 })
    }

    // ✅ Dejar solo nombres distintos, manteniendo la primera descripción encontrada
    const uniqueByName: { [key: string]: { name: string; description: string } } = {}
    ;(data || []).forEach((item) => {
      if (!uniqueByName[item.name]) {
        uniqueByName[item.name] = {
          name: item.name,
          description: item.description,
        }
      }
    })

    const result = Object.values(uniqueByName)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("🔥 API Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error?.message },
      { status: 500 },
    )
  }
}
