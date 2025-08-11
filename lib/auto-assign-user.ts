import { supabase } from "@/lib/supabase/client"

export async function autoAssignUserToConversation(conversationId: string, userId: string) {
  try {
    console.log("🔄 Auto-asignando usuario a conversación:", { conversationId, userId })

    // Verificar si el usuario ya está asignado
    const { data: existingAssignment, error: checkError } = await supabase
      .from("users_conversations")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 es "not found", otros errores son problemáticos
      console.error("❌ Error verificando asignación existente:", checkError)
      return { success: false, error: checkError.message }
    }

    // Si ya está asignado, no hacer nada
    if (existingAssignment) {
      console.log("✅ Usuario ya está asignado a la conversación")
      return { success: true, alreadyAssigned: true }
    }

    // Asignar usuario a la conversación usando upsert para evitar conflictos
    const { error: insertError } = await supabase.from("users_conversations").upsert(
      {
        conversation_id: conversationId,
        user_id: userId,
      },
      {
        onConflict: "conversation_id,user_id",
        ignoreDuplicates: true,
      },
    )

    if (insertError) {
      console.error("❌ Error asignando usuario a conversación:", insertError)
      return { success: false, error: insertError.message }
    }

    console.log("✅ Usuario asignado exitosamente a la conversación")
    return { success: true, alreadyAssigned: false }
  } catch (error) {
    console.error("❌ Error en autoAssignUserToConversation:", error)
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
  }
}
