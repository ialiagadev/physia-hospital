import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format, addDays, startOfToday } from "date-fns"

// Cliente admin que bypasea RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface UnifiedRequest {
  // Parámetros comunes
  organizationId: string | number

  // Qué datos necesitas (puedes combinar varios)
  include: {
    services?: boolean
    professionals?: boolean
    appointments?: boolean
    groupActivities?: boolean
  }

  // Parámetros específicos
  serviceId?: number // Para filtrar profesionales por servicio
  clientId?: number // Para obtener citas de un cliente específico
  professionalName?: string // Para filtrar actividades grupales por nombre
  dateFrom?: string // Fecha inicio (YYYY-MM-DD) - default: hoy
  dateTo?: string // Fecha fin (YYYY-MM-DD) - default: 30 días desde dateFrom
  days?: number // Mantener por compatibilidad, pero deprecado
}

export async function POST(request: NextRequest) {
  try {
    const body: UnifiedRequest = await request.json()
    const {
      organizationId: orgIdRaw,
      include,
      serviceId,
      clientId,
      professionalName,
      dateFrom,
      dateTo,
      days = 30,
    } = body

    const organizationId = Number.parseInt(String(orgIdRaw))

    if (isNaN(organizationId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    const today = startOfToday()
    let startDate: Date
    let endDate: Date

    if (dateFrom) {
      startDate = new Date(dateFrom)
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "Fecha de inicio inválida (usar formato YYYY-MM-DD)" }, { status: 400 })
      }
    } else {
      startDate = today
    }

    if (dateTo) {
      endDate = new Date(dateTo)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: "Fecha de fin inválida (usar formato YYYY-MM-DD)" }, { status: 400 })
      }
    } else {
      endDate = addDays(startDate, days)
    }

    // Validar que la fecha de fin sea posterior a la de inicio
    if (endDate <= startDate) {
      return NextResponse.json({ error: "La fecha de fin debe ser posterior a la fecha de inicio" }, { status: 400 })
    }

    const startDateStr = format(startDate, "yyyy-MM-dd")
    const endDateStr = format(endDate, "yyyy-MM-dd")

    // Verificar que la organización existe (solo una vez)
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    // Objeto para almacenar todos los resultados
    const results: any = {
      organization: {
        id: organization.id,
        name: organization.name,
      },
    }

    // Array para ejecutar todas las consultas en paralelo
    const promises: Promise<any>[] = []

    // 1. SERVICIOS
    if (include.services) {
      promises.push(
        Promise.resolve(
          supabaseAdmin
            .from("services")
            .select(`
              id,
              name,
              description,
              price,
              duration,
              category,
              color
            `)
            .eq("organization_id", organizationId)
            .eq("active", true)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),
        ).then(({ data, error }) => {
          if (error) throw new Error(`Error fetching services: ${error.message}`)

          results.services = (data || []).map((service) => ({
            id: service.id,
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration,
            category: service.category,
            color: service.color || "#3B82F6",
          }))
        }),
      )
    }

    // 2. PROFESIONALES
    if (include.professionals) {
      if (serviceId) {
        // Profesionales que pueden hacer un servicio específico
        promises.push(
          Promise.resolve(
            supabaseAdmin
              .from("user_services")
              .select(`
                user_id,
                users!inner (
                  id,
                  name,
                  specialty,
                  specialty_other,
                  avatar_url,
                  is_active,
                  type
                )
              `)
              .eq("service_id", serviceId)
              .eq("users.organization_id", organizationId)
              .eq("users.is_active", true)
              .eq("users.type", 1),
          ).then(({ data, error }) => {
            if (error) throw new Error(`Error fetching professionals by service: ${error.message}`)

            const professionals = (data || []).map((item: any) => item.users).filter(Boolean)
            results.professionals = professionals.map((professional: any) => ({
              id: professional.id,
              name: professional.name || "Sin nombre",
              specialty: professional.specialty === "otros" ? professional.specialty_other : professional.specialty,
              avatar_url: professional.avatar_url,
            }))
          }),
        )
      } else {
        // Todos los profesionales con sus servicios
        promises.push(
          Promise.resolve(
            supabaseAdmin
              .from("users")
              .select(`
                id,
                name,
                specialty,
                specialty_other,
                avatar_url,
                user_services!inner (
                  services (
                    id,
                    name,
                    description,
                    duration,
                    price
                  )
                )
              `)
              .eq("organization_id", organizationId)
              .eq("is_active", true)
              .eq("type", 1)
              .order("name", { ascending: true }),
          ).then(({ data, error }) => {
            if (error) throw new Error(`Error fetching professionals: ${error.message}`)

            results.professionals = (data || []).map((professional: any) => ({
              id: professional.id,
              name: professional.name || "Sin nombre",
              specialty: professional.specialty === "otros" ? professional.specialty_other : professional.specialty,
              avatar_url: professional.avatar_url,
              services: professional.user_services.map((us: any) => ({
                id: us.services.id,
                name: us.services.name,
                description: us.services.description,
                duration: us.services.duration,
                price: us.services.price,
              })),
            }))
          }),
        )
      }
    }

    // 3. CITAS DE CLIENTE
    if (include.appointments && clientId) {
      // Citas individuales
      const individualPromise = Promise.resolve(
        supabaseAdmin
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
          .gte("date", startDateStr)
          .lte("date", endDateStr)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true }),
      )

      // Actividades grupales
      const groupPromise = Promise.resolve(
        supabaseAdmin
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
          .gte("group_activities.date", startDateStr)
          .lte("group_activities.date", endDateStr)
          .order("group_activities(date)", { ascending: true })
          .order("group_activities(start_time)", { ascending: true }),
      )

      promises.push(
        Promise.all([individualPromise, groupPromise]).then(([individualResult, groupResult]) => {
          if (individualResult.error)
            throw new Error(`Error fetching individual appointments: ${individualResult.error.message}`)
          if (groupResult.error) throw new Error(`Error fetching group appointments: ${groupResult.error.message}`)

          // Formatear citas individuales
          const formattedIndividualAppointments = (individualResult.data || []).map((appointment: any) => ({
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
              id: appointment.professional_id,
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
          }))

          // Formatear citas grupales
          const formattedGroupAppointments = (groupResult.data || []).map((participant: any) => ({
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
          }))

          // Unificar y ordenar todas las citas
          const allAppointments = [...formattedIndividualAppointments, ...formattedGroupAppointments].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.start_time}`)
            const dateB = new Date(`${b.date}T${b.start_time}`)
            return dateA.getTime() - dateB.getTime()
          })

          results.appointments = {
            client_id: clientId,
            total_appointments: allAppointments.length,
            individual_appointments: formattedIndividualAppointments.length,
            group_appointments: formattedGroupAppointments.length,
            appointments: allAppointments,
          }
        }),
      )
    }

    // 4. ACTIVIDADES GRUPALES DISPONIBLES
    if (include.groupActivities) {
      let query = supabaseAdmin
        .from("group_activities")
        .select(`
          id,
          name,
          description,
          date,
          start_time,
          end_time,
          max_participants,
          current_participants,
          color,
          professional:users!fk_group_activities_professional(
            id,
            name
          ),
          service:services!fk_group_activities_service(
            id,
            name,
            price,
            duration
          ),
          consultation:consultations!fk_group_activities_consultation(
            id,
            name
          )
        `)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .gte("date", startDateStr)
        .lte("date", endDateStr)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })

      if (professionalName && professionalName.trim() !== "") {
        query = query.ilike("name", `%${professionalName}%`)
      }

      promises.push(
        Promise.resolve(query).then(({ data, error }) => {
          if (error) throw new Error(`Error fetching group activities: ${error.message}`)

          // Filtrar solo las que tienen plazas disponibles
          results.groupActivities = (data || [])
            .filter((activity) => activity.current_participants < activity.max_participants)
            .map((activity) => ({
              id: activity.id,
              name: activity.name,
              description: activity.description,
              date: activity.date,
              start_time: activity.start_time,
              end_time: activity.end_time,
              max_participants: activity.max_participants,
              current_participants: activity.current_participants,
              available_spots: activity.max_participants - activity.current_participants,
              color: activity.color,
              professional: activity.professional,
              service: activity.service,
              consultation: activity.consultation,
            }))
        }),
      )
    }

    // Ejecutar todas las consultas en paralelo
    await Promise.all(promises)

    return NextResponse.json({
      success: true,
      data: results,
    })
  } catch (error) {
    console.error("🔥 Unified API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor", details: String(error) }, { status: 500 })
  }
}
