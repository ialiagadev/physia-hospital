import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const participantId = Number.parseInt(body.participant_id)

    if (isNaN(participantId)) {
      return NextResponse.json({ error: "ID de participante inválido" }, { status: 400 })
    }

    // Eliminar al participante de la actividad
    const { error } = await supabaseAdmin
      .from("group_activity_participants")
      .delete()
      .eq("id", participantId)

    if (error) {
      console.error("Error eliminando participante:", error)
      return NextResponse.json({ error: "No se pudo eliminar al participante" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Participante eliminado correctamente" })
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
