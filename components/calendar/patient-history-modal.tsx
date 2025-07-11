"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Clock,
  ExternalLink,
  Stethoscope,
  Mic,
  MicOff,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCcw,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Client } from "@/types/calendar"

interface PatientFollowUp {
  id: number
  client_id: number
  follow_up_date: string
  follow_up_type: string
  description: string
  recommendations?: string
  next_appointment_note?: string
  professional_name?: string
  created_at: string
}

interface MedicalHistory {
  id: number
  client_id: number
  motivo_consulta?: string
  diagnostico?: string
  seguimiento?: string
  medicacion?: string
  recomendaciones?: string
  observaciones_clinicas?: string
  profesional_nombre?: string
  created_at: string
}

interface PatientHistoryModalProps {
  client: Client | null
  isOpen: boolean
  onClose: () => void
  isEmbedded?: boolean
}

export function PatientHistoryModal({ client, isOpen, onClose, isEmbedded = false }: PatientHistoryModalProps) {
  const [followUps, setFollowUps] = useState<PatientFollowUp[]>([])
  const [medicalHistories, setMedicalHistories] = useState<MedicalHistory[]>([])
  const [loading, setLoading] = useState(false)

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null)

  // Form states
  const [followUpType, setFollowUpType] = useState("CONSULTA")
  const [description, setDescription] = useState("")
  const [recommendations, setRecommendations] = useState("")
  const [originalDescription, setOriginalDescription] = useState("")
  const [originalRecommendations, setOriginalRecommendations] = useState("")

  // AI enhancement states
  const [isEnhancing, setIsEnhancing] = useState(false)

  // Expanded states for follow-ups
  const [expandedFollowUps, setExpandedFollowUps] = useState<Set<number>>(new Set())
  const [expandedHistories, setExpandedHistories] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (client && (isOpen || isEmbedded)) {
      fetchPatientData()
    }
  }, [client, isOpen, isEmbedded])

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
      setRecordingInterval(interval)
    } else {
      if (recordingInterval) {
        clearInterval(recordingInterval)
        setRecordingInterval(null)
      }
      setRecordingTime(0)
    }

    return () => {
      if (recordingInterval) {
        clearInterval(recordingInterval)
      }
    }
  }, [isRecording])

  const fetchPatientData = async () => {
    if (!client) return

    setLoading(true)
    try {
      const { data: followUpsData, error: followUpsError } = await supabase
        .from("patient_follow_ups")
        .select(`
          id,
          client_id,
          follow_up_date,
          follow_up_type,
          description,
          recommendations,
          next_appointment_note,
          professional_name,
          created_at
        `)
        .eq("client_id", client.id)
        .eq("is_active", true)
        .order("follow_up_date", { ascending: false })
        .limit(10)

      if (followUpsError) {
        console.log("Error fetching follow-ups:", followUpsError)
        setFollowUps([])
      } else {
        setFollowUps(followUpsData || [])
      }

      const { data: historiesData, error: historiesError } = await supabase
        .from("medical_histories")
        .select(`
          id,
          client_id,
          motivo_consulta,
          diagnostico,
          seguimiento,
          medicacion,
          recomendaciones,
          observaciones_clinicas,
          profesional_nombre,
          created_at
        `)
        .eq("client_id", client.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5)

      if (historiesError) {
        console.log("Error fetching medical histories:", historiesError)
        setMedicalHistories([])
      } else {
        setMedicalHistories(historiesData || [])
      }
    } catch (error) {
      console.error("Error fetching patient data:", error)
    } finally {
      setLoading(false)
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
        stream.getTracks().forEach((track) => track.stop())

        // Auto-process after recording stops
        if (chunks.length > 0) {
          await processVoiceRecording(chunks)
        }
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      toast.success("Grabación iniciada")
    } catch (error) {
      console.error("Error starting recording:", error)
      toast.error("Error al acceder al micrófono")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
      setIsProcessing(true)
      toast.info("Procesando grabación...")
    }
  }

  const processVoiceRecording = async (audioChunks: Blob[]) => {
    setIsProcessing(true)
    try {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" })
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      formData.append("clientName", client?.name || "")

      const response = await fetch("/api/voice-followup", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error processing voice recording")
      }

      const result = await response.json()

      const newDescription = result.description || ""
      const newRecommendations = result.recommendations || ""

      setDescription(newDescription)
      setRecommendations(newRecommendations)
      setOriginalDescription(newDescription)
      setOriginalRecommendations(newRecommendations)
      setFollowUpType(result.followUpType || "CONSULTA")

      toast.success("Grabación procesada correctamente")
    } catch (error) {
      console.error("Error processing voice:", error)
      toast.error("Error al procesar la grabación")
    } finally {
      setIsProcessing(false)
    }
  }

  const enhanceWithAI = async () => {
    if (!description.trim()) {
      toast.error("No hay contenido para mejorar")
      return
    }

    setIsEnhancing(true)
    try {
      const response = await fetch("/api/enhance-followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          recommendations,
          followUpType,
          clientName: client?.name || "",
        }),
      })

      if (!response.ok) {
        throw new Error("Error enhancing content")
      }

      const result = await response.json()

      setDescription(result.description || description)
      setRecommendations(result.recommendations || recommendations)

      toast.success("Contenido mejorado con IA")
    } catch (error) {
      console.error("Error enhancing content:", error)
      toast.error("Error al mejorar el contenido")
    } finally {
      setIsEnhancing(false)
    }
  }

  const resetToOriginal = () => {
    setDescription(originalDescription)
    setRecommendations(originalRecommendations)
    toast.info("Contenido restaurado")
  }

  const saveFollowUp = async () => {
    if (!client || !description.trim()) {
      toast.error("La descripción es requerida")
      return
    }

    try {
      const { error } = await supabase.from("patient_follow_ups").insert({
        client_id: client.id,
        organization_id: client.organization_id,
        follow_up_date: new Date().toISOString().split("T")[0],
        follow_up_type: followUpType,
        description: description.trim(),
        recommendations: recommendations.trim() || null,
        professional_name: "Dr. Usuario",
        is_active: true,
      })

      if (error) throw error

      toast.success("Seguimiento guardado correctamente")

      setDescription("")
      setRecommendations("")
      setOriginalDescription("")
      setOriginalRecommendations("")
      setFollowUpType("CONSULTA")
      setShowAddForm(false)
      await fetchPatientData()
    } catch (error) {
      console.error("Error saving follow-up:", error)
      toast.error("Error al guardar el seguimiento")
    }
  }

  const toggleFollowUpExpanded = (id: number) => {
    const newExpanded = new Set(expandedFollowUps)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedFollowUps(newExpanded)
  }

  const toggleHistoryExpanded = (id: number) => {
    const newExpanded = new Set(expandedHistories)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedHistories(newExpanded)
  }

  const openFullHistory = () => {
    if (client) {
      window.open(`/clients/${client.id}`, "_blank")
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (!client) return null

  // Render embedded version (for side-by-side display)
  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Historial Médico</h2>
              <p className="text-sm text-gray-600">{client.name}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              Seguimiento
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Add Follow-up Form */}
            <Collapsible open={showAddForm} onOpenChange={setShowAddForm}>
              <CollapsibleContent>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">Nuevo Seguimiento</h3>
                    <div className="flex items-center gap-2">
                      {/* Recording Button */}
                      <Button
                        variant={isRecording ? "destructive" : "outline"}
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isProcessing}
                        className="h-7 px-2 text-xs"
                      >
                        {isRecording ? (
                          <>
                            <MicOff className="h-3 w-3 mr-1" />
                            Parar {formatTime(recordingTime)}
                          </>
                        ) : (
                          <>
                            <Mic className="h-3 w-3 mr-1" />
                            Grabar
                          </>
                        )}
                      </Button>

                      {isProcessing && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Procesando...
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Select value={followUpType} onValueChange={setFollowUpType}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONSULTA">Consulta</SelectItem>
                        <SelectItem value="REVISION">Revisión</SelectItem>
                        <SelectItem value="TRATAMIENTO">Tratamiento</SelectItem>
                        <SelectItem value="EVALUACION">Evaluación</SelectItem>
                        <SelectItem value="SEGUIMIENTO">Seguimiento</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-700">Descripción</label>
                        <div className="flex gap-1">
                          {description.trim() && originalDescription && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={resetToOriginal}
                              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Original
                            </Button>
                          )}
                          {description.trim() && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={enhanceWithAI}
                              disabled={isEnhancing}
                              className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              {isEnhancing ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="h-3 w-3 mr-1" />
                              )}
                              Mejorar IA
                            </Button>
                          )}
                        </div>
                      </div>
                      <Textarea
                        placeholder="Descripción del seguimiento..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="text-sm min-h-[80px] resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700">Recomendaciones</label>
                      <Textarea
                        placeholder="Recomendaciones (opcional)..."
                        value={recommendations}
                        onChange={(e) => setRecommendations(e.target.value)}
                        className="text-sm min-h-[60px] resize-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={saveFollowUp}
                        size="sm"
                        className="h-8 px-3 text-sm"
                        disabled={!description.trim()}
                      >
                        Guardar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAddForm(false)
                          setDescription("")
                          setRecommendations("")
                          setOriginalDescription("")
                          setOriginalRecommendations("")
                        }}
                        size="sm"
                        className="h-8 px-3 text-sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Seguimientos recientes */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    Seguimientos Recientes ({followUps.length})
                  </h4>
                  {followUps.length > 0 ? (
                    <div className="space-y-2">
                      {followUps.map((followUp) => (
                        <div key={followUp.id} className="bg-green-50 rounded-lg border border-green-200">
                          <div
                            className="p-3 cursor-pointer hover:bg-green-100 transition-colors"
                            onClick={() => toggleFollowUpExpanded(followUp.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                                  {format(new Date(followUp.follow_up_date), "d MMM", { locale: es })}
                                </Badge>
                                <span className="text-xs text-green-600 uppercase tracking-wide">
                                  {followUp.follow_up_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {followUp.professional_name && (
                                  <span className="text-xs text-green-600">{followUp.professional_name}</span>
                                )}
                                {expandedFollowUps.has(followUp.id) ? (
                                  <ChevronUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {followUp.description.length > 100
                                ? `${followUp.description.substring(0, 100)}...`
                                : followUp.description}
                            </p>
                          </div>

                          <Collapsible open={expandedFollowUps.has(followUp.id)}>
                            <CollapsibleContent>
                              <div className="px-3 pb-3 border-t border-green-200 pt-3 space-y-3">
                                <div>
                                  <h5 className="text-xs font-medium text-gray-700 mb-2">Descripción completa:</h5>
                                  <div className="max-h-40 overflow-y-auto bg-white rounded p-3 border">
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                      {followUp.description}
                                    </p>
                                  </div>
                                </div>
                                {followUp.recommendations && (
                                  <div>
                                    <h5 className="text-xs font-medium text-gray-700 mb-2">Recomendaciones:</h5>
                                    <div className="max-h-32 overflow-y-auto bg-white rounded p-3 border">
                                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {followUp.recommendations}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Sin seguimientos registrados</p>
                  )}
                </div>

                {/* Consultas recientes */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-purple-600" />
                    Consultas Recientes ({medicalHistories.length})
                  </h4>
                  {medicalHistories.length > 0 ? (
                    <div className="space-y-2">
                      {medicalHistories.map((history) => (
                        <div key={history.id} className="bg-purple-50 rounded-lg border border-purple-200">
                          <div
                            className="p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                            onClick={() => toggleHistoryExpanded(history.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-xs text-purple-700 border-purple-300">
                                {format(new Date(history.created_at), "d MMM", { locale: es })}
                              </Badge>
                              <div className="flex items-center gap-2">
                               
                                {expandedHistories.has(history.id) ? (
                                  <ChevronUp className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-purple-600" />
                                )}
                              </div>
                            </div>
                            {history.diagnostico && (
                              <p className="text-sm text-gray-800">
                                <span className="font-medium">Diagnóstico:</span> {history.diagnostico}
                              </p>
                            )}
                          </div>

                          <Collapsible open={expandedHistories.has(history.id)}>
                            <CollapsibleContent>
                              <div className="px-3 pb-3 border-t border-purple-200 pt-3 space-y-3">
                                {history.motivo_consulta && (
                                  <div>
                                    <h5 className="text-xs font-medium text-gray-700 mb-2">Motivo de consulta:</h5>
                                    <div className="max-h-32 overflow-y-auto bg-white rounded p-3 border">
                                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {history.motivo_consulta}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {history.medicacion && (
                                  <div>
                                    <h5 className="text-xs font-medium text-gray-700 mb-2">Medicación:</h5>
                                    <div className="max-h-32 overflow-y-auto bg-white rounded p-3 border">
                                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {history.medicacion}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {history.recomendaciones && (
                                  <div>
                                    <h5 className="text-xs font-medium text-gray-700 mb-2">Recomendaciones:</h5>
                                    <div className="max-h-32 overflow-y-auto bg-white rounded p-3 border">
                                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                        {history.recomendaciones}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Sin consultas registradas</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 px-6 pb-4 flex-shrink-0">
          <Button onClick={openFullHistory} variant="outline" size="sm" className="w-full gap-2 bg-transparent">
            <ExternalLink className="h-4 w-4" />
            Ver Historial Completo
          </Button>
        </div>
      </div>
    )
  }

  // Render standalone modal version (same content structure)
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Same content as embedded version */}
      </DialogContent>
    </Dialog>
  )
}
