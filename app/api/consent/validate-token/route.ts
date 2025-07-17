import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token es requerido" }, { status: 400 })
    }

    // Buscar el token en la base de datos
    const { data: tokenData, error: tokenError } = await supabase
      .from("consent_tokens")
      .select(`
        *,
        consent_forms!inner(id, title, content, category, organization_id),
        clients(id, name, email, phone, organization_id)
      `)
      .eq("token", token)
      .single()

    console.log("🔍 DEBUG - Token validation:", {
      token: token.substring(0, 20) + "...",
      found: !!tokenData,
      error: tokenError?.message,
      has_processed_content: !!tokenData?.recipient_info?.processed_content,
      has_organization_data: !!tokenData?.recipient_info?.organization_data,
    })

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Token no válido" }, { status: 404 })
    }

    // Verificar si el token ha expirado
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    if (now > expiresAt) {
      return NextResponse.json({ error: "El enlace ha expirado" }, { status: 410 })
    }

    // Verificar si ya fue usado
    if (tokenData.used_at) {
      return NextResponse.json({ error: "El enlace ya ha sido utilizado" }, { status: 410 })
    }

    let content = tokenData.consent_forms.content
    let organizationData = null

    // Prioridad 1: Usar contenido y datos ya procesados
    if (tokenData.recipient_info?.processed_content && tokenData.recipient_info?.organization_data) {
      console.log("🔍 DEBUG - Using pre-processed content and organization data")
      content = tokenData.recipient_info.processed_content
      organizationData = tokenData.recipient_info.organization_data
    } else {
      console.log("❌ DEBUG - No pre-processed data found, this shouldn't happen with the new flow")
    }

    console.log("✅ DEBUG - Token validation successful:", {
      token: token.substring(0, 20) + "...",
      has_organization_data: !!organizationData,
      organization_name: organizationData?.name,
      content_length: content.length,
      client_name: tokenData.clients?.name,
      placeholders_replaced: tokenData.recipient_info?.placeholders_replaced,
    })

    return NextResponse.json({
      success: true,
      data: {
        token: tokenData.token,
        consent_form: {
          id: tokenData.consent_forms.id,
          title: tokenData.consent_forms.title,
          content: content,
          category: tokenData.consent_forms.category,
        },
        client: tokenData.clients
          ? {
              id: tokenData.clients.id,
              name: tokenData.clients.name,
              email: tokenData.clients.email,
              phone: tokenData.clients.phone,
            }
          : null,
        organization: organizationData,
        expires_at: tokenData.expires_at,
        is_signed: !!tokenData.used_at,
        processing_info: {
          has_processed_content: !!tokenData.recipient_info?.processed_content,
          placeholders_replaced: tokenData.recipient_info?.placeholders_replaced || false,
          organization_source: tokenData.recipient_info?.organization_source || null,
        },
      },
    })
  } catch (error) {
    console.error("❌ Error validating token:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
