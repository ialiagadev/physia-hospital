"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Mail, MessageSquare, Link, FileText, Send, CheckCircle, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { ConsentForm } from "@/types/consent"

interface GenerateConsentModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: number
  clientName: string
  clientEmail?: string | null
  clientPhone?: string | null
}

export function GenerateConsentModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientEmail,
  clientPhone,
}: GenerateConsentModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [consentForms, setConsentForms] = useState<ConsentForm[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string>("")
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [sendMethod, setSendMethod] = useState<"manual" | "email" | "whatsapp">("manual")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [whatsappMessage, setWhatsappMessage] = useState("")
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Cargar formularios de consentimiento
  useEffect(() => {
    const loadConsentForms = async () => {
      if (!isOpen) return

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("consent_forms")
          .select("*")
          .eq("is_active", true)
          .order("category", { ascending: true })
          .order("title", { ascending: true })

        if (error) throw error
        setConsentForms(data || [])
      } catch (err) {
        console.error("Error loading consent forms:", err)
        setError("Error al cargar los formularios de consentimiento")
      } finally {
        setIsLoading(false)
      }
    }

    loadConsentForms()
  }, [isOpen])

  // Configurar mensajes por defecto
  useEffect(() => {
    if (selectedFormId && consentForms.length > 0) {
      const selectedForm = consentForms.find((f) => f.id === selectedFormId)
      if (selectedForm) {
        setEmailSubject(`Consentimiento informado - ${selectedForm.title}`)
        setEmailMessage(
          `Estimado/a ${clientName},\n\n` +
            `Le enviamos el enlace para firmar el consentimiento informado "${selectedForm.title}".\n\n` +
            `Por favor, haga clic en el siguiente enlace para revisar y firmar el documento:\n\n` +
            `{LINK}\n\n` +
            `El enlace estará disponible durante ${expiresInDays} días.\n\n` +
            `Si tiene alguna duda, no dude en contactarnos.\n\n` +
            `Saludos cordiales.`,
        )

        setWhatsappMessage(
          `Hola ${clientName}, le enviamos el enlace para firmar el consentimiento informado "${selectedForm.title}": {LINK}\n\n` +
            `El enlace estará disponible durante ${expiresInDays} días. Si tiene dudas, contáctenos.`,
        )
      }
    }
  }, [selectedFormId, clientName, expiresInDays, consentForms])

  const generateConsentLink = async () => {
    if (!selectedFormId) {
      setError("Debe seleccionar un formulario de consentimiento")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      // Generar token único
      const token = `${crypto.randomUUID()}-${Date.now()}`
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)

      // Crear el token en la base de datos
      const { data: tokenData, error: tokenError } = await supabase
        .from("consent_tokens")
        .insert({
          client_id: clientId,
          consent_form_id: selectedFormId,
          token: token,
          expires_at: expiresAt.toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
          sent_via: sendMethod,
          recipient_info: {
            email: clientEmail,
            phone: clientPhone,
            method: sendMethod,
          },
        })
        .select()
        .single()

      if (tokenError) throw tokenError

      const link = `${window.location.origin}/consentimiento/${token}`
      setGeneratedLink(link)

      // Si se seleccionó envío automático, procesar
      if (sendMethod === "email" && clientEmail) {
        await sendEmailWithLink(link)
      } else if (sendMethod === "whatsapp" && clientPhone) {
        openWhatsAppWithLink(link)
      }

      toast({
        title: "Enlace generado",
        description: "El enlace de consentimiento se ha creado correctamente",
      })
    } catch (err) {
      console.error("Error generating consent link:", err)
      setError("Error al generar el enlace de consentimiento")
    } finally {
      setIsGenerating(false)
    }
  }

  const sendEmailWithLink = async (link: string) => {
    // Aquí implementarías el envío de email
    // Por ahora solo mostramos el mensaje
    toast({
      title: "Email preparado",
      description: "Copie el enlace y envíelo por email al paciente",
    })
  }

  const openWhatsAppWithLink = (link: string) => {
    const message = whatsappMessage.replace("{LINK}", link)
    const whatsappUrl = `https://wa.me/${clientPhone?.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copiado",
        description: "Enlace copiado al portapapeles",
      })
    } catch (err) {
      console.error("Error copying to clipboard:", err)
    }
  }

  const handleClose = () => {
    setGeneratedLink(null)
    setSelectedFormId("")
    setError(null)
    onClose()
  }

  const selectedForm = consentForms.find((f) => f.id === selectedFormId)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar consentimiento informado
          </DialogTitle>
          <DialogDescription>
            Crear enlace de consentimiento para: <strong>{clientName}</strong>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!generatedLink ? (
          <div className="space-y-6">
            {/* Selección de formulario */}
            <div>
              <Label htmlFor="consentForm">Formulario de consentimiento</Label>
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un formulario" />
                </SelectTrigger>
                <SelectContent>
                  {consentForms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {form.category}
                        </Badge>
                        {form.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedForm && <p className="text-sm text-gray-500 mt-1">{selectedForm.description}</p>}
            </div>

            {/* Configuración */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiresInDays">Válido por (días)</Label>
                <Input
                  id="expiresInDays"
                  type="number"
                  min="1"
                  max="30"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number.parseInt(e.target.value) || 7)}
                />
              </div>
              <div>
                <Label htmlFor="sendMethod">Método de envío</Label>
                <Select value={sendMethod} onValueChange={(value: any) => setSendMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        Manual (copiar enlace)
                      </div>
                    </SelectItem>
                    {clientEmail && (
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </SelectItem>
                    )}
                    {clientPhone && (
                      <SelectItem value="whatsapp">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          WhatsApp
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Configuración de mensajes */}
            {sendMethod !== "manual" && (
              <Tabs defaultValue={sendMethod} className="w-full">
                <TabsList>
                  {sendMethod === "email" && <TabsTrigger value="email">Configurar Email</TabsTrigger>}
                  {sendMethod === "whatsapp" && <TabsTrigger value="whatsapp">Configurar WhatsApp</TabsTrigger>}
                </TabsList>

                {sendMethod === "email" && (
                  <TabsContent value="email" className="space-y-4">
                    <div>
                      <Label htmlFor="emailSubject">Asunto</Label>
                      <Input id="emailSubject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="emailMessage">Mensaje</Label>
                      <Textarea
                        id="emailMessage"
                        rows={6}
                        value={emailMessage}
                        onChange={(e) => setEmailMessage(e.target.value)}
                        placeholder="Use {LINK} donde quiera que aparezca el enlace"
                      />
                    </div>
                  </TabsContent>
                )}

                {sendMethod === "whatsapp" && (
                  <TabsContent value="whatsapp" className="space-y-4">
                    <div>
                      <Label htmlFor="whatsappMessage">Mensaje de WhatsApp</Label>
                      <Textarea
                        id="whatsappMessage"
                        rows={4}
                        value={whatsappMessage}
                        onChange={(e) => setWhatsappMessage(e.target.value)}
                        placeholder="Use {LINK} donde quiera que aparezca el enlace"
                      />
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={generateConsentLink} disabled={!selectedFormId || isGenerating}>
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Generar enlace
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Enlace generado */
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Enlace generado correctamente</span>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label>Enlace de consentimiento</Label>
                    <div className="flex gap-2 mt-1">
                      <Input value={generatedLink} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedLink)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <strong>Paciente:</strong> {clientName}
                    </div>
                    <div>
                      <strong>Válido hasta:</strong>{" "}
                      {new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toLocaleDateString("es-ES")}
                    </div>
                    <div>
                      <strong>Formulario:</strong> {selectedForm?.title}
                    </div>
                    <div>
                      <strong>Método:</strong>{" "}
                      {sendMethod === "manual" ? "Manual" : sendMethod === "email" ? "Email" : "WhatsApp"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cerrar
              </Button>
              {sendMethod === "whatsapp" && clientPhone && (
                <Button onClick={() => openWhatsAppWithLink(generatedLink)}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Abrir WhatsApp
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
