import { supabase } from "@/lib/supabase/client"
import { sendWhatsAppMessage, formatPhoneForWhatsApp, validatePhoneNumber } from "@/lib/whatsapp/sendMessage"

export async function sendMessage({
  conversationId,
  content,
  userId,
  messageType = "text",
  mediaUrl,
}: {
  conversationId: string
  content: string
  userId: string
  messageType?: "text" | "image" | "audio" | "video" | "document" | "location"
  mediaUrl?: string
}) {
  try {
    console.log("🔄 Iniciando envío de mensaje:", {
      conversationId,
      content: content.substring(0, 50) + "...",
      userId,
      messageType,
      hasMediaUrl: !!mediaUrl,
    })

    // Primero obtener información de la conversación y el cliente
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        *,
        client:clients(
          *,
          phone_prefix,
          full_phone
        ),
        canales_organization:canales_organizations(
          *,
          canal:canales(*),
          waba:waba(*)
        )
      `)
      .eq("id", conversationId)
      .single()

    if (convError || !conversation) {
      console.error("❌ Error obteniendo conversación:", convError)
      throw new Error("No se pudo obtener la información de la conversación")
    }

    console.log("📋 Información de conversación obtenida:", {
      conversationId: conversation.id,
      clientId: conversation.client?.id,
      clientName: conversation.client?.name,
      clientPhone: conversation.client?.phone,
      clientPhonePrefix: conversation.client?.phone_prefix,
      clientFullPhone: conversation.client?.full_phone,
      clientExternalId: conversation.client?.external_id,
      canalNombre: conversation.canales_organization?.canal?.nombre,
      wabaCount: conversation.canales_organization?.waba?.length || 0,
      wabaToken: conversation.canales_organization?.waba?.[0]?.token_proyecto ? "✅ Presente" : "❌ Ausente",
    })

    // Insertar el mensaje en la base de datos primero
    const { data: messageData, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "agent",
        user_id: userId,
        content,
        message_type: messageType,
        media_url: mediaUrl,
        is_read: false,
      })
      .select()
      .single()

    if (messageError) {
      console.error("❌ Error guardando mensaje:", messageError)
      throw messageError
    }

    console.log("💾 Mensaje guardado en BD:", messageData.id)

    // Verificar si es un canal de WhatsApp y tiene configuración WABA
    const isWhatsApp = conversation.canales_organization?.canal?.nombre?.toLowerCase().includes("whatsapp")
    const wabaConfig = conversation.canales_organization?.waba?.[0] // Tomar la primera configuración WABA

    console.log("🔍 Verificando envío de WhatsApp:", {
      isWhatsApp,
      canalNombre: conversation.canales_organization?.canal?.nombre,
      hasWabaConfig: !!wabaConfig,
      hasToken: !!wabaConfig?.token_proyecto,
      wabaId: wabaConfig?.id,
      wabaNumero: wabaConfig?.numero,
      clientPhone: conversation.client?.phone,
      clientFullPhone: conversation.client?.full_phone,
      clientExternalId: conversation.client?.external_id,
    })

    // Si es WhatsApp y tenemos configuración WABA, enviar por API externa
    if (isWhatsApp && wabaConfig?.token_proyecto && conversation.client) {
      try {
        console.log("📱 Intentando envío por WhatsApp...")
        
        // Determinar el número de teléfono a usar - PRIORIZAR full_phone
        let phoneNumber = conversation.client.full_phone

        // Si no hay full_phone, intentar construirlo
        if (!phoneNumber && conversation.client.phone) {
          if (conversation.client.phone_prefix) {
            phoneNumber = `${conversation.client.phone_prefix}${conversation.client.phone}`
          } else {
            // Si no hay prefijo, usar el teléfono tal como está (puede que ya tenga prefijo)
            phoneNumber = conversation.client.phone
          }
        }

        // Fallback al external_id si no hay teléfono
        if (!phoneNumber) {
          phoneNumber = conversation.client.external_id
        }

        if (!phoneNumber) {
          throw new Error("No se encontró número de teléfono para el cliente")
        }

        console.log("📞 Número de teléfono determinado:", phoneNumber)

        // Validar y formatear el número
        if (!validatePhoneNumber(phoneNumber)) {
          throw new Error(`Número de teléfono inválido: ${phoneNumber}`)
        }

        const formattedPhone = formatPhoneForWhatsApp(phoneNumber)
        console.log("📞 Número formateado:", formattedPhone)

        await sendWhatsAppMessage({
          to: formattedPhone,
          message: content,
          token: wabaConfig.token_proyecto,
          messageType,
          mediaUrl,
        })

        console.log("✅ Mensaje de WhatsApp enviado exitosamente")

        // Marcar el mensaje como enviado exitosamente
        await supabase
          .from("messages")
          .update({
            metadata: {
              ...messageData.metadata,
              whatsapp_sent: true,
              whatsapp_sent_at: new Date().toISOString(),
              whatsapp_phone: formattedPhone,
            },
          })
          .eq("id", messageData.id)

        console.log("✅ Metadata de mensaje actualizada (éxito)")
      } catch (whatsappError: any) {
        console.error("💥 Error enviando mensaje de WhatsApp:", whatsappError)
        
        // Marcar el mensaje como fallido pero no lanzar error
        await supabase
          .from("messages")
          .update({
            metadata: {
              ...messageData.metadata,
              whatsapp_send_failed: true,
              whatsapp_error: whatsappError.message,
              whatsapp_failed_at: new Date().toISOString(),
            },
          })
          .eq("id", messageData.id)

        console.log("⚠️ Metadata de mensaje actualizada (error)")
      }
    } else {
      console.log("ℹ️ No se enviará por WhatsApp:", {
        reason: !isWhatsApp
          ? "No es canal WhatsApp"
          : !wabaConfig
          ? "No hay configuración WABA"
          : !wabaConfig.token_proyecto
          ? "No hay token"
          : !conversation.client
          ? "No hay cliente"
          : "Razón desconocida",
      })
    }

    // Actualizar la conversación con el timestamp del último mensaje
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: 0, // Resetear contador ya que el agente está enviando
      })
      .eq("id", conversationId)

    console.log("✅ Proceso de envío completado")
    return messageData
  } catch (error) {
    console.error("💥 Error in sendMessage:", error)
    throw error
  }
}

export async function markMessagesAsRead(conversationId: string, userId?: string) {
  try {
    console.log(`Marcando mensajes como leídos para conversación: ${conversationId}`)

    // Usar la función de PostgreSQL que creamos
    const { data, error } = await supabase.rpc("mark_conversation_as_read", {
      conversation_uuid: conversationId,
    })

    if (error) {
      console.error("Error marking messages as read:", error)
      throw error
    }

    console.log(`Mensajes marcados como leídos:`, data)

    // Opcional: Actualizar el timestamp de última interacción del cliente
    if (userId) {
      const { error: clientError } = await supabase
        .from("clients")
        .update({ last_interaction_at: new Date().toISOString() })
        .eq("id", userId)

      if (clientError) {
        console.warn("Error updating client last interaction:", clientError)
      }
    }

    return data
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error)
    throw error
  }
}

export async function createConversation({
  organizationId,
  clientData,
  initialMessage,
  existingClientId,
}: {
  organizationId: number
  clientData: {
    name: string
    phone?: string
    phone_prefix?: string
    email?: string
    external_id?: string
    avatar_url?: string
  }
  initialMessage?: string
  existingClientId?: number
}) {
  try {
    let client

    if (existingClientId) {
      // Usar cliente existente
      const { data: existingClient, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", existingClientId)
        .single()

      if (clientError) throw clientError
      client = existingClient
    } else {
      // Crear nuevo cliente o buscar existente
      const { data: existingClient, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("external_id", clientData.external_id)
        .eq("organization_id", organizationId)
        .single()

      if (clientError && clientError.code === "PGRST116") {
        // Cliente no existe, crearlo
        const { data: newClient, error: createError } = await supabase
          .from("clients")
          .insert({
            organization_id: organizationId,
            name: clientData.name,
            phone: clientData.phone,
            phone_prefix: clientData.phone_prefix || '+34', // Valor por defecto
            email: clientData.email,
            external_id: clientData.external_id,
            avatar_url: clientData.avatar_url,
            last_interaction_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (createError) throw createError
        client = newClient
      } else if (clientError) {
        throw clientError
      } else {
        client = existingClient
      }
    }

    // Verificar si ya existe una conversación activa con este cliente
    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("client_id", client.id)
      .eq("status", "active")
      .single()

    if (existingConversation) {
      // Si ya existe una conversación activa, la devolvemos
      return existingConversation
    }

    // Crear nueva conversación
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        organization_id: organizationId,
        client_id: client.id,
        status: "active",
        unread_count: 0,
        last_message_at: new Date().toISOString(),
        title: `Conversación con ${client.name}`,
      })
      .select()
      .single()

    if (convError) throw convError

    // Si hay mensaje inicial, crearlo
    if (initialMessage) {
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_type: "agent",
        content: initialMessage,
        message_type: "text",
        is_read: false,
        created_at: new Date().toISOString(),
      })

      if (msgError) throw msgError
    }

    return conversation
  } catch (error) {
    console.error("Error in createConversation:", error)
    throw error
  }
}

// Función actualizada para asignar un usuario individual (legacy)
export async function assignConversation(conversationId: string, userId: string) {
  try {
    // Verificar si ya existe la asignación
    const { data: existing, error: checkError } = await supabase
      .from("users_conversations")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    // Si ya existe, no hacer nada
    if (existing) {
      return { success: true, message: "Usuario ya asignado" }
    }

    // Insertar nueva asignación
    const { data, error } = await supabase
      .from("users_conversations")
      .insert({
        conversation_id: conversationId,
        user_id: userId
      })
      .select()
      .single()

    if (error) {
      console.error("Error assigning conversation:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in assignConversation:", error)
    throw error
  }
}

export async function unassignConversation(conversationId: string, userId: string) {
  try {
    const { error } = await supabase
      .from("users_conversations")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)

    if (error) {
      console.error("Error unassigning conversation:", error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("Error in unassignConversation:", error)
    throw error
  }
}

// Nueva función para obtener los IDs de usuarios asignados
export async function getAssignedUserIds(conversationId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("users_conversations")
      .select("user_id")
      .eq("conversation_id", conversationId)

    if (error) {
      console.error("Error getting assigned user IDs:", error)
      throw error
    }

    return data?.map(item => item.user_id) || []
  } catch (error) {
    console.error("Error in getAssignedUserIds:", error)
    throw error
  }
}

export async function updateConversationStatus(
  conversationId: string,
  status: "active" | "pending" | "resolved" | "closed",
) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .update({ status })
      .eq("id", conversationId)
      .select()
      .single()

    if (error) {
      console.error("Error updating conversation status:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in updateConversationStatus:", error)
    throw error
  }
}

export async function getUnreadMessagesCount(conversationId: string) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("unread_count")
      .eq("id", conversationId)
      .single()

    if (error) {
      console.error("Error getting unread count:", error)
      return 0
    }

    return data?.unread_count || 0
  } catch (error) {
    console.error("Error in getUnreadMessagesCount:", error)
    return 0
  }
}

export async function getTotalUnreadCount(organizationId: number) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("unread_count")
      .eq("organization_id", organizationId)
      .gt("unread_count", 0)

    if (error) {
      console.error("Error getting total unread count:", error)
      return 0
    }

    return data?.reduce((total, conv) => total + (conv.unread_count || 0), 0) || 0
  } catch (error) {
    console.error("Error in getTotalUnreadCount:", error)
    return 0
  }
}
