import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { googleTokenManager } from "@/lib/google-token-manager"

console.log("🔍 DEBUG - Sync route loaded")

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  console.log("🔍 DEBUG - Sync POST called")
  
  try {
    const body = await request.json()
    console.log("🔍 DEBUG - Request body:", body)
    
    const { appointmentId, activityId, userId, organizationId, forceCreate } = body

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: "userId y organizationId son requeridos" },
        { status: 400 }
      )
    }

    // Obtener tokens válidos
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
      return await handleAppointmentSync(appointmentId, organizationId, tokenData, userId, forceCreate)
    } else if (activityId) {
      return await handleGroupActivitySync(activityId, organizationId, tokenData)
    } else {
      return NextResponse.json(
        { error: "appointmentId o activityId es requerido" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error in sync route:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// 🆕 NUEVO: Método DELETE para eliminar eventos del Google Calendar
export async function DELETE(request: NextRequest) {
  console.log("🗑️ DEBUG - Sync DELETE called")
  
  try {
    const body = await request.json()
    console.log("🗑️ DEBUG - Delete request body:", body)
    
    const { appointmentId, activityId, userId, organizationId } = body

    if (!userId || !organizationId) {
      return NextResponse.json(
        { error: "userId y organizationId son requeridos" },
        { status: 400 }
      )
    }

    // Obtener tokens válidos
    const tokenData = await googleTokenManager.getValidTokens(userId)
    if (!tokenData) {
      console.log("🗑️ DEBUG - User doesn't have valid Google Calendar tokens")
      return NextResponse.json({
        success: false,
        message: "Usuario no conectado con Google Calendar o tokens expirados",
      })
    }

    console.log("✅ Tokens válidos obtenidos para eliminación")

    if (appointmentId) {
      return await handleAppointmentDelete(appointmentId, organizationId, tokenData)
    } else if (activityId) {
      return await handleGroupActivityDelete(activityId, organizationId, tokenData)
    } else {
      return NextResponse.json(
        { error: "appointmentId o activityId es requerido" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error in delete sync route:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// 🆕 FUNCIÓN INTELIGENTE: Detecta cambios de profesional y maneja la sincronización
async function handleAppointmentSync(
  appointmentId: string, 
  organizationId: number, 
  tokenData: any, 
  requestUserId: string,
  forceCreate: boolean = false
) {
  console.log("📅 Procesando cita con detección inteligente:", appointmentId)
  
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
      current_professional: appointment.professional_id,
      request_user: requestUserId,
      hasEventId: !!appointment.google_calendar_event_id,
      forceCreate
    })

    // 🆕 DETECCIÓN INTELIGENTE DE CAMBIO DE PROFESIONAL
    const professionalChanged = appointment.professional_id !== requestUserId
    const hasExistingEvent = !!appointment.google_calendar_event_id

    console.log("🔍 Análisis de cambios:", {
      professionalChanged,
      hasExistingEvent,
      oldProfessional: requestUserId,
      newProfessional: appointment.professional_id
    })

    // 🆕 SI HAY CAMBIO DE PROFESIONAL Y EVENTO EXISTENTE
    if (professionalChanged && hasExistingEvent && !forceCreate) {
      console.log("👤 CAMBIO DE PROFESIONAL DETECTADO - Solo eliminando evento anterior")
      
      // 1. Eliminar evento del calendario anterior (del usuario que hace la request)
      try {
        const deleteResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_calendar_event_id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
          }
        )
        
        if (deleteResponse.ok || deleteResponse.status === 404) {
          console.log("✅ Evento eliminado del calendario anterior")
        } else {
          console.log("⚠️ No se pudo eliminar evento anterior, continuando...")
        }
      } catch (error) {
        console.log("⚠️ Error eliminando evento anterior:", error)
      }

      // 2. Limpiar el event_id para permitir que la sincronización automática cree el nuevo evento
      await supabase
        .from("appointments")
        .update({
          google_calendar_event_id: null,
          synced_with_google: false,
        })
        .eq("id", appointmentId)

      console.log("🔄 Event ID limpiado - La sincronización automática creará el nuevo evento")
      
      // 3. Retornar éxito sin crear el nuevo evento
      return NextResponse.json({
        success: true,
        message: "Evento eliminado del calendario anterior. La sincronización automática creará el nuevo evento.",
        action: "cleaned_for_auto_sync"
      })
    }

    // 🆕 SI ES EL MISMO PROFESIONAL O FORZAR CREACIÓN
    if (!professionalChanged || forceCreate) {
      console.log("🔄 Sincronización normal - mismo profesional o creación forzada")
      return await createOrUpdateEvent(appointment, tokenData, appointmentId)
    }

    // 🆕 SI ES CAMBIO DE PROFESIONAL PERO SIN EVENTO EXISTENTE
    if (professionalChanged && !hasExistingEvent) {
      console.log("🆕 Cambio de profesional sin evento existente - creando nuevo")
      
      // Obtener tokens del nuevo profesional
      const newProfessionalTokens = await googleTokenManager.getValidTokens(appointment.professional_id)
      if (!newProfessionalTokens) {
        return NextResponse.json({
          success: false,
          message: "El nuevo profesional no está conectado con Google Calendar",
        })
      }

      return await createNewEvent(appointment, newProfessionalTokens, appointmentId)
    }

    return NextResponse.json({
      success: true,
      message: "No se requiere sincronización"
    })

  } catch (error) {
    console.error("Error syncing appointment:", error)
    return NextResponse.json(
      { error: "Error al sincronizar cita" },
      { status: 500 }
    )
  }
}

// 🆕 FUNCIÓN AUXILIAR: Crear nuevo evento
async function createNewEvent(appointment: any, tokenData: any, appointmentId: string) {
  console.log("🆕 Creando nuevo evento en Google Calendar")
  
  // Validar datos requeridos
  if (!appointment.date || !appointment.start_time || !appointment.end_time) {
    console.error("❌ Datos de fecha/hora faltantes")
    return NextResponse.json(
      { error: "Datos de fecha/hora incompletos" },
      { status: 400 }
    )
  }

  // Preparar datos del evento
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
    attendees: appointment.client?.email
      ? [{ email: appointment.client.email }]
      : undefined,
  }

  console.log("🆕 Creando evento:", eventData.summary)

  // Crear el evento
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    }
  )

  if (!response.ok) {
    const errorData = await response.text()
    console.error("❌ Error creando evento:", errorData)
    throw new Error(`Error de Google Calendar: ${response.status} - ${errorData}`)
  }

  const result = await response.json()
  console.log("✅ Evento creado exitosamente:", result.id)

  // Actualizar la base de datos
  await supabase
    .from("appointments")
    .update({
      google_calendar_event_id: result.id,
      synced_with_google: true,
      last_google_sync: new Date().toISOString(),
    })
    .eq("id", appointmentId)

  return NextResponse.json({
    success: true,
    eventId: result.id,
    action: "created",
    message: "Evento creado correctamente en el nuevo calendario",
  })
}

