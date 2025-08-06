import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format, parseISO } from "date-fns"

// Cliente admin que bypassa RLS
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

// Tipos para los descansos
interface ScheduleBreak {
  id: string
  break_name: string
  start_time: string
  end_time: string
  is_active: boolean
}

// Funciones utilitarias para manejo de tiempo
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

// Función para verificar si dos rangos de tiempo se solapan
function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const start1Minutes = timeToMinutes(start1)
  const end1Minutes = timeToMinutes(end1)
  const start2Minutes = timeToMinutes(start2)
  const end2Minutes = timeToMinutes(end2)

  // Dos rangos se solapan si: start1 < end2 && start2 < end1
  return start1Minutes < end2Minutes && start2Minutes < end1Minutes
}

// Función para obtener slots de un profesional específico
async function getSlotsForProfessional(
  professionalId: string,
  organizationId: number,
  serviceDuration: number,
  targetDate: Date,
  formattedDate: string
) {
  const dayOfWeek = targetDate.getDay()

  // Verificar si el profesional está de vacaciones
  const { data: vacations, error: vacationError } = await supabaseAdmin
    .from("vacation_requests")
    .select("start_date, end_date")
    .eq("user_id", professionalId)
    .eq("status", "approved")
    .lte("start_date", formattedDate)
    .gte("end_date", formattedDate)

  if (vacationError) {
    console.error("Error checking vacations:", vacationError)
  }

  if (vacations && vacations.length > 0) {
    console.log("Professional is on vacation")
    return []
  }

  // Obtener horarios de trabajo (primero excepciones, luego regulares)
  let workSchedules = null
  let currentScheduleId = null

  // Buscar excepciones para esta fecha específica
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
    console.log("Using exception schedule for date:", formattedDate)
  } else {
    // Si no hay excepciones, buscar horario regular
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
      console.log("Using regular schedule for day:", dayOfWeek)
    }

    if (regularError) {
      console.error("Error fetching regular schedules:", regularError)
    }
  }

  if (exceptionError) {
    console.error("Error fetching exception schedules:", exceptionError)
  }

  if (!workSchedules || workSchedules.length === 0) {
    console.log("No work schedules found")
    return []
  }

  // Obtener descansos específicos del horario
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
      console.log("Schedule breaks found:", breaks.length)
    }

    if (breaksError) {
      console.error("Error fetching schedule breaks:", breaksError)
    }
  }

  // Obtener citas existentes
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

  console.log("Existing appointments:", existingAppointments?.length || 0)

  // Obtener actividades grupales
  const { data: groupActivities, error: groupError } = await supabaseAdmin
    .from("group_activities")
    .select("id, start_time, end_time, status")
    .eq("professional_id", professionalId)
    .eq("date", formattedDate)
    .neq("status", "cancelled")

  if (groupError) {
    console.error("Error fetching group activities:", groupError)
  }

  console.log("Group activities:", groupActivities?.length || 0)

  // Generar slots disponibles
  const slots = []

  for (const schedule of workSchedules) {
    const workStart = schedule.start_time
    const workEnd = schedule.end_time

    console.log("🕐 Processing schedule:", {
      workStart,
      workEnd,
      serviceDuration: `${serviceDuration} minutes`,
      breaks: scheduleBreaks.length,
    })

    const startMinutes = timeToMinutes(workStart)
    const endMinutes = timeToMinutes(workEnd)

    console.log(
      `🎯 Generating slots every ${serviceDuration} minutes from ${startMinutes} to ${endMinutes - serviceDuration}`,
    )

    // Generar slots usando la duración del servicio como intervalo
    for (let minutes = startMinutes; minutes + serviceDuration <= endMinutes; minutes += serviceDuration) {
      const slotStart = minutesToTime(minutes)
      const slotEnd = minutesToTime(minutes + serviceDuration)

      console.log(`🔍 Checking slot: ${slotStart} - ${slotEnd}`)

      // Verificar conflicto con descanso principal
      let hasBreakConflict = false
      if (schedule.break_start && schedule.break_end) {
        if (timesOverlap(slotStart, slotEnd, schedule.break_start, schedule.break_end)) {
          console.log(`❌ Slot conflicts with main break: ${schedule.break_start} - ${schedule.break_end}`)
          hasBreakConflict = true
        }
      }

      // Verificar conflictos con descansos adicionales
      if (!hasBreakConflict) {
        for (const breakItem of scheduleBreaks) {
          if (timesOverlap(slotStart, slotEnd, breakItem.start_time, breakItem.end_time)) {
            console.log(
              `❌ Slot conflicts with break: ${breakItem.break_name} (${breakItem.start_time} - ${breakItem.end_time})`,
            )
            hasBreakConflict = true
            break
          }
        }
      }

      if (hasBreakConflict) {
        continue
      }

      // Verificar conflictos con citas existentes
      let hasAppointmentConflict = false
      if (existingAppointments) {
        for (const appointment of existingAppointments) {
          if (timesOverlap(slotStart, slotEnd, appointment.start_time, appointment.end_time)) {
            console.log(`❌ Slot conflicts with appointment: ${appointment.start_time} - ${appointment.end_time}`)
            hasAppointmentConflict = true
            break
          }
        }
      }

      if (hasAppointmentConflict) {
        continue
      }

      // Verificar conflictos con actividades grupales
      let hasGroupConflict = false
      if (groupActivities) {
        for (const activity of groupActivities) {
          if (timesOverlap(slotStart, slotEnd, activity.start_time, activity.end_time)) {
            console.log(`❌ Slot conflicts with group activity: ${activity.start_time} - ${activity.end_time}`)
            hasGroupConflict = true
            break
          }
        }
      }

      if (hasGroupConflict) {
        continue
      }

      // Si no hay conflictos, agregar el slot
      slots.push({
        start_time: slotStart,
        end_time: slotEnd,
        available: true,
      })
      console.log(`✅ Added slot: ${slotStart} - ${slotEnd}`)
    }
  }

  return slots
}

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

    // Verificar que la organización existe
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      console.error("Organization error:", orgError)
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    // Obtener duración del servicio
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
    const formattedDate = format(targetDate, "yyyy-MM-dd")

    // Si es "cualquier profesional", buscar en todos los profesionales que pueden realizar este servicio
    if (professionalId === "any") {
      console.log("🔍 Searching slots for ANY professional who can perform this service...")

      // Primero intentar con user_services
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
        .eq("users.organization_id", organizationId)
        .eq("users.is_active", true)

      console.log("🔍 Professional services query result:", { 
        count: professionalServices?.length || 0, 
        error: profServicesError 
      })

      let validProfessionals: any[] = []

      if (profServicesError) {
        console.error("❌ Error fetching professional services:", profServicesError)
        return NextResponse.json({ error: "Error al obtener profesionales del servicio" }, { status: 500 })
      }

      if (!professionalServices || professionalServices.length === 0) {
        console.log("⚠️ No professionals found in user_services table. Trying fallback approach...")
        
        // Fallback: obtener todos los usuarios activos de la organización
        const { data: allProfessionals, error: allProfError } = await supabaseAdmin
          .from("users")
          .select("id, name, is_active, organization_id")
          .eq("organization_id", organizationId)
          .eq("is_active", true)

        console.log("🔍 All professionals query result:", { 
          count: allProfessionals?.length || 0, 
          error: allProfError 
        })

        if (allProfError) {
          console.error("❌ Error fetching all professionals:", allProfError)
          return NextResponse.json({ error: "Error al obtener profesionales" }, { status: 500 })
        }

        if (!allProfessionals || allProfessionals.length === 0) {
          console.log("❌ No professionals found in organization")
          return NextResponse.json({ slots: [] })
        }

        // Convertir formato para compatibilidad
        validProfessionals = allProfessionals.map(prof => ({
          users: prof
        }))

        console.log("✅ Using fallback: all active users from organization")
      } else {
        validProfessionals = professionalServices
        console.log("✅ Using user_services: specific professionals for this service")
      }

      console.log(`📊 Found ${validProfessionals.length} professionals to check`)

      // Crear un mapa de todos los slots posibles con profesional asignado
      const allSlotsMap = new Map<string, { 
        start_time: string; 
        end_time: string; 
        professional_id: string; 
        professional_name: string 
      }>()

      // Para cada profesional, obtener sus slots disponibles
      for (const profService of validProfessionals) {
        const professional = profService.users
        const professionalName = professional.name || 'Profesional'
        console.log(`🔍 Checking slots for professional: ${professionalName} (ID: ${professional.id})`)
        
        try {
          const professionalSlots = await getSlotsForProfessional(
            professional.id,
            organizationId,
            serviceDuration,
            targetDate,
            formattedDate
          )

          console.log(`📅 Professional ${professionalName} has ${professionalSlots.length} available slots`)

          // Agregar slots al mapa (usando tiempo como key para evitar duplicados)
          for (const slot of professionalSlots) {
            const slotKey = `${slot.start_time}-${slot.end_time}`
            
            // Solo agregar si no existe ya (primer profesional disponible gana)
            if (!allSlotsMap.has(slotKey)) {
              allSlotsMap.set(slotKey, {
                start_time: slot.start_time,
                end_time: slot.end_time,
                professional_id: professional.id,
                professional_name: professionalName,
              })
              console.log(`✅ Added slot ${slotKey} for ${professionalName}`)
            } else {
              console.log(`⚠️ Slot ${slotKey} already exists, skipping for ${professionalName}`)
            }
          }
        } catch (slotError) {
          console.error(`❌ Error getting slots for professional ${professionalName}:`, slotError)
          // Continuar con el siguiente profesional
        }
      }

      // Convertir mapa a array y ordenar por hora
      const finalSlots = Array.from(allSlotsMap.values())
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
        .map(slot => ({
          start_time: slot.start_time,
          end_time: slot.end_time,
          available: true,
          professional_id: slot.professional_id,
          professional_name: slot.professional_name,
        }))

      console.log(`🎉 Final slots for ANY professional: ${finalSlots.length}`)
      console.log(
        "📋 Slots list:",
        finalSlots.map((s) => `${s.start_time}-${s.end_time} (${s.professional_name})`),
      )

      return NextResponse.json({ slots: finalSlots })

    } else {
      // Para profesional específico, verificar que puede realizar este servicio
      console.log("🔍 Searching slots for specific professional:", professionalId)

      // Primero verificar si existe en user_services
      const { data: canPerformService, error: serviceCheckError } = await supabaseAdmin
        .from("user_services")
        .select("id")
        .eq("user_id", professionalId)
        .eq("service_id", Number.parseInt(serviceId))
        .single()

      // Si no existe en user_services, permitir de todas formas (fallback)
      if (serviceCheckError && serviceCheckError.code !== 'PGRST116') {
        console.error("❌ Error checking service permission:", serviceCheckError)
        return NextResponse.json({ 
          error: "Error al verificar permisos del profesional" 
        }, { status: 500 })
      }

      if (!canPerformService) {
        console.log("⚠️ Professional not found in user_services, allowing anyway (fallback)")
      } else {
        console.log("✅ Professional can perform this service")
      }
      
      const slots = await getSlotsForProfessional(
        professionalId,
        organizationId,
        serviceDuration,
        targetDate,
        formattedDate
      )

      console.log(`🎉 Final generated slots: ${slots.length}`)
      console.log(
        "📋 Slots list:",
        slots.map((s) => `${s.start_time}-${s.end_time}`),
      )

      return NextResponse.json({ slots })
    }

  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
