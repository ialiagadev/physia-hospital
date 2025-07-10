import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const {
      token,
      patient_name,
      patient_tax_id,
      signature_base64,
      terms_accepted,
      terms_accepted_at,
      document_read_understood,
      document_read_at,
      marketing_notifications_accepted,
      marketing_accepted_at,
      acceptance_text_version,
    } = await request.json()

    // Validaciones básicas
    if (!token || !patient_name || !patient_tax_id || !signature_base64) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Validar campos de aceptación obligatorios
    if (!terms_accepted || !document_read_understood) {
      return NextResponse.json(
        { error: "Debe aceptar los términos y confirmar que ha leído el documento" },
        { status: 400 },
      )
    }

    // Obtener información del cliente
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Buscar el token
    const { data: tokenData, error: tokenError } = await supabase
      .from("consent_tokens")
      .select(`
        *,
        clients (id, name, tax_id)
      `)
      .eq("token", token)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Token no válido" }, { status: 404 })
    }

    // Verificaciones de seguridad
    if (tokenData.used_at) {
      return NextResponse.json({ error: "Este consentimiento ya ha sido firmado" }, { status: 400 })
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: "El enlace ha expirado" }, { status: 400 })
    }

    // Validar identidad del paciente
    const nameMatch = patient_name.toLowerCase().trim() === tokenData.clients.name.toLowerCase().trim()
    const taxIdMatch = patient_tax_id.toUpperCase().trim() === tokenData.clients.tax_id?.toUpperCase().trim()

    if (!nameMatch || !taxIdMatch) {
      return NextResponse.json({ error: "Los datos no coinciden con los registros del paciente" }, { status: 400 })
    }

    // Crear el consentimiento firmado con todos los nuevos campos
    const { data: consentData, error: consentError } = await supabase
      .from("patient_consents")
      .insert({
        client_id: tokenData.client_id,
        consent_form_id: tokenData.consent_form_id,
        consent_token_id: tokenData.id,
        signature_base64: signature_base64,
        patient_name: patient_name,
        patient_tax_id: patient_tax_id,
        signed_at: new Date().toISOString(),
        ip_address: clientIP,
        user_agent: userAgent,
        browser_info: {
          platform: request.headers.get("sec-ch-ua-platform") || "unknown",
          language: request.headers.get("accept-language")?.split(",")[0] || "unknown",
        },
        identity_verified: true,
        is_valid: true,
        // Nuevos campos de aceptación
        terms_accepted: terms_accepted,
        terms_accepted_at: terms_accepted_at,
        document_read_understood: document_read_understood,
        document_read_at: document_read_at,
        marketing_notifications_accepted: marketing_notifications_accepted || false,
        marketing_accepted_at: marketing_accepted_at,
        acceptance_text_version: acceptance_text_version,
      })
      .select()
      .single()

    if (consentError) {
      console.error("Error creating consent:", consentError)
      return NextResponse.json({ error: "Error al guardar el consentimiento" }, { status: 500 })
    }

    // Marcar el token como usado
    const { error: updateError } = await supabase
      .from("consent_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id)

    if (updateError) {
      console.error("Error updating token:", updateError)
      // No devolvemos error aquí porque el consentimiento ya se guardó
    }

    return NextResponse.json({
      success: true,
      data: {
        consent_id: consentData.id,
        signed_at: consentData.signed_at,
        marketing_accepted: consentData.marketing_notifications_accepted,
      },
    })
  } catch (error) {
    console.error("Error signing consent:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