// 🆕 FUNCIÓN AUXILIAR: Crear o actualizar evento existente
async function createOrUpdateEvent(appointment: any, tokenData: any, appointmentId: string) {
  console.log("🔄 Creando o actualizando evento existente")
  
  // Validar datos requeridos
  if (!appointment.date || !appointment.start_time || !appointment.end_time) {
    return NextResponse.json(
      { error: "Datos de fecha/hora incompletos" },
      { status: 400 }
    )
  }

  // Preparar datos del evento
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
    attendees: appointment.client?.email
      ? [{ email: appointment.client.email }]
      : undefined,
  }

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
        }
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
    console.error("❌ Error de Google Calendar:", errorData)
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
}

// 🆕 FUNCIÓN PARA ELIMINAR CITAS DEL GOOGLE CALENDAR
async function handleAppointmentDelete(
  appointmentId: string,
  organizationId: number,
  tokenData: any
) {
  console.log("🗑️ Eliminando cita del Google Calendar:", appointmentId)
  
  try {
    // Obtener la cita para verificar que existe y obtener el event_id
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(`
        id, 
        google_calendar_event_id,
        client_id,
        clients(name, email, phone)
      `)
      .eq("id", appointmentId)
      .eq("organization_id", organizationId)
      .single()

    if (appointmentError || !appointment) {
      console.log("⚠️ Cita no encontrada para eliminar:", appointmentId)
      return NextResponse.json(
        { success: true, message: "Cita no encontrada, no hay nada que eliminar" },
        { status: 200 }
      )
    }

    // Si no tiene event_id, no hay nada que eliminar en Google Calendar
    if (!appointment.google_calendar_event_id) {
      console.log("ℹ️ La cita no tiene event_id de Google Calendar")
      return NextResponse.json({
        success: true,
        message: "La cita no estaba sincronizada con Google Calendar",
      })
    }

    console.log("🗑️ Eliminando evento de Google Calendar:", appointment.google_calendar_event_id)

    // Eliminar el evento de Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_calendar_event_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (response.ok || response.status === 404) {
      console.log("✅ Evento eliminado exitosamente del Google Calendar")
      
      // Limpiar el google_calendar_event_id de la base de datos
      await supabase
        .from("appointments")
        .update({
          google_calendar_event_id: null,
          synced_with_google: false,
          last_google_sync: new Date().toISOString(),
        })
        .eq("id", appointmentId)

      return NextResponse.json({
        success: true,
      })
    } else {
      const errorData = await response.text()
      console.error("❌ Error eliminando evento de Google Calendar:", {
        status: response.status,
        error: errorData,
      })

      // Aunque falle la eliminación, limpiar el event_id para evitar problemas futuros
      await supabase
        .from("appointments")
        .update({
          google_calendar_event_id: null,
          synced_with_google: false,
        })
        .eq("id", appointmentId)

      return NextResponse.json({
        success: false,
        error: `Error eliminando evento: ${response.status}`,
      })
    }
  } catch (error) {
    console.error("Error deleting appointment from Google Calendar:", error)
    return NextResponse.json(
      { error: "Error al eliminar cita del Google Calendar" },
      { status: 500 }
    )
  }
}

