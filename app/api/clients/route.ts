import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organization_id")

    let query = supabase.from("clients").select("*").eq("is_active", true).order("name")

    if (organizationId) {
      query = query.eq("organization_id", Number.parseInt(organizationId))
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching clients:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("Creating client with data:", body)

    // Validar datos requeridos
    if (!body.name || !body.organization_id) {
      return NextResponse.json({ error: "Name and organization_id are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        birth_date: body.birth_date || null,
        notes: body.notes || null,
        organization_id: Number.parseInt(body.organization_id),
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating client:", error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log("Client created successfully:", data)
    return NextResponse.json(data)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
