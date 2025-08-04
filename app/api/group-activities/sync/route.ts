import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleCalendarService } from "@/lib/google-calendar"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { activityId, userId, organizationId } = await request.json()

    if (!activityId || !userId || !organizationId) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 })
    }

    // Verificar si el usuario tiene Google Calendar conectado
    const { data: tokenData, error: tokenError } = await supabase
      .from("user_google_tokens")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (tokenError || !tokenData) {
      console.log("🔍 DEBUG - User doesn't have Google Calendar connected")
      return NextResponse.json({ success: false, message: "Usuario no conectado con Google Calendar" })
    }

    // Verificar si el token ha expirado
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      console.log("🔍 DEBUG - Token expired")
      return NextResponse.json({ success: false, message: "Token de Google Calendar expirado" })
    }

    // Obtener la actividad grupal
    const { data: activity, error: activityError } = await supabase
      .from("group_activities")
      .select(`
        *,
        professional:users!fk_group_activities_professional(name),
        consultation:consultations!fk_group_activities_consultation(name),
        service:services!fk_group_activities_service(name),
        participants:group_activity_participants(
          id,
          client:clients!fk_group_participants_client(name, phone),
          status,
          notes
        )
      `)
      .eq("id", activityId)
      .eq("organization_id", organizationId)
      .single()

    if (activityError || !activity) {
      return NextResponse.json({ error: "Actividad no encontrada" }, { status: 404 })
    }

    // Si ya está sincronizada, no hacer nada
    if (activity.synced_with_google) {
      return NextResponse.json({ success: true, message: "Ya sincronizada" })
    }

    // Inicializar servicio de Google Calendar
    const calendarService = new GoogleCalendarService({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expiry_date: tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : undefined,
    })

    const startDateTime = new Date(`${activity.date}T${activity.start_time}`)
    const endDateTime = new Date(`${activity.date}T${activity.end_time}`)

    // Crear lista de participantes
    const participantsList =
      activity.participants
        ?.filter((p: any) => p.status === "registered" || p.status === "attended")
        .map((p: any) => `• ${p.client?.name}`)
        .join("\n") || "Sin participantes registrados"

    const event = {
      summary: `👥 ${activity.name}`,
      description: [
        `👤 Profesional: ${activity.professional?.name}`,
        `🏥 Consulta: ${activity.consultation?.name || "No especificada"}`,
        `⚕️ Servicio: ${activity.service?.name || "No especificado"}`,
        `📊 Estado: ${activity.status}`,
        `👥 Participantes (${activity.current_participants}/${activity.max_participants}):`,
        participantsList,
        activity.description ? `📝 Descripción: ${activity.description}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "America/Mexico_City",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "America/Mexico_City",
      },
    }

    const eventId = await calendarService.createEvent(event)

    // Actualizar la actividad como sincronizada
    await supabase
      .from("group_activities")
      .update({
        google_calendar_event_id: eventId,
        synced_with_google: true,
        last_google_sync: new Date().toISOString(),
      })
      .eq("id", activityId)

    return NextResponse.json({ success: true, eventId })
  } catch (error) {
    console.error("Error syncing group activity:", error)
    return NextResponse.json({ error: "Error al sincronizar actividad grupal" }, { status: 500 })
  }
}
