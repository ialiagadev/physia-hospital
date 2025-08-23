"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Activity,
  Calendar,
  Check,
  Edit,
  Plus,
  Save,
  Trash2,
  X,
  TrendingUp,
  Clock,
  User,
  FileText,
  Mic,
  Square,
  Sparkles,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  getPatientFollowUps,
  createPatientFollowUp,
  updatePatientFollowUp,
  deletePatientFollowUp,
  getFollowUpStats,
  type PatientFollowUpData,
} from "@/lib/actions/patient-follow-ups"
import type { PatientFollowUp, PatientFollowUpFormData, FollowUpStats } from "@/types/patient-follow-ups"
import { FOLLOW_UP_TYPES } from "@/types/patient-follow-ups"
import { useAuth } from "@/app/contexts/auth-context"

interface PatientFollowUpSectionProps {
  clientId: string
  clientName: string
}

export function PatientFollowUpSection({ clientId, clientName }: PatientFollowUpSectionProps) {
  const [followUps, setFollowUps] = useState<PatientFollowUp[]>([])
  const [stats, setStats] = useState<FollowUpStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isImprovingText, setIsImprovingText] = useState(false) // Added state for AI text improvement
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const { toast } = useToast()
  const { userProfile } = useAuth()

  const [formData, setFormData] = useState<PatientFollowUpFormData>({
    followUpDate: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    followUpType: "Seguimiento general",
    description: "",
    recommendations: "",
    nextAppointmentNote: "",
  })

  // Cargar seguimientos y estadísticas
  useEffect(() => {
    loadFollowUps()
    loadStats()
  }, [clientId])

  const loadFollowUps = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await getPatientFollowUps(clientId)
      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        })
      } else if (data) {
        setFollowUps(data)
      }
    } catch (error) {
      console.error("Error loading follow-ups:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data, error } = await getFollowUpStats(clientId)
      if (!error && data) {
        setStats(data)
      }
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const handleCreateFollowUp = async () => {
    if (!formData.description.trim()) {
      toast({
        title: "Campo requerido",
        description: "La descripción es obligatoria",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const followUpData: PatientFollowUpData = {
        followUpDate: new Date(formData.followUpDate).toISOString(),
        followUpType: formData.followUpType,
        description: formData.description,
        recommendations: formData.recommendations || undefined,
        nextAppointmentNote: formData.nextAppointmentNote || undefined,
        professionalName: userProfile?.name || undefined,
      }

      const { data, error } = await createPatientFollowUp(clientId, followUpData)

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Seguimiento creado",
          description: "El seguimiento se ha guardado correctamente",
        })

        // Resetear formulario
        setFormData({
          followUpDate: new Date().toISOString().slice(0, 16),
          followUpType: "Seguimiento general",
          description: "",
          recommendations: "",
          nextAppointmentNote: "",
        })

        setIsEditing(false)
        await loadFollowUps()
        await loadStats()
      }
    } catch (error) {
      console.error("Error creating follow-up:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el seguimiento",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateFollowUp = async (id: number) => {
    const followUp = followUps.find((f) => f.id === id)
    if (!followUp) return

    // Obtener valores de los inputs
    const typeElement = document.getElementById(`tipo-${id}`) as HTMLSelectElement
    const descriptionElement = document.getElementById(`descripcion-${id}`) as HTMLTextAreaElement
    const recommendationsElement = document.getElementById(`recomendaciones-${id}`) as HTMLTextAreaElement
    const nextAppointmentElement = document.getElementById(`proximaCita-${id}`) as HTMLInputElement

    if (!descriptionElement?.value.trim()) {
      toast({
        title: "Campo requerido",
        description: "La descripción es obligatoria",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const followUpData: PatientFollowUpData = {
        followUpDate: followUp.follow_up_date,
        followUpType: typeElement?.value || followUp.follow_up_type,
        description: descriptionElement?.value || followUp.description,
        recommendations: recommendationsElement?.value || undefined,
        nextAppointmentNote: nextAppointmentElement?.value || undefined,
        professionalName: userProfile?.name || followUp.professional_name,
      }

      const { error } = await updatePatientFollowUp(id, followUpData)

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Seguimiento actualizado",
          description: "El seguimiento se ha actualizado correctamente",
        })

        setEditingId(null)
        await loadFollowUps()
        await loadStats()
      }
    } catch (error) {
      console.error("Error updating follow-up:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el seguimiento",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteFollowUp = async (id: number) => {
    setIsSaving(true)
    try {
      const { error } = await deletePatientFollowUp(id)

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Seguimiento eliminado",
          description: "El seguimiento se ha eliminado correctamente",
        })

        await loadFollowUps()
        await loadStats()
      }
    } catch (error) {
      console.error("Error deleting follow-up:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el seguimiento",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setShowDeleteConfirm(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
    } catch {
      return dateString
    }
  }

  const formatDateShort = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "dd/MM/yyyy", { locale: es })
    } catch {
      return dateString
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" })
        await transcribeAudio(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setAudioChunks(chunks)
      setIsRecording(true)

      toast({
        title: "Grabación iniciada",
        description: "Habla ahora para dictar el seguimiento",
      })
    } catch (error) {
      console.error("Error accessing microphone:", error)
      toast({
        title: "Error",
        description: "No se pudo acceder al micrófono",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error en la transcripción")
      }

      const { text } = await response.json()

      setFormData((prev) => ({
        ...prev,
        description: prev.description ? `${prev.description}\n\n${text}` : text,
      }))

      toast({
        title: "Transcripción completada",
        description: "El texto se ha añadido a la descripción",
      })
    } catch (error) {
      console.error("Error transcribing audio:", error)
      toast({
        title: "Error",
        description: "No se pudo transcribir el audio",
        variant: "destructive",
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const improveTextWithAI = async () => {
    if (!formData.description.trim()) {
      toast({
        title: "No hay texto",
        description: "Escribe o dicta una descripción primero",
        variant: "destructive",
      })
      return
    }

    setIsImprovingText(true)
    try {
      const response = await fetch("/api/improve-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: formData.description,
          context: "medical_followup",
        }),
      })

      if (!response.ok) {
        throw new Error("Error mejorando el texto")
      }

      const { improvedText } = await response.json()

      setFormData((prev) => ({
        ...prev,
        description: improvedText,
      }))

      toast({
        title: "Texto mejorado",
        description: "El texto ha sido mejorado con IA",
      })
    } catch (error) {
      console.error("Error improving text:", error)
      toast({
        title: "Error",
        description: "No se pudo mejorar el texto",
        variant: "destructive",
      })
    } finally {
      setIsImprovingText(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Seguimiento del Paciente</h2>
          <p className="text-gray-500 mt-1">{clientName}</p>
          <div className="mt-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Mic className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">SEGUIMIENTO POR VOZ</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Disponible
                </span>
              </div>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Usa el botón de micrófono para dictar tus seguimientos directamente
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          disabled={isSaving}
          className={isEditing ? "bg-gray-200 text-gray-800" : "bg-teal-600 hover:bg-teal-700"}
        >
          {isEditing ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Seguimiento
            </>
          )}
        </Button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-sm text-gray-500">Total Seguimientos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFollowUps}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Último Seguimiento</p>
                  <p className="text-sm font-medium text-gray-900">
                    {stats.lastFollowUp ? formatDateShort(stats.lastFollowUp) : "Sin registros"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">Tipo Más Común</p>
                  <p className="text-sm font-medium text-gray-900">{stats.mostCommonType || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Este Mes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.followUpsByMonth.find((m) => m.month === new Date().toISOString().slice(0, 7))?.count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulario para nuevo seguimiento */}
      {isEditing && (
        <Card className="border-teal-200 bg-teal-50">
          <CardHeader>
            <CardTitle className="text-teal-800">Nuevo Seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-tipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Seguimiento
                </label>
                <Select
                  value={formData.followUpType}
                  onValueChange={(value) => setFormData({ ...formData, followUpType: value })}
                >
                  <SelectTrigger id="new-tipo">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLLOW_UP_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="new-fecha" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha y Hora
                </label>
                <Input
                  id="new-fecha"
                  type="datetime-local"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="new-descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción / Evolución <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={startRecording}
                      disabled={isTranscribing}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Mic className="w-4 h-4 mr-1" />
                      Dictar
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={stopRecording}
                      className="bg-red-600 hover:bg-red-700 text-white animate-pulse"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Detener
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={improveTextWithAI}
                    disabled={isImprovingText || isRecording || !formData.description.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    {isImprovingText ? "Mejorando..." : "Mejorar con IA"}
                  </Button>
                </div>
                {isTranscribing && <span className="text-sm text-blue-600">Transcribiendo...</span>}
              </div>
              <Textarea
                id="new-descripcion"
                placeholder="Descripción detallada de la evolución del paciente... (o usa el botón de micrófono para dictar)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <label htmlFor="new-recomendaciones" className="block text-sm font-medium text-gray-700 mb-1">
                Recomendaciones
              </label>
              <Textarea
                id="new-recomendaciones"
                placeholder="Recomendaciones para el paciente..."
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="new-proximaCita" className="block text-sm font-medium text-gray-700 mb-1">
                Próxima Cita
              </label>
              <Input
                id="new-proximaCita"
                placeholder="Ej: En 2 semanas, En 1 mes, etc."
                value={formData.nextAppointmentNote}
                onChange={(e) => setFormData({ ...formData, nextAppointmentNote: e.target.value })}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleCreateFollowUp}
                disabled={isSaving || isRecording}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Guardando..." : "Guardar Seguimiento"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de seguimientos */}
      {followUps.length > 0 ? (
        <div className="space-y-4">
          {followUps.map((followUp) => (
            <Card key={followUp.id} className="border-gray-200">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-teal-100 text-teal-800">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{followUp.follow_up_type}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{formatDate(followUp.follow_up_date)}</span>
                        {followUp.professional_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {followUp.professional_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === followUp.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateFollowUp(followUp.id)}
                          disabled={isSaving}
                          className="h-8 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                          className="h-8"
                          disabled={isSaving}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : showDeleteConfirm === followUp.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleDeleteFollowUp(followUp.id)}
                          disabled={isSaving}
                          className="h-8 bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isSaving ? "Eliminando..." : "Confirmar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(null)}
                          className="h-8"
                          disabled={isSaving}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(followUp.id)}
                          className="h-8"
                          disabled={isSaving}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(followUp.id)}
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isSaving}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-4 py-3 space-y-4">
                {editingId === followUp.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Seguimiento</label>
                      <select
                        id={`tipo-${followUp.id}`}
                        defaultValue={followUp.follow_up_type}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        {FOLLOW_UP_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / Evolución</label>
                      <Textarea id={`descripcion-${followUp.id}`} defaultValue={followUp.description} rows={4} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recomendaciones</label>
                      <Textarea
                        id={`recomendaciones-${followUp.id}`}
                        defaultValue={followUp.recommendations || ""}
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Próxima Cita</label>
                      <Input id={`proximaCita-${followUp.id}`} defaultValue={followUp.next_appointment_note || ""} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Descripción / Evolución</h4>
                      <p className="text-gray-800 whitespace-pre-wrap">{followUp.description}</p>
                    </div>

                    {followUp.recommendations && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Recomendaciones</h4>
                        <p className="text-gray-800 whitespace-pre-wrap">{followUp.recommendations}</p>
                      </div>
                    )}

                    {followUp.next_appointment_note && (
                      <div className="flex items-center gap-2 text-sm text-teal-700">
                        <Calendar className="w-4 h-4" />
                        <span>Próxima cita: {followUp.next_appointment_note}</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No hay seguimientos registrados</h3>
          <p className="text-gray-500">
            {isEditing
              ? "Añade un nuevo seguimiento usando el formulario de arriba."
              : "No hay registros de seguimiento disponibles para este paciente."}
          </p>
        </div>
      )}
    </div>
  )
}
