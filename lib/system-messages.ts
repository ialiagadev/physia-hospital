import { supabase } from "@/lib/supabase/client"

export interface SystemMessageData {
  conversationId: string
  userId: string // Usuario que puede ver el mensaje
  action: "user_assigned" | "user_unassigned" | "multiple_users_assigned"
  targetUserName?: string
  targetUserNames?: string[]
  count?: number
}

export async function createSystemMessage({
  conversationId,
  userId,
  action,
  targetUserName,
  targetUserNames,
  count,
}: SystemMessageData) {
  try {
    let content = ""

    // Generar el contenido del mensaje según la acción
    switch (action) {
      case "user_assigned":
        content = `✅ Usuario ${targetUserName} asignado a la conversación`
        break
      case "user_unassigned":
        content = `❌ Usuario ${targetUserName} desasignado de la conversación`
        break
      case "multiple_users_assigned":
        if (count && count > 1) {
          content = `👥 ${count} usuarios asignados a la conversación`
        } else {
          content = `👥 Usuarios asignados: ${targetUserNames?.join(", ")}`
        }
        break
      default:
        content = "Cambios realizados en la conversación"
    }

    // Crear el mensaje de sistema
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_type: "system",
        user_id: userId, // Usuario que realizó la acción
        content,
        message_type: "system",
        is_read: true, // Los mensajes de sistema se marcan como leídos
        metadata: {
          system_message: true,
          visible_to_user: userId, // Solo visible para este usuario
          action,
          target_users: targetUserNames || (targetUserName ? [targetUserName] : []),
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating system message:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in createSystemMessage:", error)
    throw error
  }
}

// Función para obtener nombres de usuarios por IDs
export async function getUserNamesByIds(userIds: string[]): Promise<{ [key: string]: string }> {
  try {
    const { data, error } = await supabase.from("users").select("id, name, email").in("id", userIds)

    if (error) throw error

    const userNames: { [key: string]: string } = {}
    data?.forEach((user) => {
      userNames[user.id] = user.name || user.email
    })

    return userNames
  } catch (error) {
    console.error("Error getting user names:", error)
    return {}
  }
}
