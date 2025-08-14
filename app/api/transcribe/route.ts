import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    // Transcribir audio usando Whisper
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
      const errorText = await transcriptionResponse.text()
      console.error("Error de OpenAI:", errorText)
      throw new Error(`Error transcribing audio: ${transcriptionResponse.status}`)
    }

    const transcriptionData = await transcriptionResponse.json()

    return NextResponse.json({
      text: transcriptionData.text,
      success: true,
    })
  } catch (error) {
    console.error("Error processing transcription:", error)
    return NextResponse.json(
      {
        error: "Error processing audio transcription",
        success: false,
      },
      { status: 500 },
    )
  }
}
