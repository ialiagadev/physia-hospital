interface WabaConfig {
  id_proyecto: string
  token_proyecto: string
  phone_number_id?: string // ID del número de teléfono de WhatsApp Business
}

interface TemplateComponent {
  type: string
  text?: string
  format?: string
  example?: {
    header_text?: string[]
    body_text?: string[][]
    header_handle?: string[] // For media files
  }
  buttons?: Array<{
    type: string
    text: string
  }>
}

interface EditTemplateData {
  category: string
  components: TemplateComponent[]
}

interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video"
  text?: string
  currency?: {
    fallback_value: string
    code: string
    amount_1000: number
  }
  date_time?: {
    fallback_value: string
  }
  image?: {
    link: string
  }
  document?: {
    link: string
    filename?: string
  }
  video?: {
    link: string
  }
}

interface TemplateComponentForSend {
  type: "header" | "body" | "button"
  parameters?: TemplateParameter[]
  sub_type?: "quick_reply" | "url"
  index?: number
}

// Interfaz para envío de plantillas usando Aisensy API según la documentación
interface AisensyMessageData {
  to: string
  type: "template"
  recipient_type?: "individual"
  template: {
    namespace?: string
    language: {
      policy?: "deterministic"
      code: string
    }
    name: string
    components?: Array<{
      type: string
      parameters?: Array<{
        type: string
        text?: string
      }>
    }>
  }
}

export class TemplateAPI {
  private config: WabaConfig

  constructor(config: WabaConfig) {
    this.config = config
  }

  /**
   * Enviar una plantilla usando la API de Aisensy (endpoint /messages)
   */
  async sendTemplate(templateData: AisensyMessageData): Promise<any> {
    console.log("📤 Enviando plantilla via Aisensy /messages:", templateData)

    const response = await fetch(`https://backend.aisensy.com/direct-apis/t1/messages`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.config.token_proyecto}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templateData),
    })

    console.log("📡 Respuesta de Aisensy:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Error response:", errorText)
      throw new Error(`Error ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log("✅ Plantilla enviada exitosamente:", result)
    return result
  }

  /**
   * Enviar plantilla simple sin parámetros
   */
  async sendSimpleTemplate(to: string, templateName: string, languageCode = "es"): Promise<any> {
    const templateData: AisensyMessageData = {
      to: to,
      type: "template",
      recipient_type: "individual",
      template: {
        language: {
          policy: "deterministic",
          code: languageCode,
        },
        name: templateName,
      },
    }

    return this.sendTemplate(templateData)
  }

  /**
   * Enviar plantilla con parámetros de texto
   */
  async sendTemplateWithTextParams(
    to: string,
    templateName: string,
    textParams: string[],
    languageCode = "es",
  ): Promise<any> {
    const components = []

    // Si hay parámetros, crear componente body con parámetros
    if (textParams.length > 0) {
      components.push({
        type: "body",
        parameters: textParams.map((text) => ({
          type: "text",
          text: text,
        })),
      })
    }

    const templateData: AisensyMessageData = {
      to: to,
      type: "template",
      recipient_type: "individual",
      template: {
        language: {
          policy: "deterministic",
          code: languageCode,
        },
        name: templateName,
        components: components.length > 0 ? components : undefined,
      },
    }

    return this.sendTemplate(templateData)
  }

  /**
   * Enviar plantilla con header, body y botones (usando Aisensy)
   */
  async sendComplexTemplate(
    to: string,
    templateName: string,
    languageCode = "es",
    parameters?: string[],
  ): Promise<any> {
    const components = []

    // Si hay parámetros, crear componente body con parámetros
    if (parameters && parameters.length > 0) {
      components.push({
        type: "body",
        parameters: parameters.map((text) => ({
          type: "text",
          text: text,
        })),
      })
    }

    const templateData: AisensyMessageData = {
      to: to,
      type: "template",
      recipient_type: "individual",
      template: {
        language: {
          policy: "deterministic",
          code: languageCode,
        },
        name: templateName,
        components: components.length > 0 ? components : undefined,
      },
    }

    return this.sendTemplate(templateData)
  }

  /**
   * Eliminar una plantilla
   */
  async deleteTemplate(templateName: string): Promise<void> {
    const response = await fetch(`https://backend.aisensy.com/direct-apis/t1/wa_template/${templateName}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.config.token_proyecto}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error ${response.status}: ${errorText}`)
    }

    // La API puede devolver 204 No Content para eliminación exitosa
    if (response.status !== 204) {
      const result = await response.json()
      return result
    }
  }

  /**
   * Editar una plantilla existente
   */
  async editTemplate(templateId: string, templateData: EditTemplateData): Promise<any> {
    const response = await fetch(`https://backend.aisensy.com/direct-apis/t1/edit-template/${templateId}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.config.token_proyecto}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templateData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    return result
  }

  /**
   * Obtener plantillas
   */
  async getTemplates(): Promise<any> {
    const response = await fetch(
      `https://backend.aisensy.com/direct-apis/t1/get-templates?projectID=${this.config.id_proyecto}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.config.token_proyecto}`,
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    return result
  }

  /**
   * Crear una nueva plantilla
   */
  async createTemplate(templateData: any): Promise<any> {
    console.log("📤 Creando plantilla con formato Aisensy:", JSON.stringify(templateData, null, 2))

    const response = await fetch(`https://backend.aisensy.com/direct-apis/t1/wa_template`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.config.token_proyecto}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templateData),
    })

    console.log("📡 Respuesta de creación:", response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Error en creación:", errorText)
      throw new Error(`Error ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log("✅ Plantilla creada exitosamente:", result)
    return result
  }

  /**
   * Enviar mensaje de texto simple (no plantilla)
   */
  async sendTextMessage(to: string, message: string): Promise<any> {
    const messageData = {
      to: to,
      type: "text",
      recipient_type: "individual",
      text: {
        body: message,
      },
    }

    console.log("📤 Enviando mensaje de texto:", messageData)

    const response = await fetch(`https://backend.aisensy.com/direct-apis/t1/messages`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.config.token_proyecto}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messageData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log("✅ Mensaje de texto enviado:", result)
    return result
  }
}

