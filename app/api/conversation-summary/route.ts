import { NextResponse } from "next/server"
import { z } from "zod"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { getConversationMessages, getConversationInfo } from "@/lib/conversation-summary" // ya lo tienes

const BodySchema = z.object({
  conversationId: z.string().min(1),
})

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const { conversationId } = BodySchema.parse(json)

    // Carga de datos (en servidor)
    const [messages, info] = await Promise.all([
      getConversationMessages(conversationId),
      getConversationInfo(conversationId),
    ])
    const clientName = info?.client?.name || "Cliente"

    // Formateo
    const formatted = messages
      .map((m: any) => {
        const sender = m.sender_type === "whatsapp" ? clientName : "Agente"
        const timestamp = new Date(m.created_at).toLocaleString("es-ES")
        return `[${timestamp}] ${sender}: ${m.content}`
      })
      .join("\n")

    const prompt = `
Analiza la siguiente conversación y genera un resumen elaborado y bien redactado.

Cliente: ${clientName}
Conversación:
${formatted}

Genera un resumen profesional que incluya:
- Temas principales tratados
- Solicitudes del cliente
- Respuestas/soluciones dadas
- Acuerdos o próximos pasos

Formato: párrafos claros, profesional y conciso.
Devuelve SOLO el resumen.
`

const { text } = await generateText({
    model: openai("gpt-4o"),
    system: "Eres un asistente profesional. Sé claro y no inventes datos.",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    maxTokens: 800, // ✅ correcto
  });
  

    return NextResponse.json({ summary: text, generatedAt: new Date().toISOString() })
  } catch (err: any) {
    // Zod error → 400
    if (err?.issues) {
      return NextResponse.json({ error: "Solicitud inválida", details: err.issues }, { status: 400 })
    }
    // Falta API key → 500 con mensaje útil (en server logs verás el detalle)
    console.error("conversation-summary error:", err)
    return NextResponse.json({ error: "No se pudo generar el resumen" }, { status: 500 })
  }
}
