"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
import { FileText, Link, Copy, AlertCircle, Building2 } from "lucide-react"
import type { ConsentForm } from "@/types/consent"

interface GenerateConsentModalProps {
  isOpen: boolean
  onClose: () => void
  clientId?: string | number
  clientName?: string
}

export function GenerateConsentModal({ isOpen, onClose, clientId, clientName }: GenerateConsentModalProps) {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [forms, setForms] = useState<ConsentForm[]>([])
  const [loadingForms, setLoadingForms] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string>("")
  const [organizationName, setOrganizationName] = useState<string>("")

  const [formData, setFormData] = useState({
    consent_form_id: "",
    patient_name: clientName || "",
    patient_email: "",
    notes: "",
  })

  useEffect(() => {
    if (isOpen && userProfile?.organization_id) {
      loadConsentForms()
      loadOrganizationName()
      setFormData((prev) => ({ ...prev, patient_name: clientName || "" }))
    }
  }, [isOpen, userProfile, clientName])

  const loadOrganizationName = async () => {
    if (!userProfile?.organization_id) return

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", userProfile.organization_id)
        .single()

      if (error) throw error
      setOrganizationName(data?.name || "")
    } catch (error) {
      console.error("Error loading organization name:", error)
    }
  }

  const loadConsentForms = async () => {
    if (!userProfile?.organization_id) return

    setLoadingForms(true)
    try {
      // Solo cargar formularios de la organización del usuario que estén activos
      const { data, error } = await supabase
        .from("consent_forms")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .eq("is_active", true)
        .order("title")

      if (error) throw error

      setForms(data || [])
    } catch (error) {
      console.error("Error loading consent forms:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los formularios de consentimiento",
        variant: "destructive",
      })
    } finally {
      setLoadingForms(false)
    }
  }

  const validateFormAccess = (formId: string): boolean => {
    if (!userProfile?.organization_id) return false
    const form = forms.find((f) => f.id === formId)
    return form ? form.organization_id === userProfile.organization_id : false
  }

  const generateConsentLink = async () => {
    if (!userProfile?.organization_id) {
      toast({
        title: "Error de organización",
        description: "No se pudo identificar tu organización",
        variant: "destructive",
      })
      return
    }

    if (!formData.consent_form_id || !formData.patient_name.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor selecciona un formulario e ingresa el nombre del paciente",
        variant: "destructive",
      })
      return
    }

    if (!validateFormAccess(formData.consent_form_id)) {
      toast({
        title: "Error de permisos",
        description: "No tienes permisos para usar este formulario",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Generar token único
      const token = crypto.randomUUID()

      // Crear registro en la base de datos
      const { error } = await supabase.from("patient_consents").insert({
        organization_id: userProfile.organization_id,
        consent_form_id: formData.consent_form_id,
        patient_name: formData.patient_name.trim(),
        patient_email: formData.patient_email.trim() || null,
        client_id: clientId ? String(clientId) : null,
        token,
        status: "pending",
        notes: formData.notes.trim() || null,
        created_by: userProfile.id,
      })

      if (error) throw error

      // Generar enlace
      const baseUrl = window.location.origin
      const link = `${baseUrl}/consentimiento/${token}`
      setGeneratedLink(link)

      toast({
        title: "Enlace generado",
        description: "El enlace de consentimiento se ha generado correctamente",
      })
    } catch (error) {
      console.error("Error generating consent link:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el enlace de consentimiento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      toast({
        title: "Enlace copiado",
        description: "El enlace se ha copiado al portapapeles",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    setGeneratedLink("")
    setFormData({
      consent_form_id: "",
      patient_name: clientName || "",
      patient_email: "",
      notes: "",
    })
    onClose()
  }

  const selectedForm = forms.find((f) => f.id === formData.consent_form_id)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Enlace de Consentimiento
          </DialogTitle>
          <DialogDescription>
            Crea un enlace personalizado para que el paciente firme el consentimiento informado
          </DialogDescription>
          {organizationName && (
            <div className="flex items-center gap-2 mt-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{organizationName}</span>
            </div>
          )}
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4">
            {/* Selección de formulario */}
            <div className="space-y-2">
              <Label>
                Formulario de Consentimiento <span className="text-red-500">*</span>
              </Label>
              {loadingForms ? (
                <div className="flex items-center gap-2 p-3 border rounded-md">
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  <span className="text-sm">Cargando formularios...</span>
                </div>
              ) : forms.length === 0 ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-yellow-50">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    No hay formularios activos disponibles en tu organización
                  </span>
                </div>
              ) : (
                <Select
                  value={formData.consent_form_id}
                  onValueChange={(value) => setFormData({ ...formData, consent_form_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un formulario" />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        <div className="flex items-center gap-2">
                          <span>{form.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {form.category}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Información del formulario seleccionado */}
            {selectedForm && (
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">{selectedForm.title}</p>
                    {selectedForm.description && (
                      <p className="text-xs text-blue-700 mt-1">{selectedForm.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {selectedForm.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Datos del paciente */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient_name">
                  Nombre del Paciente <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patient_name"
                  placeholder="Nombre completo del paciente"
                  value={formData.patient_name}
                  onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient_email">Email del Paciente (opcional)</Label>
                <Input
                  id="patient_email"
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={formData.patient_email}
                  onChange={(e) => setFormData({ ...formData, patient_email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionales sobre el consentimiento"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Link className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Enlace generado correctamente</span>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Comparte este enlace con el paciente para que pueda firmar el consentimiento
              </p>
              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-sm" />
                <Button size="sm" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Información del consentimiento:</p>
              <ul className="space-y-1">
                <li>
                  • <strong>Paciente:</strong> {formData.patient_name}
                </li>
                <li>
                  • <strong>Formulario:</strong> {selectedForm?.title}
                </li>
                {formData.patient_email && (
                  <li>
                    • <strong>Email:</strong> {formData.patient_email}
                  </li>
                )}
                {formData.notes && (
                  <li>
                    • <strong>Notas:</strong> {formData.notes}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedLink ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={generateConsentLink} disabled={loading || forms.length === 0}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Generar Enlace
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
