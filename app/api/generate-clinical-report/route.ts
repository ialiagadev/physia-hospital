import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paciente, historialMedico, seguimientos, citas, documentos, observaciones } = body

    if (!paciente) {
      return NextResponse.json({ error: "Datos del paciente requeridos" }, { status: 400 })
    }

    // Construir el prompt para la IA con instrucciones específicas de formato
    const prompt = `
Eres un médico especialista y necesitas generar un informe clínico profesional y detallado.

IMPORTANTE: NO uses asteriscos (*) ni símbolos de markdown para el formato. Usa texto plano limpio y profesional.

DATOS DEL PACIENTE:
- Nombre: ${paciente.nombre || "No especificado"}
- Edad: ${paciente.edad || "No especificada"} años
- Teléfono: ${paciente.telefono || "No especificado"}
- Email: ${paciente.email || "No especificado"}
- Fecha de nacimiento: ${paciente.fechaNacimiento || "No especificada"}
- Última visita: ${paciente.ultimaVisita || "No especificada"}
- Próxima cita: ${paciente.proximaCita || "No programada"}

INFORMACIÓN MÉDICA BÁSICA:
- Alergias: ${paciente.alergias?.length > 0 ? paciente.alergias.join(", ") : "No registradas"}
- Diagnósticos: ${paciente.diagnosticos?.length > 0 ? paciente.diagnosticos.join(", ") : "No registrados"}
- Medicación actual: ${paciente.medicacion?.length > 0 ? paciente.medicacion.join(", ") : "No registrada"}
- Notas médicas: ${paciente.notas || "No hay notas adicionales"}

HISTORIAL MÉDICO COMPLETO:
${
  historialMedico?.length > 0
    ? historialMedico
        .map(
          (entry: any) =>
            `- ${entry.fecha || "Fecha no especificada"}: ${entry.tipo || "Tipo no especificado"} - ${entry.descripcion || "Sin descripción"} (${entry.profesional || "Profesional no especificado"})`,
        )
        .join("\n")
    : "No hay historial médico detallado disponible"
}

SEGUIMIENTOS RECIENTES:
${
  seguimientos?.length > 0
    ? seguimientos
        .map(
          (seg: any) =>
            `- ${seg.fecha || "Fecha no especificada"}: ${seg.tipo || "Tipo no especificado"} - ${seg.descripcion || "Sin descripción"}${seg.recomendaciones ? " | Recomendaciones: " + seg.recomendaciones : ""}`,
        )
        .join("\n")
    : "No hay seguimientos registrados"
}

HISTORIAL DE CITAS:
${
  citas?.length > 0
    ? citas
        .map(
          (cita: any) =>
            `- ${cita.fecha || "Fecha no especificada"}: ${cita.tipo || "Tipo no especificado"} (${cita.estado || "Estado no especificado"}) - ${cita.notas || "Sin notas"}`,
        )
        .join("\n")
    : "No hay citas registradas"
}

DOCUMENTOS MÉDICOS:
${
  documentos?.length > 0
    ? documentos
        .map(
          (doc: any) =>
            `- ${doc.fileName || "Archivo sin nombre"} (${doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString("es-ES") : "Fecha no especificada"})${doc.notes ? ": " + doc.notes : ""}`,
        )
        .join("\n")
    : "No hay documentos médicos subidos"
}

${
  observaciones
    ? `OBSERVACIONES ADICIONALES DEL PROFESIONAL:
${observaciones}`
    : ""
}

INSTRUCCIONES DE FORMATO:
- NO uses asteriscos (*) ni símbolos de markdown
- Usa texto plano limpio y profesional
- Los títulos de sección deben ser numerados (1. ENCABEZADO, 2. ANTECEDENTES, etc.)
- Usa guiones (-) para listas cuando sea necesario
- Mantén un formato limpio y legible
- Usa saltos de línea apropiados para separar secciones

Genera un informe clínico profesional con las siguientes secciones:

1. ENCABEZADO
2. ANTECEDENTES MÉDICOS
3. EVOLUCIÓN CLÍNICA
4. SITUACIÓN CLÍNICA ACTUAL
5. ALERGIAS Y CONTRAINDICACIONES
6. TRATAMIENTO ACTUAL
7. ANÁLISIS Y VALORACIÓN
8. RECOMENDACIONES
9. PLAN DE SEGUIMIENTO
10. OBSERVACIONES FINALES

El informe debe ser profesional, detallado y útil para otros profesionales médicos. Utiliza terminología médica apropiada pero asegúrate de que sea comprensible.

Fecha del informe: ${new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}
`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      maxTokens: 2500,
      temperature: 0.2, // Más determinístico para informes médicos
    })

    return NextResponse.json({
      report: text,
      success: true,
    })
  } catch (error) {
    console.error("Error generating clinical report:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor al generar el informe",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
