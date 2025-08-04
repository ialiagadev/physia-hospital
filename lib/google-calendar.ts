import { google } from "googleapis"

console.log("🔍 DEBUG - google-calendar.ts cargado correctamente")

export interface CalendarEvent {
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
  }>
}

export class GoogleCalendarService {
  private oauth2Client: any

  constructor(tokens: any) {
    console.log("🔍 DEBUG - GoogleCalendarService constructor called")
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )
    this.oauth2Client.setCredentials(tokens)
  }

  async createEvent(event: CalendarEvent): Promise<string> {
    console.log("🔍 DEBUG - Creating calendar event:", event.summary)
    console.log("🔍 DEBUG - Event data:", JSON.stringify(event, null, 2))

    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      })

      console.log("🔍 DEBUG - Event created successfully with ID:", response.data.id)
      return response.data.id!
    } catch (error) {
      console.error("🔍 DEBUG - Error creating event:", error)
      throw error
    }
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    console.log("🔍 DEBUG - Updating calendar event:", eventId)
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

    await calendar.events.update({
      calendarId: "primary",
      eventId: eventId,
      requestBody: event,
    })
  }

  async deleteEvent(eventId: string): Promise<void> {
    console.log("🔍 DEBUG - Deleting calendar event:", eventId)
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    })
  }

  async listEvents(timeMin?: string, timeMax?: string): Promise<any[]> {
    console.log("🔍 DEBUG - Listing calendar events")
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: "startTime",
    })

    return response.data.items || []
  }
}

// 🆕 INTERFACES PARA LOS DATOS
interface GoogleCalendarTokens {
  access_token: string
  refresh_token: string
  expires_at: string
}

interface AppointmentData {
  id: string
  date: string
  start_time: string
  end_time: string
  duration: number
  notes?: string
  google_calendar_event_id?: string
  client?: {
    name: string
    email?: string
    phone?: string
  }
  service?: {
    name: string
    description?: string
  }
  professional?: {
    name: string
    email?: string
  }
}

interface GroupActivityData {
  id: string
  name: string
  description?: string
  date: string
  start_time: string
  end_time: string
  duration: number
  max_participants: number
  google_calendar_event_id?: string
  consultation?: {
    name: string
    color?: string
  }
}

interface SyncResult {
  success: boolean
  eventId?: string
  action?: "created" | "updated"
  error?: string
}

// 🆕 FUNCIÓN MEJORADA PARA SINCRONIZAR CITAS
export async function syncAppointmentToGoogleCalendar(
  appointment: AppointmentData,
  tokens: GoogleCalendarTokens,
  forceUpdate = false,
): Promise<SyncResult> {
  try {
    console.log("🔄 Iniciando sincronización de cita:", {
      id: appointment.id,
      hasEventId: !!appointment.google_calendar_event_id,
      forceUpdate,
    })

    // Configurar OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Crear el evento - Filtrar attendees para evitar undefined
    const attendees = [
      appointment.client?.email ? { email: appointment.client.email } : null,
      appointment.professional?.email ? { email: appointment.professional.email } : null,
    ].filter((attendee): attendee is { email: string } => attendee !== null)

    const eventData = {
      summary: `Cita: ${appointment.client?.name || "Cliente"}`,
      description: [
        appointment.service?.name && `Servicio: ${appointment.service.name}`,
        appointment.service?.description && `Descripción: ${appointment.service.description}`,
        appointment.professional?.name && `Profesional: ${appointment.professional.name}`,
        appointment.client?.phone && `Teléfono: ${appointment.client.phone}`,
        appointment.notes && `Notas: ${appointment.notes}`,
      ]
        .filter(Boolean)
        .join("\n"),
      start: {
        dateTime: `${appointment.date}T${appointment.start_time}:00`,
        timeZone: "Europe/Madrid",
      },
      end: {
        dateTime: `${appointment.date}T${appointment.end_time}:00`,
        timeZone: "Europe/Madrid",
      },
      attendees: attendees.length > 0 ? attendees : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    }

    console.log("📅 Datos del evento:", {
      summary: eventData.summary,
      start: eventData.start.dateTime,
      end: eventData.end.dateTime,
      hasEventId: !!appointment.google_calendar_event_id,
      attendeesCount: attendees.length,
    })

    // Decidir si crear o actualizar
    if (appointment.google_calendar_event_id && !forceUpdate) {
      try {
        console.log("🔍 Verificando evento existente:", appointment.google_calendar_event_id)

        await calendar.events.get({
          calendarId: "primary",
          eventId: appointment.google_calendar_event_id,
        })

        console.log("✅ Evento existe, actualizando...")

        const response = await calendar.events.update({
          calendarId: "primary",
          eventId: appointment.google_calendar_event_id,
          requestBody: eventData,
        })

        console.log("✅ Evento actualizado:", response.data.id)

        return {
          success: true,
          eventId: response.data.id!,
          action: "updated",
        }
      } catch (error: any) {
        console.log("❌ Evento no existe o error al verificar, creando nuevo:", error.message)
      }
    }

    // Crear nuevo evento
    console.log("🆕 Creando nuevo evento...")

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: eventData,
    })

    console.log("✅ Evento creado:", response.data.id)

    return {
      success: true,
      eventId: response.data.id!,
      action: "created",
    }
  } catch (error: any) {
    console.error("❌ Error en sincronización:", error)
    return {
      success: false,
      error: error.message || "Error desconocido",
    }
  }
}

