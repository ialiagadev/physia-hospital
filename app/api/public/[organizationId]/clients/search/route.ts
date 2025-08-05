import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { normalizePhoneNumber, getPhoneSearchVariations } from "@/utils/phone-utils"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function GET(request: NextRequest, { params }: { params: { organizationId: string } }) {
  try {
    const organizationId = Number.parseInt(params.organizationId)
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")

    if (isNaN(organizationId) || !phone) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
    }

    const normalizedPhone = normalizePhoneNumber(phone)
    const phoneVariations = getPhoneSearchVariations(normalizedPhone)

    // Buscar cliente con cualquiera de las variaciones del teléfono
    let client = null
    for (const phoneVariation of phoneVariations) {
      const { data } = await supabaseAdmin
        .from("clients")
        .select("id, name, email, phone")
        .eq("phone", phoneVariation)
        .eq("organization_id", organizationId)
        .single()

      if (data) {
        client = data
        break
      }
    }

    return NextResponse.json({
      client,
      found: !!client,
    })
  } catch (error) {
    console.error("Error searching client:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
