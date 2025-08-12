import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

export const runtime = "nodejs"
export const maxDuration = 30

// Configuración para manejo de conversaciones largas
const MAX_MESSAGES = 100 // Máximo de mensajes a procesar
const MAX_TOKENS_PER_MESSAGE = 100 // Máximo de tokens por mensaje
const MAX_TOTAL_TOKENS = 8000 // Máximo total de tokens para el prompt

function truncateMessage(content: string, maxTokens: number): string {
  // Estimación aproximada: 1 token ≈ 4 caracteres
  const maxChars = maxTokens * 4
  if (content.length <= maxChars) return content

  return content.substring(0, maxChars - 3) + "..."
}

function selectRelevantMessages(messages: any[]): any[] {
  if (messages.length <= MAX_MESSAGES) {
    return messages
  }

  // Estrategia inteligente: tomar los primeros y últimos mensajes
  const firstMessages = messages.slice(0, 20) // Primeros 20 para contexto inicial
  const lastMessages = messages.slice(-60) // Últimos 60 para contexto reciente

  // Buscar mensajes importantes en el medio (que contengan palabras clave médicas)
  const middleMessages = messages.slice(20, -60)
  const importantKeywords = [
    "dolor",
    "síntoma",
    "tratamiento",
    "medicamento",
    "diagnóstico",
    "cita",
    "urgente",
    "emergencia",
    "receta",
    "análisis",
    "resultado",
    "consulta",
    "revisión",
    "seguimiento",
    "terapia",
    "rehabilitación",
  ]

  const importantMiddleMessages = middleMessages
    .filter((msg) => importantKeywords.some((keyword) => msg.content.toLowerCase().includes(keyword)))
    .slice(0, 20) // Máximo 20 mensajes importantes del medio

  // Combinar y ordenar por fecha
  const selectedMessages = [...firstMessages, ...importantMiddleMessages, ...lastMessages]
  return selectedMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

function estimateTokens(text: string): number {
  // Estimación aproximada de tokens
  return Math.ceil(text.length / 4)
}

export async function POST(req: Request) {
  try {
    const { conversationId, organizationId } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured")
      return Response.json({ success: false, error: "OpenAI API key not configured" }, { status: 500 })
    }

    if (!conversationId || !organizationId) {
      console.error("Missing required parameters")
      return Response.json({ success: false, error: "Faltan parámetros requeridos" }, { status: 400 })
    }

    console.log("=== GENERANDO RESUMEN ===")
    console.log("Conversation ID:", conversationId)
    console.log("Organization ID:", organizationId)

    // Obtener TODOS los mensajes primero para hacer estadísticas completas
    const { data: allMessages, error: messagesError } = await supabase
      .from("messages")
      .select(`
        content,
        sender_type,
        created_at,
        message_type
      `)
      .eq("conversation_id", conversationId)
      .neq("message_type", "system")
      .order("created_at", { ascending: true })

    if (messagesError) {
      console.error("Error obteniendo mensajes:", messagesError)
      return Response.json({ success: false, error: "Error al obtener mensajes" }, { status: 500 })
    }

    // Obtener información de la conversación
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        title,
        created_at,
        client_id
      `)
      .eq("id", conversationId)
      .single()

    if (convError) {
      console.error("Error obteniendo conversación:", convError)
      return Response.json({ success: false, error: "Error al obtener conversación" }, { status: 500 })
    }

    // Obtener información del cliente por separado
    let clientName = "Cliente"
    if (conversation.client_id) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("name, phone, email")
        .eq("id", conversation.client_id)
        .single()

      if (!clientError && client) {
        clientName = client.name || "Cliente"
      }
    }

    if (!allMessages || allMessages.length === 0) {
      return Response.json({
        success: false,
        error: "No hay mensajes en esta conversación para resumir",
      })
    }

    console.log(`Total de mensajes en la conversación: ${allMessages.length}`)

    // Seleccionar mensajes relevantes para el resumen
    const selectedMessages = selectRelevantMessages(allMessages)
    console.log(`Mensajes seleccionados para análisis: ${selectedMessages.length}`)

    // Formatear mensajes para el prompt con truncamiento
    let totalTokens = 0
    const formattedMessages = selectedMessages
      .map((msg, index) => {
        const sender = msg.sender_type === "contact" ? "Cliente" : "Agente"
        const time = new Date(msg.created_at).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })

        // Truncar mensaje si es muy largo
        const truncatedContent = truncateMessage(msg.content, MAX_TOKENS_PER_MESSAGE)
        const messageText = `${index + 1}. [${time}] ${sender}: ${truncatedContent}`

        totalTokens += estimateTokens(messageText)

        // Si excedemos el límite, cortamos aquí
        if (totalTokens > MAX_TOTAL_TOKENS) {
          return null
        }

        return messageText
      })
      .filter(Boolean)
      .join("\n")

    console.log(`Tokens estimados en el prompt: ${totalTokens}`)

    const conversationDate = new Date(conversation.created_at).toLocaleDateString("es-ES")

    // Información adicional sobre la selección de mensajes
    const messageSelectionInfo =
      allMessages.length > MAX_MESSAGES
        ? `\n\nNOTA: Esta conversación tiene ${allMessages.length} mensajes. Para el análisis se han seleccionado ${selectedMessages.length} mensajes más relevantes (primeros, últimos y mensajes con contenido médico importante).`
        : ""

    // Generar resumen con IA
    const prompt = `
Eres un asistente médico especializado. Analiza esta conversación entre un profesional de la salud y un paciente/cliente, y genera un resumen profesional y conciso.

INFORMACIÓN DE LA CONVERSACIÓN:
- Cliente: ${clientName}
- Fecha: ${conversationDate}
- Total de mensajes en la conversación: ${allMessages.length}
- Mensajes analizados: ${selectedMessages.length}${messageSelectionInfo}

MENSAJES DE LA CONVERSACIÓN:
${formattedMessages}

INSTRUCCIONES:
1. Crea un resumen profesional de máximo 250 palabras
2. Identifica el motivo principal de la consulta
3. Menciona los puntos clave discutidos
4. Incluye cualquier síntoma, tratamiento o recomendación mencionada
5. Si la conversación es muy larga, enfócate en los aspectos más relevantes médicamente
6. Usa terminología médica apropiada pero clara
7. Mantén un tono profesional y objetivo
8. Si hay información incompleta debido al tamaño de la conversación, menciónalo

FORMATO DEL RESUMEN:
**Motivo de consulta:** [breve descripción]

**Puntos clave:**
- [punto 1]
- [punto 2]
- [punto 3]
- [etc.]

**Recomendaciones/Tratamiento:** [si aplica]

**Observaciones:** [cualquier nota relevante, incluyendo si la conversación fue muy extensa]

Genera solo el resumen, sin explicaciones adicionales.
`

    console.log("Generando resumen con IA...")

    const { text: summary } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxTokens: 600, // Aumentado para resúmenes más detallados
      temperature: 0.3,
    })

    // Calcular estadísticas completas (usando TODOS los mensajes)
    const clientMessages = allMessages.filter((m) => m.sender_type === "contact").length
    const agentMessages = allMessages.filter((m) => m.sender_type === "agent").length
    const duration =
      allMessages.length > 1
        ? Math.ceil(
            (new Date(allMessages[allMessages.length - 1].created_at).getTime() -
              new Date(allMessages[0].created_at).getTime()) /
              (1000 * 60),
          )
        : 0

    const result = {
      success: true,
      summary: summary.trim(),
      statistics: {
        totalMessages: allMessages.length,
        analyzedMessages: selectedMessages.length,
        clientMessages,
        agentMessages,
        durationMinutes: duration,
        conversationDate,
        clientName,
        wasLimited: allMessages.length > MAX_MESSAGES,
      },
    }

    console.log("✅ Resumen generado exitosamente")
    console.log(`Estadísticas: ${allMessages.length} mensajes totales, ${selectedMessages.length} analizados`)

    return Response.json(result)
  } catch (error) {
    console.error("Error generando resumen:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
