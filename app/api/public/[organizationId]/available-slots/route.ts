import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format, parseISO } from "date-fns"

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

export async function GET(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = Number(params.organizationId)
    const professionalId = searchParams.get("professionalId")
    const serviceId = searchParams.get("serviceId")
    const date = searchParams.get("date")

    if (isNaN(organizationId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    if (!professionalId || !serviceId || !date) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos: professionalId, serviceId, date" },
        { status: 400 },
      )
    }

    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("duration, name")
      .eq("id", Number(serviceId))
      .eq("organization_id", organizationId)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })
    }

    const serviceDuration = Number(service.duration)
    if (isNaN(serviceDuration) || serviceDuration <= 0) {
      return NextResponse.json({ error: "Duración del servicio inválida" }, { status: 500 })
    }

    const targetDate = parseISO(date)
    const dayOfWeek = targetDate.getDay()

    // Vacaciones
    const { data: vacations } = await supabaseAdmin
      .from("vacation_requests")
      .select("start_date, end_date")
      .eq("user_id", professionalId)
      .eq("status", "approved")
      .lte("start_date", format(targetDate, "yyyy-MM-dd"))
      .gte("end_date", format(targetDate, "yyyy-MM-dd"))

    if (vacations && vacations.length > 0) {
      return NextResponse.json({ slots: [] })
    }

    // Horarios laborales
    const { data: workSchedules, error: scheduleError } = await supabaseAdmin
      .from("work_schedules")
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        is_active,
        work_schedule_breaks (
          start_time,
          end_time,
          is_active
        )
      `)
      .eq("user_id", professionalId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_active", true)

    if (scheduleError) {
      return NextResponse.json({ error: "Error al obtener horarios" }, { status: 500 })
    }

    if (!workSchedules || workSchedules.length === 0) {
      return NextResponse.json({ slots: [] })
    }

    const formattedDate = format(targetDate, "yyyy-MM-dd")

    // Citas individuales
    const { data: existingAppointments, error: appointmentsError } = await supabaseAdmin
      .from("appointments")
      .select("start_time, end_time")
      .eq("professional_id", professionalId)
      .eq("date", formattedDate)
      .in("status", ["confirmed", "pending"])

    if (appointmentsError) {
      return NextResponse.json({ error: "Error al obtener citas" }, { status: 500 })
    }

    // Actividades grupales
    const { data: groupActivities, error: groupError } = await supabaseAdmin
      .from("group_activities")
      .select("start_time, end_time")
      .eq("professional_id", professionalId)
      .eq("date", formattedDate)
      .eq("status", "active")

    if (groupError) {
      return NextResponse.json({ error: "Error al obtener actividades grupales" }, { status: 500 })
    }

    const slots = []

    for (const schedule of workSchedules) {
      const startMinutes = timeToMinutes(schedule.start_time)
      const endMinutes = timeToMinutes(schedule.end_time)
      const breaks = schedule.work_schedule_breaks || []

      let currentMinute = startMinutes

      while (currentMinute + serviceDuration <= endMinutes) {
        const slotStart = currentMinute
        const slotEnd = currentMinute + serviceDuration

        const startTime = minutesToTime(slotStart)
        const endTime = minutesToTime(slotEnd)

        // Verificar descanso
        const overlappingBreak = breaks.find((b) => {
          if (!b.is_active) return false
          const breakStart = timeToMinutes(b.start_time)
          const breakEnd = timeToMinutes(b.end_time)
          return slotStart < breakEnd && breakStart < slotEnd
        })

        if (overlappingBreak) {
          currentMinute = timeToMinutes(overlappingBreak.end_time)
          continue
        }

        // Verificar conflicto con citas
        const hasAppointmentConflict = (existingAppointments || []).some((apt) => {
          const aptStart = timeToMinutes(apt.start_time)
          const aptEnd = timeToMinutes(apt.end_time)
          return slotStart < aptEnd && aptStart < slotEnd
        })

        if (hasAppointmentConflict) {
          const conflicting = existingAppointments.find((apt) => {
            const aptStart = timeToMinutes(apt.start_time)
            const aptEnd = timeToMinutes(apt.end_time)
            return slotStart < aptEnd && aptStart < slotEnd
          })
          currentMinute = conflicting ? timeToMinutes(conflicting.end_time) : currentMinute + serviceDuration
          continue
        }

        // Verificar conflicto con actividades grupales
        const hasGroupConflict = (groupActivities || []).some((activity) => {
          const actStart = timeToMinutes(activity.start_time)
          const actEnd = timeToMinutes(activity.end_time)
          return slotStart < actEnd && actStart < slotEnd
        })

        if (hasGroupConflict) {
          const conflicting = groupActivities.find((activity) => {
            const actStart = timeToMinutes(activity.start_time)
            const actEnd = timeToMinutes(activity.end_time)
            return slotStart < actEnd && actStart < slotEnd
          })
          currentMinute = conflicting ? timeToMinutes(conflicting.end_time) : currentMinute + serviceDuration
          continue
        }

        // Slot válido
        slots.push({
          start_time: startTime,
          end_time: endTime,
          available: true,
        })

        currentMinute += serviceDuration
      }
    }

    return NextResponse.json({ slots })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

// Helpers
function timeToMinutes(timeString: string): number {
  if (!timeString) return 0
  const [hours, minutes] = timeString.split(":").map(Number)
  return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}
