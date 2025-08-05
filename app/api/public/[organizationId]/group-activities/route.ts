import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { format, addDays, parseISO } from "date-fns"

export async function GET(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const organizationId = Number.parseInt(params.organizationId)
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get("startDate") // YYYY-MM-DD
    const days = Number.parseInt(searchParams.get("days") || "30") // Días a mostrar

    if (isNaN(organizationId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    // Calcular rango de fechas
    const startDateObj = startDate ? parseISO(startDate) : new Date()
    const endDateObj = addDays(startDateObj, days)

    // Obtener actividades grupales activas con plazas disponibles
    const { data: activities, error } = await supabase
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
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .gte("date", format(startDateObj, "yyyy-MM-dd"))
      .lte("date", format(endDateObj, "yyyy-MM-dd"))
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.error("Error fetching group activities:", error)
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
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