// Función helper para extraer variables de un texto
export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{\d+\}\}/g) || []
  return [...new Set(matches)].sort()
}

// Función helper para validar componentes de plantilla
export function validateTemplateComponents(components: TemplateComponent[]): string[] {
  const errors: string[] = []

  // Debe tener al menos un componente BODY
  const bodyComponents = components.filter((c) => c.type === "BODY")
  if (bodyComponents.length === 0) {
    errors.push("La plantilla debe tener al menos un componente BODY")
  }

  // Validar variables secuenciales en cada componente
  components.forEach((component, index) => {
    if (component.text) {
      const variables = extractVariables(component.text)
      for (let i = 0; i < variables.length; i++) {
        const expected = `{{${i + 1}}}`
        if (variables[i] !== expected) {
          errors.push(`Componente ${index + 1}: Las variables deben ser secuenciales (${expected})`)
          break
        }
      }
    }
  })

  return errors
}

// Función helper para validar número de teléfono
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Debe empezar con código de país y tener entre 10-15 dígitos
  const phoneRegex = /^\d{10,15}$/
  return phoneRegex.test(phoneNumber.replace(/\D/g, ""))
}

// Función helper para formatear número de teléfono para Aisensy
export function formatPhoneNumber(phoneNumber: string): string {
  // Remover todos los caracteres no numéricos
  let cleaned = phoneNumber.replace(/\D/g, "")

  // Si empieza con +, removerlo ya que lo limpiamos arriba
  if (phoneNumber.startsWith("+")) {
    cleaned = phoneNumber.substring(1).replace(/\D/g, "")
  }

  // Si no empieza con código de país, asumir que es de España (+34)
  if (cleaned.length === 9 && !cleaned.startsWith("34")) {
    cleaned = `34${cleaned}`
  }

  // Si no empieza con código de país y tiene 10 dígitos, asumir México (+52)
  if (cleaned.length === 10 && !cleaned.startsWith("52")) {
    cleaned = `52${cleaned}`
  }

  console.log("📞 Número formateado:", { original: phoneNumber, formatted: cleaned })
  return cleaned
}

// Función helper para formatear botones correctamente para Aisensy API
export function formatButtonsForAisensy(actionType: string, quickReplies: any[], callToAction: any): any[] {
  const components: any[] = []

  if (actionType === "quick_replies" && quickReplies.length > 0) {
    // Format quick replies according to official example
    const buttonComponent = {
      type: "BUTTONS",
      buttons: quickReplies.map((reply) => ({
        type: "QUICK_REPLY",
        text: reply.text,
      })),
    }

    components.push(buttonComponent)
  } else if (actionType === "cta" && callToAction.text) {
    // Format call-to-action buttons according to official example
    const button: any = {
      type: callToAction.type === "url" ? "URL" : "PHONE_NUMBER",
      text: callToAction.text,
    }

    if (callToAction.type === "url" && callToAction.url) {
      let formattedUrl = callToAction.url
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`
      }

      button.url = formattedUrl

      if (formattedUrl.includes("{{")) {
        // Replace variables with example values for the example array
        const exampleUrl = formattedUrl.replace(/\{\{\d+\}\}/g, "example")
        button.example = [exampleUrl]
      }
    } else if (callToAction.type === "phone" && callToAction.phone) {
      button.phone_number = callToAction.phone.replace(/\D/g, "")
    }

    const buttonComponent = {
      type: "BUTTONS",
      buttons: [button],
    }

    components.push(buttonComponent)
  }

  return components
}

// Helper function to format complete template data for Aisensy API
export function formatTemplateForAisensy(templateData: any): any {
  console.log("🔧 Formatting template for Aisensy API:", JSON.stringify(templateData, null, 2))

  // The template data should already be in the correct format
  // This function can be used for additional formatting if needed
  return templateData
}
