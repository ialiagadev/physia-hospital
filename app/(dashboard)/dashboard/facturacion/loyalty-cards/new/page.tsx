"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import type { CardFormData } from "@/types/loyalty-cards"

export default function NewLoyaltyCardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [formData, setFormData] = useState<CardFormData>({
    organization_id: 0,
    professional_id: null,
    client_id: null,
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

        // Cargar profesionales
        const { data: profsData, error: profsError } = await supabase
          .from("professionals")
          .select("id, name")
          .order("name")

        if (profsError) {
          console.error("Error al cargar profesionales:", profsError)
        } else if (profsData) {
          console.log("Profesionales cargados:", profsData.length)
          setProfessionals(profsData)
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
  }, [toast])

  // Cargar clientes cuando cambia la organización
  useEffect(() => {
    async function loadClients() {
      if (!formData.organization_id) {
        console.warn("No hay organization_id seleccionado")
        return
      }

      try {
        console.log("Cargando clientes para organización:", formData.organization_id)
        const { data, error } = await supabase
          .from("clients")
          .select("id, name, tax_id")
          .eq("organization_id", formData.organization_id)
          .order("name")

        if (error) {
          console.error("Error al cargar clientes:", error)
          return
        }

        if (data) {
          console.log("Clientes cargados:", data.length)
          setClients(data)
        } else {
          console.warn("No se encontraron clientes para esta organización")
        }
      } catch (error) {
        console.error("Error loading clients:", error)
      }
    }

    loadClients()
  }, [formData.organization_id])

  // Manejar cambios en el formulario con validación para evitar NaN
  const handleChange = (field: keyof CardFormData, value: any) => {
    // Si el valor es numérico, asegurarse de que sea un número válido
    if (
      field === "organization_id" ||
      field === "client_id" ||
      field === "professional_id" ||
      field === "total_sessions"
    ) {
      // Si es una cadena, intentar convertirla a número
      if (typeof value === "string") {
        const parsedValue = Number.parseInt(value, 10)
        // Si la conversión resulta en NaN, usar 0 o null según corresponda
        if (isNaN(parsedValue)) {
          value = field === "professional_id" ? null : 0
        } else {
          value = parsedValue
        }
      }
      // Si es null o undefined y no es professional_id, usar 0
      else if (value == null && field !== "professional_id") {
        value = 0
      }
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
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
        professional_id: formData.professional_id,
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

      // Redirigir a la página de la tarjeta
      router.push(`/dashboard/loyalty-cards/${cardId}`)
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
    professional_id: formData.professional_id,
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

  // Cliente seleccionado para la vista previa
  const selectedClient = clients.find((c) => c.id === formData.client_id)

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Tarjetas de Fidelización", href: "/dashboard/loyalty-cards" },
    { label: "Nueva Tarjeta", href: "/dashboard/loyalty-cards/new" },
  ]

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nueva Tarjeta de Fidelización</h1>
          <p className="text-muted-foreground">Crea una nueva tarjeta de fidelización para tus clientes</p>
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
                  <Label htmlFor="client_id">Cliente</Label>
                  <Select
                    value={getSelectValue(formData.client_id)}
                    onValueChange={(value) => handleChange("client_id", value ? Number.parseInt(value, 10) : 0)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id.toString()}>
                          {client.name} ({client.tax_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="professional_id">Profesional (opcional)</Label>
                  <Select
                    value={getSelectValue(formData.professional_id)}
                    onValueChange={(value) =>
                      handleChange("professional_id", value === "0" ? null : Number.parseInt(value, 10))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un profesional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Ninguno</SelectItem>
                      {professionals.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id.toString()}>
                          {prof.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard/loyalty-cards")}>
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
