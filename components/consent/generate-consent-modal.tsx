"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Copy, Mail, MessageCircle, User, Calendar, Clock, AlertCircle } from "lucide-react"
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
  const [consentForms, setConsentForms] = useState<ConsentForm[]>([])
  const [selectedFormId, setSelectedFormId] = useState<string>("")
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [sendMethod, setSendMethod] = useState<"manual" | "email" | "whatsapp">("manual")
  const [generatedLink, setGeneratedLink] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar formularios de consentimiento disponibles
  useEffect(() => {
    if (isOpen) {
      loadConsentForms()
    }
  }, [isOpen])

  const loadConsentForms = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("consent_forms").select("*").eq("is_active", true).order("title")

      if (error) throw error
      setConsentForms(data || [])
    } catch (err) {
      console.error("Error loading consent forms:", err)
      setError("Error al cargar los formularios de consentimiento")
    } finally {
      setIsLoading(false)
    }
  }

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

      // Generar enlace usando el dominio de producción
      const link = `https://facturas-physia.vercel.app/consentimiento/${token}`
      setGeneratedLink(link)
/*
      // Si se seleccionó envío automático, procesar
      if (sendMethod === "email" && clientEmail) {
        await sendEmailWithLink(link)
      } else if (sendMethod === "whatsapp" && clientPhone) {
        openWhatsAppWithLink(link)
      }*/

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
/*
  const sendEmailWithLink = async (link: string) => {
    // Aquí implementarías el envío de email
    // Por ahora solo mostramos un mensaje
    toast({
      title: "Email programado",
      description: "El enlace se enviará por email (funcionalidad pendiente)",
    })
  }

  const openWhatsAppWithLink = (link: string) => {
    const message = `Hola ${clientName}, necesitamos que firmes este consentimiento informado: ${link}`
    const whatsappUrl = `https://wa.me/${clientPhone?.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }*/

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Enlace copiado",
        description: "El enlace se ha copiado al portapapeles",
      })
    } catch (error) {
      console.error("Error copying to clipboard:", error)
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setSelectedFormId("")
    setExpiresInDays(7)
    setSendMethod("manual")
    setGeneratedLink("")
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const selectedForm = consentForms.find((form) => form.id === selectedFormId)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Generar Consentimiento para {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del cliente */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Email:</span> {clientEmail || "No disponible"}
                </div>
                <div>
                  <span className="font-medium">Teléfono:</span> {clientPhone || "No disponible"}
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="ml-2">Cargando formularios...</span>
            </div>
          ) : (
            <>
              {/* Selección de formulario */}
              <div className="space-y-2">
                <Label htmlFor="consent-form">Formulario de Consentimiento</Label>
                <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar formulario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {consentForms.map((form) => (
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
                {selectedForm && <p className="text-sm text-gray-500">{selectedForm.description}</p>}
              </div>

              {/* Configuración de expiración */}
              <div className="space-y-2">
                <Label htmlFor="expires-days">Días hasta expiración</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="expires-days"
                    type="number"
                    min="1"
                    max="30"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number.parseInt(e.target.value) || 7)}
                    className="w-20"
                  />
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    Expirará el {new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toLocaleDateString("es-ES")}
                  </span>
                </div>
              </div>

              {/* Método de envío */}
              <div className="space-y-2">
                <Label>Método de envío</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={sendMethod === "manual" ? "default" : "outline"}
                    onClick={() => setSendMethod("manual")}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Manual
                  </Button>
                  
                
                </div>
                {sendMethod === "email" && !clientEmail && (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    El cliente no tiene email registrado
                  </p>
                )}
                {sendMethod === "whatsapp" && !clientPhone && (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    El cliente no tiene teléfono registrado
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                </div>
              )}

              {/* Enlace generado */}
              {generatedLink && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <Label>Enlace generado</Label>
                      <div className="flex gap-2">
                        <Input value={generatedLink} readOnly className="font-mono text-sm" />
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedLink)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Este enlace expirará en {expiresInDays} días
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cerrar
                </Button>
                <Button onClick={generateConsentLink} disabled={!selectedFormId || isGenerating}>
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Generando...
                    </>
                  ) : (
                    "Generar enlace"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
