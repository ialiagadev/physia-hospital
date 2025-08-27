import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente admin para bypass RLS
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
    const { appointmentId } = body

    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId is required" }, { status: 400 })
    }

    // Verificar que la cita existe antes de borrar
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("id", appointmentId)
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Eliminar la cita
    const { error: deleteError } = await supabaseAdmin
      .from("appointments")
      .delete()
      .eq("id", appointmentId)

    if (deleteError) {
      console.error("Error deleting appointment:", deleteError)
      return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Appointment deleted successfully",
      appointmentId,
    })
  } catch (error) {
    console.error("Error in delete appointment API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
