import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { normalizePhoneNumber, isValidPhoneNumber, getPhoneSearchVariations } from "@/utils/phone-utils"
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

    const {
      organizationId,
      professionalId,
      serviceId,
      consultationId,
      date,
      startTime,
      endTime,
      duration,
      clientData,
      notes,
    } = body
    const orgId = Number.parseInt(organizationId)
    console.log("🏢 Organization ID:", orgId)

    if (isNaN(orgId) || !professionalId || !date || !startTime || !endTime || !clientData) {
      console.log("❌ Validation failed: missing required data")
      return NextResponse.json({ error: "Datos requeridos faltantes o inválidos" }, { status: 400 })
    }

    // Validar y normalizar teléfono
    const normalizedPhone = normalizePhoneNumber(clientData.phone)
    console.log("📞 Phone normalized:", normalizedPhone)

    if (!isValidPhoneNumber(normalizedPhone)) {
      console.log("❌ Invalid phone number:", normalizedPhone)
      return NextResponse.json({ error: "Número de teléfono inválido" }, { status: 400 })
    }

    // Buscar cliente existente
    console.log("🔍 Searching for existing client...")
    const phoneVariations = getPhoneSearchVariations(normalizedPhone)
    console.log("📞 Phone variations:", phoneVariations)

    let existingClient = null
    for (const phoneVariation of phoneVariations) {
      const { data } = await supabaseAdmin
        .from("clients")
        .select("id, name, email, phone")
        .eq("phone", phoneVariation)
        .eq("organization_id", orgId)
        .single()

      if (data) {
        existingClient = data
        console.log("✅ Found existing client:", existingClient)
        break
      }
    }

    let clientId: number
    if (existingClient) {
      clientId = existingClient.id
      console.log("✅ Using existing client:", clientId)
    } else {
      console.log("➕ Creating new client...")
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from("clients")
        .insert({
          organization_id: orgId,
          name: clientData.name,
          email: clientData.email || null,
          phone: normalizedPhone,
        })
        .select("id")
        .single()

      if (clientError) {
        console.error("❌ Error creating client:", clientError)
        if (clientError.code === "23505") {
          console.log("🔄 Duplicate phone detected, searching again...")
          const { data: duplicateClient } = await supabaseAdmin
            .from("clients")
            .select("id")
            .eq("phone", normalizedPhone)
            .eq("organization_id", orgId)
            .single()

          if (duplicateClient) {
            clientId = duplicateClient.id
            console.log("✅ Found duplicate client:", clientId)
          } else {
            return NextResponse.json({ error: "Error al crear cliente: teléfono duplicado" }, { status: 500 })
          }
        } else {
          return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 })
        }
      } else if (!newClient) {
        console.error("❌ No client data returned")
        return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 })
      } else {
        clientId = newClient.id
        console.log("✅ Created new client:", clientId)
      }
    }

    // Verificar disponibilidad del slot (conflictos con citas)
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

    // Obtener duración del servicio si no se proporciona
    let finalDuration = duration
    if (!finalDuration && serviceId) {
      const { data: service, error: serviceError } = await supabaseAdmin
        .from("services")
        .select("duration")
        .eq("id", serviceId)
        .single()

      if (serviceError) {
        console.error("❌ Error getting service duration:", serviceError)
        return NextResponse.json({ error: "No se pudo obtener la duración del servicio" }, { status: 500 })
      }
      finalDuration = service?.duration || 30
    }

    // Crear cita
    console.log("➕ Creating appointment...")
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from("appointments")
      .insert({
        organization_id: orgId,
        professional_id: professionalId,
        client_id: clientId,
        service_id: serviceId || null,
        consultation_id: consultationId || null,
        date,
        start_time: startTime,
        end_time: endTime,
        duration: finalDuration || 30,
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

    // 🆕 SINCRONIZAR CON GOOGLE CALENDAR DEL PROFESIONAL
    try {
      console.log("📅 Attempting Google Calendar sync for professional:", professionalId)

      // Usar googleTokenManager para obtener tokens válidos (renueva automáticamente si es necesario)
      const tokens = await googleTokenManager.getValidTokens(professionalId)

      if (!tokens) {
        console.log("ℹ️ Professional doesn't have Google Calendar connected - skipping sync")
      } else {
        console.log("🔄 Professional has valid Google tokens, syncing to calendar...")

        // Usar la misma lógica que handleAppointmentSync
        await handleAppointmentSync(appointment.id, tokens.access_token)
        console.log("✅ Google Calendar sync completed successfully")
      }
    } catch (syncError) {
      console.error("❌ Error during Google Calendar sync:", syncError)
      // No fallar la reserva por error de sincronización
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

// Función para sincronizar cita con Google Calendar
async function handleAppointmentSync(appointmentId: string, accessToken: string) {
  console.log("📅 Procesando cita:", appointmentId)

  // Obtener datos de la cita con información del cliente y servicio
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

  // Validar datos requeridos
  if (!appointment.date || !appointment.start_time || !appointment.end_time) {
    console.error("❌ Datos de cita incompletos:", {
      date: appointment.date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
    })
    throw new Error("Datos de cita incompletos")
  }

  // Preparar datos del evento con validación
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
      // Crear nuevo evento
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
      // Actualizar evento existente
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

    // Actualizar la cita en la base de datos
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
