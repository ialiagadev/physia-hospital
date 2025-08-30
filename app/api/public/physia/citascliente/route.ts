import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente admin que bypasa RLS
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
    const clientId = Number.parseInt(body.client_id)

    if (isNaN(clientId)) {
      return NextResponse.json({ error: "ID de cliente inválido" }, { status: 400 })
    }

    console.log("🔎 Buscando citas para clientId:", clientId)

    const today = new Date().toISOString().split("T")[0]

    // === Citas individuales ===
    const { data: individualAppointments, error: individualError } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        date,
        start_time,
        end_time,
        duration,
        status,
        notes,
        created_at,
        updated_at,
        professional_id,
        appointment_type_id,
        service_id,
        users!appointments_professional_id_fkey(
          id,
          name,
          email
        ),
        services(
          id,
          name,
          description,
          price
        ),
        appointment_types(
          id,
          name,
          color
        )
      `)
      .eq("client_id", clientId)
      .gte("date", today) // 👉 solo hoy en adelante
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    if (individualError) {
      console.error("❌ Error fetching individual appointments:", individualError)
      return NextResponse.json(
        { error: "Error obteniendo citas individuales", details: individualError.message },
        { status: 500 },
      )
    }

    console.log("✅ Citas individuales obtenidas:", individualAppointments?.length)

    // === Actividades grupales ===
    const { data: groupAppointments, error: groupError } = await supabaseAdmin
      .from("group_activity_participants")
      .select(`
        id,
        status,
        registration_date,
        notes,
        group_activities!inner(
          id,
          name,
          description,
          date,
          start_time,
          end_time,
          status,
          max_participants,
          current_participants,
          color,
          created_at,
          updated_at,
          professional_id,
          consultation_id,
          service_id,
          users!fk_group_activities_professional(
            id,
            name,
            email
          ),
          services(
            id,
            name,
            description,
            price
          )
        )
      `)
      .eq("client_id", clientId)
      .gte("group_activities.date", today) // 👉 solo hoy en adelante
      .order("group_activities(date)", { ascending: true })
      .order("group_activities(start_time)", { ascending: true })

    if (groupError) {
      console.error("❌ Error fetching group appointments:", groupError)
      return NextResponse.json(
        { error: "Error obteniendo actividades grupales", details: groupError.message },
        { status: 500 },
      )
    }

    console.log("✅ Actividades grupales obtenidas:", groupAppointments?.length)

    // === Formateo citas individuales ===
    const formattedIndividualAppointments =
      individualAppointments?.map((appointment: any) => ({
        id: appointment.id,
        type: "individual" as const,
        date: appointment.date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        duration: appointment.duration,
        status: appointment.status,
        notes: appointment.notes,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,

        professional: {
            id: appointment.professional_id, // siempre el user_id de la tabla
            name: appointment.users ? appointment.users.name : null,
            email: appointment.users ? appointment.users.email : null,
          },
          
          

        service:
          Array.isArray(appointment.services) && appointment.services.length > 0
            ? {
                id: appointment.services[0].id,
                name: appointment.services[0].name,
                description: appointment.services[0].description,
                price: appointment.services[0].price,
              }
            : null,

        appointment_type:
          Array.isArray(appointment.appointment_types) && appointment.appointment_types.length > 0
            ? {
                id: appointment.appointment_types[0].id,
                name: appointment.appointment_types[0].name,
                color: appointment.appointment_types[0].color,
              }
            : null,
      })) || []

    // === Formateo citas grupales ===
    const formattedGroupAppointments =
      groupAppointments?.map((participant: any) => ({
        id: participant.group_activities.id,
        type: "group" as const,
        date: participant.group_activities.date,
        start_time: participant.group_activities.start_time,
        end_time: participant.group_activities.end_time,
        duration: null,
        status: participant.group_activities.status,
        notes: participant.notes,
        created_at: participant.group_activities.created_at,
        updated_at: participant.group_activities.updated_at,
        name: participant.group_activities.name,
        description: participant.group_activities.description,
        max_participants: participant.group_activities.max_participants,
        current_participants: participant.group_activities.current_participants,
        color: participant.group_activities.color,
        participant_status: participant.status,
        registration_date: participant.registration_date,

        professional:
          Array.isArray(participant.group_activities.users) && participant.group_activities.users.length > 0
            ? {
                id: participant.group_activities.users[0].id,
                name: participant.group_activities.users[0].name,
                email: participant.group_activities.users[0].email,
              }
            : null,

        service:
          Array.isArray(participant.group_activities.services) && participant.group_activities.services.length > 0
            ? {
                id: participant.group_activities.services[0].id,
                name: participant.group_activities.services[0].name,
                description: participant.group_activities.services[0].description,
                price: participant.group_activities.services[0].price,
              }
            : null,
      })) || []

    // === Unificar y ordenar ===
    const allAppointments = [...formattedIndividualAppointments, ...formattedGroupAppointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time}`)
      const dateB = new Date(`${b.date}T${b.start_time}`)
      return dateA.getTime() - dateB.getTime()
    })

    console.log("📊 Total citas:", allAppointments.length)

    return NextResponse.json({
      success: true,
      data: {
        client_id: clientId,
        total_appointments: allAppointments.length,
        individual_appointments: formattedIndividualAppointments.length,
        group_appointments: formattedGroupAppointments.length,
        appointments: allAppointments,
      },
    })
  } catch (error) {
    console.error("🔥 Error in client appointments API:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: String(error) },
      { status: 500 },
    )
  }
}
