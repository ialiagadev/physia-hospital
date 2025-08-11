"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Search, MoreVertical, Users, MessageCircle, Plus, Phone, FileText, AlertTriangle, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createConversation } from "@/lib/chatActions"
import { useConversations } from "@/hooks/use-conversations"
import { useClients } from "@/hooks/use-clients"
import { useAuth } from "@/app/contexts/auth-context"
import { TemplateSelectorDialog } from "@/components/template-selector-dialog"
import type { ConversationWithLastMessage, Client } from "@/types/chat"
import { useTotalUnreadMessages } from "@/hooks/use-unread-messages"
import { supabase } from "@/lib/supabase/client"
import { generateTagStyle } from "@/lib/dynamic-tag-colors"
import { toast } from "@/hooks/use-toast"

// Componente para mostrar el icono del canal con letra
function ChannelIcon({ channelName }: { channelName?: string }) {
  const getChannelConfig = (name: string) => {
    switch (name?.toLowerCase()) {
      case "whatsapp":
        return { letter: "W", bgColor: "bg-green-500", textColor: "text-white" }
      case "email":
        return { letter: "E", bgColor: "bg-blue-500", textColor: "text-white" }
      case "sms":
        return { letter: "S", bgColor: "bg-orange-500", textColor: "text-white" }
      case "webchat":
        return { letter: "C", bgColor: "bg-purple-500", textColor: "text-white" }
      case "facebook":
        return { letter: "F", bgColor: "bg-blue-600", textColor: "text-white" }
      case "instagram":
        return { letter: "I", bgColor: "bg-pink-500", textColor: "text-white" }
      case "telegram":
        return { letter: "T", bgColor: "bg-sky-500", textColor: "text-white" }
      default:
        return { letter: "?", bgColor: "bg-gray-500", textColor: "text-white" }
    }
  }

  const config = getChannelConfig(channelName || "")

  return (
    <div className={`w-5 h-5 rounded-full ${config.bgColor} flex items-center justify-center`}>
      <span className={`text-xs font-bold ${config.textColor}`}>{config.letter}</span>
    </div>
  )
}

// Prefijos de países más comunes
const countryPrefixes = [
  { code: "ES", prefix: "+34", name: "España", flag: "🇪🇸" },
  { code: "US", prefix: "+1", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "MX", prefix: "+52", name: "México", flag: "🇲🇽" },
  { code: "AR", prefix: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "CO", prefix: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "PE", prefix: "+51", name: "Perú", flag: "🇵🇪" },
  { code: "CL", prefix: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "VE", prefix: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "EC", prefix: "+593", name: "Ecuador", flag: "🇪🇨" },
  { code: "UY", prefix: "+598", name: "Uruguay", flag: "🇺🇾" },
  { code: "PY", prefix: "+595", name: "Paraguay", flag: "🇵🇾" },
  { code: "BO", prefix: "+591", name: "Bolivia", flag: "🇧🇴" },
  { code: "BR", prefix: "+55", name: "Brasil", flag: "🇧🇷" },
  { code: "FR", prefix: "+33", name: "Francia", flag: "🇫🇷" },
  { code: "IT", prefix: "+39", name: "Italia", flag: "🇮🇹" },
  { code: "DE", prefix: "+49", name: "Alemania", flag: "🇩🇪" },
  { code: "GB", prefix: "+44", name: "Reino Unido", flag: "🇬🇧" },
]

// Función para limpiar el número de teléfono y detectar prefijo
function cleanPhoneNumber(input: string, currentPrefix: string): { cleanPhone: string; detectedPrefix?: string } {
  // Remover todos los caracteres no numéricos excepto el +
  const cleaned = input.replace(/[^\d+]/g, "")

  // Si no empieza con +, es solo el número
  if (!cleaned.startsWith("+")) {
    return { cleanPhone: cleaned }
  }

  // Buscar el prefijo en nuestra lista
  for (const country of countryPrefixes) {
    if (cleaned.startsWith(country.prefix)) {
      const phoneWithoutPrefix = cleaned.substring(country.prefix.length)
      return {
        cleanPhone: phoneWithoutPrefix,
        detectedPrefix: country.prefix,
      }
    }
  }

  // Si no encontramos el prefijo, asumir que es el prefijo actual
  const phoneWithoutCurrentPrefix = cleaned.startsWith(currentPrefix)
    ? cleaned.substring(currentPrefix.length)
    : cleaned.substring(1) // Remover solo el +

  return { cleanPhone: phoneWithoutCurrentPrefix }
}

