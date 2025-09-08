import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin" // tu client con service role key

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Update WhatsApp profile picture - POST received")

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Verificar autenticación
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const formData = await request.formData()
    const image = formData.get("image") as File | null
    const organizationId = formData.get("organizationId") as string | null

    if (!image || !organizationId) {
      return NextResponse.json(
        { error: "Image and organization ID are required" },
        { status: 400 }
      )
    }

    // Canal activo
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

    // Token WABA
    const { data: wabaData } = await supabase
      .from("waba")
      .select("token_proyecto")
      .eq("id_canales_organization", canalOrg.id)
      .eq("estado", 1)
      .single()

    if (!wabaData?.token_proyecto) {
      return NextResponse.json(
        { error: "WhatsApp project not found or not configured" },
        { status: 404 }
      )
    }

    // Subir imagen al bucket logos/profilepictures
    const arrayBuffer = await image.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const filePath = `profilepictures/org-${organizationId}-${Date.now()}-${image.name}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("logos")
      .upload(filePath, buffer, {
        contentType: image.type,
        upsert: true,
      })

    if (uploadError) {
      console.error("[v0] Upload error:", uploadError)
      return NextResponse.json(
        { error: "Error uploading image to storage" },
        { status: 500 }
      )
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("logos").getPublicUrl(filePath)

    console.log("[v0] Uploaded image URL:", publicUrl)

    // Llamada a AiSensy
    const response = await fetch(
      "https://backend.aisensy.com/direct-apis/t1/update-profile-picture",
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${wabaData.token_proyecto}`,
        },
        body: JSON.stringify({ whatsAppDisplayImage: publicUrl }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Error from AiSensy:", errorText)
      return NextResponse.json(
        { error: "Error updating profile picture in AiSensy" },
        { status: 500 }
      )
    }

    const result = await response.json()
    console.log("[v0] AiSensy update success:", result)

    return NextResponse.json({
      success: true,
      message: "Profile picture updated successfully",
      imageUrl: publicUrl,
      data: result,
    })
  } catch (error) {
    console.error("[v0] Error updating WhatsApp profile picture:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
