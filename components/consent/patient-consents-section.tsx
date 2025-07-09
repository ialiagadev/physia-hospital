"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Plus, Eye, Clock, CheckCircle, Shield, Download, LinkIcon, FileDown } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { GenerateConsentModal } from "./generate-consent-modal"
import type { PatientConsentWithDetails, ConsentTokenWithDetails } from "@/types/consent"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface PatientConsentsSectionProps {
  clientId: number
  clientName: string
  clientEmail?: string | null
  clientPhone?: string | null
}

export function PatientConsentsSection({
  clientId,
  clientName,
  clientEmail,
  clientPhone,
}: PatientConsentsSectionProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [signedConsents, setSignedConsents] = useState<PatientConsentWithDetails[]>([])
  const [pendingTokens, setPendingTokens] = useState<ConsentTokenWithDetails[]>([])
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("signed")

  // Cargar datos
  useEffect(() => {
    loadConsentsData()
  }, [clientId])

  const loadConsentsData = async () => {
    setIsLoading(true)
    try {
      // Cargar consentimientos firmados con el contenido completo del formulario
      const { data: signedData, error: signedError } = await supabase
        .from("patient_consents")
        .select(`
          *,
          consent_forms (id, title, category, content),
          consent_tokens (created_by, sent_via)
        `)
        .eq("client_id", clientId)
        .order("signed_at", { ascending: false })

      if (signedError) throw signedError

      // Cargar tokens pendientes (no usados y no expirados)
      const { data: pendingData, error: pendingError } = await supabase
        .from("consent_tokens")
        .select(`
          *,
          consent_forms (id, title, category),
          clients (id, name, tax_id, email, phone)
        `)
        .eq("client_id", clientId)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })

      if (pendingError) throw pendingError

      setSignedConsents(signedData || [])
      setPendingTokens(pendingData || [])
    } catch (error) {
      console.error("Error loading consents:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los consentimientos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es })
  }

  const getStatusBadge = (consent: PatientConsentWithDetails) => {
    if (!consent.is_valid) {
      return <Badge variant="destructive">Inválido</Badge>
    }
    if (consent.identity_verified) {
      return (
        <Badge variant="default" className="bg-green-600">
          Verificado
        </Badge>
      )
    }
    return <Badge variant="secondary">Pendiente verificación</Badge>
  }

  const getPendingStatusBadge = (token: ConsentTokenWithDetails) => {
    const now = new Date()
    const expires = new Date(token.expires_at)
    const hoursLeft = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60 * 60))

    if (hoursLeft < 24) {
      return <Badge variant="destructive">Expira pronto</Badge>
    }
    return <Badge variant="secondary">Pendiente</Badge>
  }

  const copyConsentLink = async (token: string) => {
    const link = `https://facturas-physia.vercel.app/consentimiento/${token}`
    try {
      await navigator.clipboard.writeText(link)
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace se ha copiado al portapapeles correctamente",
      })
    } catch (error) {
      console.error("Error copying link:", error)
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const downloadConsentDocument = async (consent: PatientConsentWithDetails) => {
    try {
      // Limpiar el contenido del formulario para eliminar campos duplicados
      let cleanContent = consent.consent_forms.content || "<p>Contenido del formulario no disponible</p>"

      // Remover líneas que contengan campos de datos del paciente duplicados
      cleanContent = cleanContent
        .replace(/Datos del paciente:[\s\S]*?Fecha:\s*_+/gi, "")
        .replace(/Nombre:\s*_+[\s\S]*?DNI:\s*_+[\s\S]*?Fecha:\s*_+/gi, "")
        .replace(/Paciente:\s*_+[\s\S]*?DNI:\s*_+[\s\S]*?Fecha:\s*_+/gi, "")
        .trim()

      // Crear un documento HTML completo con el consentimiento y la firma
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Consentimiento Informado - ${consent.consent_forms.title}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px; 
              line-height: 1.6; 
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px; 
            }
            .patient-info { 
              background: #f5f5f5; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 5px; 
            }
            .content {
              margin: 30px 0;
              text-align: justify;
            }
            .signature-section { 
              margin-top: 50px; 
              border-top: 1px solid #ccc; 
              padding-top: 30px; 
            }
            .signature-box { 
              text-align: center; 
              margin: 30px 0; 
              border: 1px solid #ddd;
              padding: 20px;
              background: #fafafa;
            }
            .signature-img { 
              max-width: 300px; 
              border: 1px solid #ccc; 
              padding: 10px; 
              background: white;
            }
            .metadata { 
              font-size: 12px; 
              color: #666; 
              margin-top: 30px; 
              border-top: 1px solid #eee; 
              padding-top: 15px; 
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin: 10px 0;
            }
            @media print {
              body { margin: 20px; }
              .signature-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${consent.consent_forms.title}</h1>
            <p><strong>Documento de Consentimiento Informado</strong></p>
            <p>Categoría: ${consent.consent_forms.category}</p>
          </div>
          
          <div class="patient-info">
            <h3>Información del Paciente</h3>
            <div class="info-grid">
              <div><strong>Nombre:</strong> ${consent.patient_name}</div>
              <div><strong>DNI/NIE:</strong> ${consent.patient_tax_id}</div>
              <div><strong>Fecha de firma:</strong> ${formatDate(consent.signed_at)}</div>
              <div><strong>Estado:</strong> ${consent.is_valid ? "Válido" : "Inválido"}</div>
            </div>
          </div>
          
          <div class="content">
            ${cleanContent}
          </div>
          
          <div class="signature-section">
            <h3>Firma Digital del Paciente</h3>
            <div class="signature-box">
              <img src="${consent.signature_base64}" alt="Firma del paciente" class="signature-img" />
              <p><strong>${consent.patient_name}</strong></p>
              <p>DNI/NIE: ${consent.patient_tax_id}</p>
              <p>Firmado digitalmente el ${formatDate(consent.signed_at)}</p>
            </div>
          </div>
          
          <div class="metadata">
            <h4>Información de Verificación Digital</h4>
            <div class="info-grid">
              <div><strong>ID del documento:</strong> ${consent.id}</div>
              <div><strong>IP de firma:</strong> ${consent.ip_address || "No disponible"}</div>
              <div><strong>Verificación de identidad:</strong> ${consent.identity_verified ? "Verificado" : "Pendiente"}</div>
              <div><strong>Navegador:</strong> ${consent.user_agent ? consent.user_agent.substring(0, 50) + "..." : "No disponible"}</div>
            </div>
            <p style="margin-top: 20px; font-style: italic; text-align: center;">
              Este documento ha sido firmado digitalmente y es válido según la normativa vigente.
            </p>
          </div>
        </body>
        </html>
      `

      // Crear y descargar el archivo HTML
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `consentimiento_${consent.patient_name.replace(/\s+/g, "_")}_${format(new Date(consent.signed_at), "yyyy-MM-dd")}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Documento descargado",
        description: "El consentimiento completo con firma se ha descargado correctamente",
      })
    } catch (error) {
      console.error("Error downloading consent:", error)
      toast({
        title: "Error",
        description: "No se pudo descargar el documento completo",
        variant: "destructive",
      })
    }
  }

  const downloadSignature = (signatureBase64: string, patientName: string, date: string) => {
    try {
      const link = document.createElement("a")
      link.href = signatureBase64
      link.download = `firma_${patientName.replace(/\s+/g, "_")}_${date}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Firma descargada",
        description: "La firma se ha descargado correctamente",
      })
    } catch (error) {
      console.error("Error downloading signature:", error)
      toast({
        title: "Error",
        description: "No se pudo descargar la firma",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="text-gray-500">Cargando consentimientos...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Consentimientos Informados
          </h3>
          <p className="text-sm text-gray-500">Gestión de consentimientos para {clientName}</p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Generar consentimiento
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="signed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Firmados ({signedConsents.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendientes ({pendingTokens.length})
          </TabsTrigger>
        </TabsList>

        {/* Consentimientos firmados */}
        <TabsContent value="signed">
          {signedConsents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay consentimientos firmados</h3>
                <p className="text-gray-500 text-center mb-4">
                  Este paciente aún no ha firmado ningún consentimiento informado.
                </p>
                <Button onClick={() => setShowGenerateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Generar primer consentimiento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consentimientos firmados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Fecha de firma</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signedConsents.map((consent) => (
                      <TableRow key={consent.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{consent.consent_forms.title}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {consent.consent_forms.category}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(consent.signed_at)}</div>
                            <div className="text-gray-500">por {consent.patient_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(consent)}</TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-500">{consent.ip_address}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSignature(consent.signature_base64)}
                              title="Ver firma"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadConsentDocument(consent)}
                              title="Descargar documento completo"
                            >
                              <FileDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                downloadSignature(
                                  consent.signature_base64,
                                  consent.patient_name,
                                  format(new Date(consent.signed_at), "yyyy-MM-dd"),
                                )
                              }
                              title="Descargar solo firma"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tokens pendientes */}
        <TabsContent value="pending">
          {pendingTokens.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay consentimientos pendientes</h3>
                <p className="text-gray-500 text-center">
                  Todos los enlaces de consentimiento han sido utilizados o han expirado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Enlaces pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead>Expira</TableHead>
                      <TableHead>Enviado por</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Copiar enlace</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTokens.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{token.consent_forms.title}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {token.consent_forms.category}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(token.created_at)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(token.expires_at)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {token.sent_via === "email" && <Badge variant="outline">Email</Badge>}
                            {token.sent_via === "whatsapp" && <Badge variant="outline">WhatsApp</Badge>}
                            {token.sent_via === "manual" && <Badge variant="outline">Manual</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{getPendingStatusBadge(token)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyConsentLink(token.token)}
                            className="flex items-center gap-2"
                          >
                            <LinkIcon className="w-4 h-4" />
                            Copiar enlace
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal para generar consentimiento */}
      <GenerateConsentModal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false)
          loadConsentsData() // Recargar datos después de generar
        }}
        clientId={clientId}
        clientName={clientName}
        clientEmail={clientEmail}
        clientPhone={clientPhone}
      />

      {/* Modal para ver firma */}
      <Dialog open={!!selectedSignature} onOpenChange={() => setSelectedSignature(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Firma digital</DialogTitle>
          </DialogHeader>
          {selectedSignature && (
            <div className="flex justify-center p-4">
              <img
                src={selectedSignature || "/placeholder.svg"}
                alt="Firma digital"
                className="max-w-full h-auto border rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
