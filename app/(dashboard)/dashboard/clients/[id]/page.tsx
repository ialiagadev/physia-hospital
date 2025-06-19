"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import { getMedicalHistory, saveMedicalHistory, type MedicalHistoryData } from "@/lib/actions/medical-history"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DatePicker } from "@/components/ui/date-picker"
import { PhysiaCard } from "@/components/loyalty-card/physia-card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CreditCard } from 'lucide-react'
import { LoyaltyCardsSection } from "@/components/loyalty-cards-section"
import { User, Phone, Mail, MapPin, Calendar, FileText, Edit, CalendarDays, FolderOpen, TrendingUp, Activity, Eye, Coffee, Shield, Brain, Heart, Stethoscope, Save, X, AlertTriangle, Pill, Users, Plus, Trash2, ChevronDown, ChevronUp, Utensils, Droplets, Zap } from 'lucide-react'
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { PatientFollowUpSection } from "@/components/patient-follow-up-section"
import { LoyaltyCardService } from "@/lib/loyalty-card-service"
import type { LoyaltyCard, CardSession, CardFormData } from "@/types/loyalty-cards"

interface CampoPersonalizado {
  id: string
  titulo: string
  subtitulo: string
  descripcion: string
  seccion: string
  orden: number
}

interface HistorialMedicoCompleto {
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
  camposPersonalizados: CampoPersonalizado[]

  // METADATOS
  fechaCreacion: string
  profesional: string
  ultimaActualizacion: string
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const clientId = params.id

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState("resumen")

  // Estados para historial médico
  const [isEditingMedical, setIsEditingMedical] = useState(false)
  const [medicalTab, setMedicalTab] = useState("motivo")
  const [showAddField, setShowAddField] = useState<string | null>(null)
  const [newField, setNewField] = useState({
    titulo: "",
    subtitulo: "",
    descripcion: "",
  })
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({})

  const [clinicalStats, setClinicalStats] = useState({
    totalRecords: 0,
    activeRecords: 0,
    lastVisit: null as string | null,
    nextAppointment: null as string | null,
  })

  const [formData, setFormData] = useState({
    organization_id: "",
    name: "",
    tax_id: "",
    address: "",
    postal_code: "",
    city: "",
    province: "",
    country: "España",
    client_type: "private",
    email: "",
    phone: "",
    birth_date: "", // Agregar este campo
    gender: "", // Opcional: también puedes agregar género
    dir3_codes: {
      CentroGestor: "",
      UnidadTramitadora: "",
      OficinaContable: "",
    },
  })

  // Historial médico completo
  const historialVacio: HistorialMedicoCompleto = {
    // Motivo de consulta
    motivoConsulta: "",
    tiempoEvolucion: "",

    // Enfermedad actual
    descripcionDetallada: "",
    inicioEvolucion: "",
    factoresAgravantes: "",
    factoresAtenuantes: "",
    intensidadSintomas: "",
    frecuenciaSintomas: "",
    localizacion: "",
    impactoVidaDiaria: "",

    // Antecedentes personales
    enfermedadesCronicas: "",
    enfermedadesAgudas: "",
    cirugiasPrevias: "",
    alergiasMedicamentosas: "",
    alergiasAlimentarias: "",
    alergiasAmbientales: "",
    medicacionHabitual: "",
    hospitalizacionesPrevias: "",
    accidentesTraumatismos: "",

    // Antecedentes familiares
    enfermedadesHereditarias: "",
    patologiasPadres: "",
    patologiasHermanos: "",
    patologiasAbuelos: "",

    // Hábitos y estilo de vida
    alimentacion: "",
    actividadFisica: "",
    consumoTabaco: false,
    cantidadTabaco: "",
    tiempoTabaco: "",
    consumoAlcohol: false,
    cantidadAlcohol: "",
    frecuenciaAlcohol: "",
    otrasSustancias: "",
    calidadSueno: "",
    horasSueno: "",
    nivelEstres: "",

    // Función digestiva
    apetito: "",
    digestion: "",
    evacuaciones: "",
    frecuenciaEvacuaciones: "",
    consistenciaEvacuaciones: "",
    cambiosEvacuaciones: "",
    nauseasVomitos: "",
    reflujo: "",

    // Función urinaria
    frecuenciaUrinaria: "",
    dolorUrinar: "",
    incontinencia: "",
    cambiosColorOrina: "",
    cambiosOlorOrina: "",

    // Función cardiovascular y respiratoria
    palpitaciones: "",
    disnea: "",
    dolorToracico: "",
    tos: "",
    esputo: "",

    // Función musculoesquelética
    dolorArticular: "",
    dolorMuscular: "",
    limitacionesMovimiento: "",
    debilidadFatiga: "",

    // Función neurológica
    mareosVertigo: "",
    perdidaSensibilidad: "",
    perdidaFuerza: "",
    cefaleas: "",
    alteracionesVisuales: "",
    alteracionesAuditivas: "",

    // Función psicológica/emocional
    estadoAnimo: "",
    ansiedad: "",
    depresion: "",
    cambiosConducta: "",
    trastornosSueno: "",

    // Revisión por sistemas
    sistemasCutaneo: "",
    sistemaEndocrino: "",
    sistemaHematologico: "",

    // EXPLORACIÓN FÍSICA
    tensionArterial: "",
    frecuenciaCardiaca: "",
    frecuenciaRespiratoria: "",
    temperatura: "",
    saturacionO2: "",
    peso: "",
    talla: "",
    imc: "",
    observacionesClinicas: "",

    // PRUEBAS COMPLEMENTARIAS
    pruebasComplementarias: "",

    // DIAGNÓSTICO Y TRATAMIENTO
    diagnostico: "",
    medicacion: "",
    recomendaciones: "",
    derivaciones: "",
    seguimiento: "",
    observacionesAdicionales: "",

    // CAMPOS PERSONALIZADOS
    camposPersonalizados: [],

    // METADATOS
    fechaCreacion: "",
    profesional: "",
    ultimaActualizacion: "",
  }

  const [historial, setHistorial] = useState<HistorialMedicoCompleto>(historialVacio)
  const [originalHistorial, setOriginalHistorial] = useState<HistorialMedicoCompleto>(historialVacio)

