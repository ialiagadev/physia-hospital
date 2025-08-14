import { sendWhatsAppMessage } from "./whatsapp/sendMessage" // Assuming this is where sendWhatsAppMessage is declared

async function downloadAudioFromUrl(url: string): Promise<Blob> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Error descargando audio: ${response.statusText}`)
    }
    return await response.blob()
  } catch (error) {
    console.error("❌ Error descargando audio desde URL:", error)
    throw error
  }
}

export async function transcribeAudio(audioInput: File | Blob | string): Promise<string> {
  try {
    console.log("🎤 Iniciando transcripción de audio con API route...")

    let audioBlob: Blob

    // Si es una URL string, descargar el archivo primero
    if (typeof audioInput === "string") {
      console.log("📥 Descargando audio desde URL:", audioInput)
      audioBlob = await downloadAudioFromUrl(audioInput)
    } else {
      audioBlob = audioInput
    }

    const formData = new FormData()
    formData.append("audio", audioBlob, "audio.ogg")

    // Llamar a nuestra API route de transcripción
    const transcriptionResponse = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    })

    if (!transcriptionResponse.ok) {
      const errorData = await transcriptionResponse.json()
      throw new Error(`Error en API de transcripción: ${errorData.error || transcriptionResponse.statusText}`)
    }

    const transcriptionData = await transcriptionResponse.json()

    if (!transcriptionData.success) {
      throw new Error(`Error en transcripción: ${transcriptionData.error}`)
    }

    const text = transcriptionData.text

    console.log("✅ Audio transcrito exitosamente:", text)
    return text
  } catch (error) {
    console.error("❌ Error transcribiendo audio:", error)
    throw new Error(`Error al transcribir audio: ${error}`)
  }
}

export async function sendAudioAsText({
  to,
  audioFile,
  token,
}: {
  to: string
  audioFile: File | Blob | string
  token: string
}) {
  try {
    console.log("🔄 Transcribiendo audio antes de enviar al cliente...")

    // Transcribir el audio a texto
    const transcribedText = await transcribeAudio(audioFile)

    // Enviar el texto transcrito como mensaje de texto
    return await sendWhatsAppMessage({
      to,
      message: transcribedText,
      token,
      messageType: "text",
    })
  } catch (error) {
    console.error("💥 Error enviando audio como texto:", error)
    throw error
  }
}
