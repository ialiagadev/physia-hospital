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

interface OrganizationData {
  id: number
  name: string
  tax_id: string
  address?: string
  city: string
  province?: string
  postal_code?: string
  email?: string
  phone?: string
  website?: string
  logo_url?: string
}

export function GenerateConsentModal({ isOpen, onClose, clientId, clientName }: GenerateConsentModalProps) {
  const { toast } = useToast()
  const { user, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [forms, setForms] = useState<ConsentForm[]>([])
  const [loadingForms, setLoadingForms] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string>("")
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null) // ✅ CAMBIO: Datos completos
  const [formData, setFormData] = useState({
    consent_form_id: "",
    patient_name: clientName || "",
    patient_email: "",
    notes: "",
  })

  useEffect(() => {
    if (isOpen && userProfile?.organization_id) {
      loadConsentForms()
      loadOrganizationData() // ✅ CAMBIO: Cargar datos completos
      setFormData((prev) => ({ ...prev, patient_name: clientName || "" }))
    }
  }, [isOpen, userProfile, clientName])

  // ✅ CAMBIO: Cargar datos completos de la organización
  const loadOrganizationData = async () => {
    if (!userProfile?.organization_id) return

    try {
      console.log("🔍 FRONTEND - Loading organization data for ID:", userProfile.organization_id)

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userProfile.organization_id)
        .single()

      if (error) {
        console.error("❌ FRONTEND - Error loading organization:", error)
        throw error
      }

      console.log("✅ FRONTEND - Organization data loaded:", {
        id: data.id,
        name: data.name,
        tax_id: data.tax_id,
        hasAddress: !!data.address,
        hasEmail: !!data.email,
      })

      setOrganizationData(data)
    } catch (error) {
      console.error("❌ FRONTEND - Error loading organization data:", error)
      toast({
        title: "Advertencia",
        description:
          "No se pudieron cargar los datos de la organización. El consentimiento se generará sin personalizar.",
        variant: "destructive",
      })
    }
  }

  const loadConsentForms = async () => {
    if (!userProfile?.organization_id) return

    setLoadingForms(true)
    try {
      // Cargar tanto formularios globales (organization_id IS NULL) como específicos de la organización
      const { data, error } = await supabase
        .from("consent_forms")
        .select("*")
        .or(`organization_id.is.null,organization_id.eq.${userProfile.organization_id}`)
        .eq("is_active", true)
        .order("organization_id", { nullsFirst: true })
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

  const generateConsentLink = async () => {
    if (!user || !userProfile?.organization_id) {
      toast({
        title: "Error de autenticación",
        description: "No se pudo identificar tu usuario o organización",
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

    setLoading(true)
    try {
      console.log("🔍 FRONTEND - Generating consent with organization data:", {
        client_id: clientId ? Number(clientId) : null,
        consent_form_id: formData.consent_form_id,
        created_by: user.id,
        organization_id: userProfile.organization_id,
        has_organization_data: !!organizationData,
        organization_name: organizationData?.name,
      })

      const response = await fetch("/api/consent/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId ? Number(clientId) : null,
          consent_form_id: formData.consent_form_id,
          expiration_days: 7,
          delivery_method: "manual",
          created_by: user.id,
          organization_id: userProfile.organization_id,
          organization_data: organizationData, // ✅ CAMBIO: Enviar datos completos
        }),
      })

      const result = await response.json()

      // ✅ AGREGAR LOG COMPLETO
      console.log("🔍 FULL GENERATE RESPONSE:", JSON.stringify(result, null, 2))

      console.log("🔍 FRONTEND - Generate response:", {
        success: result.success,
        hasOrganization: !!result.data?.organization,
        organizationName: result.data?.organization?.name,
        placeholdersReplaced: result.data?.processing_info?.placeholders_replaced,
      })

      if (!response.ok) {
        throw new Error(result.error || "Error al generar el enlace")
      }

      if (result.success && result.data?.link) {
        setGeneratedLink(result.data.link)
        toast({
          title: "Enlace generado",
          description: `El enlace de consentimiento se ha generado correctamente${
            result.data.organization ? ` para ${result.data.organization.name}` : ""
          }${result.data.processing_info?.placeholders_replaced ? " con datos personalizados" : ""}`,
        })
      } else {
        throw new Error("Respuesta inválida del servidor")
      }
    } catch (error) {
      console.error("Error generating consent link:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el enlace de consentimiento",
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Enlace de Consentimiento
          </DialogTitle>
          <DialogDescription>
            Crea un enlace personalizado para que el paciente firme el consentimiento informado
          </DialogDescription>
          {organizationData && (
            <div className="flex items-center gap-2 mt-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{organizationData.name}</span>
              {organizationData.tax_id && (
                <Badge variant="outline" className="text-xs">
                  {organizationData.tax_id}
                </Badge>
              )}
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
                  <span className="text-sm text-yellow-700">No hay formularios activos disponibles</span>
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
                          {!form.organization_id && (
                            <Badge variant="secondary" className="text-xs">
                              Global
                            </Badge>
                          )}
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900">{selectedForm.title}</p>
                    {selectedForm.description && (
                      <p className="text-xs text-blue-700 mt-1">{selectedForm.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {selectedForm.category}
                      </Badge>
                      {!selectedForm.organization_id && (
                        <Badge variant="secondary" className="text-xs">
                          Plantilla Global
                        </Badge>
                      )}
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
                {organizationData && (
                  <li>
                    • <strong>Organización:</strong> {organizationData.name}
                  </li>
                )}
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
