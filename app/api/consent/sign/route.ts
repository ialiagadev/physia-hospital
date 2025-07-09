import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const { token, patient_name, patient_tax_id, signature_base64 } = await request.json()

    if (!token || !patient_name || !patient_tax_id || !signature_base64) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 })
    }

    // Buscar el token y validar que esté activo
    const { data: tokenData, error: tokenError } = await supabase
      .from("consent_tokens")
      .select(`
        *,
        consent_forms(*),
        clients(id, name, tax_id)
      `)
      .eq("token", token)
      .eq("used_at", null)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: "Token no válido" }, { status: 404 })
    }

    // Verificar expiración
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)

    if (now > expiresAt) {
      return NextResponse.json({ error: "El enlace ha expirado" }, { status: 410 })
    }

    // Validar identidad del paciente
    const client = tokenData.clients
    const nameMatch = patient_name.toLowerCase().trim() === client.name.toLowerCase().trim()
    const taxIdMatch = patient_tax_id.toUpperCase().trim() === (client.tax_id || "").toUpperCase().trim()

    if (!nameMatch || !taxIdMatch) {
      return NextResponse.json(
        {
          error: "Los datos introducidos no coinciden con los registros del paciente",
        },
        { status: 400 },
      )
    }

    // Obtener información de la request
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Guardar el consentimiento firmado
    const { data: consentData, error: consentError } = await supabase
      .from("patient_consents")
      .insert({
        client_id: tokenData.client_id,
        consent_form_id: tokenData.consent_form_id,
        consent_token_id: tokenData.id,
        signature_base64: signature_base64,
        patient_name: patient_name,
        patient_tax_id: patient_tax_id,
        signed_at: now.toISOString(),
        ip_address: clientIP,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (consentError) {
      console.error("Error saving consent:", consentError)
      return NextResponse.json({ error: "Error al guardar el consentimiento" }, { status: 500 })
    }

    // Marcar el token como usado
    const { error: updateError } = await supabase
      .from("consent_tokens")
      .update({ used_at: now.toISOString() })
      .eq("id", tokenData.id)

    if (updateError) {
      console.error("Error updating token:", updateError)
    }

    return NextResponse.json({
      success: true,
      data: {
        consent_id: consentData.id,
        signed_at: consentData.signed_at,
      },
    })
  } catch (error) {
    console.error("Error signing consent:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
