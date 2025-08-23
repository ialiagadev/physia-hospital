import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { text, context } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Texto requerido" }, { status: 400 })
    }

    const contextPrompts = {
      medical_followup: `Eres un asistente médico especializado en mejorar notas de seguimiento de pacientes. 
      Mejora el siguiente texto manteniendo toda la información médica importante, pero haciéndolo más claro, profesional y bien estructurado.
      
      Instrucciones:
      - Mantén toda la información médica relevante
      - Mejora la gramática y ortografía
      - Estructura el texto de forma clara y profesional
      - Usa terminología médica apropiada cuando sea necesario
      - Mantén un tono profesional pero comprensible
      - No añadas información que no esté en el texto original
      - Responde únicamente con el texto mejorado, sin explicaciones adicionales
      
      Texto a mejorar:`,
    }

    const prompt = contextPrompts[context as keyof typeof contextPrompts] || contextPrompts.medical_followup

    const { text: improvedText } = await generateText({
      model: openai("gpt-4o"),
      prompt: `${prompt}\n\n"${text}"`,
      temperature: 0.3,
    })

    return NextResponse.json({ improvedText })
  } catch (error) {
    console.error("Error improving text:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
