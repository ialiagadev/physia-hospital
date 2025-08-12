import { openai } from "@ai-sdk/openai"
import { generateText, generateObject } from "ai"
import { z } from "zod"

// Cliente OpenAI configurado con el AI SDK de Vercel
export { openai }

// Función auxiliar para generar texto simple
export async function generateAIText(prompt: string, model = "gpt-4o-mini") {
  try {
    const { text } = await generateText({
      model: openai(model),
      prompt,
    })
    return text
  } catch (error) {
    console.error("Error generating AI text:", error)
    throw new Error("Error al generar texto con IA")
  }
}

// Función auxiliar para generar objetos estructurados
export async function generateAIObject<T>(prompt: string, schema: z.ZodSchema<T>, model = "gpt-4o"): Promise<T> {
  try {
    const { object } = await generateObject({
      model: openai(model),
      prompt,
      schema,
    })
    return object
  } catch (error) {
    console.error("Error generating AI object:", error)
    throw new Error("Error al generar objeto estructurado con IA")
  }
}

// Función específica para analizar archivos de clientes
export async function analyzeClientFile(headers: string[], sampleData: any[]) {
  const ColumnMappingSchema = z.object({
    name: z.string().nullable(),
    tax_id: z.string().nullable(),
    address: z.string().nullable(),
    postal_code: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
    country: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    client_type: z.string().nullable(),
    birth_date: z.string().nullable(),
    gender: z.string().nullable(),
  })

  const prompt = `
Analiza estas cabeceras de un archivo de clientes y mapéalas a nuestros campos estándar.

Cabeceras del archivo: ${headers.join(", ")}

Muestra de datos: ${JSON.stringify(sampleData.slice(0, 2))}

Campos objetivo:
- name: Nombre del cliente, empresa, razón social
- tax_id: CIF, NIF, DNI, identificación fiscal
- address: Dirección, domicilio
- postal_code: Código postal, CP
- city: Ciudad, localidad
- province: Provincia
- country: País
- email: Correo electrónico, email
- phone: Teléfono, móvil
- client_type: Tipo de cliente (private/public)
- birth_date: Fecha de nacimiento, nacimiento
- gender: Género, sexo (masculino/femenino/otro)

Para cada campo objetivo, devuelve el nombre exacto de la cabecera que mejor coincida, o null si no encuentras coincidencia.
`

  return generateAIObject(prompt, ColumnMappingSchema)
}

// Función para mejorar seguimientos de pacientes
export async function enhanceFollowUp(followUpText: string) {
  const prompt = `
Mejora este seguimiento médico haciéndolo más profesional y completo, manteniendo toda la información médica importante:

Texto original: "${followUpText}"

Mejora el texto para que sea:
- Más profesional y médico
- Bien estructurado
- Claro y conciso
- Mantenga toda la información clínica relevante

Devuelve solo el texto mejorado, sin explicaciones adicionales.
`

  return generateAIText(prompt)
}

// Función para generar reportes clínicos
export async function generateClinicalReport(patientData: any, consultations: any[]) {
  const prompt = `
Genera un reporte clínico profesional basado en los siguientes datos:

Datos del paciente: ${JSON.stringify(patientData)}
Consultas: ${JSON.stringify(consultations)}

El reporte debe incluir:
- Resumen del paciente
- Historial de consultas
- Evolución del tratamiento
- Recomendaciones

Formato profesional y médico.
`

  return generateAIText(prompt)
}

// Función para generar resúmenes de conversación
export async function generateConversationSummary(messages: any[], clientName: string) {
  // Formatear mensajes para el prompt
  const formattedMessages = messages
    .map((msg) => {
      const sender = msg.sender_type === "whatsapp" ? clientName : "Agente"
      const timestamp = new Date(msg.created_at).toLocaleString("es-ES")
      return `[${timestamp}] ${sender}: ${msg.content}`
    })
    .join("\n")

  const prompt = `
Analiza la siguiente conversación y genera un resumen elaborado y bien redactado.

Cliente: ${clientName}
Conversación:
${formattedMessages}

Genera un resumen profesional que incluya:
- Los temas principales tratados en la conversación
- Las consultas o solicitudes del cliente
- Las respuestas y soluciones proporcionadas
- Cualquier acuerdo o próximos pasos mencionados

El resumen debe ser:
- Bien estructurado en párrafos
- Profesional y claro
- Completo pero conciso
- Fácil de leer y entender

Devuelve solo el resumen, sin títulos adicionales ni explicaciones.
`

  return generateAIText(prompt, "gpt-4o")
}
