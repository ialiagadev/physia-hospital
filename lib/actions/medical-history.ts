"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import type { Database } from "@/types/supabase"

export interface MedicalHistoryData {
  // 1. MOTIVO DE CONSULTA
  motivoConsulta: string
  tiempoEvolucion: string

  // 2. ENFERMEDAD ACTUAL
  descripcionDetallada: string
  inicioEvolucion: string
  factoresAgravantes: string
  factoresAtenuantes: string
  intensidadSintomas: string
  frecuenciaSintomas: string
  localizacion: string
  impactoVidaDiaria: string

  // 3. ANTECEDENTES PERSONALES
  enfermedadesCronicas: string
  enfermedadesAgudas: string
  cirugiasPrevias: string
  alergiasMedicamentosas: string
  alergiasAlimentarias: string
  alergiasAmbientales: string
  medicacionHabitual: string
  hospitalizacionesPrevias: string
  accidentesTraumatismos: string

  // 4. ANTECEDENTES FAMILIARES
  enfermedadesHereditarias: string
  patologiasPadres: string
  patologiasHermanos: string
  patologiasAbuelos: string

  // 5. HÁBITOS Y ESTILO DE VIDA
  alimentacion: string
  actividadFisica: string
  consumoTabaco: boolean
  cantidadTabaco: string
  tiempoTabaco: string
  consumoAlcohol: boolean
  cantidadAlcohol: string
  frecuenciaAlcohol: string
  otrasSustancias: string
  calidadSueno: string
  horasSueno: string
  nivelEstres: string

  // 6. FUNCIÓN DIGESTIVA
  apetito: string
  digestion: string
  evacuaciones: string
  frecuenciaEvacuaciones: string
  consistenciaEvacuaciones: string
  cambiosEvacuaciones: string
  nauseasVomitos: string
  reflujo: string

  // 7. FUNCIÓN URINARIA
  frecuenciaUrinaria: string
  dolorUrinar: string
  incontinencia: string
  cambiosColorOrina: string
  cambiosOlorOrina: string

  // 8. FUNCIÓN CARDIOVASCULAR Y RESPIRATORIA
  palpitaciones: string
  disnea: string
  dolorToracico: string
  tos: string
  esputo: string

  // 9. FUNCIÓN MUSCULOESQUELÉTICA
  dolorArticular: string
  dolorMuscular: string
  limitacionesMovimiento: string
  debilidadFatiga: string

  // 10. FUNCIÓN NEUROLÓGICA
  mareosVertigo: string
  perdidaSensibilidad: string
  perdidaFuerza: string
  cefaleas: string
  alteracionesVisuales: string
  alteracionesAuditivas: string

  // 11. FUNCIÓN PSICOLÓGICA/EMOCIONAL
  estadoAnimo: string
  ansiedad: string
  depresion: string
  cambiosConducta: string
  trastornosSueno: string

  // 12. REVISIÓN POR SISTEMAS
  sistemasCutaneo: string
  sistemaEndocrino: string
  sistemaHematologico: string

  // EXPLORACIÓN FÍSICA
  tensionArterial: string
  frecuenciaCardiaca: string
  frecuenciaRespiratoria: string
  temperatura: string
  saturacionO2: string
  peso: string
  talla: string
  imc: string
  observacionesClinicas: string

  // PRUEBAS COMPLEMENTARIAS
  pruebasComplementarias: string

  // DIAGNÓSTICO Y TRATAMIENTO
  diagnostico: string
  medicacion: string
  recomendaciones: string
  derivaciones: string
  seguimiento: string
  observacionesAdicionales: string

  // CAMPOS PERSONALIZADOS
  camposPersonalizados: any[]

  // METADATOS
  profesionalNombre: string
}

export async function getMedicalHistory(clientId: string) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    const { data, error } = await supabase
      .from("medical_histories")
      .select(`
        *,
        professional:professionals(name),
        organization:organizations(name)
      `)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error("Error fetching medical history:", error)
    return { data: null, error: "Error al obtener el historial médico" }
  }
}

