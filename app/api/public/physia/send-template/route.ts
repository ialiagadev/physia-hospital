import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { type CountryCode, parsePhoneNumber } from "libphonenumber-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function renderTemplate(templateText: string, params: string[]) {
  let result = templateText
  params.forEach((param, index) => {
    const placeholder = `{{${index + 1}}}`
    result = result.replace(placeholder, param)
  })
  return result
}

function splitPhone(phone: string, defaultCountry: CountryCode = "ES") {
  try {
    // Limpiar el número de entrada
    const cleanPhone = phone.trim().replace(/\s+/g, "")

    // Si ya tiene +, intentar parsear directamente
    if (cleanPhone.startsWith("+")) {
      const parsed = parsePhoneNumber(cleanPhone)
      if (parsed && parsed.isValid()) {
        return {
          prefix: `+${parsed.countryCallingCode}`,
          local: parsed.nationalNumber.toString(),
          full: parsed.number,
        }
      }
    }

    // Si empieza con 34 pero no con +34, podría ser español con código incluido
    if (cleanPhone.startsWith("34") && cleanPhone.length > 2) {
      // Intentar como número español completo (+34...)
      const withPlus = `+${cleanPhone}`
      const parsed = parsePhoneNumber(withPlus)
      if (parsed && parsed.isValid() && parsed.countryCallingCode === "34") {
        return {
          prefix: `+${parsed.countryCallingCode}`,
          local: parsed.nationalNumber.toString(),
          full: parsed.number,
        }
      }
    }

    // Intentar con país por defecto
    const parsed = parsePhoneNumber(cleanPhone, defaultCountry)
    if (parsed && parsed.isValid()) {
      return {
        prefix: `+${parsed.countryCallingCode}`,
        local: parsed.nationalNumber.toString(),
        full: parsed.number,
      }
    }
  } catch (e) {
    console.error("❌ Error parsing phone:", phone, e)
  }

  // Fallback mejorado para España
  let cleaned = phone.replace(/\s+/g, "").replace(/^(\+34|34)/, "")

  // Asegurar que el número local no esté vacío
  if (!cleaned || cleaned.length < 6) {
    console.warn("⚠️ Phone number too short after cleaning:", phone, "->", cleaned)
    cleaned = phone.replace(/\s+/g, "").replace(/^\+/, "")
  }

  return {
    prefix: "+34",
    local: cleaned,
    full: `+34${cleaned}`,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, phone, name = "", templateName, templateParams = [], deductBalance = false } = body

    if (!organizationId || !phone || !templateName) {
      return NextResponse.json({ error: "organizationId, phone, and templateName are required" }, { status: 400 })
    }

    // ✅ Normalizar teléfono
    const { prefix, local, full } = splitPhone(phone)
// 🔍 Buscar cliente por full_phone
let client
const { data: existingClient, error: searchError } = await supabase
  .from("clients")
  .select("*")
  .eq("organization_id", organizationId)
  .eq("full_phone", full)
  .maybeSingle()

if (searchError) {
  console.error("❌ Error buscando cliente:", searchError)
}

if (!existingClient) {
  console.log(`🔍 No se encontró coincidencia: full="${full}" no existe en DB para org=${organizationId}`)
  console.log(`👤 Creando nuevo cliente con full="${full}" (prefix=${prefix}, local=${local})`)

  const { data: newClient, error: createClientError } = await supabase
    .from("clients")
    .insert({
      organization_id: organizationId,
      name: name || "Cliente",
      phone: local,
      phone_prefix: prefix,
      last_interaction_at: new Date().toISOString(),
      channel: "whatsapp",
    })
    .select()
    .single()

  if (createClientError) {
    console.error("❌ Error creando cliente:", createClientError)
    throw createClientError
  }

  console.log(`✅ Cliente creado: id=${newClient.id}, full="${newClient.full_phone}"`)
  client = newClient
} else {
  console.log(
    `🔁 Cliente ya existía: recibido="${full}" | DB="${existingClient.full_phone}" | id=${existingClient.id}`
  )
  client = existingClient
}


    // 🔍 Configuración de WhatsApp
    const { data: wabaConfigData, error: wabaError } = await supabase
      .from("waba")
      .select(
        `
        *,
        canales_organizations!inner(
          id,
          id_organization,
          canal:canales(id, nombre)
        )
      `,
      )
      .eq("canales_organizations.id_organization", organizationId)
      .eq("estado", 1)
      .order("fecha_alta", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (wabaError || !wabaConfigData?.token_proyecto) {
      return NextResponse.json({ error: "WhatsApp configuration not found for this organization" }, { status: 400 })
    }

    // 🔍 Buscar conversación activa
    let conversation: { id: any }
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("client_id", client.id)
      .eq("status", "active")
      .maybeSingle()

    if (!existingConversation) {
      const { data: newConversation, error: newConvError } = await supabase
        .from("conversations")
        .insert({
          organization_id: organizationId,
          client_id: client.id,
          status: "active",
          unread_count: 0,
          last_message_at: new Date().toISOString(),
          title: `Conversación con ${client.name}`,
          id_canales_organization: wabaConfigData.id_canales_organization,
        })
        .select()
        .single()

      if (newConvError) throw newConvError
      conversation = newConversation

      // ⭐ Asignar usuarios del WABA
      const { data: wabaUsers } = await supabase.from("users_waba").select("user_id").eq("waba_id", wabaConfigData.id)

      if (wabaUsers?.length) {
        const conversationUsers = wabaUsers.map((u) => ({
          conversation_id: conversation.id,
          user_id: u.user_id,
        }))
        await supabase.from("users_conversations").insert(conversationUsers)
      }
    } else {
      conversation = existingConversation
    }

    // ⚡ Preparar TemplateAPI
    const { TemplateAPI } = await import("@/app/api/templates/route")
    const templateAPI = new TemplateAPI({
      id_proyecto: wabaConfigData.id_proyecto,
      token_proyecto: wabaConfigData.token_proyecto,
    })

    const templatesResp = await templateAPI.getTemplates()
    const tpl = templatesResp?.data?.find((t: any) => t.name === templateName)
    const bodyText = tpl?.components?.find((c: any) => c.type === "BODY")?.text || templateName

    const renderedContent = renderTemplate(bodyText, templateParams)

    let response
    try {
      if (templateParams.length > 0) {
        response = await templateAPI.sendTemplateWithTextParams(
          full, // 👈 E.164
          templateName,
          templateParams,
          "es",
          deductBalance ? organizationId : undefined,
        )
      } else {
        response = await templateAPI.sendSimpleTemplate(
          full, // 👈 E.164
          templateName,
          "es",
          deductBalance ? organizationId : undefined,
        )
      }
    } catch (error: any) {
      if (error.message?.includes("Insufficient balance") || error.message?.includes("Saldo insuficiente")) {
        return NextResponse.json(
          {
            error: "Saldo insuficiente para enviar la plantilla",
            details: error.message,
          },
          { status: 400 },
        )
      }
      throw error
    }

    const templateButtons = tpl?.components?.find((c: any) => c.type === "BUTTONS")?.buttons || []

    const { data: messageData } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_type: "agent",
        user_id: null,
        content: renderedContent,
        message_type: "text",
        is_read: false,
        metadata: {
          is_template: true,
          template_name: templateName,
          template_params: templateParams,
          template_buttons: templateButtons,
          balance_deducted: deductBalance,
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString(),
          whatsapp_phone: full,
        },
      })
      .select()
      .single()

    // 🔄 Actualizar conversación
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq("id", conversation.id)

    return NextResponse.json({
      success: true,
      data: {
        clientId: client.id,
        conversationId: conversation.id,
        messageId: messageData?.id,
        templateName,
        templateParams,
        renderedContent,
        templateButtons,
      },
    })
  } catch (error) {
    console.error("💥 Error in send-template API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
