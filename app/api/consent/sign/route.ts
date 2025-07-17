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
      medical_treatment_accepted, // ✅ NUEVO CAMPO OPCIONAL
    } = await request.json()

    console.log("🔍 DEBUG - Sign consent request:", {
      token: token?.substring(0, 20) + "...",
      full_name,
      dni: dni?.substring(0, 3) + "***",
      hasSignature: !!signature,
      terms_accepted,
      document_read_understood,
      marketing_notifications_accepted,
      medical_treatment_accepted, // ✅ LOG NUEVO CAMPO
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

    // ✅ VALIDAR TRATAMIENTO MÉDICO SI ES REQUERIDO
    const requiresMedicalTreatment = tokenData.consent_forms.category !== "general"
    if (requiresMedicalTreatment && !medical_treatment_accepted) {
      return NextResponse.json(
        {
          error: "Debe aceptar el consentimiento para el tratamiento médico específico",
        },
        { status: 400 },
      )
    }

    console.log("🔍 DEBUG - Consent form validation:", {
      category: tokenData.consent_forms.category,
      requiresMedicalTreatment,
      medical_treatment_accepted,
      validationPassed: !requiresMedicalTreatment || medical_treatment_accepted,
    })

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

    // ✅ USAR CONTENIDO PROCESADO DEL TOKEN
    let finalContent = tokenData.consent_forms.content
    let organizationData = null

    if (tokenData.recipient_info?.processed_content) {
      finalContent = tokenData.recipient_info.processed_content
      organizationData = tokenData.recipient_info.organization_data
      console.log("✅ Using processed content and organization data from token")
    } else {
      console.log("❌ No processed content found in token")
    }

    // ✅ PREPARAR DATOS PARA INSERCIÓN
    const insertData: any = {
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
      identity_verified: true,
      is_valid: true,

      // ✅ CAMPOS DE ACEPTACIÓN BÁSICOS
      terms_accepted: terms_accepted,
      terms_accepted_at: terms_accepted ? now_timestamp : null,
      terms_rejected: !terms_accepted,
      terms_rejected_at: !terms_accepted ? now_timestamp : null,

      document_read_understood: document_read_understood,
      document_read_at: document_read_understood ? now_timestamp : null,
      document_rejected: !document_read_understood,
      document_rejected_at: !document_read_understood ? now_timestamp : null,

      marketing_notifications_accepted: marketing_notifications_accepted,
      marketing_accepted_at: marketing_notifications_accepted ? now_timestamp : null,
      marketing_rejected: !marketing_notifications_accepted,
      marketing_rejected_at: !marketing_notifications_accepted ? now_timestamp : null,

      acceptance_text_version: "v1.0",

      // ✅ GUARDAR CONTENIDO PROCESADO Y DATOS DE ORGANIZACIÓN
      consent_content: finalContent,
      organization_data: organizationData,
    }

    // ✅ AGREGAR CAMPOS DE TRATAMIENTO MÉDICO SOLO SI ES REQUERIDO
    if (requiresMedicalTreatment) {
      insertData.medical_treatment_accepted = medical_treatment_accepted
      insertData.medical_treatment_accepted_at = medical_treatment_accepted ? now_timestamp : null
      insertData.medical_treatment_rejected = !medical_treatment_accepted
      insertData.medical_treatment_rejected_at = !medical_treatment_accepted ? now_timestamp : null
    }

    // ✅ CREAR REGISTRO EN patient_consents
    const { data: consentRecord, error: consentError } = await supabase
      .from("patient_consents")
      .insert(insertData)
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
      category: tokenData.consent_forms.category,
      termsAccepted: terms_accepted,
      documentRead: document_read_understood,
      marketingAccepted: marketing_notifications_accepted,
      medicalTreatmentAccepted: requiresMedicalTreatment ? medical_treatment_accepted : "N/A",
      hasProcessedContent: !!consentRecord.consent_content,
      hasOrganizationData: !!consentRecord.organization_data,
    })

    const responseData: any = {
      consent_id: consentRecord.id,
      signed_at: consentRecord.signed_at,
      patient_name: consentRecord.patient_name,
      terms_accepted: consentRecord.terms_accepted,
      document_read_understood: consentRecord.document_read_understood,
      marketing_notifications_accepted: consentRecord.marketing_notifications_accepted,
    }

    // ✅ INCLUIR TRATAMIENTO MÉDICO EN RESPUESTA SI APLICA
    if (requiresMedicalTreatment) {
      responseData.medical_treatment_accepted = consentRecord.medical_treatment_accepted
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    })
  } catch (error) {
    console.error("❌ Error signing consent:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
