import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { description, recommendations, followUpType, clientName } = await request.json()

    if (!description?.trim()) {
      return NextResponse.json({ error: "No description provided" }, { status: 400 })
    }

    // Enhance the content with AI
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `
        Eres un asistente médico especializado en mejorar y estructurar seguimientos médicos.
        
        Paciente: ${clientName}
        Tipo de seguimiento: ${followUpType}
        
        Contenido actual:
        Descripción: "${description}"
        Recomendaciones: "${recommendations || "Sin recomendaciones"}"
        
        Por favor, mejora este seguimiento médico siguiendo estos criterios:
        
        1. CLARIDAD: Mejora la redacción para que sea más clara y profesional
        2. ESTRUCTURA: Organiza la información de manera lógica
        3. PRECISIÓN: Usa terminología médica apropiada cuando sea necesario
        4. CONCISIÓN: Si el texto es muy largo, resume manteniendo la información esencial
        5. COMPLETITUD: Si faltan detalles importantes, sugiere qué información podría ser útil
        
        IMPORTANTE:
        - Mantén el tono médico profesional
        - No inventes información médica que no esté en el texto original
        - Si el texto es muy largo (más de 300 palabras), crea un resumen estructurado
        - Separa claramente la descripción de las recomendaciones
        
        Responde SOLO en formato JSON válido:
        {
          "description": "descripción mejorada aquí",
          "recommendations": "recomendaciones mejoradas aquí o null si no hay"
        }
      `,
    })

    // Parse the AI response - handle markdown code blocks
    let enhancedData
    try {
      // Clean the response by removing markdown code blocks
      let cleanedText = text.trim()

      // Remove ```json and ``` if present
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.replace(/^```json\s*/, "").replace(/\s*```$/, "")
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.replace(/^```\s*/, "").replace(/\s*```$/, "")
      }

      enhancedData = JSON.parse(cleanedText)

      // Validate the response structure
      if (!enhancedData.description) {
        throw new Error("Invalid response structure")
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError)
      console.error("Raw AI response:", text)

      // Fallback if JSON parsing fails
      enhancedData = {
        description: description,
        recommendations: recommendations,
        error: "No se pudo procesar la mejora de IA",
      }
    }

    return NextResponse.json(enhancedData)
  } catch (error) {
    console.error("Error enhancing follow-up:", error)
    return NextResponse.json({ error: "Error enhancing content" }, { status: 500 })
  }
}
