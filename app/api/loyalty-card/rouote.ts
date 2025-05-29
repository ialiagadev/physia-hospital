import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabase
      .from("loyalty_cards")
      .insert({
        organization_id: body.organization_id,
        client_id: body.client_id,
        professional_id: body.professional_id,
        business_name: body.business_name,
        total_sessions: body.total_sessions,
        completed_sessions: 0,
        reward: body.reward,
        expiry_date: body.expiry_date,
        template_type: body.template_type,
        status: "active",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating loyalty card:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating loyalty card:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}