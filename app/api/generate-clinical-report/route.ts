import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paciente, historialMedico, seguimientos, citas, documentos, observaciones, historialCompleto } = body

    if (!paciente) {
      return NextResponse.json({ error: "Datos del paciente requeridos" }, { status: 400 })
    }

    // Función para formatear campos del historial
    const formatearCampo = (valor: any, etiqueta: string) => {
      if (!valor || valor === "") return ""
      return `${etiqueta}: ${valor}\n`
    }

    // Construir sección del historial médico completo
    const construirHistorialCompleto = (historial: any) => {
      if (!historial) return "No hay historial médico completo disponible"

      let texto = ""

      // 1. MOTIVO DE CONSULTA
      if (historial.motivoConsulta || historial.tiempoEvolucion) {
        texto += "\nMOTIVO DE CONSULTA:\n"
        texto += formatearCampo(historial.motivoConsulta, "Motivo principal")
        texto += formatearCampo(historial.tiempoEvolucion, "Tiempo de evolución")
      }

      // 2. ENFERMEDAD ACTUAL
      if (
        historial.descripcionDetallada ||
        historial.inicioEvolucion ||
        historial.factoresAgravantes ||
        historial.factoresAtenuantes
      ) {
        texto += "\nENFERMEDAD ACTUAL:\n"
        texto += formatearCampo(historial.descripcionDetallada, "Descripción detallada")
        texto += formatearCampo(historial.inicioEvolucion, "Inicio y evolución")
        texto += formatearCampo(historial.factoresAgravantes, "Factores agravantes")
        texto += formatearCampo(historial.factoresAtenuantes, "Factores atenuantes")
        texto += formatearCampo(historial.intensidadSintomas, "Intensidad")
        texto += formatearCampo(historial.frecuenciaSintomas, "Frecuencia")
        texto += formatearCampo(historial.localizacion, "Localización")
        texto += formatearCampo(historial.impactoVidaDiaria, "Impacto en vida diaria")
      }

      // 3. ANTECEDENTES PERSONALES
      if (historial.enfermedadesCronicas || historial.cirugiasPrevias || historial.medicacionHabitual) {
        texto += "\nANTECEDENTES PERSONALES:\n"
        texto += formatearCampo(historial.enfermedadesCronicas, "Enfermedades crónicas")
        texto += formatearCampo(historial.enfermedadesAgudas, "Enfermedades agudas previas")
        texto += formatearCampo(historial.cirugiasPrevias, "Cirugías previas")
        texto += formatearCampo(historial.medicacionHabitual, "Medicación habitual")
        texto += formatearCampo(historial.hospitalizacionesPrevias, "Hospitalizaciones")
        texto += formatearCampo(historial.accidentesTraumatismos, "Accidentes/Traumatismos")
      }

      // 4. ALERGIAS
      if (historial.alergiasMedicamentosas || historial.alergiasAlimentarias || historial.alergiasAmbientales) {
        texto += "\nALERGIAS:\n"
        texto += formatearCampo(historial.alergiasMedicamentosas, "Medicamentosas")
        texto += formatearCampo(historial.alergiasAlimentarias, "Alimentarias")
        texto += formatearCampo(historial.alergiasAmbientales, "Ambientales")
      }

      // 5. ANTECEDENTES FAMILIARES
      if (historial.enfermedadesHereditarias || historial.patologiasPadres) {
        texto += "\nANTECEDENTES FAMILIARES:\n"
        texto += formatearCampo(historial.enfermedadesHereditarias, "Enfermedades hereditarias")
        texto += formatearCampo(historial.patologiasPadres, "Patologías en padres")
        texto += formatearCampo(historial.patologiasHermanos, "Patologías en hermanos")
        texto += formatearCampo(historial.patologiasAbuelos, "Patologías en abuelos")
      }

      // 6. HÁBITOS Y ESTILO DE VIDA
      if (historial.alimentacion || historial.actividadFisica || historial.consumoTabaco || historial.consumoAlcohol) {
        texto += "\nHÁBITOS Y ESTILO DE VIDA:\n"
        texto += formatearCampo(historial.alimentacion, "Alimentación")
        texto += formatearCampo(historial.actividadFisica, "Actividad física")

        if (historial.consumoTabaco) {
          texto += `Tabaco: Sí - ${historial.cantidadTabaco || "cantidad no especificada"}${historial.tiempoTabaco ? ` durante ${historial.tiempoTabaco}` : ""}\n`
        } else {
          texto += "Tabaco: No\n"
        }

        if (historial.consumoAlcohol) {
          texto += `Alcohol: Sí - ${historial.cantidadAlcohol || "cantidad no especificada"} (${historial.frecuenciaAlcohol || "frecuencia no especificada"})\n`
        } else {
          texto += "Alcohol: No\n"
        }

        texto += formatearCampo(historial.otrasSustancias, "Otras sustancias")
        texto += formatearCampo(historial.calidadSueno, "Calidad del sueño")
        texto += formatearCampo(historial.horasSueno, "Horas de sueño")
        texto += formatearCampo(historial.nivelEstres, "Nivel de estrés")
      }

      // 7. REVISIÓN POR SISTEMAS
      texto += "\nREVISIÓN POR SISTEMAS:\n"

      // Sistema digestivo
      if (historial.apetito || historial.digestion || historial.evacuaciones) {
        texto += "Sistema Digestivo:\n"
        texto += formatearCampo(historial.apetito, "  Apetito")
        texto += formatearCampo(historial.digestion, "  Digestión")
        texto += formatearCampo(historial.evacuaciones, "  Evacuaciones")
        texto += formatearCampo(historial.frecuenciaEvacuaciones, "  Frecuencia evacuaciones")
        texto += formatearCampo(historial.consistenciaEvacuaciones, "  Consistencia")
        texto += formatearCampo(historial.nauseasVomitos, "  Náuseas/Vómitos")
        texto += formatearCampo(historial.reflujo, "  Reflujo")
      }

      // Sistema urinario
      if (historial.frecuenciaUrinaria || historial.dolorUrinar) {
        texto += "Sistema Urinario:\n"
        texto += formatearCampo(historial.frecuenciaUrinaria, "  Frecuencia urinaria")
        texto += formatearCampo(historial.dolorUrinar, "  Dolor al orinar")
        texto += formatearCampo(historial.incontinencia, "  Incontinencia")
        texto += formatearCampo(historial.cambiosColorOrina, "  Cambios en color")
        texto += formatearCampo(historial.cambiosOlorOrina, "  Cambios en olor")
      }

      // Sistema cardiovascular y respiratorio
      if (historial.palpitaciones || historial.disnea || historial.dolorToracico) {
        texto += "Sistema Cardiovascular y Respiratorio:\n"
        texto += formatearCampo(historial.palpitaciones, "  Palpitaciones")
        texto += formatearCampo(historial.disnea, "  Disnea")
        texto += formatearCampo(historial.dolorToracico, "  Dolor torácico")
        texto += formatearCampo(historial.tos, "  Tos")
        texto += formatearCampo(historial.esputo, "  Esputo")
      }

      // Sistema musculoesquelético
      if (historial.dolorArticular || historial.dolorMuscular) {
        texto += "Sistema Musculoesquelético:\n"
        texto += formatearCampo(historial.dolorArticular, "  Dolor articular")
        texto += formatearCampo(historial.dolorMuscular, "  Dolor muscular")
        texto += formatearCampo(historial.limitacionesMovimiento, "  Limitaciones de movimiento")
        texto += formatearCampo(historial.debilidadFatiga, "  Debilidad/Fatiga")
      }

      // Sistema neurológico
      if (historial.mareosVertigo || historial.cefaleas || historial.perdidaSensibilidad) {
        texto += "Sistema Neurológico:\n"
        texto += formatearCampo(historial.mareosVertigo, "  Mareos/Vértigo")
        texto += formatearCampo(historial.cefaleas, "  Cefaleas")
        texto += formatearCampo(historial.perdidaSensibilidad, "  Pérdida de sensibilidad")
        texto += formatearCampo(historial.perdidaFuerza, "  Pérdida de fuerza")
        texto += formatearCampo(historial.alteracionesVisuales, "  Alteraciones visuales")
        texto += formatearCampo(historial.alteracionesAuditivas, "  Alteraciones auditivas")
      }

      // Estado psicológico/emocional
      if (historial.estadoAnimo || historial.ansiedad || historial.depresion) {
        texto += "Estado Psicológico/Emocional:\n"
        texto += formatearCampo(historial.estadoAnimo, "  Estado de ánimo")
        texto += formatearCampo(historial.ansiedad, "  Ansiedad")
        texto += formatearCampo(historial.depresion, "  Depresión")
        texto += formatearCampo(historial.cambiosConducta, "  Cambios de conducta")
        texto += formatearCampo(historial.trastornosSueno, "  Trastornos del sueño")
      }

      // Otros sistemas
      if (historial.sistemasCutaneo || historial.sistemaEndocrino || historial.sistemaHematologico) {
        texto += "Otros Sistemas:\n"
        texto += formatearCampo(historial.sistemasCutaneo, "  Sistema cutáneo")
        texto += formatearCampo(historial.sistemaEndocrino, "  Sistema endocrino")
        texto += formatearCampo(historial.sistemaHematologico, "  Sistema hematológico")
      }

      // 8. EXPLORACIÓN FÍSICA
      if (historial.tensionArterial || historial.peso || historial.observacionesClinicas) {
        texto += "\nEXPLORACIÓN FÍSICA:\n"

        // Signos vitales
        const signosVitales = []
        if (historial.tensionArterial) signosVitales.push(`TA: ${historial.tensionArterial} mmHg`)
        if (historial.frecuenciaCardiaca) signosVitales.push(`FC: ${historial.frecuenciaCardiaca} lpm`)
        if (historial.frecuenciaRespiratoria) signosVitales.push(`FR: ${historial.frecuenciaRespiratoria} rpm`)
        if (historial.temperatura) signosVitales.push(`T°: ${historial.temperatura}°C`)
        if (historial.saturacionO2) signosVitales.push(`SatO2: ${historial.saturacionO2}%`)

        if (signosVitales.length > 0) {
          texto += `Signos vitales: ${signosVitales.join(", ")}\n`
        }

        // Antropometría
        const antropometria = []
        if (historial.peso) antropometria.push(`Peso: ${historial.peso} kg`)
        if (historial.talla) antropometria.push(`Talla: ${historial.talla} cm`)
        if (historial.imc) antropometria.push(`IMC: ${historial.imc}`)

        if (antropometria.length > 0) {
          texto += `Antropometría: ${antropometria.join(", ")}\n`
        }

        texto += formatearCampo(historial.observacionesClinicas, "Observaciones clínicas")
      }

      // 9. PRUEBAS COMPLEMENTARIAS
      texto += formatearCampo(historial.pruebasComplementarias, "\nPRUEBAS COMPLEMENTARIAS")

      // 10. DIAGNÓSTICO Y TRATAMIENTO
      if (historial.diagnostico || historial.medicacion || historial.recomendaciones) {
        texto += "\nDIAGNÓSTICO Y TRATAMIENTO:\n"
        texto += formatearCampo(historial.diagnostico, "Diagnóstico")
        texto += formatearCampo(historial.medicacion, "Medicación")
        texto += formatearCampo(historial.recomendaciones, "Recomendaciones")
        texto += formatearCampo(historial.derivaciones, "Derivaciones")
        texto += formatearCampo(historial.seguimiento, "Plan de seguimiento")
        texto += formatearCampo(historial.observacionesAdicionales, "Observaciones adicionales")
      }

      // 11. CAMPOS PERSONALIZADOS
      if (historial.camposPersonalizados && historial.camposPersonalizados.length > 0) {
        texto += "\nCAMPOS PERSONALIZADOS:\n"
        historial.camposPersonalizados.forEach((campo: any) => {
          texto += `${campo.titulo}${campo.subtitulo ? ` (${campo.subtitulo})` : ""}: ${campo.descripcion || "Sin descripción"}\n`
        })
      }

      return texto
    }

    // Construir el prompt mejorado
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

HISTORIAL MÉDICO DETALLADO:
${construirHistorialCompleto(historialCompleto)}

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
      maxTokens: 3500, // Aumentado para más contenido
      temperature: 0.2,
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
