import { supabase } from "@/lib/supabase/client"

// ========================
// Tipos / Interfaces
// ========================
export interface ConversationMessage {
  id: string
  content: string
  // En tu schema: 'contact' | 'agent' | 'system'
  sender_type: "contact" | "agent" | "system"
  message_type: string
  created_at: string
  user_id?: string | null
  users?: {
    name?: string | null
    email?: string | null
    type?: number | null
  } | null
}

// Resumen simple: solo texto + fecha
export interface ConversationSummary {
  texto: string
  fecha_generacion: string
}

export type ConversationInfo = {
  id: string
  title: string | null
  client: { name: string | null } | null
}

// ========================
// Mensajes de la conversación
// ========================
export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select(`
        id,
        content,
        sender_type,
        message_type,
        created_at,
        user_id,
        users (
          name,
          email,
          type
        )
      `)
      .eq("conversation_id", conversationId)
      .neq("sender_type", "system")
      .order("created_at", { ascending: true })
      .limit(500)

    if (error) {
      console.error("Error fetching conversation messages:", error)
      throw new Error("No se pudieron obtener los mensajes de la conversación")
    }

    // Normalizar la relación users (puede venir como objeto o array)
    const transformedData: ConversationMessage[] = (data || []).map((message: any) => {
      let userData: ConversationMessage["users"] = null

      if (Array.isArray(message.users) && message.users.length > 0) {
        userData = message.users[0]
      } else if (message.users && typeof message.users === "object") {
        userData = message.users
      }

      return {
        id: message.id,
        content: message.content,
        sender_type: message.sender_type,
        message_type: message.message_type,
        created_at: message.created_at,
        user_id: message.user_id ?? null,
        users: userData,
      }
    })

    return transformedData
  } catch (error) {
    console.error("Error in getConversationMessages:", error)
    throw error
  }
}

// ========================
// Info de la conversación (por si quieres título/cliente)
// ========================
export async function getConversationInfo(conversationId: string): Promise<ConversationInfo> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        title,
        client:clients(name)
      `)
      .eq("id", conversationId)
      .single()

    if (error) {
      console.error("Error fetching conversation info:", error)
      throw new Error("No se pudo obtener la información de la conversación")
    }

    // Normalizar: client puede venir como objeto o como array
    const rawClient = (data as any).client
    const client = Array.isArray(rawClient) ? (rawClient[0] ?? null) : (rawClient ?? null)

    const normalized: ConversationInfo = {
      id: (data as any).id,
      title: (data as any).title ?? null,
      client,
    }

    return normalized
  } catch (error) {
    console.error("Error in getConversationInfo:", error)
    throw error
  }
}

// ========================
// Generación de resumen (resumen plano del contenido)
// ========================
export async function generateConversationSummary(conversationId: string): Promise<ConversationSummary> {
  try {
    const messages = await getConversationMessages(conversationId)

    if (messages.length === 0) {
      throw new Error("No hay mensajes suficientes para generar un resumen")
    }

    const contactMessages = messages.filter((msg) => msg.sender_type === "contact")
    const agentMessages = messages.filter((msg) => msg.sender_type === "agent")

    // Extraer contenido de los mensajes
    const contactContent = contactMessages.map((msg) => msg.content).join(" ")
    const agentContent = agentMessages.map((msg) => msg.content).join(" ")

    // Crear un resumen estructurado y conciso
    let resumen = ""

    if (contactMessages.length > 0) {
      resumen += `Consulta del contacto: ${extractMainTopics(contactContent)}\n\n`
    }

    if (agentMessages.length > 0) {
      resumen += `Respuesta proporcionada: ${extractMainPoints(agentContent)}\n\n`
    }

    resumen += `Total de mensajes: ${messages.length} (${contactMessages.length} del contacto, ${agentMessages.length} del agente)`

    return {
      texto: resumen.trim(),
      fecha_generacion: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error generating summary:", error)
    throw new Error("No se pudo generar el resumen de la conversación")
  }
}

function extractMainTopics(content: string): string {
  // Extraer los primeros conceptos clave del contenido del contacto
  const words = content.toLowerCase().split(/\s+/)
  const keyWords = words.filter(
    (word) =>
      word.length > 4 &&
      !["sobre", "para", "como", "donde", "cuando", "porque", "quiero", "necesito", "tengo"].includes(word),
  )

  const uniqueKeyWords = [...new Set(keyWords)].slice(0, 5)
  return uniqueKeyWords.length > 0 ? uniqueKeyWords.join(", ") : content.substring(0, 100) + "..."
}

function extractMainPoints(content: string): string {
  // Resumir los puntos principales de la respuesta del agente
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10)

  if (sentences.length <= 2) {
    return content.substring(0, 200) + (content.length > 200 ? "..." : "")
  }

  // Tomar las primeras 2 oraciones más relevantes
  const mainPoints = sentences
    .slice(0, 2)
    .map((s) => s.trim())
    .join(". ")
  return mainPoints + (sentences.length > 2 ? "..." : "")
}

// ========================
// Formateo y descarga
// ========================
export function formatSummaryForDisplay(summary: ConversationSummary): string {
  return `${summary.texto}\n\n---\nGenerado el ${new Date(summary.fecha_generacion).toLocaleString()}`
}

export function downloadSummaryAsFile(summary: ConversationSummary, conversationId: string) {
  const content = formatSummaryForDisplay(summary)
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = `resumen-conversacion-${conversationId}-${new Date().toISOString().split("T")[0]}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