// 🆕 FUNCIÓN MEJORADA PARA SINCRONIZAR ACTIVIDADES GRUPALES
export async function syncGroupActivityToGoogleCalendar(
  activity: GroupActivityData,
  tokens: GoogleCalendarTokens,
  forceUpdate = false,
): Promise<SyncResult> {
  try {
    console.log("🔄 Iniciando sincronización de actividad grupal:", {
      id: activity.id,
      name: activity.name,
      hasEventId: !!activity.google_calendar_event_id,
      forceUpdate,
    })

    // Configurar OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Crear el evento
    const eventData = {
      summary: `Actividad: ${activity.name}`,
      description: [
        activity.description && `Descripción: ${activity.description}`,
        `Máximo participantes: ${activity.max_participants}`,
        activity.consultation?.name && `Consulta: ${activity.consultation.name}`,
      ]
        .filter(Boolean)
        .join("\n"),
      start: {
        dateTime: `${activity.date}T${activity.start_time}:00`,
        timeZone: "Europe/Madrid",
      },
      end: {
        dateTime: `${activity.date}T${activity.end_time}:00`,
        timeZone: "Europe/Madrid",
      },
      colorId: activity.consultation?.color ? getGoogleCalendarColorId(activity.consultation.color) : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    }

    console.log("👥 Datos del evento de actividad:", {
      summary: eventData.summary,
      start: eventData.start.dateTime,
      end: eventData.end.dateTime,
      hasEventId: !!activity.google_calendar_event_id,
    })

    // Decidir si crear o actualizar
    if (activity.google_calendar_event_id && !forceUpdate) {
      try {
        console.log("🔍 Verificando actividad existente:", activity.google_calendar_event_id)

        await calendar.events.get({
          calendarId: "primary",
          eventId: activity.google_calendar_event_id,
        })

        console.log("✅ Actividad existe, actualizando...")

        const response = await calendar.events.update({
          calendarId: "primary",
          eventId: activity.google_calendar_event_id,
          requestBody: eventData,
        })

        console.log("✅ Actividad actualizada:", response.data.id)

        return {
          success: true,
          eventId: response.data.id!,
          action: "updated",
        }
      } catch (error: any) {
        console.log("❌ Actividad no existe o error al verificar, creando nueva:", error.message)
      }
    }

    // Crear nuevo evento
    console.log("🆕 Creando nueva actividad...")

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: eventData,
    })

    console.log("✅ Actividad creada:", response.data.id)

    return {
      success: true,
      eventId: response.data.id!,
      action: "created",
    }
  } catch (error: any) {
    console.error("❌ Error en sincronización de actividad:", error)
    return {
      success: false,
      error: error.message || "Error desconocido",
    }
  }
}

// Helper para convertir colores hex a IDs de Google Calendar
function getGoogleCalendarColorId(hexColor: string): string {
  const colorMap: { [key: string]: string } = {
    "#a4bdfc": "1", // Lavender
    "#7ae7bf": "2", // Sage
    "#dbadff": "3", // Grape
    "#ff887c": "4", // Flamingo
    "#fbd75b": "5", // Banana
    "#ffb878": "6", // Tangerine
    "#46d6db": "7", // Peacock
    "#e1e1e1": "8", // Graphite
    "#5484ed": "9", // Blueberry
    "#51b749": "10", // Basil
    "#dc2127": "11", // Tomato
  }

  return colorMap[hexColor.toLowerCase()] || "1"
}

// 🆕 FUNCIÓN PARA ELIMINAR EVENTOS DE GOOGLE CALENDAR
export async function deleteEventFromGoogleCalendar(
  eventId: string,
  tokens: GoogleCalendarTokens,
): Promise<SyncResult> {
  try {
    console.log("🗑️ Eliminando evento de Google Calendar:", eventId)

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    )

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    })

    console.log("✅ Evento eliminado de Google Calendar")

    return {
      success: true,
      action: "updated",
    }
  } catch (error: any) {
    console.error("❌ Error eliminando evento:", error)
    return {
      success: false,
      error: error.message || "Error desconocido",
    }
  }
}
