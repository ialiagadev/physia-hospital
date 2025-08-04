import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleCalendarService } from "@/lib/google-calendar"

console.log("🔍 DEBUG - Sync-all route.ts cargado correctamente")

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  console.log("🔍 DEBUG - Sync-all POST function called")

  try {
    const { userId, organizationId } = await request.json()
    console.log("🔍 DEBUG - Sync request:", { userId, organizationId })

    if (!userId || !organizationId) {
      return NextResponse.json({ error: "userId y organizationId son requeridos" }, { status: 400 })
    }

    // Obtener tokens de Google del usuario
    const { data: tokenData, error: tokenError } = await supabase
      .from("user_google_tokens")
      .select("*")
      .eq("user_id", userId)
      .single()

    console.log("🔍 DEBUG - Token data:", {
      found: tokenData ? "✅ Existe" : "❌ No existe",
      error: tokenError?.message,
    })

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Usuario no conectado con Google Calendar" }, { status: 401 })
    }

    // Verificar si el token ha expirado
    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      console.log("🔍 DEBUG - Token expired")
      return NextResponse.json({ error: "Token de Google Calendar expirado. Reconéctate." }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]
    console.log("🔍 DEBUG - Searching from date:", today)

    // 🆕 1. OBTENER CITAS INDIVIDUALES (TODAS, sin filtro de status)
    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        *,
        client:clients(name, phone),
        professional:users!appointments_professional_id_fkey(name),
        appointment_type:appointment_types(name)
      `)
      .eq("organization_id", organizationId)
      .eq("professional_id", userId)
      .eq("synced_with_google", false)
      .gte("date", today)
      .order("date", { ascending: true })

    console.log("🔍 DEBUG - Individual appointments:", {
      error: appointmentsError?.message,
      count: appointments?.length || 0,
    })

    // 🆕 2. OBTENER ACTIVIDADES GRUPALES (TODAS, sin filtro de status)
    const { data: groupActivities, error: groupActivitiesError } = await supabase
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
      .eq("organization_id", organizationId)
      .eq("professional_id", userId)
      .eq("synced_with_google", false)
      .gte("date", today)
      .order("date", { ascending: true })

    console.log("🔍 DEBUG - Group activities:", {
      error: groupActivitiesError?.message,
      count: groupActivities?.length || 0,
    })

    if (appointmentsError || groupActivitiesError) {
      console.error("🔍 DEBUG - Query errors:", { appointmentsError, groupActivitiesError })
      return NextResponse.json({ error: "Error al obtener citas y actividades" }, { status: 500 })
    }

    const totalItems = (appointments?.length || 0) + (groupActivities?.length || 0)

    if (totalItems === 0) {
      console.log("🔍 DEBUG - No items found to sync")
      return NextResponse.json({
        success: true,
        message: "No hay citas ni actividades para sincronizar",
        syncedCount: 0,
        totalAppointments: 0,
        totalGroupActivities: 0,
      })
    }

    // Inicializar servicio de Google Calendar
    const calendarService = new GoogleCalendarService({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expiry_date: tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : undefined,
    })

    let syncedAppointments = 0
    let syncedGroupActivities = 0
    const errors: string[] = []

    // 🆕 3. SINCRONIZAR CITAS INDIVIDUALES
    if (appointments && appointments.length > 0) {
      console.log("🔍 DEBUG - Syncing individual appointments...")

      for (const appointment of appointments) {
        try {
          console.log("🔍 DEBUG - Syncing appointment:", {
            id: appointment.id,
            date: appointment.date,
            status: appointment.status,
            client: appointment.client?.name,
          })

          const startDateTime = new Date(`${appointment.date}T${appointment.start_time}`)
          const endDateTime = new Date(`${appointment.date}T${appointment.end_time}`)

          const event = {
            summary: `📅 Cita: ${appointment.client?.name || "Cliente"}`,
            description: [
              `👤 Profesional: ${appointment.professional?.name}`,
              `🏥 Cliente: ${appointment.client?.name}`,
              `📞 Teléfono: ${appointment.client?.phone || "No disponible"}`,
              `📋 Estado: ${appointment.status}`,
              `🏷️ Tipo: ${appointment.appointment_type?.name || "Consulta"}`,
              appointment.notes ? `📝 Notas: ${appointment.notes}` : "",
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
          console.log("🔍 DEBUG - Appointment event created:", eventId)

          // Actualizar la cita como sincronizada
          const { error: updateError } = await supabase
            .from("appointments")
            .update({
              google_calendar_event_id: eventId,
              synced_with_google: true,
              last_google_sync: new Date().toISOString(),
            })
            .eq("id", appointment.id)

          if (updateError) throw updateError

          syncedAppointments++
        } catch (error) {
          console.error(`🔍 DEBUG - Error syncing appointment ${appointment.id}:`, error)
          errors.push(`Cita ${appointment.id}: ${error instanceof Error ? error.message : "Error desconocido"}`)
        }
      }
    }

    // 🆕 4. SINCRONIZAR ACTIVIDADES GRUPALES
    if (groupActivities && groupActivities.length > 0) {
      console.log("🔍 DEBUG - Syncing group activities...")

      for (const activity of groupActivities) {
        try {
          console.log("🔍 DEBUG - Syncing group activity:", {
            id: activity.id,
            name: activity.name,
            date: activity.date,
            participants: activity.current_participants,
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
          console.log("🔍 DEBUG - Group activity event created:", eventId)

          // 🆕 Agregar campo para marcar actividades grupales como sincronizadas
          // Nota: Necesitarás agregar estos campos a la tabla group_activities
          const { error: updateError } = await supabase
            .from("group_activities")
            .update({
              google_calendar_event_id: eventId,
              synced_with_google: true,
              last_google_sync: new Date().toISOString(),
            })
            .eq("id", activity.id)

          if (updateError) {
            console.error("🔍 DEBUG - Error updating group activity:", updateError)
            throw updateError
          }

          syncedGroupActivities++
        } catch (error) {
          console.error(`🔍 DEBUG - Error syncing group activity ${activity.id}:`, error)
          errors.push(`Actividad ${activity.name}: ${error instanceof Error ? error.message : "Error desconocido"}`)
        }
      }
    }

    const totalSynced = syncedAppointments + syncedGroupActivities

    console.log("🔍 DEBUG - Sync completed:", {
      syncedAppointments,
      syncedGroupActivities,
      totalSynced,
      errors: errors.length,
    })

    return NextResponse.json({
      success: true,
      syncedCount: totalSynced,
      syncedAppointments,
      syncedGroupActivities,
      totalAppointments: appointments?.length || 0,
      totalGroupActivities: groupActivities?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("🔍 DEBUG - Error in sync-all:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET() {
  console.log("🔍 DEBUG - Sync-all GET function called")
  return NextResponse.json({ message: "Sync-all route is working", timestamp: new Date().toISOString() })
}
