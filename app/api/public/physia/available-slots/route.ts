import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format, parseISO, addDays, differenceInDays } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { isSameDay } from "date-fns"

const TIMEZONE = "Europe/Madrid"

// Cliente admin que bypassa RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Tipos para los descansos
interface ScheduleBreak {
  id: string
  break_name: string
  start_time: string
  end_time: string
  is_active: boolean
}

// Utilidades de tiempo
function timeToMinutes(timeString: string): number {
  if (!timeString) return 0
  const [hours, minutes] = timeString.split(":").map(Number)
  return hours * 60 + minutes
}
function roundUpToNextSlot(minutes: number, duration: number): number {
  return Math.ceil(minutes / duration) * duration
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

// Hora actual en minutos (forzada a zona horaria local)
function getCurrentTimeInMinutes(): number {
  const nowUtc = new Date()
  const now = toZonedTime(nowUtc, TIMEZONE)
  return now.getHours() * 60 + now.getMinutes()
}

// Helper: ¿es “hoy” en la zona horaria indicada?
function isTodayInTimezone(date: Date, timezone: string): boolean {
  const now = toZonedTime(new Date(), timezone)
  const zonedDate = toZonedTime(date, timezone)
  return isSameDay(now, zonedDate)
}

// ¿El slot ya ha pasado? (solo aplica a hoy en la zona horaria local)
function hasSlotPassed(slotStartTime: string, targetDate: Date): boolean {
  if (!isTodayInTimezone(targetDate, TIMEZONE)) {
    return false
  }

  const currentTimeMinutes = getCurrentTimeInMinutes()
  const slotStartMinutes = timeToMinutes(slotStartTime)

  // Buffer de 5 minutos para evitar slots “inminentes”
  const bufferMinutes = 5
  const cutoffTime = currentTimeMinutes + bufferMinutes

  const hasPassed = slotStartMinutes <= cutoffTime
  console.log(
    "[v0] Time check - Current:",
    minutesToTime(currentTimeMinutes),
    "Slot:",
    slotStartTime,
    "Has passed:",
    hasPassed,
  )

  return hasPassed
}

// ¿Se solapan dos rangos [start,end)?
function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const start1Minutes = timeToMinutes(start1)
  const end1Minutes = timeToMinutes(end1)
  const start2Minutes = timeToMinutes(start2)
  const end2Minutes = timeToMinutes(end2)
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes
}

