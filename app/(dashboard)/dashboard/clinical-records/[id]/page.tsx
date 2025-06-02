"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Edit,
  Loader2,
  PlusCircle,
  User,
  Clock,
  Phone,
  Stethoscope,
  ClipboardList,
  Activity,
  Pill,
  ChevronDown,
  ChevronUp,
  FileText,
  PlusSquare,
  FilePlus,
  ArrowUpDown,
  Trash2,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ClinicalRecordStatus, ClinicalRecordWithRelations, ConsultationStatus } from "@/types/clinical"
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

// Función para formatear fechas con hora
const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy HH:mm", { locale: es })
  } catch (error) {
    return "Fecha no válida"
  }
}

// Función para obtener el color del estado
const getStatusColor = (status: ClinicalRecordStatus) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 hover:bg-green-100"
    case "follow_up":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100"
    case "pending_review":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
    case "resolved":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    case "archived":
      return "bg-purple-100 text-purple-800 hover:bg-purple-100"
    default:
      return "bg-slate-100 text-slate-800 hover:bg-slate-100"
  }
}

// Función para obtener el texto del estado
const getStatusText = (status: ClinicalRecordStatus) => {
  switch (status) {
    case "active":
      return "Activo"
    case "follow_up":
      return "En seguimiento"
    case "pending_review":
      return "Pendiente de revisión"
    case "resolved":
      return "Resuelto"
    case "archived":
      return "Archivado"
    default:
      return status
  }
}

// Función para obtener el color del estado de la consulta
const getConsultationStatusColor = (status: ConsultationStatus) => {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-800"
    case "completed":
      return "bg-green-100 text-green-800"
    case "in_progress":
      return "bg-blue-100 text-blue-800"
    case "cancelled":
      return "bg-red-100 text-red-800"
    default:
      return "bg-slate-100 text-slate-800"
  }
}

// Función para obtener el texto del estado de la consulta
const getConsultationStatusText = (status: ConsultationStatus) => {
  switch (status) {
    case "draft":
      return "Borrador"
    case "completed":
      return "Completada"
    case "in_progress":
      return "En progreso"
    case "cancelled":
      return "Cancelada"
    default:
      return status
  }
}

