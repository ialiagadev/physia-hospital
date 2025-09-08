import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] WhatsApp Profile API - GET request received")

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // 🔐 Verificar autenticación
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // 🔎 Leer organizationId de query string
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      )
    }

    // 📡 Buscar canal activo
    const { data: canalOrg } = await supabase
      .from("canales_organizations")
      .select("id")
      .eq("id_organization", organizationId)
      .eq("estado", true)
      .single()

    if (!canalOrg) {
      return NextResponse.json(
        { error: "WhatsApp channel not configured for this organization" },
        { status: 404 }
      )
    }

    // 🔑 Obtener token del proyecto activo
    const { data: wabaData } = await supabase
      .from("waba")
      .select("token_proyecto, numero, nombre")
      .eq("id_canales_organization", canalOrg.id)
      .eq("estado", 1)
      .single()

    if (!wabaData?.token_proyecto) {
      return NextResponse.json(
        { error: "WhatsApp project not found or not configured" },
        { status: 404 }
      )
    }

    // 🌐 Llamada directa a AiSensy
    const response = await fetch(
      "https://backend.aisensy.com/direct-apis/t1/get-profile",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${wabaData.token_proyecto}`,
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Error from AiSensy:", errorText)
      return NextResponse.json(
        { error: "Error fetching profile from AiSensy" },
        { status: 500 }
      )
    }

    const profileData = await response.json()
    console.log("[v0] Profile data received:", profileData)

    // 🔧 Normalizar: tomar el primer elemento si es array
    const rawProfile = Array.isArray(profileData.profileData)
      ? profileData.profileData[0]
      : profileData.profileData || profileData

    return NextResponse.json({
      success: true,
      profile: rawProfile,
    })
  } catch (error) {
    console.error("[v0] Error fetching WhatsApp profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