  // Función para convertir datos de DB a formato del componente
  const convertDbToComponent = (dbData: any): HistorialMedicoCompleto => {
    return {
      motivoConsulta: dbData.motivo_consulta || "",
      tiempoEvolucion: dbData.tiempo_evolucion || "",
      descripcionDetallada: dbData.descripcion_detallada || "",
      inicioEvolucion: dbData.inicio_evolucion || "",
      factoresAgravantes: dbData.factores_agravantes || "",
      factoresAtenuantes: dbData.factores_atenuantes || "",
      intensidadSintomas: dbData.intensidad_sintomas || "",
      frecuenciaSintomas: dbData.frecuencia_sintomas || "",
      localizacion: dbData.localizacion || "",
      impactoVidaDiaria: dbData.impacto_vida_diaria || "",

      enfermedadesCronicas: dbData.enfermedades_cronicas || "",
      enfermedadesAgudas: dbData.enfermedades_agudas || "",
      cirugiasPrevias: dbData.cirugias_previas || "",
      alergiasMedicamentosas: dbData.alergias_medicamentosas || "",
      alergiasAlimentarias: dbData.alergias_alimentarias || "",
      alergiasAmbientales: dbData.alergias_ambientales || "",
      medicacionHabitual: dbData.medicacion_habitual || "",
      hospitalizacionesPrevias: dbData.hospitalizaciones_previas || "",
      accidentesTraumatismos: dbData.accidentes_traumatismos || "",

      enfermedadesHereditarias: dbData.enfermedades_hereditarias || "",
      patologiasPadres: dbData.patologias_padres || "",
      patologiasHermanos: dbData.patologias_hermanos || "",
      patologiasAbuelos: dbData.patologias_de_abuelos || "",

      alimentacion: dbData.alimentacion || "",
      actividadFisica: dbData.actividad_fisica || "",
      consumoTabaco: dbData.consumo_tabaco || false,
      cantidadTabaco: dbData.cantidad_tabaco || "",
      tiempoTabaco: dbData.tiempo_tabaco || "",
      consumoAlcohol: dbData.consumo_alcohol || false,
      cantidadAlcohol: dbData.cantidad_alcohol || "",
      frecuenciaAlcohol: dbData.frecuencia_alcohol || "",
      otrasSustancias: dbData.otras_sustancias || "",
      calidadSueno: dbData.calidad_sueno || "",
      horasSueno: dbData.horas_sueno || "",
      nivelEstres: dbData.nivel_estres || "",

      apetito: dbData.apetito || "",
      digestion: dbData.digestion || "",
      evacuaciones: dbData.evacuaciones || "",
      frecuenciaEvacuaciones: dbData.frecuencia_evacuaciones || "",
      consistenciaEvacuaciones: dbData.consistencia_evacuaciones || "",
      cambiosEvacuaciones: dbData.cambios_evacuaciones || "",
      nauseasVomitos: dbData.nauseas_vomitos || "",
      reflujo: dbData.reflujo || "",

      frecuenciaUrinaria: dbData.frecuencia_urinaria || "",
      dolorUrinar: dbData.dolor_urinar || "",
      incontinencia: dbData.incontinencia || "",
      cambiosColorOrina: dbData.cambios_color_orina || "",
      cambiosOlorOrina: dbData.cambios_olor_orina || "",

      palpitaciones: dbData.palpitaciones || "",
      disnea: dbData.disnea || "",
      dolorToracico: dbData.dolor_toracico || "",
      tos: dbData.tos || "",
      esputo: dbData.esputo || "",

      dolorArticular: dbData.dolor_articular || "",
      dolorMuscular: dbData.dolor_muscular || "",
      limitacionesMovimiento: dbData.limitaciones_movimiento || "",
      debilidadFatiga: dbData.debilidad_fatiga || "",

      mareosVertigo: dbData.mareos_vertigo || "",
      perdidaSensibilidad: dbData.perdida_sensibilidad || "",
      perdidaFuerza: dbData.perdida_fuerza || "",
      cefaleas: dbData.cefaleas || "",
      alteracionesVisuales: dbData.alteraciones_visuales || "",
      alteracionesAuditivas: dbData.alteraciones_auditivas || "",

      estadoAnimo: dbData.estado_animo || "",
      ansiedad: dbData.ansiedad || "",
      depresion: dbData.depresion || "",
      cambiosConducta: dbData.cambios_conducta || "",
      trastornosSueno: dbData.trastornos_sueno || "",

      sistemasCutaneo: dbData.sistemas_cutaneo || "",
      sistemaEndocrino: dbData.sistema_endocrino || "",
      sistemaHematologico: dbData.sistema_hematologico || "",

      tensionArterial: dbData.tension_arterial || "",
      frecuenciaCardiaca: dbData.frecuencia_cardiaca || "",
      frecuenciaRespiratoria: dbData.frecuencia_respiratoria || "",
      temperatura: dbData.temperatura || "",
      saturacionO2: dbData.saturacion_o2 || "",
      peso: dbData.peso || "",
      talla: dbData.talla || "",
      imc: dbData.imc || "",
      observacionesClinicas: dbData.observaciones_clinicas || "",

      pruebasComplementarias: dbData.pruebas_complementarias || "",

      diagnostico: dbData.diagnostico || "",
      medicacion: dbData.medicacion || "",
      recomendaciones: dbData.recomendaciones || "",
      derivaciones: dbData.derivaciones || "",
      seguimiento: dbData.seguimiento || "",
      observacionesAdicionales: dbData.observaciones_adicionales || "",

      camposPersonalizados: dbData.campos_personalizados || [],

      fechaCreacion: dbData.created_at || new Date().toISOString(),
      profesional: dbData.profesional_nombre || userProfile?.name || "Dr. Usuario",
      ultimaActualizacion: dbData.updated_at || new Date().toISOString(),
    }
  }

  // Función para convertir datos del componente a formato de DB
  const convertComponentToDb = (componentData: HistorialMedicoCompleto): MedicalHistoryData => {
    return {
      motivoConsulta: componentData.motivoConsulta,
      tiempoEvolucion: componentData.tiempoEvolucion,
      descripcionDetallada: componentData.descripcionDetallada,
      inicioEvolucion: componentData.inicioEvolucion,
      factoresAgravantes: componentData.factoresAgravantes,
      factoresAtenuantes: componentData.factoresAtenuantes,
      intensidadSintomas: componentData.intensidadSintomas,
      frecuenciaSintomas: componentData.frecuenciaSintomas,
      localizacion: componentData.localizacion,
      impactoVidaDiaria: componentData.impactoVidaDiaria,

      enfermedadesCronicas: componentData.enfermedadesCronicas,
      enfermedadesAgudas: componentData.enfermedadesAgudas,
      cirugiasPrevias: componentData.cirugiasPrevias,
      alergiasMedicamentosas: componentData.alergiasMedicamentosas,
      alergiasAlimentarias: componentData.alergiasAlimentarias,
      alergiasAmbientales: componentData.alergiasAmbientales,
      medicacionHabitual: componentData.medicacionHabitual,
      hospitalizacionesPrevias: componentData.hospitalizacionesPrevias,
      accidentesTraumatismos: componentData.accidentesTraumatismos,

      enfermedadesHereditarias: componentData.enfermedadesHereditarias,
      patologiasPadres: componentData.patologiasPadres,
      patologiasHermanos: componentData.patologiasHermanos,
      patologiasAbuelos: componentData.patologiasAbuelos,

      alimentacion: componentData.alimentacion,
      actividadFisica: componentData.actividadFisica,
      consumoTabaco: componentData.consumoTabaco,
      cantidadTabaco: componentData.cantidadTabaco,
      tiempoTabaco: componentData.tiempoTabaco,
      consumoAlcohol: componentData.consumoAlcohol,
      cantidadAlcohol: componentData.cantidadAlcohol,
      frecuenciaAlcohol: componentData.frecuenciaAlcohol,
      otrasSustancias: componentData.otrasSustancias,
      calidadSueno: componentData.calidadSueno,
      horasSueno: componentData.horasSueno,
      nivelEstres: componentData.nivelEstres,

      apetito: componentData.apetito,
      digestion: componentData.digestion,
      evacuaciones: componentData.evacuaciones,
      frecuenciaEvacuaciones: componentData.frecuenciaEvacuaciones,
      consistenciaEvacuaciones: componentData.consistenciaEvacuaciones,
      cambiosEvacuaciones: componentData.cambiosEvacuaciones,
      nauseasVomitos: componentData.nauseasVomitos,
      reflujo: componentData.reflujo,

      frecuenciaUrinaria: componentData.frecuenciaUrinaria,
      dolorUrinar: componentData.dolorUrinar,
      incontinencia: componentData.incontinencia,
      cambiosColorOrina: componentData.cambiosColorOrina,
      cambiosOlorOrina: componentData.cambiosOlorOrina,

      palpitaciones: componentData.palpitaciones,
      disnea: componentData.disnea,
      dolorToracico: componentData.dolorToracico,
      tos: componentData.tos,
      esputo: componentData.esputo,

      dolorArticular: componentData.dolorArticular,
      dolorMuscular: componentData.dolorMuscular,
      limitacionesMovimiento: componentData.limitacionesMovimiento,
      debilidadFatiga: componentData.debilidadFatiga,

      mareosVertigo: componentData.mareosVertigo,
      perdidaSensibilidad: componentData.perdidaSensibilidad,
      perdidaFuerza: componentData.perdidaFuerza,
      cefaleas: componentData.cefaleas,
      alteracionesVisuales: componentData.alteracionesVisuales,
      alteracionesAuditivas: componentData.alteracionesAuditivas,

      estadoAnimo: componentData.estadoAnimo,
      ansiedad: componentData.ansiedad,
      depresion: componentData.depresion,
      cambiosConducta: componentData.cambiosConducta,
      trastornosSueno: componentData.trastornosSueno,

      sistemasCutaneo: componentData.sistemasCutaneo,
      sistemaEndocrino: componentData.sistemaEndocrino,
      sistemaHematologico: componentData.sistemaHematologico,

      tensionArterial: componentData.tensionArterial,
      frecuenciaCardiaca: componentData.frecuenciaCardiaca,
      frecuenciaRespiratoria: componentData.frecuenciaRespiratoria,
      temperatura: componentData.temperatura,
      saturacionO2: componentData.saturacionO2,
      peso: componentData.peso,
      talla: componentData.talla,
      imc: componentData.imc,
      observacionesClinicas: componentData.observacionesClinicas,

      pruebasComplementarias: componentData.pruebasComplementarias,

      diagnostico: componentData.diagnostico,
      medicacion: componentData.medicacion,
      recomendaciones: componentData.recomendaciones,
      derivaciones: componentData.derivaciones,
      seguimiento: componentData.seguimiento,
      observacionesAdicionales: componentData.observacionesAdicionales,

      camposPersonalizados: componentData.camposPersonalizados,
      profesionalNombre: userProfile?.name || "Dr. Usuario",
    }
  }

