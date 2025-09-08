"use client"

import { Suspense } from "react"
import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/hooks/use-toast"
import { PhysiaCard } from "@/components/loyalty-card/physia-card"
import { Search, X, User, AlertCircle } from "lucide-react"
import type { CardFormData } from "@/types/loyalty-cards"
import type { ServiceBasic } from "@/types/services"
import { cn } from "@/lib/utils"

// Tipos para errores de validación
interface FormErrors {
  organization_id?: string
  client_id?: string
  business_name?: string
  total_sessions?: string
  reward?: string
}

interface ExtendedCardFormData extends CardFormData {
  service_id?: number | null
  service_price?: number | null
}

// Componente de búsqueda de clientes
interface ClientSearchProps {
  organizationId: number
  selectedClient: any
  onClientSelect: (client: any) => void
  disabled?: boolean
  error?: string
}

function ClientSearch({ organizationId, selectedClient, onClientSelect, disabled, error }: ClientSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Función de búsqueda con debouncing
  const searchClients = useCallback(
    async (term: string) => {
      if (!term.trim() || !organizationId) {
        setSearchResults([])
        setShowResults(false)
        return
      }

      setIsSearching(true)
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("id, name, tax_id, phone")
          .eq("organization_id", organizationId)
          .or(`name.ilike.%${term}%,tax_id.ilike.%${term}%,phone.ilike.%${term}%`)
          .order("name")
          .limit(10)

        if (error) {
          console.error("Error searching clients:", error)
          return
        }

        setSearchResults(data || [])
        setShowResults(true)
      } catch (error) {
        console.error("Error searching clients:", error)
      } finally {
        setIsSearching(false)
      }
    },
    [organizationId],
  )

  // Debounce para la búsqueda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchClients(searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, searchClients])

  // Manejar selección de cliente
  const handleClientSelect = (client: any) => {
    onClientSelect(client)
    setSearchTerm(client.name)
    setShowResults(false)
  }

  // Limpiar selección
  const handleClearSelection = () => {
    onClientSelect(null)
    setSearchTerm("")
    setShowResults(false)
  }

  // Si hay un cliente seleccionado y no estamos buscando, mostrar el cliente seleccionado
  useEffect(() => {
    if (selectedClient && !searchTerm) {
      setSearchTerm(selectedClient.name)
    }
  }, [selectedClient])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar cliente por nombre, ID fiscal o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true)
            }
          }}
          disabled={disabled}
          className={cn("pl-10 pr-10", error && "border-red-500 focus-visible:ring-red-500")}
        />
        {selectedClient && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClearSelection}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Resultados de búsqueda */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {searchResults.map((client) => (
            <button
              key={client.id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-muted flex items-center gap-3 border-b last:border-b-0"
              onClick={() => handleClientSelect(client)}
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-muted-foreground">
                  {client.tax_id} {client.phone && `• ${client.phone}`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Indicador de búsqueda */}
      {isSearching && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-4 text-center text-muted-foreground">
          Buscando...
        </div>
      )}

      {/* Sin resultados */}
      {showResults && searchResults.length === 0 && searchTerm.trim() && !isSearching && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-4 text-center text-muted-foreground">
          No se encontraron clientes
        </div>
      )}

      {/* Cliente seleccionado */}
      {selectedClient && (
        <div className="mt-2 p-3 bg-muted rounded-md flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">{selectedClient.name}</div>
            <div className="text-sm text-muted-foreground">{selectedClient.tax_id}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente que usa useSearchParams
function NewLoyaltyCardForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [selectedClientFromUrl, setSelectedClientFromUrl] = useState<any>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [services, setServices] = useState<ServiceBasic[]>([])

  // Obtener client_id de los parámetros de URL
  const clientIdFromUrl = searchParams.get("client_id")

  const [formData, setFormData] = useState<ExtendedCardFormData>({
    organization_id: 0,
    client_id: clientIdFromUrl ? Number.parseInt(clientIdFromUrl) : null,
    template_id: null,
    business_name: "",
    total_sessions: 10,
    reward: "",
    expiry_date: null,
    service_id: null,
    service_price: null,
  })

  // Función de validación
  const validateField = (field: keyof ExtendedCardFormData, value: any): string | undefined => {
    switch (field) {
      case "organization_id":
        if (!value || value === 0) return "Debes seleccionar una organización"
        break
      case "client_id":
        if (!value) return "Debes seleccionar un cliente"
        break
      case "business_name":
        if (!value || value.trim() === "") return "Debes ingresar el nombre del negocio"
        break
      case "total_sessions":
        if (!value || value < 1) return "El número de sesiones debe ser mayor a 0"
        if (value > 20) return "El número máximo de sesiones es 20"
        break
      case "reward":
        if (!value || value.trim() === "") return "Debes ingresar una recompensa"
        break
    }
    return undefined
  }

  // Validar todos los campos
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {}

    const organizationError = validateField("organization_id", formData.organization_id)
    if (organizationError) newErrors.organization_id = organizationError

    const clientError = validateField("client_id", formData.client_id)
    if (clientError) newErrors.client_id = clientError

    const businessNameError = validateField("business_name", formData.business_name)
    if (businessNameError) newErrors.business_name = businessNameError

    const sessionsError = validateField("total_sessions", formData.total_sessions)
    if (sessionsError) newErrors.total_sessions = sessionsError

    const rewardError = validateField("reward", formData.reward)
    if (rewardError) newErrors.reward = rewardError

    return newErrors
  }

  const loadServices = async (organizationId: number) => {
    if (!organizationId) return

    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, price, category, duration, active")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("name")

      if (error) {
        console.error("Error loading services:", error)
        return
      }

      setServices(data || [])
    } catch (error) {
      console.error("Error loading services:", error)
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Cargar organizaciones
        const { data: orgsData, error: orgsError } = await supabase
          .from("organizations")
          .select("id, name")
          .order("name")

        if (orgsError) {
          console.error("Error al cargar organizaciones:", orgsError)
          toast({
            title: "Error",
            description: "No se pudieron cargar las organizaciones",
            variant: "destructive",
          })
          return
        }

        if (orgsData && orgsData.length > 0) {
          console.log("Organizaciones cargadas:", orgsData)
          setOrganizations(orgsData)
          // Seleccionar la primera organización por defecto
          const firstOrgId = orgsData[0].id
          setFormData((prev) => ({ ...prev, organization_id: firstOrgId }))
          await loadServices(firstOrgId)
        } else {
          console.warn("No se encontraron organizaciones")
        }

        // Si hay un client_id en la URL, cargar los datos del cliente
        if (clientIdFromUrl) {
          const { data: clientData, error: clientError } = await supabase
            .from("clients")
            .select("id, name, tax_id, organization_id")
            .eq("id", clientIdFromUrl)
            .single()

          if (clientError) {
            console.error("Error al cargar cliente desde URL:", clientError)
          } else if (clientData) {
            setSelectedClientFromUrl(clientData)
            setSelectedClient(clientData)
            // Actualizar la organización y cliente en el formulario
            setFormData((prev) => ({
              ...prev,
              organization_id: clientData.organization_id,
              client_id: clientData.id,
            }))
            await loadServices(clientData.organization_id)
          }
        }
      } catch (error) {
        console.error("Error loading initial data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos iniciales",
          variant: "destructive",
        })
      }
    }

    loadInitialData()
  }, [toast, clientIdFromUrl])

  const handleChange = async (field: keyof ExtendedCardFormData, value: any) => {
    // Si el valor es numérico, asegurarse de que sea un número válido
    if (
      field === "organization_id" ||
      field === "client_id" ||
      field === "total_sessions" ||
      field === "service_id" ||
      field === "service_price"
    ) {
      // Si es una cadena, intentar convertirla a número
      if (typeof value === "string") {
        const parsedValue = Number.parseInt(value, 10)
        // Si la conversión resulta en NaN, usar 0 o null según el campo
        if (isNaN(parsedValue)) {
          value = field === "service_id" || field === "service_price" ? null : 0
        } else {
          value = parsedValue
        }
      }
      // Si es null o undefined, usar 0 o null según el campo
      else if (value == null) {
        value = field === "service_id" || field === "service_price" ? null : 0
      }
    }

    setFormData((prev) => ({ ...prev, [field]: value }))

    if (field === "organization_id" && value && value !== 0) {
      await loadServices(value)
      // Reset service selection when organization changes
      setFormData((prev) => ({ ...prev, service_id: null, service_price: null }))
    }

    // Validar el campo si ya fue tocado
    if (touched[field]) {
      const fieldError = validateField(field, value)
      setErrors((prev) => ({
        ...prev,
        [field]: fieldError,
      }))
    }
  }

  const handleServiceChange = (serviceId: string) => {
    const selectedService = services.find((s) => s.id.toString() === serviceId)

    if (selectedService) {
      setFormData((prev) => ({
        ...prev,
        service_id: selectedService.id,
        service_price: selectedService.price,
        reward: selectedService.description || `Servicio: ${selectedService.name}`,
      }))
    } else {
      // "Servicio personalizado" selected
      setFormData((prev) => ({
        ...prev,
        service_id: null,
        service_price: null,
      }))
    }
  }

  // Manejar cuando un campo pierde el foco
  const handleBlur = (field: keyof ExtendedCardFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const fieldError = validateField(field, formData[field])
    setErrors((prev) => ({
      ...prev,
      [field]: fieldError,
    }))
  }

  // Manejar selección de cliente
  const handleClientSelect = (client: any) => {
    setSelectedClient(client)
    if (client) {
      setFormData((prev) => ({ ...prev, client_id: client.id }))
      // Limpiar error de cliente si existe
      setErrors((prev) => ({ ...prev, client_id: undefined }))
    } else {
      setFormData((prev) => ({ ...prev, client_id: null }))
    }
    setTouched((prev) => ({ ...prev, client_id: true }))
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Marcar todos los campos como tocados
    setTouched({
      organization_id: true,
      client_id: true,
      business_name: true,
      total_sessions: true,
      reward: true,
    })

    // Validar formulario
    const formErrors = validateForm()
    setErrors(formErrors)

    // Si hay errores, no enviar
    if (Object.keys(formErrors).length > 0) {
      toast({
        title: "Formulario incompleto",
        description: "Por favor, completa todos los campos obligatorios marcados con *",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      console.log("Creando tarjeta con datos:", formData)

      const cardData = {
        organization_id: formData.organization_id || 0,
        client_id: formData.client_id || 0,
        template_id: formData.template_id,
        business_name: formData.business_name,
        total_sessions: formData.total_sessions || 10,
        completed_sessions: 0,
        reward: formData.reward,
        expiry_date: formData.expiry_date,
        status: "active" as const,
        service_id: formData.service_id,
        service_price: formData.service_price,
      }

      console.log("Enviando datos a Supabase:", cardData)

      const { data, error } = await supabase.from("loyalty_cards").insert(cardData).select("id").single()

      if (error) {
        console.error("Error creating loyalty card:", error)
        throw new Error(`No se pudo crear la tarjeta: ${error.message}`)
      }

      if (!data || !data.id) {
        throw new Error("No se pudo obtener el ID de la tarjeta creada")
      }

      const cardId = data.id

      // Verificar que el ID sea válido
      if (!cardId || isNaN(cardId) || cardId <= 0) {
        throw new Error("Error al crear la tarjeta: ID inválido")
      }

      console.log("Tarjeta creada con ID:", cardId)

      toast({
        title: "Tarjeta creada",
        description: "La tarjeta de fidelización ha sido creada correctamente",
      })

      // Redirigir según el contexto
      if (clientIdFromUrl) {
        // Si venimos de la página de un cliente, volver a esa página
        router.push(`/dashboard/clients/${clientIdFromUrl}`)
      } else {
        // Si no, ir a la página de la tarjeta creada
        router.push(`/dashboard/loyalty-cards/${cardId}`)
      }
    } catch (error) {
      console.error("Error creating loyalty card:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la tarjeta de fidelización",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Asegurarse de que los valores para los Select nunca sean NaN
  const getSelectValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return ""
    }
    return value.toString()
  }

  const previewCard = {
    id: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organization_id: formData.organization_id || 0,
    client_id: formData.client_id || 0,
    template_id: formData.template_id,
    business_name: formData.business_name || "Nombre del Negocio",
    total_sessions: formData.total_sessions || 10,
    completed_sessions: 0,
    reward: formData.reward || "Recompensa por completar",
    expiry_date: formData.expiry_date,
    last_visit_date: null,
    status: "active" as const,
    service_id: formData.service_id,
    service_price: formData.service_price,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Tarjeta de Fidelización</h1>
          <p className="text-muted-foreground">
            {selectedClientFromUrl
              ? `Crear tarjeta para ${selectedClientFromUrl.name}`
              : "Crea una nueva tarjeta de fidelización para tus clientes"}
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {clientIdFromUrl && (
            <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${clientIdFromUrl}`)}>
              Volver al Cliente
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Información de la Tarjeta</CardTitle>
              <CardDescription>
                Completa los datos para crear una nueva tarjeta de fidelización. Los campos marcados con{" "}
                <span className="text-red-500">*</span> son obligatorios.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organization_id" className="flex items-center gap-1">
                    Organización <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={getSelectValue(formData.organization_id)}
                    onValueChange={(value) => handleChange("organization_id", value ? Number.parseInt(value, 10) : 0)}
                    disabled={!!selectedClientFromUrl}
                  >
                    <SelectTrigger className={cn(errors.organization_id && "border-red-500")}>
                      <SelectValue placeholder="Selecciona una organización" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id.toString()}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.organization_id && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.organization_id}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_search" className="flex items-center gap-1">
                    Cliente <span className="text-red-500">*</span>
                  </Label>
                  <ClientSearch
                    organizationId={formData.organization_id}
                    selectedClient={selectedClient}
                    onClientSelect={handleClientSelect}
                    disabled={!!selectedClientFromUrl}
                    error={errors.client_id}
                  />
                  {selectedClientFromUrl && (
                    <p className="text-sm text-muted-foreground">
                      Tarjeta para: {selectedClientFromUrl.name} ({selectedClientFromUrl.tax_id})
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_id">Servicio (opcional)</Label>
                  <Select
                    value={formData.service_id ? formData.service_id.toString() : "0"}
                    onValueChange={handleServiceChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Servicio personalizado</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id.toString()}>
                          {service.name} - €{service.price}
                          {service.category && ` (${service.category})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.service_id && formData.service_price && (
                    <p className="text-xs text-muted-foreground">Precio del servicio: €{formData.service_price}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_name" className="flex items-center gap-1">
                    Nombre del Negocio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleChange("business_name", e.target.value)}
                    onBlur={() => handleBlur("business_name")}
                    placeholder="Ej: Physia Health"
                    className={cn(errors.business_name && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {errors.business_name && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.business_name}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_sessions" className="flex items-center gap-1">
                    Número de Sesiones <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="total_sessions"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.total_sessions || 10}
                    onChange={(e) => {
                      const value = e.target.value ? Number.parseInt(e.target.value, 10) : 0
                      handleChange("total_sessions", isNaN(value) ? 10 : value)
                    }}
                    onBlur={() => handleBlur("total_sessions")}
                    className={cn(errors.total_sessions && "border-red-500 focus-visible:ring-red-500")}
                  />
                  <p className="text-xs text-muted-foreground">Máximo 20 sesiones por tarjeta</p>
                  {errors.total_sessions && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.total_sessions}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reward" className="flex items-center gap-1">
                    Recompensa <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="reward"
                    value={formData.reward}
                    onChange={(e) => handleChange("reward", e.target.value)}
                    onBlur={() => handleBlur("reward")}
                    placeholder="Ej: Consulta premium con análisis IA"
                    className={cn(errors.reward && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {errors.reward && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {errors.reward}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Fecha de Expiración (opcional)</Label>
                  <DatePicker
                    date={formData.expiry_date ? new Date(formData.expiry_date) : undefined}
                    setDate={(date) => handleChange("expiry_date", date ? date.toISOString().split("T")[0] : null)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (clientIdFromUrl) {
                      router.push(`/dashboard/clients/${clientIdFromUrl}`)
                    } else {
                      router.push("/dashboard/loyalty-cards")
                    }
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creando..." : "Crear Tarjeta"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Vista Previa</CardTitle>
              <CardDescription>Así se verá la tarjeta de fidelización</CardDescription>
            </CardHeader>
            <CardContent>
              <PhysiaCard
                card={previewCard}
                customerName={selectedClient?.name || "Nombre del Cliente"}
                customerID={selectedClient?.tax_id || "ID-CLIENTE"}
                readOnly={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Componente principal con Suspense
export default function NewLoyaltyCardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Cargando...</div>}>
      <NewLoyaltyCardForm />
    </Suspense>
  )
}
