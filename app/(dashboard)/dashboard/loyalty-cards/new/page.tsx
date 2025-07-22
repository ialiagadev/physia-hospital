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
import { Breadcrumbs } from "@/components/breadcrumbs"
import { PhysiaCard } from "@/components/loyalty-card/physia-card"
import { Search, X, User } from "lucide-react"
import type { CardFormData } from "@/types/loyalty-cards"

// Componente de búsqueda de clientes
interface ClientSearchProps {
  organizationId: number
  selectedClient: any
  onClientSelect: (client: any) => void
  disabled?: boolean
}

function ClientSearch({ organizationId, selectedClient, onClientSelect, disabled }: ClientSearchProps) {
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
          className="pl-10 pr-10"
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

  // Obtener client_id de los parámetros de URL
  const clientIdFromUrl = searchParams.get("client_id")

  const [formData, setFormData] = useState<CardFormData>({
    organization_id: 0,
    client_id: clientIdFromUrl ? Number.parseInt(clientIdFromUrl) : null,
    template_id: null,
    business_name: "",
    total_sessions: 10,
    reward: "",
    expiry_date: null,
  })

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
          setFormData((prev) => ({ ...prev, organization_id: orgsData[0].id }))
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

  // Manejar cambios en el formulario con validación para evitar NaN
  const handleChange = (field: keyof CardFormData, value: any) => {
    // Si el valor es numérico, asegurarse de que sea un número válido
    if (field === "organization_id" || field === "client_id" || field === "total_sessions") {
      // Si es una cadena, intentar convertirla a número
      if (typeof value === "string") {
        const parsedValue = Number.parseInt(value, 10)
        // Si la conversión resulta en NaN, usar 0
        if (isNaN(parsedValue)) {
          value = 0
        } else {
          value = parsedValue
        }
      }
      // Si es null o undefined, usar 0
      else if (value == null) {
        value = 0
      }
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Manejar selección de cliente
  const handleClientSelect = (client: any) => {
    setSelectedClient(client)
    if (client) {
      setFormData((prev) => ({ ...prev, client_id: client.id }))
    } else {
      setFormData((prev) => ({ ...prev, client_id: null }))
    }
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validar datos
      if (!formData.organization_id) {
        throw new Error("Debes seleccionar una organización")
      }
      if (!formData.client_id) {
        throw new Error("Debes seleccionar un cliente")
      }
      if (!formData.business_name) {
        throw new Error("Debes ingresar el nombre del negocio")
      }
      if (!formData.total_sessions || formData.total_sessions < 1) {
        throw new Error("El número de sesiones debe ser mayor a 0")
      }
      if (!formData.reward) {
        throw new Error("Debes ingresar una recompensa")
      }

      console.log("Creando tarjeta con datos:", formData)

      // Crear la tarjeta directamente con Supabase para mayor control
      const cardData = {
        organization_id: formData.organization_id || 0,
        client_id: formData.client_id || 0,
        template_id: formData.template_id,
        business_name: formData.business_name,
        total_sessions: formData.total_sessions || 10,
        completed_sessions: 0,
        reward: formData.reward,
        expiry_date: formData.expiry_date,
        status: "active" as const, // Explicitly type as const to match the enum
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

  // Datos para la vista previa
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
    status: "active" as const, // Use const assertion to match the LoyaltyCard status type
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
              <CardDescription>Completa los datos para crear una nueva tarjeta de fidelización</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organization_id">Organización</Label>
                  <Select
                    value={getSelectValue(formData.organization_id)}
                    onValueChange={(value) => handleChange("organization_id", value ? Number.parseInt(value, 10) : 0)}
                    disabled={!!selectedClientFromUrl} // Deshabilitar si viene de un cliente específico
                  >
                    <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_search">Cliente</Label>
                  <ClientSearch
                    organizationId={formData.organization_id}
                    selectedClient={selectedClient}
                    onClientSelect={handleClientSelect}
                    disabled={!!selectedClientFromUrl}
                  />
                  {selectedClientFromUrl && (
                    <p className="text-sm text-muted-foreground">
                      Tarjeta para: {selectedClientFromUrl.name} ({selectedClientFromUrl.tax_id})
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_name">Nombre del Negocio</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleChange("business_name", e.target.value)}
                    placeholder="Ej: Physia Health"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_sessions">Número de Sesiones</Label>
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
                  />
                  <p className="text-xs text-muted-foreground">Máximo 20 sesiones por tarjeta</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reward">Recompensa</Label>
                  <Textarea
                    id="reward"
                    value={formData.reward}
                    onChange={(e) => handleChange("reward", e.target.value)}
                    placeholder="Ej: Consulta premium con análisis IA"
                  />
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
