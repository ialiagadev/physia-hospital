import { openai } from "@ai-sdk/openai"
import { streamText, convertToCoreMessages, tool } from "ai"
import { z } from "zod"
import { getTomorrowAppointments, getAppointmentsByDate } from "@/lib/appoinments"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages, organizationId, userId } = await req.json()

    if (!process.env.OPENAI_API_KEY) {
      return new Response("OpenAI API key not configured", { status: 500 })
    }

    // Validar que tenemos la información del usuario
    if (!organizationId || !userId) {
      return new Response("Usuario no autenticado o sin organización", { status: 401 })
    }

    console.log("=== CHATBOT API ===")
    console.log("User ID:", userId)
    console.log("Organization ID:", organizationId)

    const result = await streamText({
      model: openai("gpt-4o-mini"),
      messages: convertToCoreMessages(messages),
      system: `Eres PHYSIA AI, un asistente médico especializado que habla en español. 
Ayudas a profesionales de la salud con consultas médicas, diagnósticos, tratamientos y gestión clínica.
También puedes consultar información sobre citas médicas y horarios.
Siempre recuerda que tus respuestas son para apoyo profesional y no reemplazan el juicio clínico.
Responde de manera precisa, profesional y siempre sugiere verificar información crítica.

Cuando el usuario pregunte sobre citas (mañana, hoy, fechas específicas), automáticamente consulta 
la información usando las herramientas disponibles.

Cuando muestres información de citas, presenta los datos de forma clara y organizada, incluyendo:
- Hora de la cita
- Nombre del paciente
- Tipo de consulta
- Estado de la cita
- Notas si las hay`,
      tools: {
        consultarCitasManana: tool({
          description:
            "Consultar las citas programadas para mañana. Se ejecuta automáticamente cuando el usuario pregunta sobre citas de mañana.",
          parameters: z.object({
            professionalId: z
              .string()
              .optional()
              .describe("ID del profesional (opcional, para filtrar por profesional específico)"),
          }),
          execute: async ({ professionalId }) => {
            console.log("=== EJECUTANDO consultarCitasManana ===")
            console.log("Organization ID usado:", organizationId)

            const result = await getTomorrowAppointments(Number.parseInt(organizationId), professionalId)

            if (!result.success) {
              return {
                error: result.error,
                message: "No se pudieron obtener las citas de mañana",
                organizationIdUsed: organizationId,
              }
            }

            const appointments = result.appointments.map((apt) => ({
              hora: `${apt.start_time} - ${apt.end_time}`,
              paciente: apt.clients?.name || "Sin nombre",
              telefono: apt.clients?.phone || "No disponible",
              profesional: apt.professional?.name || "No asignado",
              tipoConsulta: apt.appointment_types?.name || "Consulta general",
              estado: apt.status,
              duracion: `${apt.duration} minutos`,
              notas: apt.notes || "Sin notas",
            }))

            return {
              fecha: result.date,
              totalCitas: result.total,
              citas: appointments,
              organizationIdUsed: organizationId,
              mensaje:
                result.total > 0
                  ? `Se encontraron ${result.total} citas para mañana (${result.date})`
                  : `No hay citas programadas para mañana (${result.date})`,
            }
          },
        }),
        consultarCitasPorFecha: tool({
          description: "Consultar las citas programadas para una fecha específica",
          parameters: z.object({
            fecha: z.string().describe("Fecha en formato YYYY-MM-DD"),
            professionalId: z.string().optional().describe("ID del profesional (opcional)"),
          }),
          execute: async ({ fecha, professionalId }) => {
            console.log("=== EJECUTANDO consultarCitasPorFecha ===")
            console.log("Fecha:", fecha)
            console.log("Organization ID usado:", organizationId)

            const result = await getAppointmentsByDate(Number.parseInt(organizationId), fecha, professionalId)

            if (!result.success) {
              return {
                error: result.error,
                message: `No se pudieron obtener las citas para ${fecha}`,
                organizationIdUsed: organizationId,
              }
            }

            const appointments = result.appointments.map((apt) => ({
              hora: `${apt.start_time} - ${apt.end_time}`,
              paciente: apt.clients?.name || "Sin nombre",
              telefono: apt.clients?.phone || "No disponible",
              profesional: apt.professional?.name || "No asignado",
              tipoConsulta: apt.appointment_types?.name || "Consulta general",
              estado: apt.status,
              duracion: `${apt.duration} minutos`,
              notas: apt.notes || "Sin notas",
            }))

            return {
              fecha: result.date,
              totalCitas: result.total,
              citas: appointments,
              organizationIdUsed: organizationId,
              mensaje:
                result.total > 0
                  ? `Se encontraron ${result.total} citas para ${fecha}`
                  : `No hay citas programadas para ${fecha}`,
            }
          },
        }),
        obtenerClima: tool({
          description: "Obtener información del clima en una ubicación específica",
          parameters: z.object({
            ubicacion: z.string().describe("La ciudad o ubicación para obtener el clima"),
          }),
          execute: async ({ ubicacion }) => {
            const temperaturas = [18, 22, 25, 28, 15, 20, 24]
            const condiciones = ["Soleado", "Nublado", "Lluvioso", "Parcialmente nublado"]

            const temperatura = temperaturas[Math.floor(Math.random() * temperaturas.length)]
            const condicion = condiciones[Math.floor(Math.random() * condiciones.length)]

            return {
              ubicacion,
              temperatura: `${temperatura}°C`,
              condicion,
              humedad: `${Math.floor(Math.random() * 40) + 40}%`,
              viento: `${Math.floor(Math.random() * 20) + 5} km/h`,
            }
          },
        }),
        calcularOperacion: tool({
          description: "Realizar cálculos matemáticos básicos",
          parameters: z.object({
            operacion: z.string().describe("La operación matemática a realizar (ej: 2 + 2, 10 * 5)"),
          }),
          execute: async ({ operacion }) => {
            try {
              const resultado = Function(`"use strict"; return (${operacion.replace(/[^0-9+\-*/().\s]/g, "")})`)()
              return {
                operacion,
                resultado: resultado.toString(),
              }
            } catch (error) {
              return {
                operacion,
                error: "No se pudo calcular la operación",
              }
            }
          },
        }),
      },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error in chatbot API:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
