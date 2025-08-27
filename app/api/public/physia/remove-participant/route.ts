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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { client_id, group_activity_id } = body

    if (!client_id || !group_activity_id) {
      return NextResponse.json(
        { error: "client_id and group_activity_id are required" },
        { status: 400 },
      )
    }

    // Verificar que existe el registro antes de borrarlo
    const { data: participant, error: fetchError } = await supabaseAdmin
      .from("group_activity_participants")
      .select("id")
      .eq("client_id", client_id)
      .eq("group_activity_id", group_activity_id)
      .single()

    if (fetchError || !participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 })
    }

    // Eliminar el registro
    const { error: deleteError } = await supabaseAdmin
      .from("group_activity_participants")
      .delete()
      .eq("client_id", client_id)
      .eq("group_activity_id", group_activity_id)

    if (deleteError) {
      console.error("Error deleting participant:", deleteError)
      return NextResponse.json({ error: "Failed to delete participant" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Participant removed successfully",
      client_id,
      group_activity_id,
    })
  } catch (error) {
    console.error("Error in remove participant API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
