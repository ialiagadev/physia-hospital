import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format, addDays, startOfToday } from "date-fns"

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
    console.log("📩 Body recibido:", body)

    const { organizationId, days = 30, name } = body
    const orgId = Number.parseInt(organizationId)

    if (isNaN(orgId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    // Rango: desde hoy hasta X días después
    const today = startOfToday()
    const endDateObj = addDays(today, days)

    console.log("📅 Rango de fechas:", {
      start: format(today, "yyyy-MM-dd"),
      end: format(endDateObj, "yyyy-MM-dd"),
    })

    // Query base
    let query = supabaseAdmin
      .from("group_activities")
      .select(`
        id,
        name,
        description,
        date,
        start_time,
        end_time,
        max_participants,
        current_participants,
        color,
        professional:users!fk_group_activities_professional(
          id,
          name
        ),
        service:services!fk_group_activities_service(
          id,
          name,
          price,
          duration
        ),
        consultation:consultations!fk_group_activities_consultation(
          id,
          name
        )
      `)
      .eq("organization_id", orgId)
      .eq("status", "active")
      .gte("date", format(today, "yyyy-MM-dd"))
      .lte("date", format(endDateObj, "yyyy-MM-dd"))
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    // Filtro opcional por nombre
    if (name && name.trim() !== "") {
      console.log("🔎 Filtrando por nombre:", name)
      query = query.ilike("name", `%${name}%`)
    }

    const { data: activities, error } = await query

    if (error) {
      console.error("❌ Error fetching group activities:", error)
      return NextResponse.json({ error: "Error al obtener actividades grupales" }, { status: 500 })
    }

    // Filtrar solo las que tienen plazas disponibles
    const availableActivities = (activities || [])
      .filter((activity) => activity.current_participants < activity.max_participants)
      .map((activity) => ({
        id: activity.id,
        name: activity.name,
        description: activity.description,
        date: activity.date,
        start_time: activity.start_time,
        end_time: activity.end_time,
        max_participants: activity.max_participants,
        current_participants: activity.current_participants,
        available_spots: activity.max_participants - activity.current_participants,
        color: activity.color,
        professional: activity.professional,
        service: activity.service,
        consultation: activity.consultation,
      }))

    return NextResponse.json(availableActivities)
  } catch (error: any) {
    console.error("🔥 API Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error?.message },
      { status: 500 },
    )
  }
}
