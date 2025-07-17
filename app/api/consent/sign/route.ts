import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const {
      token,
      full_name,
      dni,
      signature,
      terms_accepted,
      document_read_understood,
      marketing_notifications_accepted,
    } = await request.json()

    console.log("🔍 DEBUG - Sign consent request:", {
      token: token?.substring(0, 20) + "...",
      full_name,
      dni: dni?.substring(0, 3) + "***",
      hasSignature: !!signature,
      terms_accepted,
      document_read_understood,
      marketing_notifications_accepted,
    })

    if (!token || !full_name || !dni || !signature) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 })
    }

    if (!terms_accepted || !document_read_understood) {
      return NextResponse.json({ error: "Debe aceptar los consentimientos obligatorios" }, { status: 400 })
    }

    // Buscar el token
    const { data: tokenData, error: tokenError } = await supabase
      .from("consent_tokens")
      .select(`
        *,
        consent_forms!inner(id, title, content, category),
        clients(id, name, email, phone)
      `)
      .eq("token", token)
      .single()

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

    // Obtener información del request
    const userAgent = request.headers.get("user-agent") || ""
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const ipAddress = forwardedFor?.split(",")[0] || realIp || "unknown"

    const now_timestamp = new Date().toISOString()

    // Usar el contenido procesado si está disponible
    let finalContent = tokenData.consent_forms.content
    if (tokenData.recipient_info?.processed_content) {
      finalContent = tokenData.recipient_info.processed_content
      console.log("✅ Using processed content for signed consent")
    } else {
      console.log("❌ No processed content found, using original")
    }

    // ✅ CREAR REGISTRO EN patient_consents CON CONTENIDO PROCESADO
    const { data: consentRecord, error: consentError } = await supabase
      .from("patient_consents")
      .insert({
        client_id: tokenData.client_id,
        consent_form_id: tokenData.consent_form_id,
        consent_token_id: tokenData.id,
        signature_base64: signature,
        patient_name: full_name,
        patient_tax_id: dni,
        signed_at: now_timestamp,
        ip_address: ipAddress,
        user_agent: userAgent,
        browser_info: {
          userAgent: userAgent,
          timestamp: now_timestamp,
          ip: ipAddress,
        },
        identity_verified: false,
        is_valid: true,
        terms_accepted: terms_accepted,
        terms_accepted_at: terms_accepted ? now_timestamp : null,
        document_read_understood: document_read_understood,
        document_read_at: document_read_understood ? now_timestamp : null,
        marketing_notifications_accepted: marketing_notifications_accepted,
        marketing_accepted_at: marketing_notifications_accepted ? now_timestamp : null,
        acceptance_text_version: "v1.0",
        // ✅ AGREGAR EL CONTENIDO PROCESADO
        consent_content: finalContent,
        organization_data: tokenData.recipient_info?.organization_data || null,
      })
      .select()
      .single()

    if (consentError) {
      console.error("❌ Error creating patient consent:", consentError)
      return NextResponse.json({ error: "Error al registrar el consentimiento" }, { status: 500 })
    }

    // Marcar el token como usado
    const { error: updateError } = await supabase
      .from("consent_tokens")
      .update({
        used_at: now_timestamp,
        signature_data: {
          full_name,
          dni,
          signature_length: signature.length,
          signed_at: now_timestamp,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      })
      .eq("id", tokenData.id)

    if (updateError) {
      console.error("❌ Error updating token:", updateError)
      // No retornamos error aquí porque el consentimiento ya se guardó
    }

    console.log("✅ DEBUG - Consent signed successfully:", {
      consentId: consentRecord.id,
      tokenId: tokenData.id,
      patientName: full_name,
      termsAccepted: terms_accepted,
      documentRead: document_read_understood,
      marketingAccepted: marketing_notifications_accepted,
    })

    return NextResponse.json({
      success: true,
      data: {
        consent_id: consentRecord.id,
        signed_at: consentRecord.signed_at,
        patient_name: consentRecord.patient_name,
        terms_accepted: consentRecord.terms_accepted,
        document_read_understood: consentRecord.document_read_understood,
        marketing_notifications_accepted: consentRecord.marketing_notifications_accepted,
      },
    })
  } catch (error) {
    console.error("❌ Error signing consent:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