// 🆕 FUNCIÓN PARA ELIMINAR ACTIVIDADES GRUPALES DEL GOOGLE CALENDAR
async function handleGroupActivityDelete(
  activityId: string,
  organizationId: number,
  tokenData: any
) {
  console.log("🗑️ Eliminando actividad grupal del Google Calendar:", activityId)
  
  try {
    // Obtener la actividad para verificar que existe y obtener el event_id
    const { data: activity, error: activityError } = await supabase
      .from("group_activities")
      .select("id, name, google_calendar_event_id")
      .eq("id", activityId)
      .eq("organization_id", organizationId)
      .single()

    if (activityError || !activity) {
      console.log("⚠️ Actividad no encontrada para eliminar:", activityId)
      return NextResponse.json(
        { success: true, message: "Actividad no encontrada, no hay nada que eliminar" },
        { status: 200 }
      )
    }

    // Si no tiene event_id, no hay nada que eliminar en Google Calendar
    if (!activity.google_calendar_event_id) {
      console.log("ℹ️ La actividad no tiene event_id de Google Calendar")
      return NextResponse.json({
        success: true,
        message: "La actividad no estaba sincronizada con Google Calendar",
      })
    }

    console.log("🗑️ Eliminando evento de actividad de Google Calendar:", activity.google_calendar_event_id)

    // Eliminar el evento de Google Calendar
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${activity.google_calendar_event_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (response.ok || response.status === 404) {
      console.log("✅ Evento de actividad eliminado exitosamente del Google Calendar")
      
      // Limpiar el google_calendar_event_id de la base de datos
      await supabase
        .from("group_activities")
        .update({
          google_calendar_event_id: null,
          synced_with_google: false,
          last_google_sync: new Date().toISOString(),
        })
        .eq("id", activityId)

      return NextResponse.json({
        success: true,
        message: `Actividad "${activity.name}" eliminada del Google Calendar`,
      })
    } else {
      const errorData = await response.text()
      console.error("❌ Error eliminando evento de actividad de Google Calendar:", {
        status: response.status,
        error: errorData,
      })

      // Aunque falle la eliminación, limpiar el event_id para evitar problemas futuros
      await supabase
        .from("group_activities")
        .update({
          google_calendar_event_id: null,
          synced_with_google: false,
        })
        .eq("id", activityId)

      return NextResponse.json({
        success: false,
        error: `Error eliminando evento de actividad: ${response.status}`,
      })
    }
  } catch (error) {
    console.error("Error deleting group activity from Google Calendar:", error)
    return NextResponse.json(
      { error: "Error al eliminar actividad del Google Calendar" },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: `Actividad no encontrada: ${activityError?.message}` },
        { status: 404 }
      )
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
      return NextResponse.json(
        { error: "Datos de fecha/hora incompletos" },
        { status: 400 }
      )
    }

    // Preparar lista de participantes para el evento
    const attendeesList = (participants || [])
      .filter((p: any) => p.clients?.email)
      .map((p: any) => ({ email: p.clients.email }))

    const participantNames = (participants || [])
      .map((p: any) => p.clients?.name || "Sin nombre")
      .join(", ")

    // Preparar datos del evento
    const eventData = {
      summary: `${activity.name} (${participants?.length || 0}/${activity.max_participants})`,
      description: [
        `Actividad Grupal: ${activity.name}`,
        activity.description ? `Descripción: ${activity.description}` : null,
        `Profesional: ${professional?.name || "Sin asignar"}`,
        activity.consultations?.name
          ? `Consulta: ${activity.consultations.name}`
          : null,
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
          }
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
    console.log(
      `🔄 ${method === "POST" ? "Creando" : "Actualizando"} actividad en Google Calendar...`
    )
    
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
    return NextResponse.json(
      { error: "Error al sincronizar actividad grupal" },
      { status: 500 }
    )
  }
}

// GET para debugging
export async function GET() {
  return NextResponse.json({
    message: "Sync route is working",
    timestamp: new Date().toISOString(),
  })
}