export default function ClinicalRecordDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [record, setRecord] = useState<ClinicalRecordWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [consultations, setConsultations] = useState<any[]>([])
  const [diagnoses, setDiagnoses] = useState<any[]>([])
  const [treatments, setTreatments] = useState<any[]>([])
  const [followUps, setFollowUps] = useState<any[]>([])
  const [activeConsultationIds, setActiveConsultationIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("timeline")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc") // desc = más recientes primero
  const [isLoading, setIsLoading] = useState(false)
  const [consultationToDelete, setConsultationToDelete] = useState<string | null>(null)

  // Cargar los datos de la historia clínica
  useEffect(() => {
    const fetchRecord = async () => {
      setLoading(true)
      setError(null)

      try {
        // Obtener la historia clínica
        const { data: recordData, error: recordError } = await supabase
          .from("clinical_records")
          .select("*")
          .eq("id", params.id)
          .single()

        if (recordError) throw new Error(`Error al obtener la historia clínica: ${recordError.message}`)
        if (!recordData) throw new Error("No se encontró la historia clínica")

        // Obtener datos del paciente
        const { data: patientData } = await supabase
          .from("clients")
          .select("*")
          .eq("id", recordData.patient_id)
          .single()

        // Obtener datos del profesional si existe
        let professionalData = null
        if (recordData.professional_id && recordData.professional_id > 0) {
          const { data: profData } = await supabase
            .from("professionals")
            .select("*")
            .eq("id", recordData.professional_id)
            .single()
          professionalData = profData
        }

        // Obtener datos de la organización
        const { data: organizationData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", recordData.organization_id)
          .single()

        // Combinar los datos
        const completeRecordData = {
          ...recordData,
          patient: patientData || null,
          professional: professionalData || null,
          organization: organizationData || null,
        }

        setRecord(completeRecordData as ClinicalRecordWithRelations)

        // Obtener las consultas - Ahora ordenamos primero por fecha de consulta y luego por created_at
        const { data: consultationsData, error: consultationsError } = await supabase
          .from("clinical_consultations")
          .select(`
            *,
            professional:professionals(*)
          `)
          .eq("clinical_record_id", params.id)
          .order("created_at", { ascending: false }) // Ordenar por fecha de creación descendente

        if (consultationsError) throw new Error(`Error al obtener las consultas: ${consultationsError.message}`)

        // Verificar que las consultas estén ordenadas correctamente
        if (consultationsData) {
          console.log(
            "Consultas ordenadas:",
            consultationsData.map((c) => ({
              id: c.id,
              fecha: c.consultation_date,
              creado: c.created_at,
              motivo: c.chief_complaint,
            })),
          )
        }

        setConsultations(consultationsData || [])

        // Si hay consultas, abrir la primera por defecto
        if (consultationsData && consultationsData.length > 0) {
          setActiveConsultationIds([consultationsData[0].id])
        }

        // Obtener los diagnósticos directamente por clinical_record_id
        const { data: diagnosesData, error: diagnosesError } = await supabase
          .from("clinical_diagnoses")
          .select(`
            *,
            consultation:clinical_consultations(*)
          `)
          .eq("clinical_record_id", params.id)
          .order("created_at", { ascending: false })

        if (diagnosesError) throw new Error(`Error al obtener los diagnósticos: ${diagnosesError.message}`)
        setDiagnoses(diagnosesData || [])

        // Obtener los tratamientos directamente por clinical_record_id
        const { data: treatmentsData, error: treatmentsError } = await supabase
          .from("clinical_treatments")
          .select(`
            *,
            consultation:clinical_consultations(*)
          `)
          .eq("clinical_record_id", params.id)
          .order("created_at", { ascending: false })

        if (treatmentsError) throw new Error(`Error al obtener los tratamientos: ${treatmentsError.message}`)
        setTreatments(treatmentsData || [])

        // Obtener los seguimientos
        const { data: followUpsData, error: followUpsError } = await supabase
          .from("clinical_follow_ups")
          .select(`
            *,
            professional:professionals(*)
          `)
          .eq("clinical_record_id", params.id)
          .order("scheduled_date", { ascending: true })

        if (followUpsError) throw new Error(`Error al obtener los seguimientos: ${followUpsError.message}`)
        setFollowUps(followUpsData || [])
      } catch (err) {
        console.error("Error al cargar la historia clínica:", err)
        setError(err instanceof Error ? err.message : "Error al cargar la historia clínica")
      } finally {
        setLoading(false)
      }
    }

    fetchRecord()
  }, [params.id])

  // Navegar a la página de edición
  const handleEdit = () => {
    router.push(`/dashboard/clinical-records/${params.id}/edit`)
  }

  // Navegar a la página de nueva consulta
  const handleNewConsultation = () => {
    router.push(`/dashboard/clinical-records/${params.id}/consultations/new`)
  }

  // Manejar el toggle del acordeón de consultas
  const toggleConsultation = (id: string) => {
    setActiveConsultationIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  // Cambiar el orden de las consultas
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
  }

  // Eliminar una consulta
  const handleDeleteConsultation = async (consultationId: string) => {
    try {
      setIsLoading(true)

      // Eliminar la consulta
      const { error: deleteError } = await supabase.from("clinical_consultations").delete().eq("id", consultationId)

      if (deleteError) throw new Error(`Error al eliminar la consulta: ${deleteError.message}`)

      // Actualizar la lista de consultas
      setConsultations(consultations.filter((c) => c.id !== consultationId))

      toast({
        title: "Consulta eliminada",
        description: "La consulta se ha eliminado correctamente.",
      })
    } catch (err) {
      console.error("Error al eliminar la consulta:", err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al eliminar la consulta",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setConsultationToDelete(null)
    }
  }

  // Obtener diagnósticos activos
  const activeDiagnoses = diagnoses.filter((d) => d.is_primary)

  // Obtener tratamientos activos
  const activeTreatments = treatments.filter((t) => t.status === "active")

  // Obtener seguimientos pendientes
  const pendingFollowUps = followUps.filter((f) => f.status === "pending")

  // Ordenar las consultas según el estado actual
  const sortedConsultations = [...consultations].sort((a, b) => {
    // Primero intentamos ordenar por fecha de consulta
    const dateA = new Date(a.consultation_date).getTime()
    const dateB = new Date(b.consultation_date).getTime()

    if (dateA !== dateB) {
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB
    }

    // Si las fechas son iguales, ordenamos por created_at
    const createdA = new Date(a.created_at).getTime()
    const createdB = new Date(b.created_at).getTime()
    return sortOrder === "desc" ? createdB - createdA : createdA - createdB
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">{error || "No se pudo cargar la historia clínica"}</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard/clinical-records")}>
          Volver a historias clínicas
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* Navegación y encabezado */}
      <div className="mb-6 px-4">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/dashboard" },
            { label: "Historias Clínicas", href: "/dashboard/clinical-records" },
            { label: record.title, href: `/dashboard/clinical-records/${params.id}` },
          ]}
        />
      </div>

      {/* Cabecera con título y estado */}
      <div className="bg-white border-b pb-4 sticky top-0 z-10 px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{record.title}</h1>
              <Badge className={getStatusColor(record.status as ClinicalRecordStatus)}>
                {getStatusText(record.status as ClinicalRecordStatus)}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">Actualizado: {formatDateTime(record.updated_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-4">
        {/* Panel lateral con información del paciente */}
        <div className="lg:col-span-1 space-y-4 px-4 lg:px-0">
          {/* Información del paciente */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-500" />
                Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div>
                <Link
                  href={`/dashboard/clients/${record.patient?.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {record.patient?.name}
                </Link>
                <div className="text-gray-600 text-sm mt-1 space-y-1">
                  <div className="flex items-start">
                    <span className="inline-block w-20 text-gray-500">ID/DNI:</span>
                    <span>{record.patient?.tax_id || "No disponible"}</span>
                  </div>
                  {record.patient?.phone && (
                    <div className="flex items-start">
                      <span className="inline-block w-20 text-gray-500">Teléfono:</span>
                      <span className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {record.patient.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium">Profesional</h3>
                <p className="text-gray-600 mt-1">{record.professional?.name || "No asignado"}</p>
              </div>

              <div>
                <h3 className="font-medium">Fechas</h3>
                <div className="text-gray-600 text-sm mt-1 space-y-1">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span className="text-gray-500 mr-1">Inicio:</span>
                    <span>{formatDate(record.start_date)}</span>
                  </div>
                  {record.end_date && (
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span className="text-gray-500 mr-1">Fin:</span>
                      <span>{formatDate(record.end_date)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium">Organización</h3>
                <p className="text-gray-600 mt-1">{record.organization?.name || "No disponible"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-4 space-y-6 px-4 lg:px-0">
          {/* Pestañas para navegación */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="timeline" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Historial de consultas
              </TabsTrigger>
              <TabsTrigger value="diagnoses" className="flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Diagnósticos
              </TabsTrigger>
              <TabsTrigger value="treatments" className="flex items-center">
                <Pill className="h-4 w-4 mr-2" />
                Tratamientos
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Notas adicionales
              </TabsTrigger>
            </TabsList>

            {/* Contenido de las pestañas */}
            <TabsContent value="timeline" className="mt-6 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  Historial de consultas
                </h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={toggleSortOrder}>
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    {sortOrder === "desc" ? "Más antiguas primero" : "Más recientes primero"}
                  </Button>
                  <Button variant="default" size="sm" onClick={handleNewConsultation}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva consulta
                  </Button>
                </div>
              </div>

              {sortedConsultations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <FileText className="h-12 w-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium">No hay consultas registradas</h3>
                    <p className="text-gray-500 mt-2">Añade la primera consulta para esta historia clínica.</p>
                    <Button className="mt-6" onClick={handleNewConsultation}>
                      <PlusSquare className="mr-2 h-4 w-4" />
                      Registrar primera consulta
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {sortedConsultations.map((consultation, index) => (
                    <Card key={consultation.id} id={`consultation-${consultation.id}`} className="relative">
                      {/* Fecha y estado en el lateral */}
                      <div className="absolute left-0 top-0 bottom-0 w-[120px] border-r p-4 flex flex-col items-center">
                        <div className="bg-white w-12 h-12 rounded-full border-2 border-blue-100 flex items-center justify-center mb-2">
                          <span className="text-blue-500 font-medium">
                            {sortOrder === "desc" ? sortedConsultations.length - index : index + 1}
                          </span>
                        </div>
                        <p className="text-center text-sm font-medium">{formatDate(consultation.consultation_date)}</p>
                        <Badge
                          className={`mt-2 ${getConsultationStatusColor(consultation.status as ConsultationStatus)}`}
                        >
                          {getConsultationStatusText(consultation.status as ConsultationStatus)}
                        </Badge>
                      </div>

                      {/* Contenido de la consulta */}
                      <div className="ml-[120px]">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-xl">
                                {consultation.chief_complaint || "Consulta médica"}
                              </CardTitle>
                              <CardDescription>
                                {consultation.professional
                                  ? `Dr. ${consultation.professional.name}`
                                  : "Sin profesional asignado"}
                                <span className="ml-2 text-xs text-gray-500">
                                  {formatDateTime(consultation.created_at)}
                                </span>
                              </CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleConsultation(consultation.id)}
                            >
                              {activeConsultationIds.includes(consultation.id) ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>

                        {activeConsultationIds.includes(consultation.id) && (
                          <CardContent className="pb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Columna izquierda */}
                              <div className="space-y-6">
                                {/* Evaluación */}
                                {consultation.assessment && (
                                  <div>
                                    <h3 className="font-semibold text-lg flex items-center mb-2">
                                      <Stethoscope className="h-5 w-5 mr-2 text-gray-500" />
                                      Evaluación
                                    </h3>
                                    <div className="relative">
                                      <p className="whitespace-pre-wrap break-words max-w-full overflow-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {consultation.assessment}
                                      </p>
                                      {consultation.assessment && consultation.assessment.length > 200 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Subjetivo */}
                                {consultation.subjective && (
                                  <div>
                                    <h3 className="font-semibold text-lg flex items-center mb-2">Subjetivo</h3>
                                    <div className="relative">
                                      <p className="whitespace-pre-wrap break-words max-w-full overflow-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {consultation.subjective}
                                      </p>
                                      {consultation.subjective && consultation.subjective.length > 200 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Objetivo */}
                                {consultation.objective && (
                                  <div>
                                    <h3 className="font-semibold text-lg flex items-center mb-2">Objetivo</h3>
                                    <div className="relative">
                                      <p className="whitespace-pre-wrap break-words max-w-full overflow-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {consultation.objective}
                                      </p>
                                      {consultation.objective && consultation.objective.length > 200 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Diagnósticos de esta consulta */}
                                {diagnoses.filter((d) => d.consultation_id === consultation.id).length > 0 && (
                                  <div>
                                    <h3 className="font-semibold text-lg flex items-center mb-2">
                                      <Activity className="h-5 w-5 mr-2 text-gray-500" />
                                      Diagnósticos
                                    </h3>
                                    <ul className="space-y-2 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                                      {diagnoses
                                        .filter((d) => d.consultation_id === consultation.id)
                                        .map((diagnosis) => (
                                          <li key={diagnosis.id} className="flex items-start">
                                            <span className="text-gray-500 mr-2 flex-shrink-0">•</span>
                                            <div className="flex-1 min-w-0 max-w-full">
                                              {diagnosis.code && (
                                                <span className="font-mono text-xs mr-1">{diagnosis.code}</span>
                                              )}
                                              <span className="break-words">{diagnosis.description}</span>
                                              {diagnosis.is_primary && (
                                                <Badge
                                                  variant="outline"
                                                  className="ml-2 bg-blue-50 text-blue-700 border-blue-200"
                                                >
                                                  Principal
                                                </Badge>
                                              )}
                                              {diagnosis.type && diagnosis.type !== "primary" && (
                                                <Badge variant="outline" className="ml-2">
                                                  {diagnosis.type}
                                                </Badge>
                                              )}
                                            </div>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Columna derecha */}
                              <div className="space-y-6">
                                {/* Plan */}
                                {consultation.plan && (
                                  <div>
                                    <h3 className="font-semibold text-lg flex items-center mb-2">
                                      <ClipboardList className="h-5 w-5 mr-2 text-gray-500" />
                                      Plan
                                    </h3>
                                    <div className="relative">
                                      <p className="whitespace-pre-wrap break-words max-w-full overflow-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {consultation.plan}
                                      </p>
                                      {consultation.plan && consultation.plan.length > 200 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Tratamientos de esta consulta */}
                                {treatments.filter((t) => t.consultation_id === consultation.id).length > 0 && (
                                  <div>
                                    <h3 className="font-semibold text-lg flex items-center mb-2">
                                      <Pill className="h-5 w-5 mr-2 text-gray-500" />
                                      Tratamientos
                                    </h3>
                                    <ul className="space-y-3 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                                      {treatments
                                        .filter((t) => t.consultation_id === consultation.id)
                                        .map((treatment) => (
                                          <li key={treatment.id} className="flex items-start">
                                            <span className="text-gray-500 mr-2 flex-shrink-0">•</span>
                                            <div className="flex-1 min-w-0 max-w-full">
                                              <div className="flex items-center">
                                                <span className="font-medium break-words max-w-full inline-block">
                                                  {treatment.description}
                                                </span>
                                                <Badge
                                                  className={`ml-2 ${
                                                    treatment.status === "active"
                                                      ? "bg-green-100 text-green-800"
                                                      : "bg-gray-100 text-gray-800"
                                                  }`}
                                                >
                                                  {treatment.status === "active" ? "Activo" : "Finalizado"}
                                                </Badge>
                                              </div>
                                              {treatment.instructions && (
                                                <p className="text-sm text-gray-600 mt-1 break-words max-w-full overflow-hidden">
                                                  {treatment.instructions}
                                                </p>
                                              )}
                                              {(treatment.frequency || treatment.duration) && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                  {treatment.frequency && (
                                                    <span>Frecuencia: {treatment.frequency}. </span>
                                                  )}
                                                  {treatment.duration && <span>Duración: {treatment.duration}</span>}
                                                </p>
                                              )}
                                            </div>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Notas adicionales */}
                                {consultation.notes && (
                                  <div>
                                    <h3 className="font-semibold text-lg flex items-center mb-2">
                                      <FileText className="h-5 w-5 mr-2 text-gray-500" />
                                      Notas adicionales
                                    </h3>
                                    <div className="relative">
                                      <p className="whitespace-pre-wrap break-words max-w-full overflow-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                                        {consultation.notes}
                                      </p>
                                      {consultation.notes && consultation.notes.length > 200 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="mt-6 flex justify-end space-x-2">
                              <AlertDialog
                                open={consultationToDelete === consultation.id}
                                onOpenChange={(open) => !open && setConsultationToDelete(null)}
                              >
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setConsultationToDelete(consultation.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción eliminará permanentemente la consulta y todos sus datos asociados
                                      (diagnósticos, tratamientos, etc.). Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-500 hover:bg-red-600"
                                      onClick={() => handleDeleteConsultation(consultation.id)}
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <Link
                                href={`/dashboard/clinical-records/${params.id}/consultations/${consultation.id}/edit`}
                              >
                                <Button variant="outline" size="sm">
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar consulta
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="diagnoses" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-gray-500" />
                  Diagnósticos
                </h2>
                <Button variant="outline" size="sm" onClick={handleNewConsultation}>
                  <PlusSquare className="mr-2 h-4 w-4" />
                  Añadir diagnóstico
                </Button>
              </div>

              {diagnoses.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-10">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No hay diagnósticos registrados</h3>
                    <p className="text-gray-500 mt-2">Añade un diagnóstico desde una consulta.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-h-[600px]">
                      {diagnoses.map((diagnosis) => (
                        <div key={diagnosis.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 max-w-full">
                              <div className="flex items-center flex-wrap gap-2">
                                {diagnosis.code && (
                                  <span className="font-mono text-sm bg-gray-100 rounded px-2 py-0.5">
                                    {diagnosis.code}
                                  </span>
                                )}
                                <h3 className="font-medium break-words max-w-[90%]">{diagnosis.description}</h3>
                                {diagnosis.is_primary && <Badge className="bg-blue-100 text-blue-800">Principal</Badge>}
                                {diagnosis.type && diagnosis.type !== "primary" && (
                                  <Badge variant="outline">{diagnosis.type}</Badge>
                                )}
                              </div>

                              <div className="text-sm text-gray-500 mt-2">
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>
                                    Registrado el {formatDate(diagnosis.created_at)}
                                    {diagnosis.consultation &&
                                      ` en consulta "${diagnosis.consultation.chief_complaint || "Consulta médica"}"`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="treatments" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Pill className="h-5 w-5 mr-2 text-gray-500" />
                  Tratamientos
                </h2>
                <Button variant="outline" size="sm" onClick={handleNewConsultation}>
                  <PlusSquare className="mr-2 h-4 w-4" />
                  Añadir tratamiento
                </Button>
              </div>

              {treatments.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-10">
                    <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No hay tratamientos registrados</h3>
                    <p className="text-gray-500 mt-2">Añade un tratamiento desde una consulta.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-h-[600px]">
                      {treatments.map((treatment) => (
                        <div key={treatment.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="w-full flex-1 min-w-0 max-w-full">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium break-words max-w-[90%] inline-block">
                                  {treatment.description}
                                </h3>
                                <Badge
                                  className={
                                    treatment.status === "active"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gray-100 text-gray-800"
                                  }
                                >
                                  {treatment.status === "active" ? "Activo" : "Finalizado"}
                                </Badge>
                              </div>

                              {treatment.instructions && (
                                <p className="text-gray-700 mt-2 break-words max-w-full overflow-auto max-h-[200px] pr-2">
                                  {treatment.instructions}
                                </p>
                              )}

                              <div className="text-sm text-gray-500 mt-2 flex flex-wrap items-center gap-4">
                                {treatment.frequency && <span>Frecuencia: {treatment.frequency}</span>}
                                {treatment.duration && <span>Duración: {treatment.duration}</span>}
                                <span className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Registrado el {formatDate(treatment.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-500" />
                  Notas adicionales
                </h2>
                <Button variant="outline" size="sm" onClick={handleNewConsultation}>
                  <FilePlus className="mr-2 h-4 w-4" />
                  Añadir consulta con notas
                </Button>
              </div>

              {consultations.filter((c) => c.notes && c.notes.trim() !== "").length === 0 ? (
                <Card>
                  <CardContent className="text-center py-10">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No hay notas adicionales</h3>
                    <p className="text-gray-500 mt-2">Añade notas adicionales desde una consulta.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-h-[600px]">
                      {sortedConsultations
                        .filter((consultation) => consultation.notes && consultation.notes.trim() !== "")
                        .map((consultation) => (
                          <div key={consultation.id} className="p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="w-full flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <h3 className="font-medium">{formatDate(consultation.consultation_date)}</h3>
                                    <span className="text-gray-500">-</span>
                                    <span className="font-medium">
                                      {consultation.chief_complaint || "Consulta médica"}
                                    </span>
                                  </div>
                                  <Badge
                                    className={getConsultationStatusColor(consultation.status as ConsultationStatus)}
                                  >
                                    {getConsultationStatusText(consultation.status as ConsultationStatus)}
                                  </Badge>
                                </div>

                                <p className="text-gray-700 mt-2 break-words max-w-full overflow-auto max-h-[200px] pr-2 whitespace-pre-wrap">
                                  {consultation.notes}
                                </p>

                                <div className="flex items-center text-sm text-gray-500 mt-2">
                                  {consultation.professional && (
                                    <span className="flex items-center">
                                      <User className="h-3 w-3 mr-1" />
                                      {consultation.professional.name}
                                    </span>
                                  )}
                                  <span className="flex items-center ml-3">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatDateTime(consultation.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
