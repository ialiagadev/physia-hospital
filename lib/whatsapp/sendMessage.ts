interface WhatsAppMessageParams {
  to: string
  message: string
  token: string
  messageType?: "text" | "image" | "audio" | "video" | "document" | "location"
  mediaUrl?: string
}

export async function sendWhatsAppMessage({
  to,
  message,
  token,
  messageType = "text",
  mediaUrl,
}: WhatsAppMessageParams) {
  try {
    // Limpiar el número de teléfono (remover espacios, guiones, etc.)
    const cleanPhone = to.replace(/[^\d]/g, "")

    // Preparar el payload base
    const payload: any = {
      to: cleanPhone,
      type: messageType,
      recipient_type: "individual",
    }

    // Configurar el contenido según el tipo de mensaje
    switch (messageType) {
      case "text":
        payload.text = { body: message }
        break

      case "image":
        if (!mediaUrl) throw new Error("Media URL is required for image messages")
        payload.image = { link: mediaUrl, caption: message || "" }
        break

      case "document":
        if (!mediaUrl) throw new Error("Media URL is required for document messages")
        payload.document = { link: mediaUrl, caption: message || "" }
        break

      case "audio":
        if (!mediaUrl) throw new Error("Media URL is required for audio messages")
        payload.audio = { link: mediaUrl }
        break

      case "video":
        if (!mediaUrl) throw new Error("Media URL is required for video messages")
        payload.video = { link: mediaUrl, caption: message || "" }
        break

      default:
        payload.text = { body: message }
    }

    const response = await fetch("https://backend.aisensy.com/direct-apis/t1/messages", {
      method: "POST",
      headers: {
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${response.status} - ${responseText}`)
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      result = { raw_response: responseText }
    }

    return result
  } catch (error) {
    throw error
  }
}

// ✅ Función permisiva que no valida el número - solo verifica que exista
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false

  // Solo verificar que el teléfono no esté vacío y tenga al menos algunos dígitos
  const cleanPhone = phone.replace(/[\s\-()]/g, "").trim()

  // Verificar que tenga al menos 5 caracteres y contenga al menos un dígito
  return cleanPhone.length >= 5 && /\d/.test(cleanPhone)
}

// Función auxiliar para formatear números de teléfono
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return ""

  // Limpiar el número
  let cleanPhone = phone.replace(/[\s\-()]/g, "")

  // Si no empieza con código de país, asumir que es España (+34)
  if (!cleanPhone.startsWith("34") && !cleanPhone.startsWith("+")) {
    cleanPhone = "34" + cleanPhone
  }

  // Remover el + si existe
  cleanPhone = cleanPhone.replace("+", "")

  return cleanPhone
}
