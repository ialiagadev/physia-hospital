import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: body.name,
        phone: body.phone,
        organization_id: body.organization_id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating client:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
