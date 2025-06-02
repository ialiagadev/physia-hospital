"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ConsultationStatus } from "@/types/clinical"

interface Professional {
  id: number
  name: string
}

export default function NewConsultationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [recordData, setRecordData] = useState<any>(null)
  const [loadingRecord, setLoadingRecord] = useState(true)
  const [consultationCount, setConsultationCount] = useState(0)

  // Estado para los datos de la consulta
  const [consultationData, setConsultationData] = useState({
    consultation_date: new Date().toISOString().split("T")[0],
    chief_complaint: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    notes: "",
    status: "completed" as ConsultationStatus,
    professional_id: "",
    diagnosis: "",
    treatment: "",
    follow_up_date: "",
    follow_up_notes: "",
  })

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

        // Si hay un profesional asignado a la historia clínica, usarlo por defecto
        if (record.professional_id) {
          setConsultationData((prev) => ({
            ...prev,
            professional_id: record.professional_id.toString(),
          }))
        }

        // Obtener profesionales de la misma organización
        const { data: professionalsData, error: professionalsError } = await supabase
          .from("professionals")
          .select("id, name")
          .eq("organization_id", record.organization_id)
          .eq("active", true)
          .order("name")

        if (professionalsError) throw new Error(`Error al obtener los profesionales: ${professionalsError.message}`)
        setProfessionals(professionalsData || [])

        // Contar el número de consultas existentes
        const { count, error: countError } = await supabase
          .from("clinical_consultations")
          .select("*", { count: "exact", head: true })
          .eq("clinical_record_id", params.id)

        if (countError) throw new Error(`Error al contar las consultas: ${countError.message}`)
        setConsultationCount(count || 0)
      } catch (err) {
        console.error("Error al cargar los datos:", err)
        setError(err instanceof Error ? err.message : "Error al cargar los datos")
      } finally {
        setLoadingRecord(false)
      }
    }

    fetchData()
  }, [params.id])

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
      // Crear la consulta
      const { data: newConsultation, error: consultationError } = await supabase
        .from("clinical_consultations")
        .insert({
          clinical_record_id: params.id,
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
        .select()
        .single()

      if (consultationError) throw new Error(`Error al crear la consulta: ${consultationError.message}`)

      // Si hay diagnóstico, crearlo
      if (consultationData.diagnosis) {
        const { error: diagnosisError } = await supabase.from("clinical_diagnoses").insert({
          clinical_record_id: params.id,
          consultation_id: newConsultation.id,
          description: consultationData.diagnosis,
          code: null,
          type: "primary",
          is_primary: true,
        })

        if (diagnosisError) {
          console.error("Error al crear el diagnóstico:", diagnosisError)
        }
      }

      // Si hay tratamiento, crearlo
      if (consultationData.treatment) {
        const { error: treatmentError } = await supabase.from("clinical_treatments").insert({
          clinical_record_id: params.id,
          consultation_id: newConsultation.id,
          description: consultationData.treatment,
          instructions: null,
          frequency: null,
          duration: null,
          status: "active",
        })

        if (treatmentError) {
          console.error("Error al crear el tratamiento:", treatmentError)
        }
      }

      // Si hay seguimiento, crearlo
      if (consultationData.follow_up_date) {
        const { error: followupError } = await supabase.from("clinical_follow_ups").insert({
          clinical_record_id: params.id,
          consultation_id: newConsultation.id,
          scheduled_date: consultationData.follow_up_date,
          status: "pending",
          description: consultationData.follow_up_notes || "Seguimiento programado",
          professional_id:
            consultationData.professional_id && consultationData.professional_id !== "none"
              ? Number(consultationData.professional_id)
              : null,
        })

        if (followupError) {
          console.error("Error al crear el seguimiento:", followupError)
        }
      }

      // Actualizar el estado de la historia clínica si es necesario
      if (recordData.status !== "active" && recordData.status !== "follow_up") {
        const { error: updateError } = await supabase
          .from("clinical_records")
          .update({ status: "active" })
          .eq("id", params.id)

        if (updateError) {
          console.error("Error al actualizar el estado de la historia clínica:", updateError)
        }
      }

      toast({
        title: "Consulta creada",
        description: "La consulta se ha creado correctamente.",
      })

      // Redirigir a la página de detalle de la historia clínica
      router.push(`/dashboard/clinical-records/${params.id}`)
    } catch (err) {
      console.error("Error completo:", err)
      setError(err instanceof Error ? err.message : "Error al crear la consulta")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al crear la consulta",
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

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Inicio", href: "/dashboard" },
            { label: "Historias Clínicas", href: "/dashboard/clinical-records" },
            { label: recordData.title, href: `/dashboard/clinical-records/${params.id}` },
            { label: "Nueva Consulta", href: `/dashboard/clinical-records/${params.id}/consultations/new` },
          ]}
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Nueva Consulta</h1>
          <p className="text-gray-500 mt-1">
            Historia clínica: {recordData.title} - Paciente: {recordData.patient?.name}
          </p>
        </div>
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
            <CardTitle>Consulta {consultationCount + 1}</CardTitle>
            <CardDescription>
              Añade información sobre la consulta, diagnóstico, tratamiento y seguimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="consultation_date">
                  Fecha de consulta <span className="text-red-500">*</span>
                </Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="chief_complaint">
                Motivo de consulta <span className="text-red-500">*</span>
              </Label>
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

            <div className="space-y-2">
              <Label htmlFor="assessment">Evaluación</Label>
              <Textarea
                id="assessment"
                name="assessment"
                value={consultationData.assessment}
                onChange={handleChange}
                placeholder="Evaluación clínica del paciente"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnóstico</Label>
              <Textarea
                id="diagnosis"
                name="diagnosis"
                value={consultationData.diagnosis}
                onChange={handleChange}
                placeholder="Diagnóstico principal"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment">Tratamiento</Label>
              <Textarea
                id="treatment"
                name="treatment"
                value={consultationData.treatment}
                onChange={handleChange}
                placeholder="Tratamiento recomendado"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="follow_up_date">Fecha de seguimiento</Label>
                <Input
                  id="follow_up_date"
                  name="follow_up_date"
                  type="date"
                  value={consultationData.follow_up_date}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="follow_up_notes">Notas de seguimiento</Label>
                <Textarea
                  id="follow_up_notes"
                  name="follow_up_notes"
                  value={consultationData.follow_up_notes}
                  onChange={handleChange}
                  placeholder="Notas para el seguimiento"
                  rows={2}
                />
              </div>
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
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/clinical-records/${params.id}`)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Consulta"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