// Modal unificado para nueva conversación
function UnifiedNewConversationModal({ onConversationCreated }: { onConversationCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"new" | "existing">("new")

  // Estados para nuevo contacto
  const [selectedPrefix, setSelectedPrefix] = useState("+34")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [contactName, setContactName] = useState("")

  // Estados para contacto existente
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [contactSearch, setContactSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Client[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Estados para validación de teléfono
  const [phoneValidation, setPhoneValidation] = useState<{
    checking: boolean
    exists: boolean
    existingClient?: Client
    error?: string
  }>({
    checking: false,
    exists: false,
  })

  // Estados para validación de conversación existente
  const [conversationValidation, setConversationValidation] = useState<{
    checking: boolean
    exists: boolean
    existingConversation?: any
    error?: string
  }>({
    checking: false,
    exists: false,
  })

  const [loading, setLoading] = useState(false)
  const { userProfile } = useAuth()
  const organizationId = userProfile?.organization_id
  const organizationIdNumber = organizationId ? Number(organizationId) : undefined
  const { searchClientsServer } = useClients(organizationIdNumber)

  // Use useRef to store the timeout ID and prevent re-renders
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const phoneCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const conversationCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isSearchingRef = useRef(false)

  // Función para verificar si ya existe una conversación activa con el cliente
  const checkExistingConversation = useCallback(
    async (clientId: number) => {
      if (!organizationIdNumber || !clientId) {
        setConversationValidation({ checking: false, exists: false })
        return
      }

      setConversationValidation({ checking: true, exists: false })

      try {
        // Buscar conversaciones activas o pendientes con este cliente
        const { data, error } = await supabase
          .from("conversations")
          .select(`
          *,
          client:clients(*)
        `)
          .eq("organization_id", organizationIdNumber)
          .eq("client_id", clientId)
          .in("status", ["active", "pending"])
          .limit(1)

        if (error) {
          console.error("Error checking existing conversation:", error)
          setConversationValidation({
            checking: false,
            exists: false,
            error: "Error al verificar conversaciones existentes",
          })
          return
        }

        if (data && data.length > 0) {
          setConversationValidation({
            checking: false,
            exists: true,
            existingConversation: data[0],
          })
        } else {
          setConversationValidation({ checking: false, exists: false })
        }
      } catch (error) {
        console.error("Error checking existing conversation:", error)
        setConversationValidation({
          checking: false,
          exists: false,
          error: "Error al verificar conversaciones existentes",
        })
      }
    },
    [organizationIdNumber],
  )

  // Función para verificar si el teléfono ya existe
  const checkPhoneExists = useCallback(
    async (phone: string, prefix: string) => {
      if (!organizationIdNumber || phone.length < 9) {
        setPhoneValidation({ checking: false, exists: false })
        setConversationValidation({ checking: false, exists: false })
        return
      }

      const fullPhone = prefix + phone
      setPhoneValidation({ checking: true, exists: false })

      try {
        // Buscar por teléfono completo o por partes
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("organization_id", organizationIdNumber)
          .or(`full_phone.eq.${fullPhone},phone.eq.${phone}`)
          .limit(1)

        if (error) {
          console.error("Error checking phone:", error)
          setPhoneValidation({
            checking: false,
            exists: false,
            error: "Error al verificar el teléfono",
          })
          return
        }

        if (data && data.length > 0) {
          const existingClient = data[0] as Client
          setPhoneValidation({
            checking: false,
            exists: true,
            existingClient,
          })

          // Si el cliente existe, verificar si ya tiene una conversación activa
          checkExistingConversation(existingClient.id)
        } else {
          setPhoneValidation({ checking: false, exists: false })
          setConversationValidation({ checking: false, exists: false })
        }
      } catch (error) {
        console.error("Error checking phone:", error)
        setPhoneValidation({
          checking: false,
          exists: false,
          error: "Error al verificar el teléfono",
        })
      }
    },
    [organizationIdNumber, checkExistingConversation],
  )

  // Manejar cambios en el número de teléfono con debounce
  const handlePhoneChange = useCallback(
    (value: string) => {
      const { cleanPhone, detectedPrefix } = cleanPhoneNumber(value, selectedPrefix)

      // Si detectamos un prefijo diferente, actualizarlo
      if (detectedPrefix && detectedPrefix !== selectedPrefix) {
        setSelectedPrefix(detectedPrefix)
      }

      setPhoneNumber(cleanPhone)

      // Clear previous timeout
      if (phoneCheckTimeoutRef.current) {
        clearTimeout(phoneCheckTimeoutRef.current)
      }

      // Si tiene menos de 9 dígitos, no verificar
      if (cleanPhone.length < 9) {
        setPhoneValidation({ checking: false, exists: false })
        setConversationValidation({ checking: false, exists: false })
        return
      }

      // Set new timeout for phone check
      phoneCheckTimeoutRef.current = setTimeout(() => {
        checkPhoneExists(cleanPhone, detectedPrefix || selectedPrefix)
      }, 1000) // 1 segundo de delay
    },
    [selectedPrefix, checkPhoneExists],
  )

  // Manejar cambios en el prefijo
  const handlePrefixChange = useCallback(
    (newPrefix: string) => {
      setSelectedPrefix(newPrefix)
      // Si hay teléfono, re-verificar con el nuevo prefijo
      if (phoneNumber.length >= 9) {
        if (phoneCheckTimeoutRef.current) {
          clearTimeout(phoneCheckTimeoutRef.current)
        }
        phoneCheckTimeoutRef.current = setTimeout(() => {
          checkPhoneExists(phoneNumber, newPrefix)
        }, 500)
      }
    },
    [phoneNumber, checkPhoneExists],
  )

  // Manejar selección de cliente existente
  const handleClientSelection = useCallback(
    (clientId: string) => {
      setSelectedClientId(clientId)

      // Clear previous timeout
      if (conversationCheckTimeoutRef.current) {
        clearTimeout(conversationCheckTimeoutRef.current)
      }

      // Verificar si ya existe una conversación con este cliente
      conversationCheckTimeoutRef.current = setTimeout(() => {
        checkExistingConversation(Number(clientId))
      }, 300)
    },
    [checkExistingConversation],
  )

  // Stable search function that doesn't change on every render
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([])
        setSearchLoading(false)
        isSearchingRef.current = false
        return
      }

      if (isSearchingRef.current) {
        return // Prevent multiple simultaneous searches
      }

      isSearchingRef.current = true
      setSearchLoading(true)

      try {
        const results = await searchClientsServer(query)
        setSearchResults(results)
      } catch (error) {
        console.error("Error searching clients:", error)
        setSearchResults([])
      } finally {
        setSearchLoading(false)
        isSearchingRef.current = false
      }
    },
    [searchClientsServer],
  )

  // Handle search input changes with debouncing
  const handleSearchChange = useCallback(
    (value: string) => {
      setContactSearch(value)

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // If empty, clear results immediately
      if (!value.trim()) {
        setSearchResults([])
        setSearchLoading(false)
        return
      }

      // Set new timeout for search
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value)
      }, 500) // Increased to 500ms to reduce API calls
    },
    [performSearch],
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (phoneCheckTimeoutRef.current) {
        clearTimeout(phoneCheckTimeoutRef.current)
      }
      if (conversationCheckTimeoutRef.current) {
        clearTimeout(conversationCheckTimeoutRef.current)
      }
    }
  }, [])

  const handleNewContactTemplateSent = async (template: any) => {
    if (!phoneNumber.trim() || !contactName.trim() || !organizationIdNumber) return

    // Verificar si existe conversación antes de crear
    if (conversationValidation.exists) {
      toast({
        title: "Conversación ya existe",
        description: "Ya existe una conversación activa con este cliente",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Asegurar que el phoneNumber esté limpio (sin prefijo)
      const { cleanPhone } = cleanPhoneNumber(phoneNumber, selectedPrefix)

      // Crear conversación con nuevo contacto
      await createConversation({
        organizationId: organizationIdNumber,
        clientData: {
          name: contactName,
          phone: phoneNumber, // Solo el número sin prefijo
          phone_prefix: selectedPrefix, // Prefijo por separado
          external_id: `phone-${selectedPrefix}${phoneNumber}`,
        },
        initialMessage: template.finalContent || `Plantilla "${template.name}" enviada`,
      })

      toast({
        title: "Conversación creada",
        description: `Se ha creado una conversación con ${contactName} y se ha enviado la plantilla "${template.name}"`,
      })

      // Limpiar formulario y cerrar modal
      resetForm()
      setOpen(false)
      onConversationCreated()
    } catch (error) {
      console.error("Error creating conversation:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExistingContactTemplateSent = async (template: any) => {
    if (!selectedClientId || !organizationIdNumber) return

    const selectedClient = searchResults.find((c) => c.id.toString() === selectedClientId)
    if (!selectedClient) return

    // Verificar si existe conversación antes de crear
    if (conversationValidation.exists) {
      toast({
        title: "Conversación ya existe",
        description: `Ya existe una conversación activa con ${selectedClient.name}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await createConversation({
        organizationId: organizationIdNumber,
        clientData: {
          name: selectedClient.name,
          phone: selectedClient.phone || undefined, // Solo el número sin prefijo
          phone_prefix: selectedClient.phone_prefix || "+34", // Prefijo por separado
          email: selectedClient.email || undefined,
          external_id: selectedClient.external_id || `client-${selectedClient.id}`,
        },
        initialMessage: template.finalContent || `Plantilla "${template.name}" enviada`,
        existingClientId: selectedClient.id,
      })

      toast({
        title: "Conversación creada",
        description: `Se ha creado una conversación con ${selectedClient.name} y se ha enviado la plantilla "${template.name}"`,
      })

      resetForm()
      setOpen(false)
      onConversationCreated()
    } catch (error) {
      console.error("Error creating conversation:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setPhoneNumber("")
    setContactName("")
    setSelectedClientId("")
    setContactSearch("")
    setSearchResults([])
    setSearchLoading(false)
    setPhoneValidation({ checking: false, exists: false })
    setConversationValidation({ checking: false, exists: false })
    isSearchingRef.current = false

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    if (phoneCheckTimeoutRef.current) {
      clearTimeout(phoneCheckTimeoutRef.current)
    }
    if (conversationCheckTimeoutRef.current) {
      clearTimeout(conversationCheckTimeoutRef.current)
    }
  }

  // Obtener número de teléfono para el selector de plantillas
  const getRecipientPhone = () => {
    if (activeTab === "new") {
      return selectedPrefix + phoneNumber
    } else {
      const selectedClient = searchResults.find((c) => c.id.toString() === selectedClientId)
      if (selectedClient?.phone) {
        const prefix = selectedClient.phone_prefix || "+34"
        return prefix + selectedClient.phone
      }
      return selectedClient?.phone || ""
    }
  }

  // Determinar si se puede crear la conversación
  const canCreateConversation = () => {
    if (activeTab === "new") {
      return (
        phoneNumber.trim().length >= 9 &&
        contactName.trim() &&
        !phoneValidation.checking &&
        !conversationValidation.checking &&
        !conversationValidation.exists
      )
    } else {
      return selectedClientId && !conversationValidation.checking && !conversationValidation.exists
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all duration-200 hover:shadow-md rounded-lg h-9 font-medium">
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Nueva conversación
          </DialogTitle>
        </DialogHeader>

        {/* Pestañas */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "new"
                ? "border-green-500 text-green-600 bg-green-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Phone className="h-4 w-4 inline mr-2" />
            Nuevo contacto
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("existing")}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "existing"
                ? "border-green-500 text-green-600 bg-green-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Contacto existente
          </button>
        </div>

        {/* Contenido de la pestaña "Nuevo contacto" */}
        {activeTab === "new" && (
          <div className="space-y-4">
            <div className="space-y-4">
              {/* Nombre del contacto */}
              <div className="space-y-2">
                <Label htmlFor="contactName">Nombre del contacto</Label>
                <Input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              {/* Número de teléfono */}
              <div className="space-y-2">
                <Label htmlFor="phone">Número de teléfono</Label>
                <div className="flex gap-2">
                  <Select value={selectedPrefix} onValueChange={handlePrefixChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryPrefixes.map((country) => (
                        <SelectItem key={country.code} value={country.prefix}>
                          <div className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.prefix}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 relative">
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Número de teléfono"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`${
                        phoneValidation.exists || conversationValidation.exists
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }`}
                      required
                    />
                    {(phoneValidation.checking || conversationValidation.checking) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Información del número completo */}
                <p className="text-sm text-gray-500">
                  Número completo: {selectedPrefix}
                  {phoneNumber}
                </p>

                {/* Alerta si el teléfono ya existe */}
                {phoneValidation.exists && phoneValidation.existingClient && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-amber-700">
                      <strong>Cliente ya existe:</strong> {phoneValidation.existingClient.name}
                      <br />
                      <span className="text-sm">
                        Te recomendamos usar la pestaña "Contacto existente" para enviar plantillas a este cliente.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Alerta si ya existe una conversación */}
                {conversationValidation.exists && conversationValidation.existingConversation && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-700">
                      <strong>⚠️ Conversación ya existe</strong>
                      <br />
                      Ya existe una conversación activa con este cliente. No puedes crear otra conversación.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error de validación */}
                {(phoneValidation.error || conversationValidation.error) && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-700">
                      {phoneValidation.error || conversationValidation.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Selector de plantillas mejorado */}
              <div className="space-y-2">
                <Label>Enviar plantilla</Label>
                <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Plantillas WhatsApp</p>
                      <p className="text-xs text-gray-600">Selecciona una plantilla para enviar al contacto</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <TemplateSelectorDialog
                      recipientPhone={getRecipientPhone()}
                      onTemplateSent={handleNewContactTemplateSent}
                      disabled={loading || !canCreateConversation()}
                      trigger={
                        <Button
                          className={`bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${
                            loading || !canCreateConversation() ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          disabled={loading || !canCreateConversation()}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Seleccionar Plantilla
                        </Button>
                      }
                    />
                  </div>

                  {/* Información adicional */}
                  {conversationValidation.exists ? (
                    <div className="mt-3 p-2 bg-red-100 rounded-md">
                      <p className="text-xs text-red-700 text-center">
                        ❌ No puedes crear una conversación porque ya existe una activa con este cliente
                      </p>
                    </div>
                  ) : phoneValidation.exists ? (
                    <div className="mt-3 p-2 bg-amber-100 rounded-md">
                      <p className="text-xs text-amber-700 text-center">
                        ⚠️ No puedes crear un nuevo contacto con este número porque ya existe
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 p-2 bg-green-100 rounded-md">
                      <p className="text-xs text-green-700 text-center">
                        ✨ Se creará un nuevo contacto y se enviará la plantilla seleccionada
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botón cancelar */}
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Contenido de la pestaña "Contacto existente" */}
        {activeTab === "existing" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar contacto</Label>
              <Input
                placeholder="Buscar contacto por nombre, teléfono o email..."
                value={contactSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />

              {/* Resultados de búsqueda */}
              {contactSearch && (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white">
                  {searchLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                      <span className="ml-2">Buscando contactos...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-gray-500 p-3">No se encontraron contactos</div>
                  ) : (
                    searchResults.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => {
                          handleClientSelection(client.id.toString())
                          setContactSearch(client.name)
                        }}
                        className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                          selectedClientId === client.id.toString() ? "bg-green-50" : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{client.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {client.phone && <span>{client.phone}</span>}
                            {client.phone && client.email && <span> • </span>}
                            {client.email && <span>{client.email}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedClientId && !contactSearch && (
                <div className="text-sm text-green-600 bg-green-50 p-2 rounded border">
                  ✓ Contacto seleccionado: {searchResults.find((c) => c.id.toString() === selectedClientId)?.name}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId("")
                      setContactSearch("")
                      setConversationValidation({ checking: false, exists: false })
                    }}
                    className="ml-2 text-green-700 hover:text-green-800 underline"
                  >
                    Cambiar
                  </button>
                </div>
              )}

              {/* Alerta si ya existe una conversación con el cliente seleccionado */}
              {conversationValidation.exists && conversationValidation.existingConversation && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-700">
                    <strong>⚠️ Conversación ya existe</strong>
                    <br />
                    Ya existe una conversación activa con este cliente. No puedes crear otra conversación.
                  </AlertDescription>
                </Alert>
              )}

              {/* Indicador de verificación */}
              {conversationValidation.checking && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando conversaciones existentes...
                </div>
              )}
            </div>

            {/* Selector de plantillas para contacto existente */}
            {selectedClientId && (
              <div className="space-y-2">
                <Label>Enviar plantilla</Label>
                <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Plantillas WhatsApp</p>
                      <p className="text-xs text-gray-600">Selecciona una plantilla para enviar al contacto</p>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <TemplateSelectorDialog
                      recipientPhone={getRecipientPhone()}
                      onTemplateSent={handleExistingContactTemplateSent}
                      disabled={loading || !canCreateConversation()}
                      trigger={
                        <Button
                          className={`bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${
                            loading || !canCreateConversation() ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          disabled={loading || !canCreateConversation()}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Seleccionar Plantilla
                        </Button>
                      }
                    />
                  </div>

                  {/* Información adicional */}
                  {conversationValidation.exists ? (
                    <div className="mt-3 p-2 bg-red-100 rounded-md">
                      <p className="text-xs text-red-700 text-center">
                        ❌ No puedes crear una conversación porque ya existe una activa con este cliente
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 p-2 bg-blue-100 rounded-md">
                      <p className="text-xs text-blue-700 text-center">
                        ✨ Se enviará la plantilla al contacto seleccionado
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botón cancelar */}
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface ChatListProps {
  selectedChatId: string | null
  onChatSelect: (chatId: string) => void
}

// Hook personalizado para cargar colores de etiquetas desde la base de datos
function useTagColors(organizationId: number | undefined) {
  const [tagColors, setTagColors] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTagColors = async () => {
      if (!organizationId) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from("organization_tags")
          .select("tag_name, color")
          .eq("organization_id", organizationId)

        if (error) {
          console.error("Error loading tag colors:", error)
          setTagColors(new Map())
        } else {
          const colorMap = new Map<string, string>()
          data?.forEach((tag) => {
            colorMap.set(tag.tag_name, tag.color)
          })
          setTagColors(colorMap)
        }
      } catch (error) {
        console.error("Error loading tag colors:", error)
        setTagColors(new Map())
      } finally {
        setLoading(false)
      }
    }

    loadTagColors()
  }, [organizationId])

  return { tagColors, loading }
}

// Actualizar la interface
interface ConversationTagsProps {
  tags:
    | Array<{
        id: string
        tag_name: string
        created_at: string
        color?: string
      }>
    | undefined
  tagColors: Map<string, string>
  colorsLoading: boolean
}

// Componente para las etiquetas de conversación
const ConversationTags: React.FC<ConversationTagsProps> = ({ tags, tagColors, colorsLoading }) => {
  if (!tags || tags.length === 0) {
    return null
  }

  const visibleTags = tags.slice(0, 2)
  const remainingCount = tags.length - 2

  return (
    <div className="flex items-center gap-1 mt-1">
      {visibleTags.map((tag) => {
        // Si los colores están cargando, mostrar un placeholder
        if (colorsLoading) {
          return (
            <div
              key={tag.id}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 animate-pulse"
            >
              <div className="w-12 h-3 bg-gray-300 rounded"></div>
            </div>
          )
        }

        // Usar los colores cargados
        const hexColor = tag.color || tagColors.get(tag.tag_name) || "#8B5CF6"
        const tagStyle = generateTagStyle(hexColor)

        return (
          <span
            key={tag.id}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border-0 shadow-sm"
            style={tagStyle.style}
          >
            {tag.tag_name}
          </span>
        )
      })}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 shadow-sm">
          +{remainingCount}
        </span>
      )}
    </div>
  )
}

// Mover useTagColors al componente ChatList principal
export default function ChatList({ selectedChatId, onChatSelect }: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"all" | "assigned">("all")
  const [assignedCount, setAssignedCount] = useState(0)

  const { userProfile } = useAuth()
  const organizationId = userProfile?.organization_id
  const organizationIdNumber = organizationId ? Number(organizationId) : undefined

  // Cargar colores a nivel superior
  const { tagColors, loading: colorsLoading } = useTagColors(organizationIdNumber)

  const { conversations, loading, error, refetch } = useConversations(
    organizationId?.toString(),
    viewMode,
    userProfile?.id,
  )

  // Hook para conteo total de mensajes no leídos
  const { totalUnread } = useTotalUnreadMessages(organizationIdNumber)

  // ✨ Obtener conteo de conversaciones asignadas usando la nueva tabla
  useEffect(() => {
    const fetchAssignedCount = async () => {
      if (!userProfile?.id || !organizationIdNumber) {
        setAssignedCount(0)
        return
      }

      try {
        // Consultar la tabla users_conversations para obtener conversaciones asignadas al usuario actual
        const { data, error } = await supabase
          .from("users_conversations")
          .select(`
            conversation_id,
            conversations!inner(
              id,
              organization_id
            )
          `)
          .eq("user_id", userProfile.id)
          .eq("conversations.organization_id", organizationIdNumber)

        if (error) {
          console.error("Error fetching assigned conversations count:", error)
          setAssignedCount(0)
          return
        }

        setAssignedCount(data?.length || 0)
      } catch (error) {
        console.error("Error fetching assigned conversations count:", error)
        setAssignedCount(0)
      }
    }

    fetchAssignedCount()
  }, [userProfile?.id, organizationIdNumber, conversations]) // Recalcular cuando cambien las conversaciones

  const filteredConversations = conversations
    .filter(
      (conv) =>
        conv.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message?.content.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      // Primero: conversaciones con mensajes no leídos
      if (a.unread_count > 0 && b.unread_count === 0) return -1
      if (a.unread_count === 0 && b.unread_count > 0) return 1

      // Segundo: por fecha del último mensaje
      const aTime = new Date(a.last_message_at || a.updated_at || 0).getTime()
      const bTime = new Date(b.last_message_at || b.updated_at || 0).getTime()
      return bTime - aTime
    })

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return ""

    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 48) {
      return "Ayer"
    } else {
      return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    }
  }

  const getLastMessagePreview = (conversation: any) => {
    if (conversation.last_message) {
      return conversation.last_message.content
    }
    return "Nueva conversación"
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">
            <p>Error al cargar conversaciones</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          Chats
          {totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <UnifiedNewConversationModal onConversationCreated={refetch} />
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filtros principales */}
      <div className="bg-white border-b border-gray-200">
        <div
          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
            viewMode === "assigned" ? "bg-green-50 border-r-4 border-green-500" : ""
          }`}
          onClick={() => setViewMode("assigned")}
        >
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-gray-900">Asignados</span>
            <span className="ml-2 text-gray-500">({assignedCount})</span>
          </div>
        </div>
        <div
          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 ${
            viewMode === "all" ? "bg-green-50 border-r-4 border-green-500" : ""
          }`}
          onClick={() => setViewMode("all")}
        >
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <span className="font-medium text-gray-900">Todos</span>
            <span className="ml-2 text-gray-500">({conversations.length})</span>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="p-3 bg-white border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar conversaciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-none focus:bg-white"
          />
        </div>
      </div>

      {/* Lista de chats */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 p-4">
            <p className="text-center mb-2">No hay conversaciones</p>
            <p className="text-sm text-center">Haz clic en el botón de mensaje para iniciar una nueva conversación</p>
          </div>
        ) : (
          filteredConversations.map((conversation: ConversationWithLastMessage) => (
            <div
              key={conversation.id}
              onClick={() => onChatSelect(conversation.id)}
              className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                selectedChatId === conversation.id
                  ? "bg-blue-50"
                  : conversation.unread_count > 0
                    ? "bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500"
                    : ""
              }`}
            >
              {/* Avatar sin imagen - solo iniciales */}
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{conversation.client?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                {/* Icono del canal en la esquina inferior derecha */}
                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 border border-gray-200 shadow-sm">
                  <ChannelIcon channelName={conversation.canales_organization?.canal?.nombre || "whatsapp"} />
                </div>
              </div>

              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {conversation.client?.name || "Usuario desconocido"}
                  </h3>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatTimestamp(conversation.last_message?.created_at || conversation.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate flex-1">{getLastMessagePreview(conversation)}</p>
                  {conversation.unread_count > 0 && (
                    <div className="ml-2 flex items-center gap-1">
                      <span className="bg-green-500 text-white text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 flex-shrink-0 font-medium">
                        {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                      </span>
                    </div>
                  )}
                </div>
                <ConversationTags
                  tags={conversation.conversation_tags}
                  tagColors={tagColors}
                  colorsLoading={colorsLoading}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
