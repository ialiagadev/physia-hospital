import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { googleTokenManager } from "@/lib/google-token-manager"

console.log("🔍 DEBUG - Sync route loaded")

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  console.log("🔍 DEBUG - Sync POST called")

  try {
    const body = await request.json()
    console.log("🔍 DEBUG - Request body:", body)

    const { appointmentId, activityId, userId, organizationId } = body

    if (!userId || !organizationId) {
      return NextResponse.json({ error: "userId y organizationId son requeridos" }, { status: 400 })
    }

    // Obtener tokens válidos (sin organization_id porque la tabla no lo tiene)
    const tokenData = await googleTokenManager.getValidTokens(userId)

    if (!tokenData) {
      console.log("🔍 DEBUG - User doesn't have valid Google Calendar tokens")
      return NextResponse.json({
        success: false,
        message: "Usuario no conectado con Google Calendar o tokens expirados",
      })
    }

    console.log("✅ Tokens válidos obtenidos para sincronización")

    if (appointmentId) {
      return await handleAppointmentSync(appointmentId, organizationId, tokenData)
    } else if (activityId) {
      return await handleGroupActivitySync(activityId, organizationId, tokenData)
    } else {
      return NextResponse.json({ error: "appointmentId o activityId es requerido" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in sync route:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

async function handleAppointmentSync(appointmentId: string, organizationId: number, tokenData: any) {
  console.log("📅 Procesando cita:", appointmentId)

  try {
    // Obtener la cita con todos los datos necesarios
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        *,
        client:clients!client_id(name, email, phone),
        service:services!service_id(name, description),
        professional:users!appointments_professional_id_fkey(name, email)
      `)
      .eq("id", appointmentId)
      .eq("organization_id", organizationId)
      .single()

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 })
    }

    console.log("📅 Datos de la cita:", {
      id: appointment.id,
      client: appointment.client?.name,
      date: appointment.date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      hasEventId: !!appointment.google_calendar_event_id,
    })

    // Validar datos requeridos
    if (!appointment.date || !appointment.start_time || !appointment.end_time) {
      console.error("❌ Datos de fecha/hora faltantes:", {
        date: appointment.date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
      })
      return NextResponse.json({ error: "Datos de fecha/hora incompletos" }, { status: 400 })
    }

    // Preparar datos del evento con validación
    const eventData = {
      summary: `${appointment.client?.name || "Paciente"} - ${appointment.service?.name || "Consulta"}`,
      description: [
        `Paciente: ${appointment.client?.name || "Sin nombre"}`,
        appointment.client?.phone ? `Teléfono: ${appointment.client.phone}` : null,
        `Servicio: ${appointment.service?.name || "Consulta general"}`,
        appointment.notes ? `Notas: ${appointment.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      start: {
        dateTime: `${appointment.date}T${appointment.start_time}`,
        timeZone: "Europe/Madrid",
      },
      end: {
        dateTime: `${appointment.date}T${appointment.end_time}`,
        timeZone: "Europe/Madrid",
      },
      attendees: appointment.client?.email ? [{ email: appointment.client.email }] : undefined,
    }

    console.log("📅 Datos del evento a enviar:", {
      summary: eventData.summary,
      start: eventData.start,
      end: eventData.end,
      hasAttendees: !!eventData.attendees?.length,
    })

    // Verificar si ya existe el evento
    let eventId = appointment.google_calendar_event_id
    let method = "POST"
    let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

    if (eventId) {
      // Verificar si el evento existe
      try {
        const checkResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
          },
        )

        if (checkResponse.ok) {
          // El evento existe, actualizarlo
          method = "PUT"
          url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`
          console.log("✅ Evento existente encontrado, actualizando...")
        } else {
          // El evento no existe, crear uno nuevo
          eventId = null
          console.log("🆕 Evento no encontrado, creando nuevo...")
        }
      } catch (error) {
        console.log("🆕 Error verificando evento, creando nuevo...")
        eventId = null
      }
    }

    // Crear o actualizar el evento
    console.log(`🔄 ${method === "POST" ? "Creando" : "Actualizando"} evento en Google Calendar...`)

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("❌ Error de Google Calendar:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        eventData: JSON.stringify(eventData, null, 2),
      })
      throw new Error(`Error de Google Calendar: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    console.log("✅ Evento procesado en Google Calendar:", result.id)

    // Actualizar el google_calendar_event_id en la base de datos si es necesario
    if (!eventId || eventId !== result.id) {
      await supabase
        .from("appointments")
        .update({
          google_calendar_event_id: result.id,
          synced_with_google: true,
          last_google_sync: new Date().toISOString(),
        })
        .eq("id", appointmentId)
    }

    return NextResponse.json({
      success: true,
      eventId: result.id,
      action: eventId ? "updated" : "created",
      message: `Cita ${eventId ? "actualizada" : "creada"} correctamente`,
    })
  } catch (error) {
    console.error("Error syncing appointment:", error)
    return NextResponse.json({ error: "Error al sincronizar cita" }, { status: 500 })
  }
}

async function handleGroupActivitySync(activityId: string, organizationId: number, tokenData: any) {
  console.log("👥 Procesando actividad grupal:", activityId)

  try {
    // Obtener actividad
    const { data: activity, error: activityError } = await supabase
      .from("group_activities")
      .select(`
        *,
        consultations!consultation_id(name, color),
        services!service_id(name, description)
      `)
      .eq("id", activityId)
      .eq("organization_id", organizationId)
      .single()

    if (activityError || !activity) {
      console.error("❌ Error obteniendo actividad:", activityError)
      return NextResponse.json({ error: `Actividad no encontrada: ${activityError?.message}` }, { status: 404 })
    }

    // Obtener profesional por separado
    const { data: professional, error: professionalError } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", activity.professional_id)
      .single()

    if (professionalError) {
      console.error("❌ Error obteniendo profesional:", professionalError)
    }

    // Obtener participantes por separado
    const { data: participants, error: participantsError } = await supabase
      .from("group_activity_participants")
      .select(`
        id,
        client_id,
        status,
        clients!client_id(
          id,
          name,
          phone,
          email
        )
      `)
      .eq("group_activity_id", activityId)
      .neq("status", "cancelled")

    if (participantsError) {
      console.error("❌ Error obteniendo participantes:", participantsError)
    }

    console.log("👥 Datos de la actividad:", {
      id: activity.id,
      name: activity.name,
      date: activity.date,
      start_time: activity.start_time,
      end_time: activity.end_time,
      hasEventId: !!activity.google_calendar_event_id,
      participants: participants?.length || 0,
      professional: professional?.name || "Sin asignar",
    })

    // Validar datos requeridos
    if (!activity.date || !activity.start_time || !activity.end_time) {
      console.error("❌ Datos de fecha/hora faltantes:", {
        date: activity.date,
        start_time: activity.start_time,
        end_time: activity.end_time,
      })
      return NextResponse.json({ error: "Datos de fecha/hora incompletos" }, { status: 400 })
    }

    // Preparar lista de participantes para el evento
    const attendeesList = (participants || [])
      .filter((p: any) => p.clients?.email)
      .map((p: any) => ({ email: p.clients.email }))

    const participantNames = (participants || []).map((p: any) => p.clients?.name || "Sin nombre").join(", ")

    // Preparar datos del evento
    const eventData = {
      summary: `${activity.name} (${participants?.length || 0}/${activity.max_participants})`,
      description: [
        `Actividad Grupal: ${activity.name}`,
        activity.description ? `Descripción: ${activity.description}` : null,
        `Profesional: ${professional?.name || "Sin asignar"}`,
        activity.consultations?.name ? `Consulta: ${activity.consultations.name}` : null,
        activity.services?.name ? `Servicio: ${activity.services.name}` : null,
        `Participantes (${participants?.length || 0}): ${participantNames || "Sin participantes"}`,
        `Capacidad máxima: ${activity.max_participants}`,
      ]
        .filter(Boolean)
        .join("\n"),
      start: {
        dateTime: `${activity.date}T${activity.start_time}`,
        timeZone: "Europe/Madrid",
      },
      end: {
        dateTime: `${activity.date}T${activity.end_time}`,
        timeZone: "Europe/Madrid",
      },
      attendees: attendeesList.length > 0 ? attendeesList : undefined,
    }

    console.log("👥 Datos del evento de actividad a enviar:", {
      summary: eventData.summary,
      start: eventData.start,
      end: eventData.end,
      hasAttendees: !!eventData.attendees?.length,
    })

    // Verificar si ya existe el evento
    let eventId = activity.google_calendar_event_id
    let method = "POST"
    let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

    if (eventId) {
      // Verificar si el evento existe
      try {
        const checkResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
          },
        )

        if (checkResponse.ok) {
          // El evento existe, actualizarlo
          method = "PUT"
          url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`
          console.log("✅ Evento de actividad existente encontrado, actualizando...")
        } else {
          // El evento no existe, crear uno nuevo
          eventId = null
          console.log("🆕 Evento de actividad no encontrado, creando nuevo...")
        }
      } catch (error) {
        console.log("🆕 Error verificando evento de actividad, creando nuevo...")
        eventId = null
      }
    }

    // Crear o actualizar el evento
    console.log(`🔄 ${method === "POST" ? "Creando" : "Actualizando"} actividad en Google Calendar...`)

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("❌ Error de Google Calendar:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        eventData: JSON.stringify(eventData, null, 2),
      })
      throw new Error(`Error de Google Calendar: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    console.log("✅ Actividad procesada en Google Calendar:", result.id)

    // Actualizar el google_calendar_event_id en la base de datos si es necesario
    if (!eventId || eventId !== result.id) {
      await supabase
        .from("group_activities")
        .update({
          google_calendar_event_id: result.id,
          synced_with_google: true,
          last_google_sync: new Date().toISOString(),
        })
        .eq("id", activityId)
    }

    return NextResponse.json({
      success: true,
      eventId: result.id,
      action: eventId ? "updated" : "created",
      message: `Actividad ${eventId ? "actualizada" : "creada"} correctamente`,
    })
  } catch (error) {
    console.error("Error syncing group activity:", error)
    return NextResponse.json({ error: "Error al sincronizar actividad grupal" }, { status: 500 })
  }
}

// GET para debugging
export async function GET() {
  return NextResponse.json({
    message: "Sync route is working",
    timestamp: new Date().toISOString(),
  })
}