  // Función para formatear fechas
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sin fecha"
    try {
      const date = new Date(dateString)
      return format(date, "dd/MM/yyyy", { locale: es })
    } catch (error) {
      return "Fecha no válida"
    }
  }

  // Función para calcular edad
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return "No especificada"
    try {
      const birth = new Date(birthDate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      return `${age} años`
    } catch (error) {
      return "No especificada"
    }
  }

  // Cargar datos del cliente y organizaciones
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Cargar organizaciones
        const { data: orgsData } = await supabase.from("organizations").select("id, name").order("name")
        if (orgsData) {
          setOrganizations(orgsData)
        }

        // Cargar datos del cliente
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .single()

        if (clientError) {
          throw new Error("No se pudo cargar la información del cliente")
        }

        if (clientData) {
          setFormData({
            organization_id: clientData.organization_id.toString(),
            name: clientData.name || "",
            tax_id: clientData.tax_id || "",
            address: clientData.address || "",
            postal_code: clientData.postal_code || "",
            city: clientData.city || "",
            province: clientData.province || "",
            country: clientData.country || "España",
            client_type: clientData.client_type || "private",
            email: clientData.email || "",
            phone: clientData.phone || "",
            birth_date: clientData.birth_date || "", // Agregar este campo
            gender: clientData.gender || "", // Opcional
            dir3_codes: clientData.dir3_codes || {
              CentroGestor: "",
              UnidadTramitadora: "",
              OficinaContable: "",
            },
          })

          // Cargar historial médico desde la base de datos
          const { data: medicalData } = await getMedicalHistory(clientId)

          if (medicalData) {
            const convertedData = convertDbToComponent(medicalData)
            setHistorial(convertedData)
            setOriginalHistorial(convertedData)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar los datos")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [clientId])

  // Función para calcular IMC automáticamente
  useEffect(() => {
    if (historial.peso && historial.talla) {
      const peso = Number.parseFloat(historial.peso)
      const talla = Number.parseFloat(historial.talla) / 100 // convertir cm a metros
      if (peso > 0 && talla > 0) {
        const imc = (peso / (talla * talla)).toFixed(1)
        if (historial.imc !== imc) {
          setHistorial((prev) => ({ ...prev, imc }))
        }
      }
    }
  }, [historial.peso, historial.talla])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDir3Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      dir3_codes: { ...prev.dir3_codes, [name]: value },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      if (!formData.organization_id) {
        throw new Error("Debes seleccionar una organización")
      }

      const { error: updateError } = await supabase
        .from("clients")
        .update({
          organization_id: Number.parseInt(formData.organization_id),
          name: formData.name,
          tax_id: formData.tax_id,
          address: formData.address,
          postal_code: formData.postal_code,
          city: formData.city,
          province: formData.province,
          country: formData.country,
          client_type: formData.client_type,
          email: formData.email || null,
          phone: formData.phone || null,
          birth_date: formData.birth_date || null, // Agregar este campo
          gender: formData.gender || null, // Opcional
          dir3_codes: formData.client_type === "public" ? formData.dir3_codes : null,
        })
        .eq("id", clientId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el cliente")
    } finally {
      setIsSaving(false)
    }
  }

  // Funciones para el historial médico
  const updateMedicalField = (field: keyof HistorialMedicoCompleto, value: string | boolean) => {
    setHistorial((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Función para guardar historial médico
  const handleSaveMedical = async () => {
    setIsSaving(true)
    try {
      const dbData = convertComponentToDb(historial)
      const { data, error } = await saveMedicalHistory(clientId, dbData)

      if (error) {
        throw new Error(error)
      }

      setOriginalHistorial(historial)
      setIsEditingMedical(false)

      toast({
        title: "Guardado exitoso",
        description: "El historial médico se ha guardado correctamente",
      })
    } catch (error) {
      console.error("Error al guardar historial médico:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el historial médico",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelMedical = () => {
    setHistorial(originalHistorial)
    setIsEditingMedical(false)
    setShowAddField(null)
    setNewField({ titulo: "", subtitulo: "", descripcion: "" })
  }

  const addCustomField = (seccion: string) => {
    if (!newField.titulo.trim()) {
      toast({
        title: "Campo requerido",
        description: "El título es obligatorio",
        variant: "destructive",
      })
      return
    }

    const nuevoCampo: CampoPersonalizado = {
      id: `campo_${Date.now()}`,
      titulo: newField.titulo,
      subtitulo: newField.subtitulo,
      descripcion: newField.descripcion,
      seccion,
      orden: historial.camposPersonalizados.filter((c) => c.seccion === seccion).length + 1,
    }

    setHistorial((prev) => ({
      ...prev,
      camposPersonalizados: [...prev.camposPersonalizados, nuevoCampo],
    }))

    setNewField({ titulo: "", subtitulo: "", descripcion: "" })
    setShowAddField(null)

    toast({
      title: "Campo añadido",
      description: "El nuevo campo se ha añadido correctamente",
    })
  }

  const updateCustomField = (id: string, field: keyof CampoPersonalizado, value: string) => {
    setHistorial((prev) => ({
      ...prev,
      camposPersonalizados: prev.camposPersonalizados.map((campo) =>
        campo.id === id ? { ...campo, [field]: value } : campo,
      ),
    }))
  }

  const deleteCustomField = (id: string) => {
    setHistorial((prev) => ({
      ...prev,
      camposPersonalizados: prev.camposPersonalizados.filter((campo) => campo.id !== id),
    }))

    toast({
      title: "Campo eliminado",
      description: "El campo personalizado se ha eliminado",
    })
  }

  const toggleFieldExpansion = (id: string) => {
    setExpandedFields((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const renderCustomFields = (seccion: string) => {
    const camposSeccion = historial.camposPersonalizados
      .filter((campo) => campo.seccion === seccion)
      .sort((a, b) => a.orden - b.orden)

    return (
      <div className="space-y-4">
        {camposSeccion.map((campo) => (
          <Card key={campo.id} className="border-l-4 border-indigo-500 bg-indigo-50">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-indigo-900">
                      {isEditingMedical ? (
                        <Input
                          value={campo.titulo}
                          onChange={(e) => updateCustomField(campo.id, "titulo", e.target.value)}
                          className="font-medium border-indigo-200 bg-white"
                        />
                      ) : (
                        campo.titulo
                      )}
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleFieldExpansion(campo.id)}
                      className="h-6 w-6 p-0"
                    >
                      {expandedFields[campo.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {campo.subtitulo && (
                    <p className="text-sm text-indigo-700 mt-1">
                      {isEditingMedical ? (
                        <Input
                          value={campo.subtitulo}
                          onChange={(e) => updateCustomField(campo.id, "subtitulo", e.target.value)}
                          className="text-sm border-indigo-200 bg-white"
                          placeholder="Subtítulo (opcional)"
                        />
                      ) : (
                        campo.subtitulo
                      )}
                    </p>
                  )}
                </div>
                {isEditingMedical && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteCustomField(campo.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            {(expandedFields[campo.id] || isEditingMedical) && (
              <CardContent className="pt-0 px-4 pb-4">
                {isEditingMedical ? (
                  <Textarea
                    value={campo.descripcion}
                    onChange={(e) => updateCustomField(campo.id, "descripcion", e.target.value)}
                    placeholder="Descripción del campo..."
                    className="border-indigo-200 bg-white"
                    rows={3}
                  />
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-indigo-200">
                    {campo.descripcion || "Sin descripción"}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))}

        {/* Formulario para añadir nuevo campo */}
        {isEditingMedical && (
          <div className="space-y-4">
            {showAddField === seccion ? (
              <Card className="border-2 border-dashed border-indigo-300 bg-indigo-50">
                <CardHeader>
                  <CardTitle className="text-indigo-800">Nuevo Campo Personalizado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-indigo-700 mb-1">
                      Título <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={newField.titulo}
                      onChange={(e) => setNewField({ ...newField, titulo: e.target.value })}
                      placeholder="Ej: Escala de Dolor, Síntomas Específicos..."
                      className="border-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-700 mb-1">Subtítulo (opcional)</label>
                    <Input
                      value={newField.subtitulo}
                      onChange={(e) => setNewField({ ...newField, subtitulo: e.target.value })}
                      placeholder="Ej: Evaluación según escala EVA..."
                      className="border-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-indigo-700 mb-1">Descripción</label>
                    <Textarea
                      value={newField.descripcion}
                      onChange={(e) => setNewField({ ...newField, descripcion: e.target.value })}
                      placeholder="Información detallada del campo..."
                      className="border-indigo-200"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => addCustomField(seccion)} className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Campo
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddField(null)
                        setNewField({ titulo: "", subtitulo: "", descripcion: "" })
                      }}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button
                onClick={() => setShowAddField(seccion)}
                variant="outline"
                className="w-full border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir Campo Personalizado
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Clientes", href: "/dashboard/facturacion/clients" },
    { label: formData.name, href: `/dashboard/facturacion/clients/${clientId}` },
  ]

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex justify-between items-center mb-6 mt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{formData.name}</h1>
          <p className="text-gray-500 mt-1">ID: {formData.tax_id}</p>
        </div>
        {!isEditing && activeTab === "resumen" && (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Cliente
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-7">
       <TabsTrigger value="resumen" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="informacion-personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Información Personal
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Historial Médico
          </TabsTrigger>
          <TabsTrigger value="seguimiento" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Seguimiento
          </TabsTrigger>
          <TabsTrigger value="loyalty-cards" className="flex items-center gap-2">
           <CreditCard className="h-4 w-4" />
             Tarjetas
          </TabsTrigger>
          <TabsTrigger value="citas" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Citas
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Documentos
          </TabsTrigger>
        </TabsList>

        {/* Pestaña Resumen */}
        <TabsContent value="resumen" className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Información Personal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" />
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-500">Nombre completo</Label>
                  {isEditing ? (
                    <Input name="name" value={formData.name} onChange={handleChange} required className="mt-1" />
                  ) : (
                    <p className="font-medium mt-1">{formData.name}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Fecha de nacimiento</Label>
                  {isEditing ? (
                    <Input
                      name="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={handleChange}
                      className="mt-1"
                    />
                  ) : (
                    <p className="font-medium mt-1">{formatDate(formData.birth_date)}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Edad</Label>
                  <p className="font-medium mt-1">{calculateAge(formData.birth_date)}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">ID Paciente</Label>
                  {isEditing ? (
                    <Input name="tax_id" value={formData.tax_id} onChange={handleChange} required className="mt-1" />
                  ) : (
                    <p className="font-medium mt-1">{formData.tax_id}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Tipo de Cliente</Label>
                  {isEditing ? (
                    <RadioGroup
                      value={formData.client_type}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, client_type: value }))}
                      className="flex space-x-4 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="private" id="private" />
                        <Label htmlFor="private">Privado</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="public" />
                        <Label htmlFor="public">Administración Pública</Label>
                      </div>
                    </RadioGroup>
                  ) : (
                    <p className="font-medium mt-1">
                      {formData.client_type === "public" ? "Administración Pública" : "Privado"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información de Contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-green-500" />
                  Información de Contacto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Teléfono
                  </Label>
                  {isEditing ? (
                    <Input name="phone" value={formData.phone} onChange={handleChange} className="mt-1" />
                  ) : (
                    <p className="font-medium mt-1">{formData.phone || "No registrado"}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-500 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  {isEditing ? (
                    <Input name="email" type="email" value={formData.email} onChange={handleChange} className="mt-1" />
                  ) : (
                    <p className="font-medium mt-1">{formData.email || "No registrado"}</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Dirección
                  </Label>
                  {isEditing ? (
                    <Textarea name="address" value={formData.address} onChange={handleChange} className="mt-1" />
                  ) : (
                    <p className="font-medium mt-1">{formData.address || "No registrada"}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm text-gray-500">Código Postal</Label>
                      <Input name="postal_code" value={formData.postal_code} onChange={handleChange} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Ciudad</Label>
                      <Input name="city" value={formData.city} onChange={handleChange} className="mt-1" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Historial de Visitas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Historial de Visitas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-500">Última visita</Label>
                  <p className="font-medium mt-1">{formatDate(clinicalStats.lastVisit)}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Próxima cita</Label>
                  <p className="font-medium mt-1 text-green-600">
                    {clinicalStats.nextAppointment ? formatDate(clinicalStats.nextAppointment) : "No programada"}
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Total de historias</Label>
                  <p className="font-medium mt-1">{clinicalStats.totalRecords}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Historias activas</Label>
                  <p className="font-medium mt-1">{clinicalStats.activeRecords}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botones de acción para el resumen */}
          {isEditing && (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit}>
                  {formData.client_type === "public" && (
                    <div className="space-y-4 border p-4 rounded-md mb-4">
                      <h3 className="font-medium">Códigos DIR3</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="CentroGestor">Centro Gestor</Label>
                          <Input
                            id="CentroGestor"
                            name="CentroGestor"
                            value={formData.dir3_codes.CentroGestor}
                            onChange={handleDir3Change}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="UnidadTramitadora">Unidad Tramitadora</Label>
                          <Input
                            id="UnidadTramitadora"
                            name="UnidadTramitadora"
                            value={formData.dir3_codes.UnidadTramitadora}
                            onChange={handleDir3Change}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="OficinaContable">Oficina Contable</Label>
                          <Input
                            id="OficinaContable"
                            name="OficinaContable"
                            value={formData.dir3_codes.OficinaContable}
                            onChange={handleDir3Change}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pestaña Información Personal */}
      <TabsContent value="informacion-personal" className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Información del cliente</CardTitle>
              <CardDescription>Introduce los datos del cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="organization_id" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Organización
                </Label>
                {isEditing ? (
                  <Select
                    value={formData.organization_id}
                    onValueChange={(value) => handleSelectChange("organization_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una organización" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {organizations.find((org) => org.id.toString() === formData.organization_id)?.name ||
                        "No asignada"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Nombre o Razón Social
                </Label>
                {isEditing ? (
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.name}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="tax_id" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  CIF/NIF
                </Label>
                {isEditing ? (
                  <Input id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleChange} required />
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.tax_id}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="address" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dirección
                </Label>
                {isEditing ? (
                  <Textarea id="address" name="address" value={formData.address} onChange={handleChange} required />
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.address || "No registrada"}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="postal_code" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Código Postal
                  </Label>
                  {isEditing ? (
                    <Input
                      id="postal_code"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.postal_code || "No registrado"}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="city" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ciudad
                  </Label>
                  {isEditing ? (
                    <Input id="city" name="city" value={formData.city} onChange={handleChange} required />
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.city || "No registrada"}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="province" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Provincia
                  </Label>
                  {isEditing ? (
                    <Input id="province" name="province" value={formData.province} onChange={handleChange} required />
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.province || "No registrada"}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="country" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    País
                  </Label>
                  {isEditing ? (
                    <Input id="country" name="country" value={formData.country} onChange={handleChange} required />
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.country}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email
                  </Label>
                  {isEditing ? (
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.email || "No registrado"}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Teléfono
                  </Label>
                  {isEditing ? (
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.phone || "No registrado"}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo de Cliente</Label>
                {isEditing ? (
                  <RadioGroup
                    value={formData.client_type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, client_type: value }))}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="private" id="private" />
                      <Label htmlFor="private">Privado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="public" id="public" />
                      <Label htmlFor="public">Administración Pública</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {formData.client_type === "public" ? "Administración Pública" : "Privado"}
                    </p>
                  </div>
                )}
              </div>

              {formData.client_type === "public" && (
                <div className="space-y-4 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 border-b border-blue-300 dark:border-blue-700 pb-2">
                    Códigos DIR3
                  </h3>
                  <div className="space-y-3">
                    <Label htmlFor="CentroGestor" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Centro Gestor
                    </Label>
                    {isEditing ? (
                      <Input
                        id="CentroGestor"
                        name="CentroGestor"
                        value={formData.dir3_codes.CentroGestor}
                        onChange={handleDir3Change}
                        required
                      />
                    ) : (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-md border">
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.dir3_codes.CentroGestor || "No registrado"}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="UnidadTramitadora" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Unidad Tramitadora
                    </Label>
                    {isEditing ? (
                      <Input
                        id="UnidadTramitadora"
                        name="UnidadTramitadora"
                        value={formData.dir3_codes.UnidadTramitadora}
                        onChange={handleDir3Change}
                        required
                      />
                    ) : (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-md border">
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.dir3_codes.UnidadTramitadora || "No registrado"}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="OficinaContable" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Oficina Contable
                    </Label>
                    {isEditing ? (
                      <Input
                        id="OficinaContable"
                        name="OficinaContable"
                        value={formData.dir3_codes.OficinaContable}
                        onChange={handleDir3Change}
                        required
                      />
                    ) : (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-md border">
                        <p className="text-base font-medium text-gray-900 dark:text-gray-100">{formData.dir3_codes.OficinaContable || "No registrado"}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            {isEditing && (
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar Cliente"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </form>

        {!isEditing && (
          <div className="flex justify-end">
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar Cliente
            </Button>
          </div>
        )}
      </TabsContent>
        {/* Pestaña Historial Médico */}
        <TabsContent value="historial" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Historial Médico Completo</h2>
            <div className="flex gap-2">
              {!isEditingMedical && (
                <Button onClick={() => setIsEditingMedical(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Historial
                </Button>
              )}
              {isEditingMedical && (
                <>
                  <Button onClick={handleSaveMedical} className="bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                  <Button onClick={handleCancelMedical} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>

          <Tabs value={medicalTab} onValueChange={setMedicalTab} className="w-full">
            <TabsList className="grid w-full grid-cols-8 mb-6 h-auto">
              <TabsTrigger value="motivo" className="flex flex-col items-center gap-1 p-3">
                <User className="w-4 h-4" />
                <span className="text-xs">Motivo</span>
              </TabsTrigger>
              <TabsTrigger value="enfermedad" className="flex flex-col items-center gap-1 p-3">
                <Activity className="w-4 h-4" />
                <span className="text-xs">Enfermedad</span>
              </TabsTrigger>
              <TabsTrigger value="antecedentes" className="flex flex-col items-center gap-1 p-3">
                <Users className="w-4 h-4" />
                <span className="text-xs">Antecedentes</span>
              </TabsTrigger>
              <TabsTrigger value="habitos" className="flex flex-col items-center gap-1 p-3">
                <Coffee className="w-4 h-4" />
                <span className="text-xs">Hábitos</span>
              </TabsTrigger>
              <TabsTrigger value="sistemas" className="flex flex-col items-center gap-1 p-3">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Sistemas</span>
              </TabsTrigger>
              <TabsTrigger value="neuropsico" className="flex flex-col items-center gap-1 p-3">
                <Brain className="w-4 h-4" />
                <span className="text-xs">Neuro/Psico</span>
              </TabsTrigger>
              <TabsTrigger value="exploracion" className="flex flex-col items-center gap-1 p-3">
                <Stethoscope className="w-4 h-4" />
                <span className="text-xs">Exploración</span>
              </TabsTrigger>
              <TabsTrigger value="diagnostico" className="flex flex-col items-center gap-1 p-3">
                <FileText className="w-4 h-4" />
                <span className="text-xs">Diagnóstico</span>
              </TabsTrigger>
            </TabsList>

            {/* Pestaña Motivo de Consulta */}
            <TabsContent value="motivo">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                      1. Motivo de Consulta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">¿Por qué acude hoy?</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.motivoConsulta}
                            onChange={(e) => updateMedicalField("motivoConsulta", e.target.value)}
                            placeholder="Descripción del motivo principal de consulta..."
                            className="min-h-24"
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.motivoConsulta || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ¿Desde cuándo presenta el problema?
                        </label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.tiempoEvolucion}
                            onChange={(e) => updateMedicalField("tiempoEvolucion", e.target.value)}
                            placeholder="Ej: 3 meses, 2 semanas, 1 año..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.tiempoEvolucion || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campos personalizados para motivo */}
                {renderCustomFields("motivo")}
              </div>
            </TabsContent>

            {/* Pestaña Enfermedad Actual */}
            <TabsContent value="enfermedad">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-red-600" />
                      2. Enfermedad Actual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción detallada del problema
                      </label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.descripcionDetallada}
                          onChange={(e) => updateMedicalField("descripcionDetallada", e.target.value)}
                          placeholder="Descripción completa de los síntomas, características, etc..."
                          className="min-h-32"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.descripcionDetallada || "No registrado"}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Inicio y evolución</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.inicioEvolucion}
                            onChange={(e) => updateMedicalField("inicioEvolucion", e.target.value)}
                            placeholder="Cómo comenzó y cómo ha evolucionado..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.inicioEvolucion || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Impacto en la vida diaria
                        </label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.impactoVidaDiaria}
                            onChange={(e) => updateMedicalField("impactoVidaDiaria", e.target.value)}
                            placeholder="Cómo afecta las actividades cotidianas..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.impactoVidaDiaria || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Factores agravantes</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.factoresAgravantes}
                            onChange={(e) => updateMedicalField("factoresAgravantes", e.target.value)}
                            placeholder="Qué empeora los síntomas..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.factoresAgravantes || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Factores atenuantes</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.factoresAtenuantes}
                            onChange={(e) => updateMedicalField("factoresAtenuantes", e.target.value)}
                            placeholder="Qué mejora los síntomas..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.factoresAtenuantes || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Intensidad</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.intensidadSintomas}
                            onChange={(e) => updateMedicalField("intensidadSintomas", e.target.value)}
                            placeholder="Ej: 7/10, leve, moderada..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.intensidadSintomas || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.frecuenciaSintomas}
                            onChange={(e) => updateMedicalField("frecuenciaSintomas", e.target.value)}
                            placeholder="Ej: 3 veces/semana, diario..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.frecuenciaSintomas || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Localización</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.localizacion}
                            onChange={(e) => updateMedicalField("localizacion", e.target.value)}
                            placeholder="Dónde se localiza..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.localizacion || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campos personalizados para enfermedad */}
                {renderCustomFields("enfermedad")}
              </div>
            </TabsContent>

            {/* Pestaña Antecedentes */}
            <TabsContent value="antecedentes">
              <div className="space-y-6">
                {/* Antecedentes Personales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-red-600" />
                      3. Antecedentes Personales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Enfermedades crónicas</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.enfermedadesCronicas}
                            onChange={(e) => updateMedicalField("enfermedadesCronicas", e.target.value)}
                            placeholder="Diabetes, hipertensión, asma..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.enfermedadesCronicas || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enfermedades agudas importantes
                        </label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.enfermedadesAgudas}
                            onChange={(e) => updateMedicalField("enfermedadesAgudas", e.target.value)}
                            placeholder="Infecciones graves, accidentes..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.enfermedadesAgudas || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Cirugías previas</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.cirugiasPrevias}
                          onChange={(e) => updateMedicalField("cirugiasPrevias", e.target.value)}
                          placeholder="Tipo de cirugía, fecha, complicaciones..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.cirugiasPrevias || "No registrado"}
                        </div>
                      )}
                    </div>

                    {/* Alergias */}
                    <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h4 className="font-medium text-red-700">Alergias</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-red-700 mb-2">Medicamentosas</label>
                          {isEditingMedical ? (
                            <Textarea
                              value={historial.alergiasMedicamentosas}
                              onChange={(e) => updateMedicalField("alergiasMedicamentosas", e.target.value)}
                              placeholder="Penicilina, aspirina..."
                              className="border-red-200 focus:border-red-400"
                            />
                          ) : (
                            <div className="p-3 bg-white rounded-lg border border-red-200">
                              {historial.alergiasMedicamentosas || "No registrado"}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-red-700 mb-2">Alimentarias</label>
                          {isEditingMedical ? (
                            <Textarea
                              value={historial.alergiasAlimentarias}
                              onChange={(e) => updateMedicalField("alergiasAlimentarias", e.target.value)}
                              placeholder="Frutos secos, mariscos..."
                              className="border-red-200 focus:border-red-400"
                            />
                          ) : (
                            <div className="p-3 bg-white rounded-lg border border-red-200">
                              {historial.alergiasAlimentarias || "No registrado"}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-red-700 mb-2">Ambientales</label>
                          {isEditingMedical ? (
                            <Textarea
                              value={historial.alergiasAmbientales}
                              onChange={(e) => updateMedicalField("alergiasAmbientales", e.target.value)}
                              placeholder="Polen, ácaros..."
                              className="border-red-200 focus:border-red-400"
                            />
                          ) : (
                            <div className="p-3 bg-white rounded-lg border border-red-200">
                              {historial.alergiasAmbientales || "No registrado"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Medicación habitual</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.medicacionHabitual}
                            onChange={(e) => updateMedicalField("medicacionHabitual", e.target.value)}
                            placeholder="Medicamentos que toma regularmente..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.medicacionHabitual || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hospitalizaciones previas
                        </label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.hospitalizacionesPrevias}
                            onChange={(e) => updateMedicalField("hospitalizacionesPrevias", e.target.value)}
                            placeholder="Motivo, fecha, duración..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.hospitalizacionesPrevias || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Accidentes o traumatismos</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.accidentesTraumatismos}
                          onChange={(e) => updateMedicalField("accidentesTraumatismos", e.target.value)}
                          placeholder="Fracturas, traumatismos craneoencefálicos..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.accidentesTraumatismos || "No registrado"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Antecedentes Familiares */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      4. Antecedentes Familiares
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Enfermedades hereditarias</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.enfermedadesHereditarias}
                          onChange={(e) => updateMedicalField("enfermedadesHereditarias", e.target.value)}
                          placeholder="Enfermedades con componente genético conocido..."
                          className="min-h-24"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.enfermedadesHereditarias || "No registrado"}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Patologías en padres</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.patologiasPadres}
                            onChange={(e) => updateMedicalField("patologiasPadres", e.target.value)}
                            placeholder="Enfermedades de padre y madre..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.patologiasPadres || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Patologías en hermanos</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.patologiasHermanos}
                            onChange={(e) => updateMedicalField("patologiasHermanos", e.target.value)}
                            placeholder="Enfermedades en hermanos..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.patologiasHermanos || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Patologías en abuelos</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.patologiasAbuelos}
                            onChange={(e) => updateMedicalField("patologiasAbuelos", e.target.value)}
                            placeholder="Enfermedades en abuelos..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.patologiasAbuelos || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campos personalizados para antecedentes */}
                {renderCustomFields("antecedentes")}
              </div>
            </TabsContent>

            {/* Pestaña Hábitos y Estilo de Vida */}
            <TabsContent value="habitos">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coffee className="w-5 h-5 text-orange-600" />
                      5. Hábitos y Estilo de Vida
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alimentación</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.alimentacion}
                            onChange={(e) => updateMedicalField("alimentacion", e.target.value)}
                            placeholder="Tipo de dieta, horarios, restricciones..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.alimentacion || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Actividad física</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.actividadFisica}
                            onChange={(e) => updateMedicalField("actividadFisica", e.target.value)}
                            placeholder="Tipo, frecuencia, intensidad..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.actividadFisica || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Consumo de sustancias */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <label className="block text-sm font-medium text-gray-700">Consumo de tabaco</label>
                        </div>
                        {isEditingMedical ? (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="tabaco"
                                checked={historial.consumoTabaco}
                                onCheckedChange={(checked) => updateMedicalField("consumoTabaco", checked as boolean)}
                              />
                              <label htmlFor="tabaco" className="text-sm">
                                Sí, consume tabaco
                              </label>
                            </div>
                            {historial.consumoTabaco && (
                              <div className="space-y-2">
                                <Input
                                  value={historial.cantidadTabaco}
                                  onChange={(e) => updateMedicalField("cantidadTabaco", e.target.value)}
                                  placeholder="Cantidad (ej: 10 cigarrillos/día)"
                                />
                                <Input
                                  value={historial.tiempoTabaco}
                                  onChange={(e) => updateMedicalField("tiempoTabaco", e.target.value)}
                                  placeholder="Tiempo fumando (ej: 15 años)"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.consumoTabaco
                              ? `Sí - ${historial.cantidadTabaco}${historial.tiempoTabaco ? ` (${historial.tiempoTabaco})` : ""}`
                              : "No"}
                          </div>
                        )}
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <label className="block text-sm font-medium text-gray-700">Consumo de alcohol</label>
                        </div>
                        {isEditingMedical ? (
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="alcohol"
                                checked={historial.consumoAlcohol}
                                onCheckedChange={(checked) => updateMedicalField("consumoAlcohol", checked as boolean)}
                              />
                              <label htmlFor="alcohol" className="text-sm">
                                Sí, consume alcohol
                              </label>
                            </div>
                            {historial.consumoAlcohol && (
                              <div className="space-y-2">
                                <Input
                                  value={historial.cantidadAlcohol}
                                  onChange={(e) => updateMedicalField("cantidadAlcohol", e.target.value)}
                                  placeholder="Cantidad (ej: 2 copas de vino)"
                                />
                                <Input
                                  value={historial.frecuenciaAlcohol}
                                  onChange={(e) => updateMedicalField("frecuenciaAlcohol", e.target.value)}
                                  placeholder="Frecuencia (ej: fines de semana)"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.consumoAlcohol
                              ? `Sí - ${historial.cantidadAlcohol} (${historial.frecuenciaAlcohol})`
                              : "No"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Otras sustancias</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.otrasSustancias}
                          onChange={(e) => updateMedicalField("otrasSustancias", e.target.value)}
                          placeholder="Drogas recreativas, suplementos, etc..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.otrasSustancias || "No registrado"}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Calidad del sueño</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.calidadSueno}
                            onChange={(e) => updateMedicalField("calidadSueno", e.target.value)}
                            placeholder="Buena, regular, mala..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.calidadSueno || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Horas de sueño</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.horasSueno}
                            onChange={(e) => updateMedicalField("horasSueno", e.target.value)}
                            placeholder="Ej: 7-8 horas"
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.horasSueno || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nivel de estrés</label>
                        {isEditingMedical ? (
                          <Select
                            value={historial.nivelEstres}
                            onValueChange={(value) => updateMedicalField("nivelEstres", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar nivel" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bajo">Bajo</SelectItem>
                              <SelectItem value="moderado">Moderado</SelectItem>
                              <SelectItem value="alto">Alto</SelectItem>
                              <SelectItem value="muy-alto">Muy alto</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.nivelEstres || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campos personalizados para hábitos */}
                {renderCustomFields("habitos")}
              </div>
            </TabsContent>

            {/* Pestaña Revisión por Sistemas */}
            <TabsContent value="sistemas">
              <div className="space-y-6">
                {/* Función Digestiva */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="w-5 h-5 text-green-600" />
                      6. Función Digestiva
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Apetito</label>
                        {isEditingMedical ? (
                          <Select
                            value={historial.apetito}
                            onValueChange={(value) => updateMedicalField("apetito", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="aumentado">Aumentado</SelectItem>
                              <SelectItem value="disminuido">Disminuido</SelectItem>
                              <SelectItem value="ausente">Ausente</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">{historial.apetito || "No registrado"}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Digestión</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.digestion}
                            onChange={(e) => updateMedicalField("digestion", e.target.value)}
                            placeholder="Normal, pesada, con gases..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.digestion || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Evacuaciones</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.evacuaciones}
                          onChange={(e) => updateMedicalField("evacuaciones", e.target.value)}
                          placeholder="Descripción general de las evacuaciones..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.evacuaciones || "No registrado"}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.frecuenciaEvacuaciones}
                            onChange={(e) => updateMedicalField("frecuenciaEvacuaciones", e.target.value)}
                            placeholder="Ej: 1 vez/día"
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.frecuenciaEvacuaciones || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Consistencia</label>
                        {isEditingMedical ? (
                          <Select
                            value={historial.consistenciaEvacuaciones}
                            onValueChange={(value) => updateMedicalField("consistenciaEvacuaciones", value)}                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="dura">Dura</SelectItem>
                              <SelectItem value="blanda">Blanda</SelectItem>
                              <SelectItem value="liquida">Líquida</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.consistenciaEvacuaciones || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cambios recientes</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.cambiosEvacuaciones}
                            onChange={(e) => updateMedicalField("cambiosEvacuaciones", e.target.value)}
                            placeholder="Cambios en patrón..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.cambiosEvacuaciones || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Náuseas/Vómitos</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.nauseasVomitos}
                            onChange={(e) => updateMedicalField("nauseasVomitos", e.target.value)}
                            placeholder="Frecuencia, relación con comidas..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.nauseasVomitos || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reflujo</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.reflujo}
                            onChange={(e) => updateMedicalField("reflujo", e.target.value)}
                            placeholder="Acidez, regurgitación..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">{historial.reflujo || "No registrado"}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Función Urinaria */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-blue-600" />
                      7. Función Urinaria
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia urinaria</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.frecuenciaUrinaria}
                            onChange={(e) => updateMedicalField("frecuenciaUrinaria", e.target.value)}
                            placeholder="Ej: 5-6 veces/día"
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.frecuenciaUrinaria || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dolor al orinar</label>
                        {isEditingMedical ? (
                          <Select
                            value={historial.dolorUrinar}
                            onValueChange={(value) => updateMedicalField("dolorUrinar", value)}                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="ocasional">Ocasional</SelectItem>
                              <SelectItem value="frecuente">Frecuente</SelectItem>
                              <SelectItem value="siempre">Siempre</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.dolorUrinar || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Incontinencia</label>
                        {isEditingMedical ? (
                          <Select
                            value={historial.incontinencia}
                            onValueChange={(value) => updateMedicalField("incontinencia", value)}                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no">No</SelectItem>
                              <SelectItem value="esfuerzo">De esfuerzo</SelectItem>
                              <SelectItem value="urgencia">De urgencia</SelectItem>
                              <SelectItem value="mixta">Mixta</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.incontinencia || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cambios en color</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.cambiosColorOrina}
                            onChange={(e) => updateMedicalField("cambiosColorOrina", e.target.value)}
                            placeholder="Amarillo, rojizo, turbio..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.cambiosColorOrina || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cambios en olor</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.cambiosOlorOrina}
                            onChange={(e) => updateMedicalField("cambiosOlorOrina", e.target.value)}
                            placeholder="Fuerte, dulce, fétido..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.cambiosOlorOrina || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Función Cardiovascular y Respiratoria */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-red-600" />
                      8. Función Cardiovascular y Respiratoria
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Palpitaciones</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.palpitaciones}
                            onChange={(e) => updateMedicalField("palpitaciones", e.target.value)}
                            placeholder="Frecuencia, duración, desencadenantes..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.palpitaciones || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Disnea (dificultad respiratoria)
                        </label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.disnea}
                            onChange={(e) => updateMedicalField("disnea", e.target.value)}
                            placeholder="En reposo, al esfuerzo, nocturna..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">{historial.disnea || "No registrado"}</div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dolor torácico</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.dolorToracico}
                            onChange={(e) => updateMedicalField("dolorToracico", e.target.value)}
                            placeholder="Localización, tipo, duración..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.dolorToracico || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tos</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.tos}
                            onChange={(e) => updateMedicalField("tos", e.target.value)}
                            placeholder="Seca, productiva, nocturna..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">{historial.tos || "No registrado"}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Esputo</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.esputo}
                            onChange={(e) => updateMedicalField("esputo", e.target.value)}
                            placeholder="Color, consistencia, cantidad..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">{historial.esputo || "No registrado"}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Función Musculoesquelética */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      9. Función Musculoesquelética
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dolor articular</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.dolorArticular}
                            onChange={(e) => updateMedicalField("dolorArticular", e.target.value)}
                            placeholder="Localización, intensidad, horario..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.dolorArticular || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Dolor muscular</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.dolorMuscular}
                            onChange={(e) => updateMedicalField("dolorMuscular", e.target.value)}
                            placeholder="Localización, tipo, desencadenantes..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.dolorMuscular || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Limitaciones de movimiento
                        </label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.limitacionesMovimiento}
                            onChange={(e) => updateMedicalField("limitacionesMovimiento", e.target.value)}
                            placeholder="Rigidez, bloqueos, rango limitado..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.limitacionesMovimiento || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Debilidad o fatiga</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.debilidadFatiga}
                            onChange={(e) => updateMedicalField("debilidadFatiga", e.target.value)}
                            placeholder="Generalizada, localizada, horario..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.debilidadFatiga || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Revisión por Sistemas Adicionales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      12. Revisión por Sistemas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sistema cutáneo</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.sistemasCutaneo}
                            onChange={(e) => updateMedicalField("sistemasCutaneo", e.target.value)}
                            placeholder="Cambios en piel, heridas, erupciones..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.sistemasCutaneo || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sistema endocrino</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.sistemaEndocrino}
                            onChange={(e) => updateMedicalField("sistemaEndocrino", e.target.value)}
                            placeholder="Sudoración, intolerancia frío/calor..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.sistemaEndocrino || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sistema hematológico</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.sistemaHematologico}
                            onChange={(e) => updateMedicalField("sistemaHematologico", e.target.value)}
                            placeholder="Hematomas, sangrados, petequias..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.sistemaHematologico || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campos personalizados para sistemas */}
                {renderCustomFields("sistemas")}
              </div>
            </TabsContent>

            {/* Pestaña Neurológica y Psicológica */}
            <TabsContent value="neuropsico">
              <div className="space-y-6">
                {/* Función Neurológica */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      10. Función Neurológica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mareos o vértigo</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.mareosVertigo}
                            onChange={(e) => updateMedicalField("mareosVertigo", e.target.value)}
                            placeholder="Frecuencia, duración, desencadenantes..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.mareosVertigo || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cefaleas</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.cefaleas}
                            onChange={(e) => updateMedicalField("cefaleas", e.target.value)}
                            placeholder="Tipo, localización, intensidad, frecuencia..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.cefaleas || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pérdida de sensibilidad</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.perdidaSensibilidad}
                            onChange={(e) => updateMedicalField("perdidaSensibilidad", e.target.value)}
                            placeholder="Localización, tipo, duración..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.perdidaSensibilidad || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pérdida de fuerza</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.perdidaFuerza}
                            onChange={(e) => updateMedicalField("perdidaFuerza", e.target.value)}
                            placeholder="Localización, grado, progresión..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.perdidaFuerza || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alteraciones visuales</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.alteracionesVisuales}
                            onChange={(e) => updateMedicalField("alteracionesVisuales", e.target.value)}
                            placeholder="Visión borrosa, diplopia, escotomas..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.alteracionesVisuales || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alteraciones auditivas</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.alteracionesAuditivas}
                            onChange={(e) => updateMedicalField("alteracionesAuditivas", e.target.value)}
                            placeholder="Hipoacusia, acúfenos, otalgia..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.alteracionesAuditivas || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Función Psicológica/Emocional */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-indigo-600" />
                      11. Función Psicológica/Emocional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Estado de ánimo</label>
                        {isEditingMedical ? (
                          <Select
                            value={historial.estadoAnimo}
                            onValueChange={(value) => updateMedicalField("estadoAnimo", value)}                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="estable">Estable</SelectItem>
                              <SelectItem value="elevado">Elevado</SelectItem>
                              <SelectItem value="deprimido">Deprimido</SelectItem>
                              <SelectItem value="irritable">Irritable</SelectItem>
                              <SelectItem value="ansioso">Ansioso</SelectItem>
                              <SelectItem value="variable">Variable</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.estadoAnimo || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ansiedad</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.ansiedad}
                            onChange={(e) => updateMedicalField("ansiedad", e.target.value)}
                            placeholder="Nivel, desencadenantes, síntomas..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.ansiedad || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Depresión</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.depresion}
                            onChange={(e) => updateMedicalField("depresion", e.target.value)}
                            placeholder="Síntomas, duración, severidad..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.depresion || "No registrado"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cambios de conducta</label>
                        {isEditingMedical ? (
                          <Textarea
                            value={historial.cambiosConducta}
                            onChange={(e) => updateMedicalField("cambiosConducta", e.target.value)}
                            placeholder="Agresividad, aislamiento, impulsividad..."
                          />
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            {historial.cambiosConducta || "No registrado"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Trastornos del sueño</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.trastornosSueno}
                          onChange={(e) => updateMedicalField("trastornosSueno", e.target.value)}
                          placeholder="Insomnio, pesadillas, sonambulismo..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.trastornosSueno || "No registrado"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Campos personalizados para neuropsico */}
                {renderCustomFields("neuropsico")}
              </div>
            </TabsContent>

            {/* Pestaña Exploración Física */}
            <TabsContent value="exploracion">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-green-600" />
                      Signos Vitales y Antropometría
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">TA (mmHg)</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.tensionArterial}
                            onChange={(e) => updateMedicalField("tensionArterial", e.target.value)}
                            placeholder="120/80"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded border text-center">
                            {historial.tensionArterial || "---"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">FC (lpm)</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.frecuenciaCardiaca}
                            onChange={(e) => updateMedicalField("frecuenciaCardiaca", e.target.value)}
                            placeholder="72"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded border text-center">
                            {historial.frecuenciaCardiaca || "---"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">FR (rpm)</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.frecuenciaRespiratoria}
                            onChange={(e) => updateMedicalField("frecuenciaRespiratoria", e.target.value)}
                            placeholder="16"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded border text-center">
                            {historial.frecuenciaRespiratoria || "---"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">T° (°C)</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.temperatura}
                            onChange={(e) => updateMedicalField("temperatura", e.target.value)}
                            placeholder="36.5"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded border text-center">
                            {historial.temperatura || "---"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">SatO₂ (%)</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.saturacionO2}
                            onChange={(e) => updateMedicalField("saturacionO2", e.target.value)}
                            placeholder="98"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded border text-center">
                            {historial.saturacionO2 || "---"}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.peso}
                            onChange={(e) => updateMedicalField("peso", e.target.value)}
                            placeholder="70"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded border text-center">{historial.peso || "---"}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Talla (cm)</label>
                        {isEditingMedical ? (
                          <Input
                            value={historial.talla}
                            onChange={(e) => updateMedicalField("talla", e.target.value)}
                            placeholder="170"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded border text-center">{historial.talla || "---"}</div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">IMC</label>
                        <div className="p-2 bg-blue-50 rounded border text-center font-medium text-blue-800">
                          {historial.imc || "---"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                      Exploración Física
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones clínicas</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.observacionesClinicas}
                          onChange={(e) => updateMedicalField("observacionesClinicas", e.target.value)}
                          placeholder="Descripción detallada de la exploración física por aparatos y sistemas..."
                          className="min-h-32"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.observacionesClinicas || "No registrado"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pruebas complementarias solicitadas
                      </label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.pruebasComplementarias}
                          onChange={(e) => updateMedicalField("pruebasComplementarias", e.target.value)}
                          placeholder="Analíticas, radiografías, ecografías, resultados disponibles..."
                          className="min-h-24"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.pruebasComplementarias || "No registrado"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Campos personalizados para exploración */}
                {renderCustomFields("exploracion")}
              </div>
            </TabsContent>

            {/* Pestaña Diagnóstico y Tratamiento */}
            <TabsContent value="diagnostico">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      Diagnóstico
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Diagnóstico provisional o definitivo
                      </label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.diagnostico}
                          onChange={(e) => updateMedicalField("diagnostico", e.target.value)}
                          placeholder="Diagnóstico principal y diagnósticos secundarios con códigos CIE-10 si es posible..."
                          className="min-h-24"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.diagnostico || "No registrado"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="w-5 h-5 text-green-600" />
                      Plan Terapéutico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Medicación</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.medicacion}
                          onChange={(e) => updateMedicalField("medicacion", e.target.value)}
                          placeholder="Medicamentos prescritos con dosis, frecuencia y duración..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.medicacion || "No registrado"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recomendaciones</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.recomendaciones}
                          onChange={(e) => updateMedicalField("recomendaciones", e.target.value)}
                          placeholder="Recomendaciones generales, cambios en el estilo de vida, medidas no farmacológicas..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.recomendaciones || "No registrado"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Derivaciones</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.derivaciones}
                          onChange={(e) => updateMedicalField("derivaciones", e.target.value)}
                          placeholder="Derivaciones a especialistas, pruebas adicionales, interconsultas..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.derivaciones || "No registrado"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Plan de seguimiento</label>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.seguimiento}
                          onChange={(e) => updateMedicalField("seguimiento", e.target.value)}
                          placeholder="Próximas citas, controles, revisiones, criterios de alarma..."
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.seguimiento || "No registrado"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Observaciones Adicionales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      {isEditingMedical ? (
                        <Textarea
                          value={historial.observacionesAdicionales}
                          onChange={(e) => updateMedicalField("observacionesAdicionales", e.target.value)}
                          placeholder="Cualquier información adicional relevante, evolución esperada, pronóstico..."
                          className="min-h-24"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          {historial.observacionesAdicionales || "No registrado"}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Campos personalizados para diagnóstico */}
                {renderCustomFields("diagnostico")}

                {/* Información del profesional */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Fecha de creación:</span>
                        <p className="text-gray-600">{new Date(historial.fechaCreacion).toLocaleDateString("es-ES")}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Profesional:</span>
                        <p className="text-gray-600">{historial.profesional}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Última actualización:</span>
                        <p className="text-gray-600">
                          {new Date(historial.ultimaActualizacion).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Pestaña Seguimiento */}
        <TabsContent value="seguimiento" className="space-y-6">
          <PatientFollowUpSection clientId={clientId} clientName={formData.name} />
        </TabsContent>

        {/* Pestaña Tarjetas de Fidelización */}
        <TabsContent value="loyalty-cards" className="space-y-6">
          <LoyaltyCardsSection clientId={clientId} clientName={formData.name} />
        </TabsContent>

        {/* Pestaña Citas */}
        <TabsContent value="citas" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">Citas</h3>
              <p className="text-gray-500 mt-2">Funcionalidad en desarrollo</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña Documentos */}
        <TabsContent value="documentos" className="space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">Documentos</h3>
              <p className="text-gray-500 mt-2">Funcionalidad en desarrollo</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
