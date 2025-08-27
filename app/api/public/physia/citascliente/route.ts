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
        modalidad,
        virtual_link,
        created_at,
        updated_at,
        professional_id,
        appointment_type_id,
        service_id,
        users!appointments_professional_id_fkey(
          id,
          first_name,
          last_name,
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
          description,
          color
        )
      `)
      .eq("client_id", clientId)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    if (individualError) {
      console.error("Error fetching individual appointments:", individualError)
      return NextResponse.json({ error: "Error obteniendo citas individuales" }, { status: 500 })
    }

    // === Actividades grupales ===
    const { data: groupAppointments, error: groupError } = await supabaseAdmin
      .from("group_activity_participants")
      .select(`
        id,
        status as participant_status,
        registration_date,
        notes as participant_notes,
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
          users!group_activities_professional_id_fkey(
            id,
            first_name,
            last_name,
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
      .order("group_activities(date)", { ascending: true })
      .order("group_activities(start_time)", { ascending: true })

    if (groupError) {
      console.error("Error fetching group appointments:", groupError)
      return NextResponse.json({ error: "Error obteniendo actividades grupales" }, { status: 500 })
    }

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
        modalidad: appointment.modalidad,
        virtual_link: appointment.virtual_link,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,
        professional: appointment.users
          ? {
              id: appointment.users.id,
              name: `${appointment.users.first_name} ${appointment.users.last_name}`,
              email: appointment.users.email,
            }
          : null,
        service: appointment.services
          ? {
              id: appointment.services.id,
              name: appointment.services.name,
              description: appointment.services.description,
              price: appointment.services.price,
            }
          : null,
        appointment_type: appointment.appointment_types
          ? {
              id: appointment.appointment_types.id,
              name: appointment.appointment_types.name,
              description: appointment.appointment_types.description,
              color: appointment.appointment_types.color,
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
        duration: null, // las actividades grupales no tienen duración específica
        status: participant.group_activities.status,
        notes: participant.participant_notes,
        modalidad: "presencial", // por defecto
        virtual_link: null,
        created_at: participant.group_activities.created_at,
        updated_at: participant.group_activities.updated_at,
        name: participant.group_activities.name,
        description: participant.group_activities.description,
        max_participants: participant.group_activities.max_participants,
        current_participants: participant.group_activities.current_participants,
        color: participant.group_activities.color,
        participant_status: participant.participant_status,
        registration_date: participant.registration_date,
        professional: participant.group_activities.users
          ? {
              id: participant.group_activities.users.id,
              name: `${participant.group_activities.users.first_name} ${participant.group_activities.users.last_name}`,
              email: participant.group_activities.users.email,
            }
          : null,
        service: participant.group_activities.services
          ? {
              id: participant.group_activities.services.id,
              name: participant.group_activities.services.name,
              description: participant.group_activities.services.description,
              price: participant.group_activities.services.price,
            }
          : null,
      })) || []

    // === Unificar y ordenar ===
    const allAppointments = [...formattedIndividualAppointments, ...formattedGroupAppointments].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.start_time}`)
      const dateB = new Date(`${b.date}T${b.start_time}`)
      return dateA.getTime() - dateB.getTime()
    })

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
    console.error("Error in client appointments API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
