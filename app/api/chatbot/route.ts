import { openai } from "@ai-sdk/openai"
import { streamText, convertToCoreMessages, tool } from "ai"
import { z } from "zod"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    messages: convertToCoreMessages(messages),
    system: `Eres PHYSIA AI, un asistente médico especializado que habla en español. 
Ayudas a profesionales de la salud con consultas médicas, diagnósticos, tratamientos y gestión clínica.
Siempre recuerda que tus respuestas son para apoyo profesional y no reemplazan el juicio clínico.
Responde de manera precisa, profesional y siempre sugiere verificar información crítica.`,
    tools: {
      obtenerClima: tool({
        description: "Obtener información del clima en una ubicación específica",
        parameters: z.object({
          ubicacion: z.string().describe("La ciudad o ubicación para obtener el clima"),
        }),
        execute: async ({ ubicacion }) => {
          // Simulamos una API de clima
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
            // Evaluación segura de operaciones básicas
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
      generarIdeas: tool({
        description: "Generar ideas creativas sobre un tema específico",
        parameters: z.object({
          tema: z.string().describe("El tema para generar ideas"),
          cantidad: z.number().optional().describe("Número de ideas a generar (por defecto 5)"),
        }),
        execute: async ({ tema, cantidad = 5 }) => {
          const ideas = []
          for (let i = 1; i <= cantidad; i++) {
            ideas.push(`Idea ${i} sobre ${tema}: ${generarIdeaAleatoria(tema)}`)
          }
          return {
            tema,
            ideas,
            total: cantidad,
          }
        },
      }),
    },
  })

  return result.toDataStreamResponse()
}

function generarIdeaAleatoria(tema: string): string {
  const prefijos = [
    "Crear una aplicación que",
    "Desarrollar un sistema para",
    "Implementar una solución que",
    "Diseñar una herramienta para",
    "Construir una plataforma que",
  ]

  const acciones = [
    "mejore la experiencia del usuario",
    "automatice procesos repetitivos",
    "conecte personas con intereses similares",
    "simplifique tareas complejas",
    "proporcione información valiosa",
  ]

  const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)]
  const accion = acciones[Math.floor(Math.random() * acciones.length)]

  return `${prefijo} ${accion} relacionado con ${tema}`
}
