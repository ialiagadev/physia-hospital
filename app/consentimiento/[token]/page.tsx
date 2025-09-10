"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Shield, CheckCircle, AlertCircle, Building2, Mail, Phone, MapPin, Stethoscope } from "lucide-react"
import { SignaturePad } from "@/components/signature-pad"

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

interface ConsentData {
  token: string
  consent_form: {
    id: number
    title: string
    content: string
    category?: string
  }
  client?: {
    id: number
    name: string
    email?: string
    phone?: string
  }
  organization?: OrganizationData
  expires_at: string
  is_signed: boolean
  processing_info?: {
    has_processed_content: boolean
    placeholders_replaced: boolean
    organization_source: string | null
  }
}

export default function ConsentPage({ params }: { params: { token: string } }) {
  const [consentData, setConsentData] = useState<ConsentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)

  // Form data
  const [fullName, setFullName] = useState("")
  const [dni, setDni] = useState("")
  const [signature, setSignature] = useState<string | null>(null)

  // ✅ CHECKBOXES CON IDs ÚNICOS
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [documentReadUnderstood, setDocumentReadUnderstood] = useState(false)
  const [aiCommunicationsAccepted, setAiCommunicationsAccepted] = useState(false) // ✅ OPCIONAL
  const [marketingNotificationsAccepted, setMarketingNotificationsAccepted] = useState(false)
  const [medicalTreatmentAccepted, setMedicalTreatmentAccepted] = useState(false)

  useEffect(() => {
    validateToken()
  }, [])

  const validateToken = async () => {
    try {
      console.log("🔍 FRONTEND DEBUG - Validating token:", params.token)
      const response = await fetch("/api/consent/validate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: params.token }),
      })

      const data = await response.json()
      console.log("🔍 FRONTEND DEBUG - Response data:", {
        success: data.success,
        hasOrganization: !!data.data?.organization,
        organizationName: data.data?.organization?.name,
        placeholdersReplaced: data.data?.processing_info?.placeholders_replaced,
        category: data.data?.consent_form?.category,
      })

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Token inválido")
      }

      setConsentData(data.data)

      // Pre-fill client data if available
      if (data.data.client?.name) {
        setFullName(data.data.client.name)
      }
    } catch (err) {
      console.error("❌ FRONTEND DEBUG - Error validating token:", err)
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  // ✅ FUNCIÓN PARA DETERMINAR SI REQUIERE TRATAMIENTO MÉDICO
  const requiresMedicalTreatment = () => {
    return consentData?.consent_form?.category !== "general"
  }

  // ✅ FUNCIÓN PARA VERIFICAR SI TODOS LOS CAMPOS OBLIGATORIOS ESTÁN COMPLETOS
  const areRequiredFieldsValid = () => {
    const basicFieldsValid = fullName.trim() && dni.trim() && signature
    const requiredCheckboxesValid = termsAccepted && documentReadUnderstood
    const medicalTreatmentValid = !requiresMedicalTreatment() || medicalTreatmentAccepted

    console.log("🔍 VALIDATION DEBUG:", {
      basicFieldsValid: !!basicFieldsValid,
      termsAccepted,
      documentReadUnderstood,
      aiCommunicationsAccepted, // ✅ SOLO PARA DEBUG - NO AFECTA VALIDACIÓN
      medicalTreatmentRequired: requiresMedicalTreatment(),
      medicalTreatmentAccepted,
      medicalTreatmentValid,
      finalResult: !!(basicFieldsValid && requiredCheckboxesValid && medicalTreatmentValid),
    })

    return basicFieldsValid && requiredCheckboxesValid && medicalTreatmentValid
  }

  const handleSign = async () => {
    if (!fullName.trim() || !dni.trim() || !signature) {
      setError("Por favor, complete todos los campos requeridos")
      return
    }

    // ✅ VALIDACIÓN EXPLÍCITA SIN aiCommunicationsAccepted
    if (!termsAccepted) {
      setError("Debe aceptar el consentimiento para el tratamiento de datos")
      return
    }

    if (!documentReadUnderstood) {
      setError("Debe confirmar que ha leído y entendido el documento")
      return
    }

    if (requiresMedicalTreatment() && !medicalTreatmentAccepted) {
      setError("Debe aceptar el consentimiento para el tratamiento médico específico")
      return
    }

    setSigning(true)
    setError(null)

    try {
      console.log("🔍 FRONTEND DEBUG - Signing consent:", {
        token: params.token,
        fullName,
        dni,
        hasSignature: !!signature,
        termsAccepted,
        documentReadUnderstood,
        aiCommunicationsAccepted, // ✅ OPCIONAL - Solo para log
        marketingNotificationsAccepted,
        medicalTreatmentAccepted: requiresMedicalTreatment() ? medicalTreatmentAccepted : undefined,
        category: consentData?.consent_form?.category,
        requiresMedicalTreatment: requiresMedicalTreatment(),
      })

      const requestBody: any = {
        token: params.token,
        full_name: fullName,
        dni: dni,
        signature: signature,
        terms_accepted: termsAccepted,
        document_read_understood: documentReadUnderstood,
        marketing_notifications_accepted: marketingNotificationsAccepted,
        // ✅ NOTA: aiCommunicationsAccepted no se envía al backend
      }

      // ✅ AGREGAR TRATAMIENTO MÉDICO SOLO SI ES REQUERIDO
      if (requiresMedicalTreatment()) {
        requestBody.medical_treatment_accepted = medicalTreatmentAccepted
      }

      const response = await fetch("/api/consent/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()
      console.log("🔍 FRONTEND DEBUG - Sign response:", {
        success: data.success,
        error: data.error,
      })

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error al firmar el consentimiento")
      }

      setSigned(true)
    } catch (err) {
      console.error("❌ FRONTEND DEBUG - Error signing:", err)
      setError(err instanceof Error ? err.message : "Error al firmar")
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando enlace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Enlace no válido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              El enlace puede haber expirado o ya haber sido utilizado. Contacte con su centro médico para obtener un
              nuevo enlace.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Consentimiento Firmado</CardTitle>
            <CardDescription>Su consentimiento ha sido registrado correctamente</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">Gracias por completar el proceso. Puede cerrar esta ventana.</p>
            {consentData?.organization && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500">Documento procesado por {consentData.organization.name}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!consentData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ✅ HEADER SIMPLIFICADO */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            {consentData.organization?.logo_url ? (
              <img
                src={consentData.organization.logo_url || "/placeholder.svg"}
                alt={`Logo de ${consentData.organization.name}`}
                className="h-12 w-auto"
              />
            ) : (
              <Building2 className="h-8 w-8 text-blue-600" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{consentData.organization?.name || "Centro Médico"}</h1>
              {consentData.organization?.tax_id && (
                <p className="text-sm text-gray-600">CIF: {consentData.organization.tax_id}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Consentimiento Informado</h2>
          </div>

          {consentData.client && (
            <Badge variant="outline" className="mb-4">
              Paciente: {consentData.client.name}
            </Badge>
          )}

          {consentData.processing_info?.placeholders_replaced && (
            <Badge variant="secondary" className="text-xs">
              ✓ Documento personalizado con datos de la organización
            </Badge>
          )}
        </div>

        {/* ✅ LAYOUT MEJORADO - MÁS ADAPTABLE */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Consent Form Content - Adaptable con scroll interno */}
          <div className="lg:col-span-3">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {consentData.consent_form.title}
                </CardTitle>
                {consentData.consent_form.category && (
                  <Badge variant="outline">{consentData.consent_form.category}</Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: consentData.consent_form.content }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ✅ FORMULARIO DE FIRMA MEJORADO - STICKY Y MÁS COMPACTO */}
          <div className="lg:col-span-2">
            <Card className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Firmar consentimiento</CardTitle>
                <CardDescription>Complete los datos para firmar digitalmente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Datos básicos */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="fullName" className="text-sm">
                      Nombre completo
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nombre completo"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dni" className="text-sm">
                      DNI/CIF
                    </Label>
                    <Input
                      id="dni"
                      value={dni}
                      onChange={(e) => setDni(e.target.value)}
                      placeholder="DNI o CIF"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Separator />

                {/* ✅ CHECKBOXES COMPACTOS */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Consentimientos requeridos:</Label>

                  <div className="space-y-2">
                    {/* ✅ TRATAMIENTO DE DATOS (OBLIGATORIO) */}
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="consent-terms-data-treatment"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      />
                      <Label htmlFor="consent-terms-data-treatment" className="text-xs leading-relaxed">
                        <span className="text-red-500">*</span> Doy mi consentimiento para el tratamiento de mis datos
                        conforme a las finalidades descritas.
                      </Label>
                    </div>

                    {/* ✅ DOCUMENTO LEÍDO (OBLIGATORIO) */}
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="consent-document-read-understood"
                        checked={documentReadUnderstood}
                        onCheckedChange={(checked) => setDocumentReadUnderstood(checked as boolean)}
                      />
                      <Label htmlFor="consent-document-read-understood" className="text-xs leading-relaxed">
                        <span className="text-red-500">*</span> He leído y entendido el documento completo.
                      </Label>
                    </div>

                    {/* ✅ COMUNICACIONES DE IA (OPCIONAL) */}
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="consent-ai-communications-optional"
                        checked={aiCommunicationsAccepted}
                        onCheckedChange={(checked) => setAiCommunicationsAccepted(checked as boolean)}
                      />
                      <Label htmlFor="consent-ai-communications-optional" className="text-xs leading-relaxed">
                        Autorizo las comunicaciones automatizadas por asistente virtual de IA.
                      </Label>
                    </div>

                    {/* ✅ CHECKBOX DE TRATAMIENTO MÉDICO CONDICIONAL */}
                    {requiresMedicalTreatment() && (
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="consent-medical-treatment-required"
                          checked={medicalTreatmentAccepted}
                          onCheckedChange={(checked) => setMedicalTreatmentAccepted(checked as boolean)}
                        />
                        <Label htmlFor="consent-medical-treatment-required" className="text-xs leading-relaxed">
                          <span className="text-red-500">*</span>
                          <Stethoscope className="w-3 h-3 inline mx-1" />
                          Doy mi consentimiento para el tratamiento médico específico.
                        </Label>
                      </div>
                    )}

                    {/* ✅ MARKETING (OPCIONAL) */}
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="consent-marketing-optional"
                        checked={marketingNotificationsAccepted}
                        onCheckedChange={(checked) => setMarketingNotificationsAccepted(checked as boolean)}
                      />
                      <Label htmlFor="consent-marketing-optional" className="text-xs leading-relaxed">
                        Recibir información comercial y promociones.
                      </Label>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    <span className="text-red-500">*</span> Campos obligatorios
                  </p>
                </div>

                <Separator />

                {/* Firma - Más compacta */}
                <div>
                  <Label className="text-sm">Firma digital</Label>
                  <SignaturePad onSignatureChange={setSignature} width={300} height={150} className="mt-2" />
                  <p className="text-xs text-gray-500 mt-1">Firme usando su dedo o ratón</p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* ✅ BOTÓN DE FIRMA */}
                <Button onClick={handleSign} disabled={signing || !areRequiredFieldsValid()} className="w-full">
                  {signing ? "Firmando..." : "Firmar consentimiento"}
                </Button>

                {/* ✅ INFO ORGANIZACIÓN COMPACTA */}
                {consentData.organization && (
                  <div className="pt-3 border-t">
                    <div className="text-xs text-gray-600 space-y-1">
                      <p className="font-medium">{consentData.organization.name}</p>
                      {consentData.organization.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {consentData.organization.address}, {consentData.organization.city}
                          </span>
                        </div>
                      )}
                      {consentData.organization.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{consentData.organization.email}</span>
                        </div>
                      )}
                      {consentData.organization.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{consentData.organization.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
