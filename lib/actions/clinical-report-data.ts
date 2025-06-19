import { supabase } from '@/lib/supabase/client'

export interface ClinicalReportData {
  pacienteInfo: {
    id: string
    nombre: string
    telefono: string | null
    email: string | null
    fechaNacimiento: string | null
    taxId: string
    direccion: string | null
    ciudad: string | null
    provincia: string | null
  }
  historialMedico: {
    id: number
    motivoConsulta: string | null
    tiempoEvolucion: string | null
    descripcionDetallada: string | null
    inicioEvolucion: string | null
    factoresAgravantes: string | null
    factoresAtenuantes: string | null
    intensidadSintomas: string | null
    frecuenciaSintomas: string | null
    localizacion: string | null
    impactoVidaDiaria: string | null
    enfermedadesCronicas: string | null
    enfermedadesAgudas: string | null
    cirugiasPrevias: string | null
    alergiasMedicamentosas: string | null
    alergiasAlimentarias: string | null
    alergiasAmbientales: string | null
    medicacionHabitual: string | null
    hospitalizacionesPrevias: string | null
    accidentesTraumatismos: string | null
    enfermedadesHereditarias: string | null
    patologiasPadres: string | null
    patologiasHermanos: string | null
    patologiasAbuelos: string | null
    alimentacion: string | null
    actividadFisica: string | null
    consumoTabaco: boolean
    cantidadTabaco: string | null
    tiempoTabaco: string | null
    consumoAlcohol: boolean
    cantidadAlcohol: string | null
    frecuenciaAlcohol: string | null
    otrasSustancias: string | null
    calidadSueno: string | null
    horasSueno: string | null
    nivelEstres: string | null
    apetito: string | null
    digestion: string | null
    evacuaciones: string | null
    frecuenciaEvacuaciones: string | null
    consistenciaEvacuaciones: string | null
    cambiosEvacuaciones: string | null
    nauseasVomitos: string | null
    reflujo: string | null
    frecuenciaUrinaria: string | null
    dolorUrinar: string | null
    incontinencia: string | null
    cambiosColorOrina: string | null
    cambiosOlorOrina: string | null
    palpitaciones: string | null
    disnea: string | null
    dolorToracico: string | null
    tos: string | null
    esputo: string | null
    dolorArticular: string | null
    dolorMuscular: string | null
    limitacionesMovimiento: string | null
    debilidadFatiga: string | null
    mareosVertigo: string | null
    perdidaSensibilidad: string | null
    perdidaFuerza: string | null
    cefaleas: string | null
    alteracionesVisuales: string | null
    alteracionesAuditivas: string | null
    estadoAnimo: string | null
    ansiedad: string | null
    depresion: string | null
    cambiosConducta: string | null
    trastornosSueno: string | null
    sistemasCutaneo: string | null
    sistemaEndocrino: string | null
    sistemaHematologico: string | null
    tensionArterial: string | null
    frecuenciaCardiaca: string | null
    frecuenciaRespiratoria: string | null
    temperatura: string | null
    saturacionO2: string | null
    peso: string | null
    talla: string | null
    imc: string | null
    observacionesClinicas: string | null
    pruebasComplementarias: string | null
    diagnostico: string | null
    medicacion: string | null
    recomendaciones: string | null
    derivaciones: string | null
    seguimiento: string | null
    observacionesAdicionales: string | null
    camposPersonalizados: any[]
    profesionalNombre: string | null
    fechaCreacion: string
    ultimaActualizacion: string
  } | null
  seguimientos: {
    id: number
    fechaSeguimiento: string
    tipoSeguimiento: string
    descripcion: string
    recomendaciones: string | null
    notaProximaCita: string | null
    profesionalNombre: string | null
    fechaCreacion: string
  }[]
  metadatos: {
    ultimaVisita: string | null
    totalSeguimientos: number
    fechaGeneracionReporte: string
  }
}