export async function saveMedicalHistory(clientId: string, historyData: MedicalHistoryData, professionalId?: string) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    // Obtener información del usuario actual
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error("Usuario no autenticado")
    }

    // Obtener organización del usuario desde la tabla users
    const { data: userOrg } = await supabase.from("users").select("organization_id").eq("id", user.id).single()

    if (!userOrg || !userOrg.organization_id) {
      throw new Error("Usuario sin organización asignada")
    }

    // Convertir los datos al formato de la base de datos
    const dbData = {
      client_id: Number.parseInt(clientId),
      professional_id: professionalId ? Number.parseInt(professionalId) : null,
      organization_id: userOrg.organization_id,

      // Convertir nombres de campos de camelCase a snake_case
      motivo_consulta: historyData.motivoConsulta || null,
      tiempo_evolucion: historyData.tiempoEvolucion || null,
      descripcion_detallada: historyData.descripcionDetallada || null,
      inicio_evolucion: historyData.inicioEvolucion || null,
      factores_agravantes: historyData.factoresAgravantes || null,
      factores_atenuantes: historyData.factoresAtenuantes || null,
      intensidad_sintomas: historyData.intensidadSintomas || null,
      frecuencia_sintomas: historyData.frecuenciaSintomas || null,
      localizacion: historyData.localizacion || null,
      impacto_vida_diaria: historyData.impactoVidaDiaria || null,

      enfermedades_cronicas: historyData.enfermedadesCronicas || null,
      enfermedades_agudas: historyData.enfermedadesAgudas || null,
      cirugias_previas: historyData.cirugiasPrevias || null,
      alergias_medicamentosas: historyData.alergiasMedicamentosas || null,
      alergias_alimentarias: historyData.alergiasAlimentarias || null,
      alergias_ambientales: historyData.alergiasAmbientales || null,
      medicacion_habitual: historyData.medicacionHabitual || null,
      hospitalizaciones_previas: historyData.hospitalizacionesPrevias || null,
      accidentes_traumatismos: historyData.accidentesTraumatismos || null,

      enfermedades_hereditarias: historyData.enfermedadesHereditarias || null,
      patologias_padres: historyData.patologiasPadres || null,
      patologias_hermanos: historyData.patologiasHermanos || null,
      patologias_abuelos: historyData.patologiasAbuelos || null,

      alimentacion: historyData.alimentacion || null,
      actividad_fisica: historyData.actividadFisica || null,
      consumo_tabaco: historyData.consumoTabaco || false,
      cantidad_tabaco: historyData.cantidadTabaco || null,
      tiempo_tabaco: historyData.tiempoTabaco || null,
      consumo_alcohol: historyData.consumoAlcohol || false,
      cantidad_alcohol: historyData.cantidadAlcohol || null,
      frecuencia_alcohol: historyData.frecuenciaAlcohol || null,
      otras_sustancias: historyData.otrasSustancias || null,
      calidad_sueno: historyData.calidadSueno || null,
      horas_sueno: historyData.horasSueno || null,
      nivel_estres: historyData.nivelEstres || null,

      apetito: historyData.apetito || null,
      digestion: historyData.digestion || null,
      evacuaciones: historyData.evacuaciones || null,
      frecuencia_evacuaciones: historyData.frecuenciaEvacuaciones || null,
      consistencia_evacuaciones: historyData.consistenciaEvacuaciones || null,
      cambios_evacuaciones: historyData.cambiosEvacuaciones || null,
      nauseas_vomitos: historyData.nauseasVomitos || null,
      reflujo: historyData.reflujo || null,

      frecuencia_urinaria: historyData.frecuenciaUrinaria || null,
      dolor_urinar: historyData.dolorUrinar || null,
      incontinencia: historyData.incontinencia || null,
      cambios_color_orina: historyData.cambiosColorOrina || null,
      cambios_olor_orina: historyData.cambiosOlorOrina || null,

      palpitaciones: historyData.palpitaciones || null,
      disnea: historyData.disnea || null,
      dolor_toracico: historyData.dolorToracico || null,
      tos: historyData.tos || null,
      esputo: historyData.esputo || null,

      dolor_articular: historyData.dolorArticular || null,
      dolor_muscular: historyData.dolorMuscular || null,
      limitaciones_movimiento: historyData.limitacionesMovimiento || null,
      debilidad_fatiga: historyData.debilidadFatiga || null,

      mareos_vertigo: historyData.mareosVertigo || null,
      perdida_sensibilidad: historyData.perdidaSensibilidad || null,
      perdida_fuerza: historyData.perdidaFuerza || null,
      cefaleas: historyData.cefaleas || null,
      alteraciones_visuales: historyData.alteracionesVisuales || null,
      alteraciones_auditivas: historyData.alteracionesAuditivas || null,

      estado_animo: historyData.estadoAnimo || null,
      ansiedad: historyData.ansiedad || null,
      depresion: historyData.depresion || null,
      cambios_conducta: historyData.cambiosConducta || null,
      trastornos_sueno: historyData.trastornosSueno || null,

      sistemas_cutaneo: historyData.sistemasCutaneo || null,
      sistema_endocrino: historyData.sistemaEndocrino || null,
      sistema_hematologico: historyData.sistemaHematologico || null,

      tension_arterial: historyData.tensionArterial || null,
      frecuencia_cardiaca: historyData.frecuenciaCardiaca || null,
      frecuencia_respiratoria: historyData.frecuenciaRespiratoria || null,
      temperatura: historyData.temperatura || null,
      saturacion_o2: historyData.saturacionO2 || null,
      peso: historyData.peso || null,
      talla: historyData.talla || null,
      imc: historyData.imc || null,
      observaciones_clinicas: historyData.observacionesClinicas || null,

      pruebas_complementarias: historyData.pruebasComplementarias || null,

      diagnostico: historyData.diagnostico || null,
      medicacion: historyData.medicacion || null,
      recomendaciones: historyData.recomendaciones || null,
      derivaciones: historyData.derivaciones || null,
      seguimiento: historyData.seguimiento || null,
      observaciones_adicionales: historyData.observacionesAdicionales || null,

      campos_personalizados: historyData.camposPersonalizados || [],
      profesional_nombre: historyData.profesionalNombre || null,
    }

    // Verificar si ya existe un historial para este cliente
    const { data: existing } = await supabase
      .from("medical_histories")
      .select("id, version")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .single()

    let result

    if (existing) {
      // Actualizar historial existente
      const { data, error } = await supabase
        .from("medical_histories")
        .update({
          ...dbData,
          version: (existing.version || 1) + 1,
        })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Crear nuevo historial
      const { data, error } = await supabase.from("medical_histories").insert(dbData).select().single()

      if (error) throw error
      result = data
    }

    // Revalidar la página del cliente
    revalidatePath(`/dashboard/facturacion/clients/${clientId}`)

    return { data: result, error: null }
  } catch (error) {
    console.error("Error saving medical history:", error)
    return { data: null, error: "Error al guardar el historial médico" }
  }
}

export async function getMedicalAlerts(clientId: string) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    const { data, error } = await supabase
      .from("medical_alerts")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error("Error fetching medical alerts:", error)
    return { data: null, error: "Error al obtener las alertas médicas" }
  }
}

export async function createMedicalAlert(
  clientId: string,
  alertData: {
    alertType: string
    severity: string
    title: string
    description?: string
    expiresAt?: string
  },
) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies })

    // Obtener información del usuario actual
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error("Usuario no autenticado")
    }

    // Obtener organización del usuario
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()

    if (!userOrg) {
      throw new Error("Usuario sin organización asignada")
    }

    const { data, error } = await supabase
      .from("medical_alerts")
      .insert({
        client_id: Number.parseInt(clientId),
        organization_id: userOrg.organization_id,
        alert_type: alertData.alertType,
        severity: alertData.severity,
        title: alertData.title,
        description: alertData.description,
        expires_at: alertData.expiresAt,
        created_by: null, // Se podría obtener el professional_id si está disponible
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/dashboard/facturacion/clients/${clientId}`)

    return { data, error: null }
  } catch (error) {
    console.error("Error creating medical alert:", error)
    return { data: null, error: "Error al crear la alerta médica" }
  }
}
