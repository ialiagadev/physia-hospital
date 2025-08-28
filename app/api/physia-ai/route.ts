import { openai } from "@ai-sdk/openai"
import { streamText, convertToCoreMessages } from "ai"
import type { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { messages, model = "gpt-5-mini", conversationId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Messages are required", { status: 400 })
    }

    const systemMessage = `Eres PHYSIA, un asistente de IA especializado en el sector sanitario y fisioterapia. 

Características principales:
- Eres experto en fisioterapia, rehabilitación, anatomía y biomecánica
- Ayudas con diagnósticos, tratamientos y ejercicios terapéuticos
- Proporcionas información médica precisa pero siempre recomiendas consultar con profesionales
- Eres amigable, profesional y empático
- Respondes en español de forma clara y estructurada
- Puedes ayudar con la gestión de consultas, pacientes y documentación médica

Importante:
- Siempre menciona que tus recomendaciones no sustituyen el criterio médico profesional
- Si detectas síntomas graves, recomienda consulta médica inmediata
- Mantén un tono profesional pero cercano
- Estructura tus respuestas de forma clara con viñetas o numeración cuando sea apropiado`

    const coreMessages = convertToCoreMessages([{ role: "system", content: systemMessage }, ...messages])

    const result = await streamText({
      model: openai(model),
      messages: coreMessages,
      temperature: 0.7,
      maxTokens: 2000,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error in Physia AI API:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
