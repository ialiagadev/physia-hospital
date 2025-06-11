"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { PlusCircle, Trash2 } from "lucide-react"
import type { ClinicalRecordStatus } from "@/types/clinical"

interface Client {
  id: number
  name: string
  tax_id: string
}

interface Professional {
  id: number
  name: string
}

interface ConsultationData {
  consultation_date: string
  chief_complaint: string
  evaluation: string
  diagnosis: string
  treatment: string
  notes: string
}

export default function NewClinicalRecordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [organizations, setOrganizations] = useState<{ id: number; name: string }[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<string>("")

  // Estado base para información de historia clínica
  const [formData, setFormData] = useState({
    // Datos básicos de la historia clínica
    title: "",
    patient_id: "",
    professional_id: "",
    organization_id: "",
    start_date: new Date().toISOString().split("T")[0],
    description: "",
    status: "active" as ClinicalRecordStatus,
  })

  // Estado para múltiples consultas
  const [consultations, setConsultations] = useState<ConsultationData[]>([
    {
      consultation_date: new Date().toISOString().split("T")[0],
      chief_complaint: "",
      evaluation: "",
      diagnosis: "",
      treatment: "",
      notes: "",
    },
  ])

  const [formErrors, setFormErrors] = useState({
    title: false,
    patient_id: false,
    organization_id: false,
    start_date: false,
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener organizaciones
        const { data: orgsData, error: orgsError } = await supabase
          .from("organizations")
          .select("id, name")
          .order("name")

        if (orgsError) throw new Error("Error al obtener las organizaciones")
        setOrganizations(orgsData || [])

        if (orgsData && orgsData.length > 0) {
          setSelectedOrganization(orgsData[0].id.toString())
          setFormData((prev) => ({ ...prev, organization_id: orgsData[0].id.toString() }))

          // Cargar clientes y profesionales para esta organización
          await fetchClientsAndProfessionals(orgsData[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar los datos")
      }
    }

    fetchData()
  }, [])

  const fetchClientsAndProfessionals = async (organizationId: number) => {
    try {
      // Obtener clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, tax_id")
        .eq("organization_id", organizationId)
        .order("name")

      if (clientsError) throw new Error("Error al obtener los clientes")
      setClients(clientsData || [])

      // Obtener profesionales
      const { data: professionalsData, error: professionalsError } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("name")

      if (professionalsError) throw new Error("Error al obtener los profesionales")
      setProfessionals(professionalsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los datos relacionados")
    }
  }

  const handleOrganizationChange = async (value: string) => {
    setSelectedOrganization(value)
    setFormData((prev) => ({ ...prev, organization_id: value, patient_id: "", professional_id: "" }))
    await fetchClientsAndProfessionals(Number(value))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Validar campo si es requerido
    if (formErrors[name as keyof typeof formErrors] !== undefined) {
      setFormErrors((prev) => ({ ...prev, [name]: value.trim() === "" }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    // Si es professional_id y el valor es "none", establecer un valor vacío en lugar de null
    if (name === "professional_id" && value === "none") {
      setFormData((prev) => ({ ...prev, [name]: "" }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    // Validar campo si es requerido
    if (formErrors[name as keyof typeof formErrors] !== undefined) {
      setFormErrors((prev) => ({ ...prev, [name]: value === "" }))
    }
  }

  // Manejar cambios en las consultas
  const handleConsultationChange = (index: number, field: keyof ConsultationData, value: string) => {
    const updatedConsultations = [...consultations]
    updatedConsultations[index] = {
      ...updatedConsultations[index],
      [field]: value,
    }
    setConsultations(updatedConsultations)
  }

  // Añadir nueva consulta
  const handleAddConsultation = () => {
    setConsultations([
      ...consultations,
      {
        consultation_date: new Date().toISOString().split("T")[0],
        chief_complaint: "",
        evaluation: "",
        diagnosis: "",
        treatment: "",
        notes: "",
      },
    ])
  }

  // Eliminar consulta
  const handleRemoveConsultation = (index: number) => {
    if (consultations.length <= 1) {
      // No permitir eliminar la única consulta
      return
    }

    const updatedConsultations = [...consultations]
    updatedConsultations.splice(index, 1)
    setConsultations(updatedConsultations)
  }

  const validateForm = () => {
    const newErrors = {
      title: formData.title.trim() === "",
      patient_id: formData.patient_id === "",
      organization_id: formData.organization_id === "",
      start_date: formData.start_date === "",
    }

    setFormErrors(newErrors)
    return !Object.values(newErrors).some(Boolean)
  }

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
      // Insertar nueva historia clínica
      const { data: recordData, error: recordError } = await supabase
        .from("clinical_records")
        .insert({
          title: formData.title,
          patient_id: Number(formData.patient_id),
          professional_id: formData.professional_id ? Number(formData.professional_id) : null, // Usar NULL en lugar de 0
          organization_id: Number(formData.organization_id),
          start_date: formData.start_date,
          description: formData.description || null,
          status: formData.status,
        })
        .select()

      if (recordError) {
        console.error("Error detallado:", recordError)
        throw new Error(`Error al crear la historia clínica: ${recordError.message}`)
      }

      if (!recordData || recordData.length === 0) {
        throw new Error("No se pudo crear la historia clínica. No se recibieron datos de respuesta.")
      }

      const newRecord = recordData[0]

      // Guardar cada consulta
      for (const consultation of consultations) {
        if (
          consultation.chief_complaint ||
          consultation.evaluation ||
          consultation.diagnosis ||
          consultation.treatment
        ) {
          // Crear la consulta
          const { data: consultationData, error: consultationError } = await supabase
            .from("clinical_consultations")
            .insert({
              clinical_record_id: newRecord.id,
              chief_complaint: consultation.chief_complaint || "Consulta",
              consultation_date: consultation.consultation_date,
              subjective: "",
              objective: "",
              assessment: consultation.evaluation || null,
              plan: consultation.treatment || null,
              notes: "",
              status: "completed",
              professional_id: formData.professional_id ? Number(formData.professional_id) : null, // Usar NULL en lugar de 0
            })
            .select()
            .single()

          if (consultationError) {
            console.error("Error al crear la consulta:", consultationError)
            continue // Continuar con la siguiente consulta
          }

          // Si hay diagnóstico, crearlo asociado a la consulta y a la historia clínica
          if (consultation.diagnosis) {
            const { error: diagnosisError } = await supabase.from("clinical_diagnoses").insert({
              clinical_record_id: newRecord.id,
              consultation_id: consultationData.id,
              description: consultation.diagnosis,
              code: null,
              type: "primary",
              is_primary: true,
            })

            if (diagnosisError) {
              console.error("Error al crear el diagnóstico:", diagnosisError)
            }
          }

          // Si hay tratamiento, crearlo asociado a la consulta y a la historia clínica
          if (consultation.treatment) {
            const { error: treatmentError } = await supabase.from("clinical_treatments").insert({
              clinical_record_id: newRecord.id,
              consultation_id: consultationData.id,
              description: consultation.treatment,
              instructions: null,
              frequency: null,
              duration: null,
              status: "active",
            })

            if (treatmentError) {
              console.error("Error al crear el tratamiento:", treatmentError)
            }
          }

          // Guardar las notas adicionales en el campo notes de la consulta
          if (consultation.notes) {
            const { error: updateError } = await supabase
              .from("clinical_consultations")
              .update({ notes: consultation.notes })
              .eq("id", consultationData.id)

            if (updateError) {
              console.error("Error al guardar las notas adicionales:", updateError)
            }
          }
        }
      }

      toast({
        title: "Historia clínica creada",
        description: "La historia clínica se ha creado correctamente.",
      })

      // Redirigir a la página de detalle
      router.push(`/dashboard/clinical-records/${newRecord.id}`)
    } catch (err) {
      console.error("Error completo:", err)
      setError(err instanceof Error ? err.message : "Error al crear la historia clínica")
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al crear la historia clínica",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNewClient = () => {
    // Guardar el estado actual del formulario en sessionStorage para recuperarlo después
    sessionStorage.setItem("pendingClinicalRecord", JSON.stringify({ formData, consultations }))
    // Redirigir a la página de creación de cliente
    router.push("/dashboard/clients/new")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Nueva Historia Clínica</h1>
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Historias Clínicas", href: "/dashboard/clinical-records" },
            { label: "Nueva Historia", href: "/dashboard/clinical-records/new" },
          ]}
        />
      </div>

      <form onSubmit={handleSubmit}>
        {/* Información básica */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información de la Historia Clínica</CardTitle>
            <CardDescription>Introduce los datos básicos para crear una nueva historia clínica.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="organization_id">
                Organización <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.organization_id} onValueChange={(value) => handleOrganizationChange(value)}>
                <SelectTrigger className={formErrors.organization_id ? "border-red-500" : ""}>
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
              {formErrors.organization_id && <p className="text-sm text-red-500">Selecciona una organización</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={formErrors.title ? "border-red-500" : ""}
              />
              {formErrors.title && <p className="text-sm text-red-500">El título es obligatorio</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="patient_id">
                    Paciente <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-blue-600 hover:text-blue-800"
                    onClick={handleCreateNewClient}
                  >
                    <PlusCircle className="mr-1 h-4 w-4" />
                    Nuevo paciente
                  </Button>
                </div>
                <Select value={formData.patient_id} onValueChange={(value) => handleSelectChange("patient_id", value)}>
                  <SelectTrigger className={formErrors.patient_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecciona un paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name} - {client.tax_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.patient_id && <p className="text-sm text-red-500">Selecciona un paciente</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="professional_id">
                  Profesional <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Select
                  value={formData.professional_id}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">
                  Fecha de inicio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={formErrors.start_date ? "border-red-500" : ""}
                />
                {formErrors.start_date && <p className="text-sm text-red-500">La fecha de inicio es obligatoria</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado inicial</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleSelectChange("status", value as ClinicalRecordStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="follow_up">En seguimiento</SelectItem>
                    <SelectItem value="pending_review">Pendiente de revisión</SelectItem>
                    <SelectItem value="resolved">Resuelta</SelectItem>
                    <SelectItem value="archived">Archivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe brevemente el motivo de la historia clínica"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Consultas, diagnósticos y seguimientos - Una sección por consulta */}
        {consultations.map((consultation, index) => (
          <Card key={index} className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{index === 0 ? "Consulta Inicial" : `Consulta ${index + 1}`}</CardTitle>
                  <CardDescription>
                    Añade información sobre la consulta, diagnóstico, tratamiento y seguimiento
                  </CardDescription>
                </div>
                {consultations.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveConsultation(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`consultation_date_${index}`}>Fecha de consulta</Label>
                  <Input
                    id={`consultation_date_${index}`}
                    type="date"
                    value={consultation.consultation_date}
                    onChange={(e) => handleConsultationChange(index, "consultation_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`chief_complaint_${index}`}>Motivo de consulta</Label>
                  <Input
                    id={`chief_complaint_${index}`}
                    value={consultation.chief_complaint}
                    onChange={(e) => handleConsultationChange(index, "chief_complaint", e.target.value)}
                    placeholder="¿Por qué viene el paciente?"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`evaluation_${index}`}>Evaluación</Label>
                <Textarea
                  id={`evaluation_${index}`}
                  value={consultation.evaluation}
                  onChange={(e) => handleConsultationChange(index, "evaluation", e.target.value)}
                  placeholder="Evaluación clínica del paciente"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`diagnosis_${index}`}>Diagnóstico</Label>
                <Textarea
                  id={`diagnosis_${index}`}
                  value={consultation.diagnosis}
                  onChange={(e) => handleConsultationChange(index, "diagnosis", e.target.value)}
                  placeholder="Diagnóstico principal"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`treatment_${index}`}>Tratamiento</Label>
                <Textarea
                  id={`treatment_${index}`}
                  value={consultation.treatment}
                  onChange={(e) => handleConsultationChange(index, "treatment", e.target.value)}
                  placeholder="Tratamiento recomendado"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`notes_${index}`}>Notas adicionales</Label>
                <Textarea
                  id={`notes_${index}`}
                  value={consultation.notes || ""}
                  onChange={(e) => handleConsultationChange(index, "notes", e.target.value)}
                  placeholder="Notas adicionales sobre la consulta"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Botón para añadir otra consulta */}
        <div className="mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={handleAddConsultation}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir otra consulta
          </Button>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/clinical-records")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Historia Clínica"}
          </Button>
        </div>
      </form>
    </div>
  )
}
