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
import { Shield, CheckCircle, AlertCircle, Building2, Mail, Phone, MapPin } from "lucide-react"
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

  // ✅ CHECKBOXES SEGÚN LA BASE DE DATOS
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [documentReadUnderstood, setDocumentReadUnderstood] = useState(false)
  const [marketingNotificationsAccepted, setMarketingNotificationsAccepted] = useState(false)

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

  const handleSign = async () => {
    if (!fullName.trim() || !dni.trim() || !signature) {
      setError("Por favor, complete todos los campos requeridos")
      return
    }

    // ✅ VALIDAR CHECKBOXES OBLIGATORIOS
    if (!termsAccepted || !documentReadUnderstood) {
      setError("Debe aceptar los consentimientos obligatorios marcados con *")
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
        marketingNotificationsAccepted,
      })

      const response = await fetch("/api/consent/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: params.token,
          full_name: fullName,
          dni: dni,
          signature: signature,
          terms_accepted: termsAccepted,
          document_read_understood: documentReadUnderstood,
          marketing_notifications_accepted: marketingNotificationsAccepted,
        }),
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

        {/* ✅ LAYOUT SIMPLIFICADO - 2 COLUMNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Consent Form Content - Más ancho */}
          <div className="lg:col-span-2">
            <Card>
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
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: consentData.consent_form.content }}
                />
              </CardContent>
            </Card>
          </div>

          {/* ✅ FORMULARIO DE FIRMA SIMPLIFICADO */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
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

                {/* ✅ CHECKBOXES SEGÚN BASE DE DATOS */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Consentimientos requeridos:</Label>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      />
                      <Label htmlFor="terms" className="text-xs leading-relaxed">
                        <span className="text-red-500">*</span> Doy mi consentimiento para el tratamiento de mis datos
                        conforme a las finalidades descritas.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="document"
                        checked={documentReadUnderstood}
                        onCheckedChange={(checked) => setDocumentReadUnderstood(checked as boolean)}
                      />
                      <Label htmlFor="document" className="text-xs leading-relaxed">
                        <span className="text-red-500">*</span> Autorizo las comunicaciones automatizadas por asistente
                        virtual de IA y el uso de los canales indicados.
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="marketing"
                        checked={marketingNotificationsAccepted}
                        onCheckedChange={(checked) => setMarketingNotificationsAccepted(checked as boolean)}
                      />
                      <Label htmlFor="marketing" className="text-xs leading-relaxed">
                        Doy mi consentimiento para recibir información comercial y promociones.
                      </Label>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    <span className="text-red-500">*</span> Campos obligatorios
                  </p>
                </div>

                <Separator />

                {/* Firma */}
                <div>
                  <Label className="text-sm">Firma digital</Label>
                  <SignaturePad onSignatureChange={setSignature} />
                  <p className="text-xs text-gray-500 mt-1">Firme usando su dedo o ratón</p>
                  {signature && (
                    <Button variant="outline" size="sm" onClick={() => setSignature(null)} className="mt-2">
                      Borrar firma
                    </Button>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleSign}
                  disabled={
                    signing ||
                    !fullName.trim() ||
                    !dni.trim() ||
                    !signature ||
                    !termsAccepted ||
                    !documentReadUnderstood
                  }
                  className="w-full"
                >
                  {signing ? "Firmando..." : "Firmar consentimiento"}
                </Button>

                {/* ✅ INFO ORGANIZACIÓN SIMPLIFICADA */}
                {consentData.organization && (
                  <div className="pt-4 border-t">
                    <div className="text-xs text-gray-600 space-y-1">
                      <p className="font-medium">{consentData.organization.name}</p>
                      {consentData.organization.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {consentData.organization.address}, {consentData.organization.city}
                          </span>
                        </div>
                      )}
                      {consentData.organization.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{consentData.organization.email}</span>
                        </div>
                      )}
                      {consentData.organization.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
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
