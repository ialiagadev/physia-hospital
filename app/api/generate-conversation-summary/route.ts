import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

export const runtime = "nodejs"
export const maxDuration = 30

// Configuración para manejo de conversaciones largas
const MAX_MESSAGES = 100
const MAX_TOKENS_PER_MESSAGE = 100
const MAX_TOTAL_TOKENS = 8000

type TimeFilter =
  | "all"
  | "3months"
  | "2months"
  | "1month"
  | "2weeks"
  | "1week"
  | "3days"
  | "1day"

// Función para obtener la fecha límite según el filtro de tiempo
function getDateLimit(timeFilter: TimeFilter): Date | null {
  if (timeFilter === "all") return null

  switch (timeFilter) {
    case "3months": {
      const date = new Date()
      date.setMonth(date.getMonth() - 3)
      return date
    }
    case "2months": {
      const date = new Date()
      date.setMonth(date.getMonth() - 2)
      return date
    }
    case "1month": {
      const date = new Date()
      date.setMonth(date.getMonth() - 1)
      return date
    }
    case "2weeks": {
      const date = new Date()
      date.setDate(date.getDate() - 14)
      return date
    }
    case "1week": {
      const date = new Date()
      date.setDate(date.getDate() - 7)
      return date
    }
    case "3days": {
      const date = new Date()
      date.setDate(date.getDate() - 3)
      return date
    }
    case "1day": {
      // Últimas 24 horas
      const date = new Date()
      date.setDate(date.getDate() - 1)
      return date
    }
    default:
      return null
  }
}

function getTimeRangeText(timeFilter: TimeFilter): string {
  switch (timeFilter) {
    case "all":
      return "Toda la conversación"
    case "3months":
      return "Últimos 3 meses"
    case "2months":
      return "Últimos 2 meses"
    case "1month":
      return "Último mes"
    case "2weeks":
      return "Últimas 2 semanas"
    case "1week":
      return "Última semana"
    case "3days":
      return "Últimos 3 días"
    case "1day":
      return "Últimas 24 horas"
    default:
      return ""
  }
}

function truncateMessage(content: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (content.length <= maxChars) return content
  return content.substring(0, maxChars - 3) + "..."
}

function selectRelevantMessages(messages: any[]): any[] {
  if (messages.length <= MAX_MESSAGES) {
    return messages
  }

  const firstMessages = messages.slice(0, 20)
  const lastMessages = messages.slice(-60)

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
    .filter((msg) =>
      importantKeywords.some((keyword) =>
        msg.content.toLowerCase().includes(keyword),
      ),
    )
    .slice(0, 20)

  const selectedMessages = [
    ...firstMessages,
    ...importantMiddleMessages,
    ...lastMessages,
  ]
  return selectedMessages.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export async function POST(req: Request) {
  try {
    const { conversationId, organizationId, timeFilter = "all" } =
      await req.json()

    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured")
      return Response.json(
        { success: false, error: "OpenAI API key not configured" },
        { status: 500 },
      )
    }

    if (!conversationId || !organizationId) {
      console.error("Missing required parameters")
      return Response.json(
        { success: false, error: "Faltan parámetros requeridos" },
        { status: 400 },
      )
    }

    console.log("=== GENERANDO RESUMEN ===")
    console.log("Conversation ID:", conversationId)
    console.log("Organization ID:", organizationId)
    console.log("Time Filter:", timeFilter)

    const dateLimit = getDateLimit(timeFilter as TimeFilter)
    console.log("Date Limit:", dateLimit ? dateLimit.toISOString() : "No limit")

    let messagesQuery = supabase
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

    if (dateLimit) {
      messagesQuery = messagesQuery.gte("created_at", dateLimit.toISOString())
    }

    const { data: allMessages, error: messagesError } = await messagesQuery

    if (messagesError) {
      console.error("Error obteniendo mensajes:", messagesError)
      return Response.json(
        { success: false, error: "Error al obtener mensajes" },
        { status: 500 },
      )
    }

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
      return Response.json(
        { success: false, error: "Error al obtener conversación" },
        { status: 500 },
      )
    }

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

    const selectedMessages = selectRelevantMessages(allMessages)
    console.log(
      `Mensajes seleccionados para análisis: ${selectedMessages.length}`,
    )

    let totalTokens = 0
    const formattedMessages = selectedMessages
      .map((msg, index) => {
        const sender = msg.sender_type === "contact" ? "Cliente" : "Agente"
        const time = new Date(msg.created_at).toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })

        const truncatedContent = truncateMessage(
          msg.content,
          MAX_TOKENS_PER_MESSAGE,
        )
        const messageText = `${index + 1}. [${time}] ${sender}: ${truncatedContent}`

        totalTokens += estimateTokens(messageText)

        if (totalTokens > MAX_TOTAL_TOKENS) {
          return null
        }

        return messageText
      })
      .filter(Boolean)
      .join("\n")

    console.log(`Tokens estimados en el prompt: ${totalTokens}`)

    const today = new Date().toLocaleDateString("es-ES")
    const lastMessageDate = selectedMessages.length
      ? new Date(
          selectedMessages[selectedMessages.length - 1].created_at,
        ).toLocaleDateString("es-ES")
      : today

    const messageSelectionInfo =
      allMessages.length > MAX_MESSAGES
        ? `\n\nNOTA: Esta conversación tiene ${allMessages.length} mensajes. Para el análisis se han seleccionado ${selectedMessages.length} mensajes más relevantes (primeros, últimos y mensajes con contenido médico importante).`
        : ""

    const timeFilterInfo =
      timeFilter !== "all"
        ? `\n\nNOTA: Este resumen solo incluye mensajes de ${getTimeRangeText(
            timeFilter as TimeFilter,
          ).toLowerCase()}.`
        : ""

    const prompt = `
Eres un asistente médico especializado. Analiza esta conversación entre un profesional de la salud y un paciente/cliente, y genera un resumen profesional y conciso.

INFORMACIÓN DE LA CONVERSACIÓN:
- Cliente: ${clientName}
- Fecha actual: ${today}
- Último mensaje analizado: ${lastMessageDate}
- Total de mensajes en la conversación: ${allMessages.length}
- Mensajes analizados: ${selectedMessages.length}${messageSelectionInfo}${timeFilterInfo}

MENSAJES DE LA CONVERSACIÓN:
${formattedMessages}

INSTRUCCIONES:
1. Crea un resumen profesional de máximo 250 palabras
`

    console.log("Generando resumen con IA...")

    const { text: summary } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      maxTokens: 600,
      temperature: 0.3,
    })

    const clientMessages = allMessages.filter(
      (m) => m.sender_type === "contact",
    ).length
    const agentMessages = allMessages.filter(
      (m) => m.sender_type === "agent",
    ).length
    const duration =
      allMessages.length > 1
        ? Math.ceil(
            (new Date(
              allMessages[allMessages.length - 1].created_at,
            ).getTime() -
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
        today,
        lastMessageDate,
        clientName,
        wasLimited: allMessages.length > MAX_MESSAGES,
        timeRange:
          timeFilter !== "all"
            ? getTimeRangeText(timeFilter as TimeFilter)
            : undefined,
      },
    }

    console.log("✅ Resumen generado exitosamente")
    console.log(
      `Estadísticas: ${allMessages.length} mensajes totales, ${selectedMessages.length} analizados`,
    )

    return Response.json(result)
  } catch (error) {
    console.error("Error generando resumen:", error)
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
