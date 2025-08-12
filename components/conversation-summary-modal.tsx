// /app/api/conversation-summary/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { getConversationMessages, getConversationInfo } from "@/lib/conversation-summary"

const BodySchema = z.object({ conversationId: z.string().min(1) })
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: Request) {
  try {
    const { conversationId } = BodySchema.parse(await req.json())
    const [messages, info] = await Promise.all([
      getConversationMessages(conversationId),
      getConversationInfo(conversationId),
    ])
    const clientName = info?.client?.name || "Cliente"
    const formatted = messages.map((m:any)=>{
      const sender = m.sender_type === "whatsapp" ? clientName : "Agente"
      const ts = new Date(m.created_at).toLocaleString("es-ES")
      return `[${ts}] ${sender}: ${m.content}`
    }).join("\n")

    const prompt = `Analiza la conversación y genera un resumen profesional...\nCliente: ${clientName}\nConversación:\n${formatted}\nDevuelve SOLO el resumen.`
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: "Eres un asistente profesional. Sé claro y no inventes datos.",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      maxTokens: 800, // ✅
    })
    return NextResponse.json({ summary: text, generatedAt: new Date().toISOString() })
  } catch (err:any) {
    if (err?.issues) return NextResponse.json({ error: "Solicitud inválida", details: err.issues }, { status: 400 })
    console.error("conversation-summary error:", err)
    return NextResponse.json({ error: "No se pudo generar el resumen" }, { status: 500 })
  }
}
