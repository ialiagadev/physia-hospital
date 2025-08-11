import { NextResponse } from "next/server"
import { getWabaByUserId } from "@/lib/database"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const wabaProject = await getWabaByUserId(session.user.id)

    if (!wabaProject) {
      return NextResponse.json({ error: "No WABA project found" }, { status: 404 })
    }

    return NextResponse.json(wabaProject)
  } catch (error) {
    console.error("Error getting WABA project:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
