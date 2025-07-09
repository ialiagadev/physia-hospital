"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SignaturePad } from "@/components/signature-pad"
import { Loader2, CheckCircle, AlertTriangle, FileText, Shield, Clock } from "lucide-react"
import type { ConsentForm, ConsentToken } from "@/types/consent"

interface TokenData {
  token: ConsentToken
  consentForm: ConsentForm
  client: {
    id: number
    name: string
    tax_id: string
  }
}

export default function ConsentPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSigning, setIsSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tokenData, setTokenData] = useState<TokenData | null>(null)

  // Formulario
  const [patientName, setPatientName] = useState("")
  const [patientTaxId, setPatientTaxId] = useState("")
  const [signature, setSignature] = useState<string | null>(null)
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Cargar datos del token
  useEffect(() => {
    const loadTokenData = async () => {
      try {
        const response = await fetch(`/api/consent/validate-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: params.token }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Token inválido")
        }

        setTokenData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar el consentimiento")
      } finally {
        setIsLoading(false)
      }
    }

    loadTokenData()
  }, [params.token])

  const handleSign = async () => {
    if (!tokenData || !signature) return

    // Validaciones
    if (!patientName.trim()) {
      setError("El nombre es obligatorio")
      return
    }

    if (!patientTaxId.trim()) {
      setError("El DNI/CIF es obligatorio")
      return
    }

    if (!acceptTerms) {
      setError("Debe aceptar los términos para continuar")
      return
    }

    // Validar identidad básica (nombre y DNI deben coincidir)
    const nameMatch = patientName.toLowerCase().trim() === tokenData.client.name.toLowerCase().trim()
    const taxIdMatch = patientTaxId.toUpperCase().trim() === tokenData.client.tax_id?.toUpperCase().trim()

    if (!nameMatch || !taxIdMatch) {
      setError("Los datos introducidos no coinciden con los registros del paciente")
      return
    }

    setIsSigning(true)
    setError(null)

    try {
      const response = await fetch("/api/consent/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          patient_name: patientName,
          patient_tax_id: patientTaxId,
          signature_base64: signature,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al firmar el consentimiento")
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al firmar el consentimiento")
    } finally {
      setIsSigning(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Cargando consentimiento...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !tokenData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Enlace no válido</h2>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <p className="text-sm text-gray-500 text-center">
              El enlace puede haber expirado o ya haber sido utilizado. Contacte con su centro médico para obtener un
              nuevo enlace.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">¡Consentimiento firmado!</h2>
            <p className="text-gray-600 text-center mb-4">Su consentimiento ha sido registrado correctamente.</p>
            <p className="text-sm text-gray-500 text-center">
              Puede cerrar esta ventana. Su centro médico ha sido notificado.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tokenData) return null

  const { token, consentForm, client } = tokenData
  const isExpired = new Date(token.expires_at) < new Date()

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-orange-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Enlace expirado</h2>
            <p className="text-gray-600 text-center mb-4">Este enlace de consentimiento ha expirado.</p>
            <p className="text-sm text-gray-500 text-center">
              Contacte con su centro médico para obtener un nuevo enlace.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Consentimiento Informado</h1>
          </div>
          <p className="text-gray-600">
            Paciente: <span className="font-medium">{client.name}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Documento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {consentForm.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: consentForm.content }} />
            </CardContent>
          </Card>

          {/* Formulario de firma */}
          <Card>
            <CardHeader>
              <CardTitle>Firmar consentimiento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Validación de identidad */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patientName">Nombre completo</Label>
                  <Input
                    id="patientName"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Introduzca su nombre completo"
                    disabled={isSigning}
                  />
                </div>

                <div>
                  <Label htmlFor="patientTaxId">DNI/CIF</Label>
                  <Input
                    id="patientTaxId"
                    value={patientTaxId}
                    onChange={(e) => setPatientTaxId(e.target.value)}
                    placeholder="Introduzca su DNI o CIF"
                    disabled={isSigning}
                  />
                </div>
              </div>

              {/* Firma */}
              <div>
                <Label>Firma digital</Label>
                <div className="mt-2">
                  <SignaturePad onSignatureChange={setSignature} disabled={isSigning} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Firme en el recuadro superior usando su dedo o ratón</p>
              </div>

              {/* Aceptación */}
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  disabled={isSigning}
                  className="mt-1"
                />
                <Label htmlFor="acceptTerms" className="text-sm leading-5">
                  He leído y entendido el contenido de este consentimiento informado. Acepto el tratamiento propuesto y
                  confirmo que toda la información proporcionada es correcta.
                </Label>
              </div>

              {/* Botón de firma */}
              <Button
                onClick={handleSign}
                disabled={!signature || !patientName || !patientTaxId || !acceptTerms || isSigning}
                className="w-full"
                size="lg"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Firmando...
                  </>
                ) : (
                  "Firmar consentimiento"
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Al firmar, acepta que su firma digital tiene la misma validez legal que una firma manuscrita.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-500">
          <p>Este documento es confidencial y está protegido por la normativa de protección de datos.</p>
          <p>Enlace válido hasta: {new Date(token.expires_at).toLocaleDateString("es-ES")}</p>
        </div>
      </div>
    </div>
  )
}
