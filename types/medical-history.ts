export interface MedicalHistory {
    id: number
    created_at: string
    updated_at: string
    client_id: number
    professional_id?: number
    organization_id: number
  
    // 1. MOTIVO DE CONSULTA
    motivo_consulta?: string
    tiempo_evolucion?: string
  
    // 2. ENFERMEDAD ACTUAL
    descripcion_detallada?: string
    inicio_evolucion?: string
    factores_agravantes?: string
    factores_atenuantes?: string
    intensidad_sintomas?: string
    frecuencia_sintomas?: string
    localizacion?: string
    impacto_vida_diaria?: string
  
    // 3. ANTECEDENTES PERSONALES
    enfermedades_cronicas?: string
    enfermedades_agudas?: string
    cirugias_previas?: string
    alergias_medicamentosas?: string
    alergias_alimentarias?: string
    alergias_ambientales?: string
    medicacion_habitual?: string
    hospitalizaciones_previas?: string
    accidentes_traumatismos?: string
  
    // 4. ANTECEDENTES FAMILIARES
    enfermedades_hereditarias?: string
    patologias_padres?: string
    patologias_hermanos?: string
    patologias_abuelos?: string
  
    // 5. HÁBITOS Y ESTILO DE VIDA
    alimentacion?: string
    actividad_fisica?: string
    consumo_tabaco?: boolean
    cantidad_tabaco?: string
    tiempo_tabaco?: string
    consumo_alcohol?: boolean
    cantidad_alcohol?: string
    frecuencia_alcohol?: string
    otras_sustancias?: string
    calidad_sueno?: string
    horas_sueno?: string
    nivel_estres?: string
  
    // 6. FUNCIÓN DIGESTIVA
    apetito?: string
    digestion?: string
    evacuaciones?: string
    frecuencia_evacuaciones?: string
    consistencia_evacuaciones?: string
    cambios_evacuaciones?: string
    nauseas_vomitos?: string
    reflujo?: string
  
    // 7. FUNCIÓN URINARIA
    frecuencia_urinaria?: string
    dolor_urinar?: string
    incontinencia?: string
    cambios_color_orina?: string
    cambios_olor_orina?: string
  
    // 8. FUNCIÓN CARDIOVASCULAR Y RESPIRATORIA
    palpitaciones?: string
    disnea?: string
    dolor_toracico?: string
    tos?: string
    esputo?: string
  
    // 9. FUNCIÓN MUSCULOESQUELÉTICA
    dolor_articular?: string
    dolor_muscular?: string
    limitaciones_movimiento?: string
    debilidad_fatiga?: string
  
    // 10. FUNCIÓN NEUROLÓGICA
    mareos_vertigo?: string
    perdida_sensibilidad?: string
    perdida_fuerza?: string
    cefaleas?: string
    alteraciones_visuales?: string
    alteraciones_auditivas?: string
  
    // 11. FUNCIÓN PSICOLÓGICA/EMOCIONAL
    estado_animo?: string
    ansiedad?: string
    depresion?: string
    cambios_conducta?: string
    trastornos_sueno?: string
  
    // 12. REVISIÓN POR SISTEMAS
    sistemas_cutaneo?: string
    sistema_endocrino?: string
    sistema_hematologico?: string
  
    // EXPLORACIÓN FÍSICA
    tension_arterial?: string
    frecuencia_cardiaca?: string
    frecuencia_respiratoria?: string
    temperatura?: string
    saturacion_o2?: string
    peso?: string
    talla?: string
    imc?: string
    observaciones_clinicas?: string
  
    // PRUEBAS COMPLEMENTARIAS
    pruebas_complementarias?: string
  
    // DIAGNÓSTICO Y TRATAMIENTO
    diagnostico?: string
    medicacion?: string
    recomendaciones?: string
    derivaciones?: string
    seguimiento?: string
    observaciones_adicionales?: string
  
    // CAMPOS PERSONALIZADOS
    campos_personalizados?: any[]
  
    // METADATOS
    profesional_nombre?: string
    is_active?: boolean
    version?: number
  }
  
  export interface MedicalAlert {
    id: number
    created_at: string
    updated_at: string
    client_id: number
    medical_history_id?: number
    alert_type: "allergy" | "medication" | "condition" | "emergency"
    severity: "low" | "medium" | "high" | "critical"
    title: string
    description?: string
    is_active: boolean
    expires_at?: string
    created_by?: number
    organization_id: number
  }
  
  export interface MedicalHistoryTemplate {
    id: number
    created_at: string
    updated_at: string
    name: string
    description?: string
    organization_id: number
    created_by?: number
    template_config: any
    custom_fields: any[]
    enabled_sections: {
      motivo: boolean
      enfermedad: boolean
      antecedentes: boolean
      habitos: boolean
      sistemas: boolean
      neuropsico: boolean
      exploracion: boolean
      diagnostico: boolean
    }
    is_active: boolean
    is_default: boolean
  }
  
  export interface MedicalHistoryVersion {
    id: number
    created_at: string
    medical_history_id: number
    version_number: number
    changed_by?: number
    change_reason?: string
    data: any
    changed_fields: string[]
  }
  
  // Tipos para el componente React
  export interface CampoPersonalizado {
    id: string
    titulo: string
    subtitulo: string
    descripcion: string
    seccion: string
    orden: number
  }
  
  export interface HistorialMedicoCompleto {
    // Todos los campos en camelCase para el frontend
    motivoConsulta: string
    tiempoEvolucion: string
    descripcionDetallada: string
    inicioEvolucion: string
    factoresAgravantes: string
    factoresAtenuantes: string
    intensidadSintomas: string
    frecuenciaSintomas: string
    localizacion: string
    impactoVidaDiaria: string
    enfermedadesCronicas: string
    enfermedadesAgudas: string
    cirugiasPrevias: string
    alergiasMedicamentosas: string
    alergiasAlimentarias: string
    alergiasAmbientales: string
    medicacionHabitual: string
    hospitalizacionesPrevias: string
    accidentesTraumatismos: string
    enfermedadesHereditarias: string
    patologiasPadres: string
    patologiasHermanos: string
    patologiasAbuelos: string
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
    apetito: string
    digestion: string
    evacuaciones: string
    frecuenciaEvacuaciones: string
    consistenciaEvacuaciones: string
    cambiosEvacuaciones: string
    nauseasVomitos: string
    reflujo: string
    frecuenciaUrinaria: string
    dolorUrinar: string
    incontinencia: string
    cambiosColorOrina: string
    cambiosOlorOrina: string
    palpitaciones: string
    disnea: string
    dolorToracico: string
    tos: string
    esputo: string
    dolorArticular: string
    dolorMuscular: string
    limitacionesMovimiento: string
    debilidadFatiga: string
    mareosVertigo: string
    perdidaSensibilidad: string
    perdidaFuerza: string
    cefaleas: string
    alteracionesVisuales: string
    alteracionesAuditivas: string
    estadoAnimo: string
    ansiedad: string
    depresion: string
    cambiosConducta: string
    trastornosSueno: string
    sistemasCutaneo: string
    sistemaEndocrino: string
    sistemaHematologico: string
    tensionArterial: string
    frecuenciaCardiaca: string
    frecuenciaRespiratoria: string
    temperatura: string
    saturacionO2: string
    peso: string
    talla: string
    imc: string
    observacionesClinicas: string
    pruebasComplementarias: string
    diagnostico: string
    medicacion: string
    recomendaciones: string
    derivaciones: string
    seguimiento: string
    observacionesAdicionales: string
    camposPersonalizados: CampoPersonalizado[]
    fechaCreacion: string
    profesional: string
    ultimaActualizacion: string
  }
  