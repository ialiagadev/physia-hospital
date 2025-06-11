import { supabase } from "@/lib/supabase/client"

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
    const { data, error } = await supabase
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

    if (error) {
      console.error("Error sending message:", error)
      throw error
    }

    // Actualizar la conversación con el timestamp del último mensaje
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId)

    return data
  } catch (error) {
    console.error("Error in sendMessage:", error)
    throw error
  }
}

export async function markMessagesAsRead(conversationId: string) {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("sender_type", "contact")
      .eq("is_read", false)

    if (error) {
      console.error("Error marking messages as read:", error)
      throw error
    }
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

export async function assignConversation(conversationId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .update({
        assigned_user_id: userId,
        status: "active",
      })
      .eq("id", conversationId)
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