export async function getClinicalReportData(clientId: string): Promise<{
  data: ClinicalReportData | null
  error: string | null
}> {
  try {
    // 1. Obtener información básica del paciente
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        phone,
        email,
        birth_date,
        tax_id,
        address,
        city,
        province
      `)
      .eq('id', clientId)
      .single()

    if (clientError) {
      return { data: null, error: `Error al obtener datos del paciente: ${clientError.message}` }
    }

    if (!clientData) {
      return { data: null, error: 'Paciente no encontrado' }
    }

    // 2. Obtener historial médico más reciente y activo
    const { data: medicalHistory, error: medicalError } = await supabase
      .from('medical_histories')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (medicalError) {
      return { data: null, error: `Error al obtener historial médico: ${medicalError.message}` }
    }

    // 3. Obtener seguimientos activos (últimos 20)
    const { data: followUps, error: followUpsError } = await supabase
      .from('patient_follow_ups')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('follow_up_date', { ascending: false })
      .limit(20)

    if (followUpsError) {
      return { data: null, error: `Error al obtener seguimientos: ${followUpsError.message}` }
    }

    // 4. Construir objeto de respuesta
    const reportData: ClinicalReportData = {
      pacienteInfo: {
        id: clientData.id.toString(),
        nombre: clientData.name,
        telefono: clientData.phone,
        email: clientData.email,
        fechaNacimiento: clientData.birth_date,
        taxId: clientData.tax_id,
        direccion: clientData.address,
        ciudad: clientData.city,
        provincia: clientData.province
      },
      historialMedico: medicalHistory ? {
        id: medicalHistory.id,
        motivoConsulta: medicalHistory.motivo_consulta,
        tiempoEvolucion: medicalHistory.tiempo_evolucion,
        descripcionDetallada: medicalHistory.descripcion_detallada,
        inicioEvolucion: medicalHistory.inicio_evolucion,
        factoresAgravantes: medicalHistory.factores_agravantes,
        factoresAtenuantes: medicalHistory.factores_atenuantes,
        intensidadSintomas: medicalHistory.intensidad_sintomas,
        frecuenciaSintomas: medicalHistory.frecuencia_sintomas,
        localizacion: medicalHistory.localizacion,
        impactoVidaDiaria: medicalHistory.impacto_vida_diaria,
        enfermedadesCronicas: medicalHistory.enfermedades_cronicas,
        enfermedadesAgudas: medicalHistory.enfermedades_agudas,
        cirugiasPrevias: medicalHistory.cirugias_previas,
        alergiasMedicamentosas: medicalHistory.alergias_medicamentosas,
        alergiasAlimentarias: medicalHistory.alergias_alimentarias,
        alergiasAmbientales: medicalHistory.alergias_ambientales,
        medicacionHabitual: medicalHistory.medicacion_habitual,
        hospitalizacionesPrevias: medicalHistory.hospitalizaciones_previas,
        accidentesTraumatismos: medicalHistory.accidentes_traumatismos,
        enfermedadesHereditarias: medicalHistory.enfermedades_hereditarias,
        patologiasPadres: medicalHistory.patologias_padres,
        patologiasHermanos: medicalHistory.patologias_hermanos,
        patologiasAbuelos: medicalHistory.patologias_abuelos,
        alimentacion: medicalHistory.alimentacion,
        actividadFisica: medicalHistory.actividad_fisica,
        consumoTabaco: medicalHistory.consumo_tabaco || false,
        cantidadTabaco: medicalHistory.cantidad_tabaco,
        tiempoTabaco: medicalHistory.tiempo_tabaco,
        consumoAlcohol: medicalHistory.consumo_alcohol || false,
        cantidadAlcohol: medicalHistory.cantidad_alcohol,
        frecuenciaAlcohol: medicalHistory.frecuencia_alcohol,
        otrasSustancias: medicalHistory.otras_sustancias,
        calidadSueno: medicalHistory.calidad_sueno,
        horasSueno: medicalHistory.horas_sueno,
        nivelEstres: medicalHistory.nivel_estres,
        apetito: medicalHistory.apetito,
        digestion: medicalHistory.digestion,
        evacuaciones: medicalHistory.evacuaciones,
        frecuenciaEvacuaciones: medicalHistory.frecuencia_evacuaciones,
        consistenciaEvacuaciones: medicalHistory.consistencia_evacuaciones,
        cambiosEvacuaciones: medicalHistory.cambios_evacuaciones,
        nauseasVomitos: medicalHistory.nauseas_vomitos,
        reflujo: medicalHistory.reflujo,
        frecuenciaUrinaria: medicalHistory.frecuencia_urinaria,
        dolorUrinar: medicalHistory.dolor_urinar,
        incontinencia: medicalHistory.incontinencia,
        cambiosColorOrina: medicalHistory.cambios_color_orina,
        cambiosOlorOrina: medicalHistory.cambios_olor_orina,
        palpitaciones: medicalHistory.palpitaciones,
        disnea: medicalHistory.disnea,
        dolorToracico: medicalHistory.dolor_toracico,
        tos: medicalHistory.tos,
        esputo: medicalHistory.esputo,
        dolorArticular: medicalHistory.dolor_articular,
        dolorMuscular: medicalHistory.dolor_muscular,
        limitacionesMovimiento: medicalHistory.limitaciones_movimiento,
        debilidadFatiga: medicalHistory.debilidad_fatiga,
        mareosVertigo: medicalHistory.mareos_vertigo,
        perdidaSensibilidad: medicalHistory.perdida_sensibilidad,
        perdidaFuerza: medicalHistory.perdida_fuerza,
        cefaleas: medicalHistory.cefaleas,
        alteracionesVisuales: medicalHistory.alteraciones_visuales,
        alteracionesAuditivas: medicalHistory.alteraciones_auditivas,
        estadoAnimo: medicalHistory.estado_animo,
        ansiedad: medicalHistory.ansiedad,
        depresion: medicalHistory.depresion,
        cambiosConducta: medicalHistory.cambios_conducta,
        trastornosSueno: medicalHistory.trastornos_sueno,
        sistemasCutaneo: medicalHistory.sistemas_cutaneo,
        sistemaEndocrino: medicalHistory.sistema_endocrino,
        sistemaHematologico: medicalHistory.sistema_hematologico,
        tensionArterial: medicalHistory.tension_arterial,
        frecuenciaCardiaca: medicalHistory.frecuencia_cardiaca,
        frecuenciaRespiratoria: medicalHistory.frecuencia_respiratoria,
        temperatura: medicalHistory.temperatura,
        saturacionO2: medicalHistory.saturacion_o2,
        peso: medicalHistory.peso,
        talla: medicalHistory.talla,
        imc: medicalHistory.imc,
        observacionesClinicas: medicalHistory.observaciones_clinicas,
        pruebasComplementarias: medicalHistory.pruebas_complementarias,
        diagnostico: medicalHistory.diagnostico,
        medicacion: medicalHistory.medicacion,
        recomendaciones: medicalHistory.recomendaciones,
        derivaciones: medicalHistory.derivaciones,
        seguimiento: medicalHistory.seguimiento,
        observacionesAdicionales: medicalHistory.observaciones_adicionales,
        camposPersonalizados: medicalHistory.campos_personalizados || [],
        profesionalNombre: medicalHistory.profesional_nombre,
        fechaCreacion: medicalHistory.created_at,
        ultimaActualizacion: medicalHistory.updated_at
      } : null,
      seguimientos: (followUps || []).map(followUp => ({
        id: followUp.id,
        fechaSeguimiento: followUp.follow_up_date,
        tipoSeguimiento: followUp.follow_up_type,
        descripcion: followUp.description,
        recomendaciones: followUp.recommendations,
        notaProximaCita: followUp.next_appointment_note,
        profesionalNombre: followUp.professional_name,
        fechaCreacion: followUp.created_at
      })),
      metadatos: {
        ultimaVisita: followUps && followUps.length > 0 ? followUps[0].follow_up_date : null,
        totalSeguimientos: followUps?.length || 0,
        fechaGeneracionReporte: new Date().toISOString()
      }
    }

    return { data: reportData, error: null }

  } catch (error) {
    console.error('Error en getClinicalReportData:', error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Error desconocido al obtener datos del informe' 
    }
  }
}