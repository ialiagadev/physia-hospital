import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Verificar autenticación
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, about, address, description, vertical, email, websites, whatsAppDisplayImage } = body

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const { data: canalOrg, error: canalError } = await supabase
      .from("canales_organizations")
      .select("id")
      .eq("id_organization", organizationId)
      .eq("estado", true)
      .single()

    if (canalError || !canalOrg) {
      return NextResponse.json({ error: "WhatsApp channel not configured for this organization" }, { status: 404 })
    }

    // Obtener token del proyecto desde waba usando el canal
    const { data: wabaData, error: wabaError } = await supabase
      .from("waba")
      .select("token_proyecto")
      .eq("id_canales_organization", canalOrg.id)
      .eq("estado", 1) // Solo WABA activos
      .single()

    if (wabaError || !wabaData?.token_proyecto) {
      return NextResponse.json({ error: "WhatsApp project not found or not configured" }, { status: 404 })
    }

    // Preparar datos para AiSensy
    const profileData: Record<string, any> = {}

    if (about !== undefined) profileData.whatsAppAbout = about
    if (address !== undefined) profileData.address = address
    if (description !== undefined) profileData.description = description
    if (vertical !== undefined) profileData.vertical = vertical
    if (email !== undefined) profileData.email = email
    if (Array.isArray(websites) && websites.length > 0) profileData.websites = websites
    if (whatsAppDisplayImage !== undefined) profileData.whatsAppDisplayImage = whatsAppDisplayImage

    // Llamar a la API de AiSensy para actualizar el perfil
    const response = await fetch("https://backend.aisensy.com/direct-apis/t1/update-profile", {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${wabaData.token_proyecto}`,
      },
      body: JSON.stringify(profileData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Error from AiSensy:", errorText)
      return NextResponse.json({ error: "Error updating profile in AiSensy", details: errorText }, { status: 500 })
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: result,
    })
  } catch (error) {
    console.error("Error updating WhatsApp profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
