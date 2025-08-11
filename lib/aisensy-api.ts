// Configuración de la API de Aisensy
const AISENSY_BASE_URL = "https://backend.aisensy.com/direct-apis/t1"

export interface AisensyTemplate {
  id: string
  name: string
  language: string
  category: string
  status: string
  components: TemplateComponent[]
  created_at?: string
}

export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS"
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT"
  text?: string
  example?: {
    header_handle?: string[]
    body_text?: string[][]
    [key: string]: any
  }
  buttons?: TemplateButton[]
}

export interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
  text: string
  url?: string
  phone_number?: string
  example?: string[]
}

export interface CreateTemplateData {
  name: string
  category: string
  language: string
  components: TemplateComponent[]
}

class AisensyAPI {
  private baseURL = AISENSY_BASE_URL

  private async request(endpoint: string, token: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`

    console.log("🔍 Aisensy API Request:", {
      url,
      method: options.method || "GET",
      headers: options.headers,
      body: options.body,
    })

    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    console.log("📡 Aisensy API Response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`

      try {
        const errorBody = await response.text()
        console.error("❌ Aisensy API Error Body:", errorBody)

        // Intentar parsear como JSON para obtener más detalles
        try {
          const errorJson = JSON.parse(errorBody)
          if (errorJson.message) {
            errorMessage = errorJson.message
          } else if (errorJson.error) {
            errorMessage = errorJson.error
          } else if (errorJson.details) {
            errorMessage = errorJson.details
          }
        } catch {
          // Si no es JSON válido, usar el texto completo
          if (errorBody) {
            errorMessage = errorBody
          }
        }
      } catch (e) {
        console.error("Error reading response body:", e)
      }

      throw new Error(errorMessage)
    }

    return response.json()
  }

  async getTemplates(token: string): Promise<AisensyTemplate[]> {
    return this.request("/get-templates", token)
  }

  async getTemplate(templateId: string, token: string): Promise<AisensyTemplate> {
    return this.request(`/get-template/${templateId}`, token)
  }

  async createTemplate(data: CreateTemplateData, token: string): Promise<AisensyTemplate> {
    // Procesar y limpiar los datos según el formato esperado por Aisensy
    const processedData = {
      name: data.name.trim(),
      category: data.category,
      language: data.language,
      components: data.components.map((component) => {
        const processedComponent: any = {
          type: component.type,
        }

        // Procesar según el tipo de componente
        if (component.type === "BODY" && component.text) {
          processedComponent.text = component.text.trim()

          // Extraer variables del texto y generar ejemplos
          const variables = this.extractVariables(component.text)
          if (variables.length > 0) {
            // Generar ejemplos para las variables
            const exampleValues = variables.map((_, index) => `Ejemplo${index + 1}`)
            processedComponent.example = {
              body_text: [exampleValues],
            }
          }
        } else if (component.type === "FOOTER" && component.text) {
          processedComponent.text = component.text.trim()
        } else if (component.type === "HEADER") {
          if (component.format) {
            processedComponent.format = component.format
          }
          if (component.text) {
            processedComponent.text = component.text.trim()
          }
          if (component.example) {
            processedComponent.example = component.example
          }
        } else if (component.type === "BUTTONS" && component.buttons) {
          processedComponent.buttons = component.buttons
        }

        return processedComponent
      }),
    }

    console.log("🚀 Sending processed template data to Aisensy:", JSON.stringify(processedData, null, 2))

    return this.request("/wa_template", token, {
      method: "POST",
      body: JSON.stringify(processedData),
    })
  }

  // Función auxiliar para extraer variables del texto
  private extractVariables(text: string): string[] {
    const matches = text.match(/\{\{\d+\}\}/g) || []
    return [...new Set(matches)].sort()
  }

  async editTemplate(templateId: string, data: Partial<CreateTemplateData>, token: string): Promise<AisensyTemplate> {
    return this.request(`/edit-template/${templateId}`, token, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async deleteTemplate(templateName: string, token: string): Promise<void> {
    return this.request(`/wa_template/${templateName}`, token, {
      method: "DELETE",
    })
  }
}

export const aisensyAPI = new AisensyAPI()
