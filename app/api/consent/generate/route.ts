import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { OrganizationDataService } from "@/lib/services/organization-data"

interface OrganizationData {
  id: number
  name: string
  tax_id: string
  address?: string
  city: string
  province?: string
  postal_code?: string
  email?: string
  phone?: string
  website?: string
  logo_url?: string
}

export async function POST(request: NextRequest) {
  try {
    const {
      client_id,
      consent_form_id,
      expiration_days = 7,
      delivery_method = "manual",
      created_by,
      organization_id,
      organization_data, // ✅ CAMBIO: Recibir datos completos
    } = await request.json()

    console.log("🔍 DEBUG - Generate consent request:", {
      client_id,
      consent_form_id,
      created_by,
      organization_id,
      has_organization_data: !!organization_data, // ✅ CAMBIO
      organization_name: organization_data?.name,
      expiration_days,
      delivery_method,
    })

    if (!consent_form_id || !created_by) {
      return NextResponse.json({ error: "consent_form_id y created_by son obligatorios" }, { status: 400 })
    }

    if (!organization_id) {
      return NextResponse.json({ error: "organization_id es obligatorio" }, { status: 400 })
    }

    // Verificar que el cliente existe (si se proporciona)
    let client = null
    if (client_id) {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, tax_id, email, phone, organization_id")
        .eq("id", client_id)
        .single()

      console.log("🔍 DEBUG - Client data:", { clientData, clientError })

      if (clientError || !clientData) {
        return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
      }
      client = clientData
    }

    // Verificar que el formulario de consentimiento existe
    const { data: consentForm, error: formError } = await supabase
      .from("consent_forms")
      .select("id, title, content, category, organization_id")
      .eq("id", consent_form_id)
      .eq("is_active", true)
      .single()

    console.log("🔍 DEBUG - Consent form data:", {
      consentForm: consentForm
        ? {
            id: consentForm.id,
            title: consentForm.title,
            organization_id: consentForm.organization_id,
            content_length: consentForm.content?.length || 0,
            content_preview: consentForm.content?.substring(0, 200) + "...",
          }
        : null,
      formError,
    })

    if (formError || !consentForm) {
      return NextResponse.json({ error: "Formulario de consentimiento no encontrado" }, { status: 404 })
    }

    // ✅ CAMBIO: Usar datos de organización del frontend
    console.log("✅ DEBUG - Using organization data from frontend:", {
      organizationId: organization_id,
      organizationData: organization_data
        ? {
            id: organization_data.id,
            name: organization_data.name,
            tax_id: organization_data.tax_id,
            hasAddress: !!organization_data.address,
            hasEmail: !!organization_data.email,
            hasPhone: !!organization_data.phone,
          }
        : null,
    })

    // Procesar el contenido reemplazando placeholders
    let processedContent = consentForm.content
    let placeholdersReplaced = false

    console.log("🔍 DEBUG - Original content preview:", processedContent.substring(0, 300) + "...")

    if (organization_data) {
      try {
        processedContent = OrganizationDataService.replaceOrganizationPlaceholders(
          consentForm.content,
          organization_data as OrganizationData,
        )
        placeholdersReplaced = processedContent !== consentForm.content

        console.log("🔍 DEBUG - Processed content preview:", processedContent.substring(0, 300) + "...")
        console.log("✅ DEBUG - Placeholders replaced:", placeholdersReplaced)
      } catch (processError) {
        console.error("❌ Error processing placeholders:", processError)
        // Usar contenido original si hay error en el procesamiento
        processedContent = consentForm.content
      }
    } else {
      console.log("❌ DEBUG - No organization data provided from frontend!")
    }

    // Generar token único
    const token = `${crypto.randomUUID()}-${Date.now()}`

    // Calcular fecha de expiración
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiration_days)

    // Preparar información del destinatario con datos completos
    const recipientInfo = {
      email: client?.email || null,
      phone: client?.phone || null,
      method: delivery_method,
      client_name: client?.name || null,
      processed_content: processedContent,
      placeholders_replaced: placeholdersReplaced,
      organization_data: organization_data || null, // ✅ CAMBIO: Usar datos del frontend
      organization_source: "frontend_complete",
      processing_timestamp: new Date().toISOString(),
    }

    // Crear el token en la base de datos con el contenido procesado
    const { data: tokenData, error: tokenError } = await supabase
      .from("consent_tokens")
      .insert({
        client_id: client_id || null,
        consent_form_id: consent_form_id,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_by: created_by,
        sent_via: delivery_method,
        recipient_info: recipientInfo,
      })
      .select()
      .single()

    console.log("🔍 DEBUG - Token creation:", {
      tokenData: tokenData
        ? {
            id: tokenData.id,
            token: tokenData.token,
            recipient_info_keys: Object.keys(tokenData.recipient_info || {}),
            has_processed_content: !!tokenData.recipient_info?.processed_content,
            processed_content_length: tokenData.recipient_info?.processed_content?.length || 0,
            has_organization_data: !!tokenData.recipient_info?.organization_data,
            placeholders_replaced: tokenData.recipient_info?.placeholders_replaced,
          }
        : null,
      tokenError,
    })

    if (tokenError) {
      console.error("❌ Error creating token:", tokenError)
      return NextResponse.json({ error: "Error al crear el token" }, { status: 500 })
    }

    // Generar el enlace dinámicamente según el entorno
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://facturas-physia.vercel.app")
    const link = `${baseUrl}/consentimiento/${token}`

    console.log("✅ DEBUG - Consent link generated successfully:", {
      token: tokenData.token,
      link,
      has_organization_data: !!organization_data,
      content_processed: placeholdersReplaced,
      organization_name: organization_data?.name,
    })

    return NextResponse.json({
      success: true,
      data: {
        token: tokenData.token,
        link: link,
        expires_at: tokenData.expires_at,
        client: client
          ? {
              id: client.id,
              name: client.name,
              email: client.email,
              phone: client.phone,
            }
          : null,
        consent_form: {
          id: consentForm.id,
          title: consentForm.title,
          category: consentForm.category,
        },
        organization: organization_data
          ? {
              name: organization_data.name,
              tax_id: organization_data.tax_id,
              city: organization_data.city,
              address: organization_data.address,
              email: organization_data.email,
              phone: organization_data.phone,
            }
          : null,
        processing_info: {
          placeholders_replaced: placeholdersReplaced,
          organization_source: "frontend_complete",
        },
      },
    })
  } catch (error) {
    console.error("❌ Error generating consent link:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
