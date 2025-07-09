import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const { client_id, consent_form_id, expiration_days = 7, delivery_method = "manual" } = await request.json()

    if (!client_id || !consent_form_id) {
      return NextResponse.json({ error: "client_id y consent_form_id son obligatorios" }, { status: 400 })
    }

    // Verificar que el cliente existe
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, name, tax_id, email, phone")
      .eq("id", client_id)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Verificar que el formulario de consentimiento existe
    const { data: consentForm, error: formError } = await supabase
      .from("consent_forms")
      .select("id, title, category")
      .eq("id", consent_form_id)
      .eq("is_active", true)
      .single()

    if (formError || !consentForm) {
      return NextResponse.json({ error: "Formulario de consentimiento no encontrado" }, { status: 404 })
    }

    // Generar token único
    const token = `${crypto.randomUUID()}-${Date.now()}`

    // Calcular fecha de expiración
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiration_days)

    // Obtener el usuario actual (si está autenticado)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Crear el token en la base de datos
    const { data: tokenData, error: tokenError } = await supabase
      .from("consent_tokens")
      .insert({
        client_id: client_id,
        consent_form_id: consent_form_id,
        token: token,
        expires_at: expiresAt.toISOString(),
        created_by: user?.id || null,
        sent_via: delivery_method,
        recipient_info: {
          email: client.email,
          phone: client.phone,
          method: delivery_method,
          client_name: client.name,
        },
      })
      .select()
      .single()

    if (tokenError) {
      console.error("Error creating token:", tokenError)
      return NextResponse.json({ error: "Error al crear el token" }, { status: 500 })
    }

    // Generar el enlace con la URL de producción
    const baseUrl = "https://facturas-physia.vercel.app"
    const link = `${baseUrl}/consentimiento/${token}`

    return NextResponse.json({
      success: true,
      data: {
        token: tokenData.token,
        link: link,
        expires_at: tokenData.expires_at,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
        },
        consent_form: {
          id: consentForm.id,
          title: consentForm.title,
          category: consentForm.category,
        },
      },
    })
  } catch (error) {
    console.error("Error generating consent link:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
