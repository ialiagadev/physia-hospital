import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente admin que bypasea RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Clave de servicio, no la pública
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
    const { appointmentId } = body

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId es requerido" }, { status: 400 })
    }

    // Verificar que la cita existe
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select("id, status")
      .eq("id", appointmentId)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 })
    }

    // Actualizar status a "confirmed"
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({
        status: "confirmed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .select("id, status, updated_at")
      .single()

    if (updateError) {
      console.error("Error updating appointment:", updateError)
      return NextResponse.json({ error: "Error al actualizar la cita" }, { status: 500 })
    }

    return NextResponse.json({ success: true, appointment: updated })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
