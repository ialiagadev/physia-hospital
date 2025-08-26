import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { googleTokenManager } from "@/lib/google-token-manager"

// Cliente admin para bypasear RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Starting booking process...")
    const body = await request.json()
    console.log("📝 Request body:", body)

    const { organizationId, professionalId, serviceId, consultationId, date, startTime, endTime, clientId, notes } =
      body
    const orgId = Number.parseInt(organizationId)
    console.log("🏢 Organization ID:", orgId)

    if (isNaN(orgId) || !professionalId || !serviceId || !date || !startTime || !endTime || !clientId) {
      console.log("❌ Validation failed: missing required data")
      return NextResponse.json({ error: "Datos requeridos faltantes o inválidos" }, { status: 400 })
    }

    const finalClientId = Number.parseInt(clientId)
    if (isNaN(finalClientId)) {
      console.log("❌ Invalid client ID:", clientId)
      return NextResponse.json({ error: "ID de cliente inválido" }, { status: 400 })
    }

    console.log("🔍 Verifying client exists...")
    const { data: existingClient, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("id, name")
      .eq("id", finalClientId)
      .eq("organization_id", orgId)
      .single()

    if (clientError || !existingClient) {
      console.log("❌ Client not found or doesn't belong to organization:", finalClientId)
      return NextResponse.json({ error: "Cliente no encontrado o no pertenece a la organización" }, { status: 404 })
    }

    console.log("✅ Client verified:", existingClient)

    console.log("🔍 Checking slot availability...")
    const { data: conflictingAppointments, error: conflictError } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("professional_id", professionalId)
      .eq("date", date)
      .neq("status", "cancelled")
      .lt("start_time", endTime)
      .gt("end_time", startTime)

    if (conflictError) {
      console.error("❌ Error checking conflicts:", conflictError)
      return NextResponse.json({ error: "Error al verificar conflictos de horario" }, { status: 500 })
    }

    if (conflictingAppointments && conflictingAppointments.length > 0) {
      console.log("❌ Slot conflict detected:", conflictingAppointments)
      return NextResponse.json({ error: "El horario seleccionado ya no está disponible" }, { status: 409 })
    }

    console.log("🔍 Getting service duration...")
    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("duration")
      .eq("id", serviceId)
      .single()

    if (serviceError || !service) {
      console.error("❌ Error getting service or service not found:", serviceError)
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })
    }

    const finalDuration = service.duration || 30
    console.log("⏱️ Service duration:", finalDuration)

    console.log("➕ Creating appointment...")
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("appointments")
      .insert({
        organization_id: orgId,
        professional_id: professionalId,
        client_id: finalClientId,
        service_id: serviceId, // Now always required, removed || null
        consultation_id: consultationId || null,
        date,
        start_time: startTime,
        end_time: endTime,
        duration: finalDuration, // Always use duration from service
        status: "confirmed",
        notes: notes || null,
        user_id: professionalId,
        created_by: professionalId,
        is_group_activity: false,
      })
      .select(`
        id,
        date,
        start_time,
        end_time,
        duration,
        status,
        notes,
        professional:users!appointments_professional_id_fkey(name),
        service:services(name),
        client:clients(name, phone, email)
      `)
      .single()

    if (appointmentError) {
      console.error("❌ Error creating appointment:", appointmentError)
      return NextResponse.json({ error: "Error al crear la cita" }, { status: 500 })
    }

    if (!appointment) {
      console.error("❌ No appointment data returned")
      return NextResponse.json({ error: "Error al crear la cita" }, { status: 500 })
    }

    console.log("✅ Appointment created successfully:", appointment.id)

    try {
      console.log("📅 Attempting Google Calendar sync for professional:", professionalId)

      const tokens = await googleTokenManager.getValidTokens(professionalId)

      if (!tokens) {
        console.log("ℹ️ Professional doesn't have Google Calendar connected - skipping sync")
      } else {
        console.log("🔄 Professional has valid Google tokens, syncing to calendar...")

        await handleAppointmentSync(appointment.id, tokens.access_token)
        console.log("✅ Google Calendar sync completed successfully")
      }
    } catch (syncError) {
      console.error("❌ Error during Google Calendar sync:", syncError)
    }

    return NextResponse.json({
      success: true,
      appointment,
      message: "Cita reservada exitosamente",
    })
  } catch (error) {
    console.error("💥 API Error:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function handleAppointmentSync(appointmentId: string, accessToken: string) {
  console.log("📅 Procesando cita:", appointmentId)

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .select(
      `
      *,
      clients!inner(name, email, phone),
      services!inner(name)
    `,
    )
    .eq("id", appointmentId)
    .single()

  if (appointmentError || !appointment) {
    console.error("❌ Error obteniendo cita:", appointmentError)
    throw new Error("Cita no encontrada")
  }

  console.log("📅 Datos de la cita:", {
    id: appointment.id,
    client: appointment.clients?.name,
    date: appointment.date,
    start_time: appointment.start_time,
    end_time: appointment.end_time,
    hasEventId: !!appointment.google_calendar_event_id,
  })

  if (!appointment.date || !appointment.start_time || !appointment.end_time) {
    console.error("❌ Datos de cita incompletos:", {
      date: appointment.date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
    })
    throw new Error("Datos de cita incompletos")
  }

  const eventData = {
    summary: `${appointment.clients?.name || "Paciente"} - ${appointment.services?.name || "Consulta"}`,
    description: [
      `Paciente: ${appointment.clients?.name || "Sin nombre"}`,
      appointment.clients?.phone ? `Teléfono: ${appointment.clients.phone}` : null,
      `Servicio: ${appointment.services?.name || "Consulta general"}`,
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
    attendees: appointment.clients?.email ? [{ email: appointment.clients.email }] : undefined,
  }

  console.log("📅 Datos del evento a enviar:", {
    summary: eventData.summary,
    start: eventData.start,
    end: eventData.end,
    hasAttendees: !!eventData.attendees,
  })

  try {
    let eventId = appointment.google_calendar_event_id
    let action = "updated"

    if (!eventId) {
      console.log("🔄 Creando evento en Google Calendar...")
      const createResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error("❌ Error de Google Calendar:", {
          status: createResponse.status,
          statusText: createResponse.statusText,
          error: errorText,
          eventData: JSON.stringify(eventData, null, 2),
        })
        throw new Error(`Error de Google Calendar: ${createResponse.status} - ${errorText}`)
      }

      const createdEvent = await createResponse.json()
      eventId = createdEvent.id
      action = "created"
      console.log("✅ Evento creado:", eventId)
    } else {
      console.log("🔄 Actualizando evento en Google Calendar:", eventId)
      const updateResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      })

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        console.error("❌ Error actualizando evento:", {
          status: updateResponse.status,
          statusText: updateResponse.statusText,
          error: errorText,
          eventId,
        })
        throw new Error(`Error actualizando evento: ${updateResponse.status} - ${errorText}`)
      }

      console.log("✅ Evento actualizado:", eventId)
    }

    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({
        google_calendar_event_id: eventId,
        synced_with_google: true,
      })
      .eq("id", appointmentId)

    if (updateError) {
      console.error("❌ Error actualizando cita en BD:", updateError)
      throw new Error("Error actualizando cita en base de datos")
    }

    console.log("✅ Cita sincronizada exitosamente")
    return {
      success: true,
      message: `Appointment ${action} successfully in Google Calendar`,
      eventId,
      action,
    }
  } catch (error) {
    console.error("❌ Error sincronizando cita:", error)
    throw error
  }
}
