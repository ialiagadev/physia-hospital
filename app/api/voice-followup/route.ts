import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File
    const clientName = formData.get("clientName") as string

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Step 1: Transcribe audio using Whisper
    const transcriptionFormData = new FormData()
    transcriptionFormData.append("file", audioFile)
    transcriptionFormData.append("model", "whisper-1")
    transcriptionFormData.append("language", "es")

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: transcriptionFormData,
    })

    if (!transcriptionResponse.ok) {
      throw new Error("Error transcribing audio")
    }

    const transcriptionData = await transcriptionResponse.json()
    const transcription = transcriptionData.text

    // Step 2: Process transcription with AI to structure the follow-up
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `
        Eres un asistente médico especializado en crear seguimientos estructurados.
        
        El paciente es: ${clientName}
        
        Transcripción de la nota de voz del médico:
        "${transcription}"
        
        Por favor, estructura esta información en un seguimiento médico profesional con los siguientes campos:
        
        1. Tipo de seguimiento (elige uno): CONSULTA, REVISION, TRATAMIENTO, EVALUACION, SEGUIMIENTO
        2. Descripción: Un resumen claro y profesional de lo mencionado
        3. Recomendaciones: Si se mencionan recomendaciones o tratamientos
        
        Responde SOLO en formato JSON válido:
        {
          "followUpType": "TIPO_AQUI",
          "description": "descripción aquí",
          "recommendations": "recomendaciones aquí o null si no hay"
        }
        
        Mantén un tono médico profesional y conciso.
      `,
    })

    // Parse the AI response
    let structuredData
    try {
      structuredData = JSON.parse(text)
    } catch (parseError) {
      // Fallback if JSON parsing fails
      structuredData = {
        followUpType: "CONSULTA",
        description: transcription,
        recommendations: null,
      }
    }

    return NextResponse.json({
      transcription,
      ...structuredData,
    })
  } catch (error) {
    console.error("Error processing voice follow-up:", error)
    return NextResponse.json({ error: "Error processing voice recording" }, { status: 500 })
  }
}