// Slots para un profesional
async function getSlotsForProfessional(
  professionalId: string,
  organizationId: number,
  serviceDuration: number,
  targetDate: Date,
  formattedDate: string,
) {
  console.log(
    "[v0] === Getting slots for professional:",
    professionalId,
    "Date:",
    formattedDate,
    "Service duration:",
    serviceDuration,
  )

  const dayOfWeek = targetDate.getDay()

  // Vacaciones aprobadas
  const { data: vacations, error: vacationError } = await supabaseAdmin
    .from("vacation_requests")
    .select("start_date, end_date")
    .eq("user_id", professionalId)
    .eq("status", "approved")
    .lte("start_date", formattedDate)
    .gte("end_date", formattedDate)

  if (vacationError) console.error("Error checking vacations:", vacationError)
  if (vacations && vacations.length > 0) return []

  // Horarios (excepción del día o regular por día de semana)
  let workSchedules: any[] | null = null
  let currentScheduleId: string | null = null

  const { data: exceptionSchedules, error: exceptionError } = await supabaseAdmin
    .from("work_schedules")
    .select(`
      id,
      start_time,
      end_time,
      break_start,
      break_end,
      is_exception,
      date_exception
    `)
    .eq("user_id", professionalId)
    .eq("is_active", true)
    .eq("is_exception", true)
    .eq("date_exception", formattedDate)

  if (exceptionSchedules && exceptionSchedules.length > 0) {
    workSchedules = exceptionSchedules
    currentScheduleId = exceptionSchedules[0].id
  } else {
    const { data: regularSchedules, error: regularError } = await supabaseAdmin
      .from("work_schedules")
      .select(`
        id,
        start_time,
        end_time,
        break_start,
        break_end,
        day_of_week,
        is_exception
      `)
      .eq("user_id", professionalId)
      .eq("is_active", true)
      .eq("day_of_week", dayOfWeek)
      .eq("is_exception", false)

    if (regularSchedules && regularSchedules.length > 0) {
      workSchedules = regularSchedules
      currentScheduleId = regularSchedules[0].id
    }
    if (regularError) console.error("Error fetching regular schedules:", regularError)
  }

  if (exceptionError) console.error("Error fetching exception schedules:", exceptionError)
  if (!workSchedules || workSchedules.length === 0) {
    console.log("[v0] No work schedules found for professional:", professionalId)
    return []
  }

  console.log("[v0] Work schedules found:", workSchedules.length)

  // Descansos asociados al horario (tabla work_schedule_breaks)
  let scheduleBreaks: ScheduleBreak[] = []
  if (currentScheduleId) {
    const { data: breaks, error: breaksError } = await supabaseAdmin
      .from("work_schedule_breaks")
      .select(`
        id,
        break_name,
        start_time,
        end_time,
        is_active
      `)
      .eq("work_schedule_id", currentScheduleId)
      .eq("is_active", true)
      .order("start_time", { ascending: true })

    if (breaks && !breaksError) {
      scheduleBreaks = breaks as ScheduleBreak[]
      console.log(
        "[v0] Schedule breaks found:",
        scheduleBreaks.length,
        scheduleBreaks.map((b) => `${b.break_name}: ${b.start_time}-${b.end_time}`),
      )
    }
    if (breaksError) console.error("Error fetching schedule breaks:", breaksError)
  }

  // Citas existentes
  const { data: existingAppointments, error: appointmentsError } = await supabaseAdmin
    .from("appointments")
    .select("id, start_time, end_time, status")
    .eq("professional_id", professionalId)
    .eq("date", formattedDate)
    .neq("status", "cancelled")

  if (appointmentsError) {
    console.error("Error fetching appointments:", appointmentsError)
    return []
  }

  // Actividades grupales
  const { data: groupActivities, error: groupError } = await supabaseAdmin
    .from("group_activities")
    .select("id, start_time, end_time, status")
    .eq("professional_id", professionalId)
    .eq("date", formattedDate)
    .neq("status", "cancelled")

  if (groupError) console.error("Error fetching group activities:", groupError)

  // Generación de slots
  const slots: Array<{ start_time: string; end_time: string; available: boolean }> = []

  for (const schedule of workSchedules) {
    const workStart: string = schedule.start_time
    const workEnd: string = schedule.end_time
    const startMinutes = timeToMinutes(workStart)
    const endMinutes = timeToMinutes(workEnd)

    console.log("[v0] Processing schedule:", workStart, "to", workEnd)
    console.log("[v0] Main break:", schedule.break_start, "to", schedule.break_end)

    let currentMinutes = startMinutes
    let slotCount = 0

    // Fast-forward (solo si es hoy): saltar directamente al primer slot >= ahora+buffer
    if (isTodayInTimezone(targetDate, TIMEZONE)) {
      const bufferMinutes = 5
      const cutoff = getCurrentTimeInMinutes() + bufferMinutes
      const roundedCutoff = roundUpToNextSlot(cutoff, serviceDuration)
      if (roundedCutoff > currentMinutes) {
        currentMinutes = roundedCutoff
        console.log("[v0] Fast-forward rounded to", minutesToTime(currentMinutes), "due to 'today'")
      }
    }

    while (currentMinutes + serviceDuration <= endMinutes) {
      const slotStart = minutesToTime(currentMinutes)
      const slotEnd = minutesToTime(currentMinutes + serviceDuration)
      slotCount++
      console.log("[v0] --- Checking slot", slotCount, ":", slotStart, "to", slotEnd)

      // 1) DESCANSOS: si pisa, saltar al final del descanso
      let hasBreakConflict = false
      let nextAvailableTime = currentMinutes

      // Descanso principal del horario (si existe)
      if (schedule.break_start && schedule.break_end) {
        if (timesOverlap(slotStart, slotEnd, schedule.break_start, schedule.break_end)) {
          hasBreakConflict = true
          const breakEndMinutes = timeToMinutes(schedule.break_end)
          nextAvailableTime = breakEndMinutes
          console.log("[v0] Main break conflict! Next available time:", minutesToTime(nextAvailableTime))
        }
      }

      // Descansos adicionales (work_schedule_breaks)
      if (!hasBreakConflict) {
        for (const breakItem of scheduleBreaks) {
          if (timesOverlap(slotStart, slotEnd, breakItem.start_time, breakItem.end_time)) {
            hasBreakConflict = true
            const breakEndMinutes = timeToMinutes(breakItem.end_time)
            nextAvailableTime = Math.max(nextAvailableTime, breakEndMinutes)
            console.log(
              "[v0] Schedule break conflict with",
              breakItem.break_name,
              "! Next available time:",
              minutesToTime(nextAvailableTime),
            )
            break
          }
        }
      }

      if (hasBreakConflict) {
        console.log("[v0] Jumping from", minutesToTime(currentMinutes), "to", minutesToTime(nextAvailableTime))
        currentMinutes = nextAvailableTime
        if (currentMinutes + serviceDuration > endMinutes) {
          console.log("[v0] No more time after break, ending loop")
          break
        }
        continue
      }

      // 2) CITAS EXISTENTES
      let hasAppointmentConflict = false
      let latestAppointmentEnd = currentMinutes

      if (existingAppointments) {
        for (const appointment of existingAppointments) {
          if (timesOverlap(slotStart, slotEnd, appointment.start_time, appointment.end_time)) {
            hasAppointmentConflict = true
            const appointmentEndMinutes = timeToMinutes(appointment.end_time)
            latestAppointmentEnd = Math.max(latestAppointmentEnd, appointmentEndMinutes)
            console.log("[v0] Appointment conflict with:", appointment.start_time, "to", appointment.end_time)
          }
        }
      }

      if (hasAppointmentConflict) {
        console.log("[v0] Jumping from", minutesToTime(currentMinutes), "to", minutesToTime(latestAppointmentEnd))
        currentMinutes = latestAppointmentEnd
        if (currentMinutes + serviceDuration > endMinutes) {
          console.log("[v0] No more time after appointment, ending loop")
          break
        }
        continue
      }

      // 3) ACTIVIDADES GRUPALES
      let hasGroupConflict = false
      let latestGroupActivityEnd = currentMinutes

      if (groupActivities) {
        for (const activity of groupActivities) {
          if (timesOverlap(slotStart, slotEnd, activity.start_time, activity.end_time)) {
            hasGroupConflict = true
            const activityEndMinutes = timeToMinutes(activity.end_time)
            latestGroupActivityEnd = Math.max(latestGroupActivityEnd, activityEndMinutes)
            console.log("[v0] Group activity conflict with:", activity.start_time, "to", activity.end_time)
          }
        }
      }

      if (hasGroupConflict) {
        console.log("[v0] Jumping from", minutesToTime(currentMinutes), "to", minutesToTime(latestGroupActivityEnd))
        currentMinutes = latestGroupActivityEnd
        if (currentMinutes + serviceDuration > endMinutes) {
          console.log("[v0] No more time after group activity, ending loop")
          break
        }
        continue
      }

      // 4) ¿EL SLOT YA HA PASADO? (solo hoy, después de gestionar descansos/conflictos)
      if (hasSlotPassed(slotStart, targetDate)) {
        console.log("[v0] Slot has passed, skipping")
        currentMinutes += 1
        continue
      }

      // 5) SLOT DISPONIBLE ✅
      console.log("[v0] ✅ Adding available slot:", slotStart, "to", slotEnd)
      slots.push({
        start_time: slotStart,
        end_time: slotEnd,
        available: true,
      })

      currentMinutes += serviceDuration
    }

    console.log("[v0] Schedule processing complete. Total slots generated:", slots.length)
  }

  return slots
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { professionalId, serviceId, startDate, endDate, organizationId } = body

    const orgId = Number.parseInt(organizationId)

    if (isNaN(orgId)) {
      return NextResponse.json({ error: "ID de organización inválido" }, { status: 400 })
    }

    if (!professionalId || !serviceId || !startDate || !endDate || !organizationId) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos: organizationId, professionalId, serviceId, startDate, endDate" },
        { status: 400 },
      )
    }

    const startDateParsed = parseISO(startDate)
    const endDateParsed = parseISO(endDate)

    if (startDateParsed > endDateParsed) {
      return NextResponse.json(
        { error: "La fecha de inicio no puede ser posterior a la fecha de fin" },
        { status: 400 },
      )
    }

    const daysDifference = differenceInDays(endDateParsed, startDateParsed)
    if (daysDifference > 30) {
      return NextResponse.json({ error: "El rango de fechas no puede exceder 30 días" }, { status: 400 })
    }

    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("id", orgId)
      .single()

    if (orgError || !organization) {
      console.error("Organization error:", orgError)
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("services")
      .select("duration, name")
      .eq("id", Number.parseInt(serviceId))
      .eq("organization_id", orgId)
      .single()

    if (serviceError || !service) {
      console.error("Service error:", serviceError)
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })
    }

    const serviceDuration = Number.parseInt(String(service.duration), 10)
    if (isNaN(serviceDuration) || serviceDuration <= 0) {
      console.error("❌ Duración del servicio inválida:", service.duration)
      return NextResponse.json({ error: "Duración del servicio inválida" }, { status: 500 })
    }

    const slotsByDate: Record<string, any[]> = {}

    let currentDate = startDateParsed
    while (currentDate <= endDateParsed) {
      const formattedDate = format(currentDate, "yyyy-MM-dd")
      console.log(`[v0] Processing date: ${formattedDate}`)

      if (professionalId === "any") {
        const { data: professionalServices, error: profServicesError } = await supabaseAdmin
          .from("user_services")
          .select(`
            user_id,
            users!inner (
              id,
              name,
              is_active,
              organization_id
            )
          `)
          .eq("service_id", Number.parseInt(serviceId))
          .eq("users.organization_id", orgId)
          .eq("users.is_active", true)

        let validProfessionals: any[] = []
        if (profServicesError) {
          console.error("❌ Error fetching professional services:", profServicesError)
          return NextResponse.json({ error: "Error al obtener profesionales del servicio" }, { status: 500 })
        }

        if (!professionalServices || professionalServices.length === 0) {
          const { data: allProfessionals, error: allProfError } = await supabaseAdmin
            .from("users")
            .select("id, name, is_active, organization_id")
            .eq("organization_id", orgId)
            .eq("is_active", true)

          if (allProfError) {
            console.error("❌ Error fetching all professionals:", allProfError)
            return NextResponse.json({ error: "Error al obtener profesionales" }, { status: 500 })
          }

          if (!allProfessionals || allProfessionals.length === 0) {
            slotsByDate[formattedDate] = []
            currentDate = addDays(currentDate, 1)
            continue
          }

          validProfessionals = allProfessionals.map((prof) => ({ users: prof }))
        } else {
          validProfessionals = professionalServices
        }

        const allSlotsMap = new Map<
          string,
          {
            start_time: string
            end_time: string
            professional_id: string
            professional_name: string
          }
        >()

        for (const profService of validProfessionals) {
          const professional = profService.users
          const professionalName = professional.name || "Profesional"

          try {
            const professionalSlots = await getSlotsForProfessional(
              professional.id,
              orgId,
              serviceDuration,
              currentDate,
              formattedDate,
            )

            for (const slot of professionalSlots) {
              const slotKey = `${slot.start_time}-${slot.end_time}`
              if (!allSlotsMap.has(slotKey)) {
                allSlotsMap.set(slotKey, {
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  professional_id: professional.id,
                  professional_name: professionalName,
                })
              }
            }
          } catch (slotError) {
            console.error(`❌ Error getting slots for professional ${professionalName}:`, slotError)
          }
        }

        const finalSlots = Array.from(allSlotsMap.values())
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
          .map((slot) => ({
            start_time: slot.start_time,
            end_time: slot.end_time,
            available: true,
            professional_id: slot.professional_id,
            professional_name: slot.professional_name,
          }))

        slotsByDate[formattedDate] = finalSlots
      } else {
        const { error: serviceCheckError } = await supabaseAdmin
          .from("user_services")
          .select("id")
          .eq("user_id", professionalId)
          .eq("service_id", Number.parseInt(serviceId))
          .single()

        if (serviceCheckError && serviceCheckError.code !== "PGRST116") {
          console.error("❌ Error checking service permission:", serviceCheckError)
          return NextResponse.json({ error: "Error al verificar permisos del profesional" }, { status: 500 })
        }

        const slots = await getSlotsForProfessional(professionalId, orgId, serviceDuration, currentDate, formattedDate)
        slotsByDate[formattedDate] = slots
      }

      currentDate = addDays(currentDate, 1)
    }

    return NextResponse.json({
      slotsByDate,
      dateRange: {
        startDate: format(startDateParsed, "yyyy-MM-dd"),
        endDate: format(endDateParsed, "yyyy-MM-dd"),
      },
    })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
