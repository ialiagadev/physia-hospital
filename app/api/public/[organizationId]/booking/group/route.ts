import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { normalizePhoneNumber, isValidPhoneNumber } from "@/utils/phone-utils"

// Cliente admin para saltarse RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const organizationId = Number.parseInt(params.organizationId)
    const body = await request.json()

    const { activityId, clientData, notes } = body

    // Validaciones básicas
    if (isNaN(organizationId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    if (!activityId || !clientData) {
      return NextResponse.json({ error: "Datos requeridos faltantes" }, { status: 400 })
    }

    // Validar teléfono
    const normalizedPhone = normalizePhoneNumber(clientData.phone)
    if (!isValidPhoneNumber(normalizedPhone)) {
      return NextResponse.json({ error: "Número de teléfono inválido" }, { status: 400 })
    }

    // Verificar que la actividad existe y tiene plazas disponibles
    const { data: activity, error: activityError } = await supabase
      .from("group_activities")
      .select(`
        id,
        name,
        max_participants,
        current_participants,
        status,
        date,
        start_time,
        end_time
      `)
      .eq("id", activityId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single()

    if (activityError || !activity) {
      return NextResponse.json({ error: "Actividad grupal no encontrada" }, { status: 404 })
    }

    if (activity.current_participants >= activity.max_participants) {
      return NextResponse.json({ error: "No hay plazas disponibles en esta actividad" }, { status: 409 })
    }

    // Buscar cliente existente por teléfono
    let clientId: number
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", normalizedPhone)
      .eq("organization_id", organizationId)
      .single()

    if (existingClient) {
      clientId = existingClient.id

      // Actualizar datos del cliente si es necesario
      await supabase
        .from("clients")
        .update({
          name: clientData.name,
          email: clientData.email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)
    } else {
      // Crear nuevo cliente
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          organization_id: organizationId,
          name: clientData.name,
          email: clientData.email,
          phone: normalizedPhone,
        })
        .select("id")
        .single()

      if (clientError || !newClient) {
        console.error("Error creating client:", clientError)
        return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 })
      }

      clientId = newClient.id
    }

    // Verificar si el cliente ya está inscrito en esta actividad
    const { data: existingParticipant } = await supabase
      .from("group_activity_participants")
      .select("id")
      .eq("group_activity_id", activityId)
      .eq("client_id", clientId)
      .neq("status", "cancelled")
      .single()

    if (existingParticipant) {
      return NextResponse.json({ error: "El cliente ya está inscrito en esta actividad" }, { status: 409 })
    }

    // Inscribir al cliente en la actividad grupal
    const { data: participant, error: participantError } = await supabase
      .from("group_activity_participants")
      .insert({
        group_activity_id: activityId,
        client_id: clientId,
        status: "registered",
        notes: notes || null,
      })
      .select(`
        id,
        status,
        registration_date,
        group_activity:group_activities(
          name,
          date,
          start_time,
          end_time
        ),
        client:clients(
          name,
          phone,
          email
        )
      `)
      .single()

    if (participantError || !participant) {
      console.error("Error creating participant:", participantError)
      return NextResponse.json({ error: "Error al inscribir en la actividad" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      participant,
      message: "Inscripción realizada exitosamente",
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
