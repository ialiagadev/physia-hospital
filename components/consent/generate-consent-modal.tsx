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
import { FileText, Link, Copy, AlertCircle, Building2, Clock, User, Mail, Check } from "lucide-react"
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
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null)
  const [copied, setCopied] = useState(false) // ✅ NUEVO: Estado para mostrar feedback de copiado
  const [formData, setFormData] = useState({
    consent_form_id: "",
    patient_name: clientName || "",
    patient_email: "",
    notes: "",
    expiration_days: 7,
  })

  useEffect(() => {
    if (isOpen && userProfile?.organization_id) {
      loadConsentForms()
      loadOrganizationData()
      setFormData((prev) => ({ ...prev, patient_name: clientName || "" }))
    }
  }, [isOpen, userProfile, clientName])

  const loadOrganizationData = async () => {
    if (!userProfile?.organization_id) return

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userProfile.organization_id)
        .single()

      if (error) {
        throw error
      }

      setOrganizationData(data)
    } catch (error) {
      console.error("Error loading organization data:", error)
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
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        throw new Error("No se pudo obtener el token de autenticación")
      }

      const response = await fetch("/api/consent/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          client_id: clientId ? Number(clientId) : null,
          consent_form_id: formData.consent_form_id,
          expiration_days: formData.expiration_days,
          delivery_method: "manual",
          created_by: user.id,
          organization_id: userProfile.organization_id,
          organization_data: organizationData,
        }),
      })

      const result = await response.json()

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

  // ✅ MEJORADO: Función de copiar con mejor feedback visual
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)

      // Mostrar toast de confirmación
      toast({
        title: "¡Copiado!",
        description: "El enlace se ha copiado al portapapeles",
      })

      // Resetear el estado después de 2 segundos
      setTimeout(() => {
        setCopied(false)
      }, 2000)
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
    setCopied(false) // ✅ NUEVO: Resetear estado de copiado
    setFormData({
      consent_form_id: "",
      patient_name: clientName || "",
      patient_email: "",
      notes: "",
      expiration_days: 7,
    })
    onClose()
  }

  const selectedForm = forms.find((f) => f.id === formData.consent_form_id)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda - Configuración */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuración del Consentimiento</h3>

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

                {/* Datos del paciente */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Datos del Paciente
                  </h4>

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
                    <Label htmlFor="patient_email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email del Paciente (opcional)
                    </Label>
                    <Input
                      id="patient_email"
                      type="email"
                      placeholder="email@ejemplo.com"
                      value={formData.patient_email}
                      onChange={(e) => setFormData({ ...formData, patient_email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiration_days" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Días hasta expiración
                    </Label>
                    <Select
                      value={formData.expiration_days.toString()}
                      onValueChange={(value) => setFormData({ ...formData, expiration_days: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 día</SelectItem>
                        <SelectItem value="3">3 días</SelectItem>
                        <SelectItem value="7">7 días</SelectItem>
                        <SelectItem value="14">14 días</SelectItem>
                        <SelectItem value="30">30 días</SelectItem>
                      </SelectContent>
                    </Select>
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
            </div>

            {/* Columna derecha - Vista previa */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Vista Previa</h3>

                {/* Información del formulario seleccionado */}
                {selectedForm ? (
                  <div className="p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-blue-900">{selectedForm.title}</p>
                        {selectedForm.description && (
                          <p className="text-xs text-blue-700 mt-1 line-clamp-3">{selectedForm.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
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
                ) : (
                  <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Selecciona un formulario para ver la vista previa</p>
                  </div>
                )}

                {/* Resumen de configuración */}
                {formData.patient_name && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium mb-3">Resumen de Configuración</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paciente:</span>
                        <span className="font-medium">{formData.patient_name}</span>
                      </div>
                      {formData.patient_email && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{formData.patient_email}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expira en:</span>
                        <span className="font-medium">{formData.expiration_days} días</span>
                      </div>
                      {organizationData && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Organización:</span>
                          <span className="font-medium">{organizationData.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <Link className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-green-900">Enlace generado correctamente</h3>
                  <p className="text-sm text-green-700">
                    Comparte este enlace con el paciente para que pueda firmar el consentimiento
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-sm" />
                {/* ✅ MEJORADO: Botón de copiar con feedback visual */}
                <Button
                  size="sm"
                  onClick={copyToClipboard}
                  className={`transition-all duration-200 ${
                    copied ? "bg-green-600 hover:bg-green-700 text-white" : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      ¡Copiado!
                    </>
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Información del Consentimiento</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paciente:</span>
                    <span className="font-medium">{formData.patient_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Formulario:</span>
                    <span className="font-medium">{selectedForm?.title}</span>
                  </div>
                  {organizationData && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Organización:</span>
                      <span className="font-medium">{organizationData.name}</span>
                    </div>
                  )}
                  {formData.patient_email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{formData.patient_email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Configuración</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expira en:</span>
                    <span className="font-medium">{formData.expiration_days} días</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Método:</span>
                    <span className="font-medium">Enlace manual</span>
                  </div>
                  {formData.notes && (
                    <div className="mt-3">
                      <span className="text-gray-600 block mb-1">Notas:</span>
                      <p className="text-sm bg-white p-2 rounded border">{formData.notes}</p>
                    </div>
                  )}
                </div>
              </div>
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
