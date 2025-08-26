import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente admin para bypasear RLS
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { appointmentId } = body

    // Validar que se proporcione el appointmentId
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 })
    }

    // Verificar que la cita existe y obtener sus datos
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select(`
        *,
        client:clients(*),
        professional:users(*),
        service:services(*)
      `)
      .eq("id", appointmentId)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Verificar que la cita no esté ya cancelada
    if (appointment.status === "cancelled") {
      return NextResponse.json({ error: "Appointment is already cancelled" }, { status: 400 })
    }

    // Actualizar el status de la cita a cancelada
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .select(`
        *,
        client:clients(*),
        professional:users(*),
        service:services(*)
      `)
      .single()

    if (updateError) {
      console.error("Error updating appointment:", updateError)
      return NextResponse.json({ error: "Failed to cancel appointment" }, { status: 500 })
    }

    // TODO: Sincronizar con Google Calendar si está habilitado
    // TODO: Enviar notificación al cliente
    // TODO: Enviar notificación al profesional

    return NextResponse.json({
      message: "Appointment cancelled successfully",
      appointment: updatedAppointment,
    })
  } catch (error) {
    console.error("Error in cancel appointment API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
