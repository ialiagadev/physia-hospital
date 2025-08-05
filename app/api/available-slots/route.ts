import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format, parseISO } from "date-fns"

// Cliente admin que bypasea RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = Number.parseInt(params.organizationId)
    const professionalId = searchParams.get("professionalId")
    const serviceId = searchParams.get("serviceId")
    const date = searchParams.get("date")

    console.log("Available slots request:", { organizationId, professionalId, serviceId, date })

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
      console.error("Organization error:", orgError)
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("duration, name")
      .eq("id", Number.parseInt(serviceId))
      .eq("organization_id", organizationId)
      .single()

    if (serviceError || !service) {
      console.error("Service error:", serviceError)
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })
    }

    console.log("🧾 Raw service data:", service)
    const serviceDuration = Number.parseInt(String(service.duration), 10)
    if (isNaN(serviceDuration) || serviceDuration <= 0) {
      console.error("❌ Duración del servicio inválida:", service.duration)
      return NextResponse.json({ error: "Duración del servicio inválida" }, { status: 500 })
    }

    console.log("🔍 Service details:", {
      name: service.name,
      duration: serviceDuration,
      "duration type": typeof serviceDuration,
    })

    const targetDate = parseISO(date)
    const dayOfWeek = targetDate.getDay() // 0 = domingo, 1 = lunes, etc.
    console.log(
      `📅 Target date: ${targetDate.toISOString()} | Day of week: ${dayOfWeek} | Service duration: ${serviceDuration} min`,
    )

    // Check for vacations
    const { data: vacations, error: vacationError } = await supabaseAdmin
      .from("vacation_requests")
      .select("start_date, end_date")
      .eq("user_id", professionalId)
      .eq("status", "approved")
      .lte("start_date", format(targetDate, "yyyy-MM-dd"))
      .gte("end_date", format(targetDate, "yyyy-MM-dd"))

    if (vacationError) {
      console.error("Error checking vacations:", vacationError)
    }

    if (vacations && vacations.length > 0) {
      console.log("Professional is on vacation")
      return NextResponse.json({ slots: [] })
    }

    // Get work schedules
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
      console.error("Error fetching work schedules:", scheduleError)
      return NextResponse.json({ error: "Error al obtener horarios" }, { status: 500 })
    }

    console.log("Work schedules found:", workSchedules?.length || 0)
    if (!workSchedules || workSchedules.length === 0) {
      console.log("No work schedules found for day", dayOfWeek)
      return NextResponse.json({ slots: [] })
    }

    // Get existing appointments
    const { data: existingAppointments, error: appointmentsError } = await supabaseAdmin
      .from("appointments")
      .select("start_time, end_time")
      .eq("professional_id", professionalId)
      .eq("date", format(targetDate, "yyyy-MM-dd"))
      .in("status", ["confirmed", "pending"])

    if (appointmentsError) {
      console.error("Error fetching appointments:", appointmentsError)
      return NextResponse.json({ error: "Error al obtener citas" }, { status: 500 })
    }

    console.log("Existing appointments:", existingAppointments?.length || 0)

    const slots = []
    const bufferTime = 5

    for (const schedule of workSchedules) {
      const startTime = schedule.start_time
      const endTime = schedule.end_time
      const breaks = schedule.work_schedule_breaks || []

      console.log("🕐 Processing schedule:", {
        startTime,
        endTime,
        serviceDuration: `${serviceDuration} minutes`,
        breaks: breaks.length,
      })

      const startMinutes = timeToMinutes(startTime)
      const endMinutes = timeToMinutes(endTime)

      console.log(
        `🎯 Generating slots every ${serviceDuration} minutes from ${startMinutes} to ${endMinutes - serviceDuration}`,
      )

      let slotCount = 0

      // Generate slots based on service duration, not fixed 15-minute intervals
      for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += serviceDuration) {
        const slotStart = minutesToTime(minutes)
        const slotEnd = minutesToTime(minutes + serviceDuration)
        slotCount++

        console.log(`🔍 Checking slot: ${slotStart} - ${slotEnd}`)

        // Check if slot overlaps with any break
        const isInBreak = breaks.some((breakTime) => {
          if (!breakTime.is_active) return false

          const breakStart = timeToMinutes(breakTime.start_time)
          const breakEnd = timeToMinutes(breakTime.end_time)

          // Check if the slot overlaps with the break
          return minutes < breakEnd && minutes + serviceDuration > breakStart
        })

        if (isInBreak) {
          console.log(`❌ Slot ${slotStart} - ${slotEnd} overlaps with break, skipping`)
          continue
        }

        // Check if slot conflicts with existing appointments
        const hasConflict = (existingAppointments || []).some((appointment) => {
          const appointmentStart = timeToMinutes(appointment.start_time)
          const appointmentEnd = timeToMinutes(appointment.end_time)

          // Check if the slot overlaps with the appointment (including buffer)
          return minutes < appointmentEnd + bufferTime && minutes + serviceDuration + bufferTime > appointmentStart
        })

        if (!hasConflict) {
          slots.push({
            start_time: slotStart,
            end_time: slotEnd,
            available: true,
          })
          console.log(`✅ Added slot: ${slotStart} - ${slotEnd}`)
        } else {
          console.log(`❌ Slot ${slotStart} - ${slotEnd} conflicts with existing appointment`)
        }
      }

      console.log(`🔢 Total slots checked: ${slotCount}`)
    }

    console.log(`🎉 Final generated slots: ${slots.length}`)
    return NextResponse.json({ slots })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// Helper functions
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
