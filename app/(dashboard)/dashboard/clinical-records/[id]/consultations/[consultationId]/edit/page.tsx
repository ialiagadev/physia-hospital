"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ConsultationStatus } from "@/types/clinical"

interface Professional {
  id: number
  name: string
}

interface Diagnosis {
  id?: number
  description: string
  code: string | null
  type: string
  is_primary: boolean
  isNew?: boolean
  isDeleted?: boolean
}

interface Treatment {
  id?: number
  description: string
  instructions: string | null
  frequency: string | null
  duration: string | null
  status: string
  isNew?: boolean
  isDeleted?: boolean
}

interface FollowUp {
  id?: number
  scheduled_date: string
  description: string
  status: string
  professional_id: string | null
  isNew?: boolean
  isDeleted?: boolean
}

export default function EditConsultationPage({
  params,
}: {
  params: { id: string; consultationId: string }
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [recordData, setRecordData] = useState<any>(null)
  const [loadingRecord, setLoadingRecord] = useState(true)

  // Estado para los datos de la consulta
  const [consultationData, setConsultationData] = useState({
    consultation_date: "",
    chief_complaint: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    notes: "",
    status: "" as ConsultationStatus,
    professional_id: "",
  })

  // Estado para diagnósticos, tratamientos y seguimientos
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])

  // Estado para validación
  const [formErrors, setFormErrors] = useState({
    chief_complaint: false,
    consultation_date: false,
  })

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener la historia clínica
        const { data: record, error: recordError } = await supabase
          .from("clinical_records")
          .select(`
            *,
            patient:clients(id, name, tax_id),
            professional:professionals(id, name),
            organization:organizations(id, name)
          `)
          .eq("id", params.id)
          .single()

        if (recordError) throw new Error(`Error al obtener la historia clínica: ${recordError.message}`)
        setRecordData(record)

        // Obtener profesionales de la misma organización
        const { data: professionalsData, error: professionalsError } = await supabase
          .from("professionals")
          .select("id, name")
          .eq("organization_id", record.organization_id)
          .eq("active", true)
          .order("name")

        if (professionalsError) throw new Error(`Error al obtener los profesionales: ${professionalsError.message}`)
        setProfessionals(professionalsData || [])

        // Obtener la consulta específica
        const { data: consultation, error: consultationError } = await supabase
          .from("clinical_consultations")
          .select("*")
          .eq("id", params.consultationId)
          .single()

        if (consultationError) throw new Error(`Error al obtener la consulta: ${consultationError.message}`)

        // Establecer los datos de la consulta
        setConsultationData({
          consultation_date: consultation.consultation_date || new Date().toISOString().split("T")[0],
          chief_complaint: consultation.chief_complaint || "",
          subjective: consultation.subjective || "",
          objective: consultation.objective || "",
          assessment: consultation.assessment || "",
          plan: consultation.plan || "",
          notes: consultation.notes || "",
          status: consultation.status as ConsultationStatus,
          professional_id: consultation.professional_id ? consultation.professional_id.toString() : "",
        })

        // Obtener diagnósticos asociados a esta consulta
        const { data: diagnosesData, error: diagnosesError } = await supabase
          .from("clinical_diagnoses")
          .select("*")
          .eq("consultation_id", params.consultationId)

        if (diagnosesError) throw new Error(`Error al obtener los diagnósticos: ${diagnosesError.message}`)
        setDiagnoses(diagnosesData || [])

        // Obtener tratamientos asociados a esta consulta
        const { data: treatmentsData, error: treatmentsError } = await supabase
          .from("clinical_treatments")
          .select("*")
          .eq("consultation_id", params.consultationId)

        if (treatmentsError) throw new Error(`Error al obtener los tratamientos: ${treatmentsError.message}`)
        setTreatments(treatmentsData || [])

        // Obtener seguimientos asociados a esta consulta
        const { data: followUpsData, error: followUpsError } = await supabase
          .from("clinical_follow_ups")
          .select("*")
          .eq("clinical_record_id", params.id)

        if (followUpsError) throw new Error(`Error al obtener los seguimientos: ${followUpsError.message}`)
        setFollowUps(followUpsData || [])
      } catch (err) {
        console.error("Error al cargar los datos:", err)
        setError(err instanceof Error ? err.message : "Error al cargar los datos")
      } finally {
        setLoadingRecord(false)
      }
    }

    fetchData()
  }, [params.id, params.consultationId])

  // Manejar cambios en los campos de la consulta
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setConsultationData((prev) => ({ ...prev, [name]: value }))

    // Validar campos requeridos
    if (formErrors[name as keyof typeof formErrors] !== undefined) {
      setFormErrors((prev) => ({ ...prev, [name]: value.trim() === "" }))
    }
  }

  // Manejar cambios en los selects
  const handleSelectChange = (name: string, value: string) => {
    setConsultationData((prev) => ({ ...prev, [name]: value }))
  }

  // Manejar cambios en los diagnósticos
  const handleDiagnosisChange = (index: number, field: keyof Diagnosis, value: any) => {
    const updatedDiagnoses = [...diagnoses]
    updatedDiagnoses[index] = {
      ...updatedDiagnoses[index],
      [field]: value,
    }
    setDiagnoses(updatedDiagnoses)
  }

  // Añadir nuevo diagnóstico
  const handleAddDiagnosis = () => {
    setDiagnoses([
      ...diagnoses,
      {
        description: "",
        code: null,
        type: "primary",
        is_primary: false,
        isNew: true,
      },
    ])
  }

  // Eliminar diagnóstico
  const handleRemoveDiagnosis = (index: number) => {
    const updatedDiagnoses = [...diagnoses]
    if (updatedDiagnoses[index].id) {
      // Si ya existe en la base de datos, marcarlo como eliminado
      updatedDiagnoses[index] = {
        ...updatedDiagnoses[index],
        isDeleted: true,
      }
      setDiagnoses(updatedDiagnoses)
    } else {
      // Si es nuevo, simplemente eliminarlo del array
      updatedDiagnoses.splice(index, 1)
      setDiagnoses(updatedDiagnoses)
    }
  }

  // Manejar cambios en los tratamientos
  const handleTreatmentChange = (index: number, field: keyof Treatment, value: any) => {
    const updatedTreatments = [...treatments]
    updatedTreatments[index] = {
      ...updatedTreatments[index],
      [field]: value,
    }
    setTreatments(updatedTreatments)
  }

  // Añadir nuevo tratamiento
  const handleAddTreatment = () => {
    setTreatments([
      ...treatments,
      {
        description: "",
        instructions: null,
        frequency: null,
        duration: null,
        status: "active",
        isNew: true,
      },
    ])
  }

  // Eliminar tratamiento
  const handleRemoveTreatment = (index: number) => {
    const updatedTreatments = [...treatments]
    if (updatedTreatments[index].id) {
      // Si ya existe en la base de datos, marcarlo como eliminado
      updatedTreatments[index] = {
        ...updatedTreatments[index],
        isDeleted: true,
      }
      setTreatments(updatedTreatments)
    } else {
      // Si es nuevo, simplemente eliminarlo del array
      updatedTreatments.splice(index, 1)
      setTreatments(updatedTreatments)
    }
  }

  // Manejar cambios en los seguimientos
  const handleFollowUpChange = (index: number, field: keyof FollowUp, value: any) => {
    const updatedFollowUps = [...followUps]
    updatedFollowUps[index] = {
      ...updatedFollowUps[index],
      [field]: value,
    }
    setFollowUps(updatedFollowUps)
  }

  // Añadir nuevo seguimiento
  const handleAddFollowUp = () => {
    setFollowUps([
      ...followUps,
      {
        scheduled_date: new Date().toISOString().split("T")[0],
        description: "",
        status: "pending",
        professional_id: consultationData.professional_id || null,
        isNew: true,
      },
    ])
  }

  // Eliminar seguimiento
  const handleRemoveFollowUp = (index: number) => {
    const updatedFollowUps = [...followUps]
    if (updatedFollowUps[index].id) {
      // Si ya existe en la base de datos, marcarlo como eliminado
      updatedFollowUps[index] = {
        ...updatedFollowUps[index],
        isDeleted: true,
      }
      setFollowUps(updatedFollowUps)
    } else {
      // Si es nuevo, simplemente eliminarlo del array
      updatedFollowUps.splice(index, 1)
      setFollowUps(updatedFollowUps)
    }
  }

  // Validar formulario
  const validateForm = () => {
    const newErrors = {
      chief_complaint: consultationData.chief_complaint.trim() === "",
      consultation_date: consultationData.consultation_date === "",
    }

    setFormErrors(newErrors)
    return !Object.values(newErrors).some(Boolean)
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor, completa todos los campos requeridos.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Actualizar la consulta
      const { error: consultationError } = await supabase
        .from("clinical_consultations")
        .update({
          consultation_date: consultationData.consultation_date,
          chief_complaint: consultationData.chief_complaint,
          subjective: consultationData.subjective || null,
          objective: consultationData.objective || null,
          assessment: consultationData.assessment || null,
          plan: consultationData.plan || null,
          notes: consultationData.notes || null,
          status: consultationData.status,
          professional_id:
            consultationData.professional_id && consultationData.professional_id !== "none"
              ? Number(consultationData.professional_id)
              : null,
        })
        .eq("id", params.consultationId)

      if (consultationError) throw new Error(`Error al actualizar la consulta: ${consultationError.message}`)

      // Procesar diagnósticos
      for (const diagnosis of diagnoses) {
        if (diagnosis.isDeleted && diagnosis.id) {
          // Eliminar diagnóstico
          const { error: deleteError } = await supabase.from("clinical_diagnoses").delete().eq("id", diagnosis.id)

          if (deleteError) {
            console.error("Error al eliminar el diagnóstico:", deleteError)
          }
        } else if (diagnosis.isNew) {
          // Crear nuevo diagnóstico
          if (diagnosis.description.trim()) {
            const { error: createError } = await supabase.from("clinical_diagnoses").insert({
              clinical_record_id: params.id,
              consultation_id: params.consultationId,
              description: diagnosis.description,
              code: diagnosis.code,
              type: diagnosis.type || "primary",
              is_primary: diagnosis.is_primary,
            })

            if (createError) {
              console.error("Error al crear el diagnóstico:", createError)
            }
          }
        } else if (diagnosis.id) {
          // Actualizar diagnóstico existente
          const { error: updateError } = await supabase
            .from("clinical_diagnoses")
            .update({
              description: diagnosis.description,
              code: diagnosis.code,
              type: diagnosis.type,
              is_primary: diagnosis.is_primary,
            })
            .eq("id", diagnosis.id)

          if (updateError) {
            console.error("Error al actualizar el diagnóstico:", updateError)
          }
        }
      }

      // Procesar tratamientos
      for (const treatment of treatments) {
        if (treatment.isDeleted && treatment.id) {
          // Eliminar tratamiento
          const { error: deleteError } = await supabase.from("clinical_treatments").delete().eq("id", treatment.id)

          if (deleteError) {
            console.error("Error al eliminar el tratamiento:", deleteError)
          }
        } else if (treatment.isNew) {
          // Crear nuevo tratamiento
          if (treatment.description.trim()) {
            const { error: createError } = await supabase.from("clinical_treatments").insert({
              clinical_record_id: params.id,
              consultation_id: params.consultationId,
              description: treatment.description,
              instructions: treatment.instructions,
              frequency: treatment.frequency,
              duration: treatment.duration,
              status: treatment.status,
            })

            if (createError) {
              console.error("Error al crear el tratamiento:", createError)
            }
          }
        } else if (treatment.id) {
          // Actualizar tratamiento existente
          const { error: updateError } = await supabase
            .from("clinical_treatments")
            .update({
              description: treatment.description,
              instructions: treatment.instructions,
              frequency: treatment.frequency,
              duration: treatment.duration,
              status: treatment.status,
            })
            .eq("id", treatment.id)

          if (updateError) {
            console.error("Error al actualizar el tratamiento:", updateError)
          }
        }
      }

      // Procesar seguimientos
      /*
      for (const followUp of followUps) {
        if (followUp.isDeleted && followUp.id) {
          // Eliminar seguimiento
          const { error: deleteError } = await supabase.from("clinical_follow_ups").delete().eq("id", followUp.id)

          if (deleteError) {
            console.error("Error al eliminar el seguimiento:", deleteError)
          }
        } else if (followUp.isNew) {
          // Crear nuevo seguimiento
          if (followUp.description.trim() && followUp.scheduled_date) {
            const { error: createError } = await supabase.from("clinical_follow_ups").insert({
              clinical_record_id: params.id,
              scheduled_date: followUp.scheduled_date,
              description: followUp.description,
              status: followUp.status,
              professional_id:
                followUp.professional_id && followUp.professional_id !== "none"
                  ? Number(followUp.professional_id)
                  : null,
            })

            if (createError) {
              console.error("Error al crear el seguimiento:", createError)
            }
          }
        } else if (followUp.id) {
          // Actualizar seguimiento existente
          const { error: updateError } = await supabase
            .from("clinical_follow_ups")
            .update({
              scheduled_date: followUp.scheduled_date,
              description: followUp.description,
              status: followUp.status,
              professional_id:
                followUp.professional_id && followUp.professional_id !== "none"
                  ? Number(followUp.professional_id)
                  : null,
            })
            .eq("id", followUp.id)

          if (updateError) {
            console.error("Error al actualizar el seguimiento:", updateError)
          }
        }
      }
      */

      toast({
        title: "Consulta actualizada",
        description: "La consulta se ha actualizado correctamente.",
      })

      // Redirigir a la página de detalle de la historia clínica
      router.push(`/dashboard/clinical-records/${params.id}`)
    } catch (err) {
      console.error("Error completo:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar la consulta")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al actualizar la consulta",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingRecord) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!recordData) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">No se pudo cargar la historia clínica</p>
        <Button className="mt-4" onClick={() => router.push("/dashboard/clinical-records")}>
          Volver a historias clínicas
        </Button>
      </div>
    )
  }

  // Obtener el diagnóstico principal si existe
  const primaryDiagnosis = diagnoses.find((d) => d.is_primary && !d.isDeleted)
  // Obtener el primer tratamiento si existe
  const firstTreatment = treatments.find((t) => !t.isDeleted)
  // Obtener el primer seguimiento si existe
  const firstFollowUp = followUps.find((f) => !f.isDeleted)

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/dashboard" },
            { label: "Historias Clínicas", href: "/dashboard/clinical-records" },
            { label: recordData.title, href: `/dashboard/clinical-records/${params.id}` },
            {
              label: "Editar Consulta",
              href: `/dashboard/clinical-records/${params.id}/consultations/${params.consultationId}/edit`,
            },
          ]}
        />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Consulta</CardTitle>
            <CardDescription>
              Edita información sobre la consulta, diagnóstico, tratamiento y seguimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fecha y Motivo de consulta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="consultation_date">Fecha de consulta</Label>
                <Input
                  id="consultation_date"
                  name="consultation_date"
                  type="date"
                  value={consultationData.consultation_date}
                  onChange={handleChange}
                  className={formErrors.consultation_date ? "border-red-500" : ""}
                />
                {formErrors.consultation_date && (
                  <p className="text-sm text-red-500">La fecha de consulta es obligatoria</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="chief_complaint">Motivo de consulta</Label>
                <Input
                  id="chief_complaint"
                  name="chief_complaint"
                  value={consultationData.chief_complaint}
                  onChange={handleChange}
                  placeholder="¿Por qué viene el paciente?"
                  className={formErrors.chief_complaint ? "border-red-500" : ""}
                />
                {formErrors.chief_complaint && (
                  <p className="text-sm text-red-500">El motivo de consulta es obligatorio</p>
                )}
              </div>
            </div>

            {/* Evaluación */}
            <div className="space-y-2">
              <Label htmlFor="assessment">Evaluación</Label>
              <Textarea
                id="assessment"
                name="assessment"
                value={consultationData.assessment || ""}
                onChange={handleChange}
                placeholder="Evaluación clínica del paciente"
                rows={4}
              />
            </div>

            {/* Diagnóstico */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnóstico</Label>
              <Textarea
                id="diagnosis"
                value={primaryDiagnosis?.description || ""}
                onChange={(e) => {
                  if (primaryDiagnosis) {
                    handleDiagnosisChange(diagnoses.indexOf(primaryDiagnosis), "description", e.target.value)
                  } else {
                    // Si no hay diagnóstico principal, crear uno nuevo
                    setDiagnoses([
                      ...diagnoses,
                      {
                        description: e.target.value,
                        code: null,
                        type: "primary",
                        is_primary: true,
                        isNew: true,
                      },
                    ])
                  }
                }}
                placeholder="Diagnóstico principal"
                rows={3}
              />
            </div>

            {/* Tratamiento */}
            <div className="space-y-2">
              <Label htmlFor="treatment">Tratamiento</Label>
              <Textarea
                id="treatment"
                value={firstTreatment?.description || ""}
                onChange={(e) => {
                  if (firstTreatment) {
                    handleTreatmentChange(treatments.indexOf(firstTreatment), "description", e.target.value)
                  } else {
                    // Si no hay tratamiento, crear uno nuevo
                    setTreatments([
                      ...treatments,
                      {
                        description: e.target.value,
                        instructions: null,
                        frequency: null,
                        duration: null,
                        status: "active",
                        isNew: true,
                      },
                    ])
                  }
                }}
                placeholder="Tratamiento recomendado"
                rows={3}
              />
            </div>

            {/* Notas adicionales */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                name="notes"
                value={consultationData.notes || ""}
                onChange={handleChange}
                placeholder="Notas adicionales sobre la consulta"
                rows={4}
              />
            </div>

            {/* Profesional y Estado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="professional_id">Profesional</Label>
                <Select
                  value={consultationData.professional_id}
                  onValueChange={(value) => handleSelectChange("professional_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un profesional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {professionals.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id.toString()}>
                        {professional.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado de la consulta</Label>
                <Select
                  value={consultationData.status}
                  onValueChange={(value) => handleSelectChange("status", value as ConsultationStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="in_progress">En progreso</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/clinical-records/${params.id}`)}
          >
            Cancelar
          </Button>

          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/clinical-records/${params.id}/consultations/new`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Añadir otra consulta
            </Button>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
