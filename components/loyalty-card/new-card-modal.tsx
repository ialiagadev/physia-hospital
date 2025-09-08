"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { useToast } from "@/hooks/use-toast"
import { PhysiaCard } from "@/components/loyalty-card/physia-card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LoyaltyCardService } from "@/lib/loyalty-card-service"
import type { CardFormData, LoyaltyCard } from "@/types/loyalty-cards"
import type { ServiceBasic } from "@/types/services"

interface NewCardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  organizationId: string
  onCardCreated: () => void
  editingCard?: LoyaltyCard // Nueva prop para edición
}

export function NewCardModal({
  open,
  onOpenChange,
  clientId,
  organizationId,
  onCardCreated,
  editingCard,
}: NewCardModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [professionals, setProfessionals] = useState<any[]>([])
  const [client, setClient] = useState<any>(null)
  const [services, setServices] = useState<ServiceBasic[]>([])
  const [formData, setFormData] = useState<CardFormData>({
    organization_id: Number.parseInt(organizationId),
    professional_id: null,
    client_id: Number.parseInt(clientId),
    template_id: null,
    business_name: "",
    total_sessions: 10,
    reward: "",
    expiry_date: null,
    service_id: null,
    service_price: null,
  })

  const isEditing = !!editingCard

  useEffect(() => {
    if (open) {
      loadInitialData()
    }
  }, [open, clientId, organizationId])

  useEffect(() => {
    if (editingCard && open) {
      setFormData({
        organization_id: editingCard.organization_id,
        professional_id: editingCard.professional_id || null,
        client_id: editingCard.client_id,
        template_id: editingCard.template_id,
        business_name: editingCard.business_name,
        total_sessions: editingCard.total_sessions,
        reward: editingCard.reward,
        expiry_date: editingCard.expiry_date,
        service_id: editingCard.service_id || null,
        service_price: editingCard.service_price || null,
      })
    } else if (!editingCard && open) {
      setFormData({
        organization_id: Number.parseInt(organizationId),
        professional_id: null,
        client_id: Number.parseInt(clientId),
        template_id: null,
        business_name: "",
        total_sessions: 10,
        reward: "",
        expiry_date: null,
        service_id: null,
        service_price: null,
      })
    }
  }, [editingCard, open, clientId, organizationId])

  const loadInitialData = async () => {
    try {
      if (!isEditing) {
        const { data: profsData, error: profsError } = await supabase
          .from("professionals")
          .select("id, name")
          .order("name")

        if (profsError) {
          console.error("Error al cargar profesionales:", profsError)
        } else if (profsData) {
          setProfessionals(profsData)
        }
      }

      try {
        const servicesData = await LoyaltyCardService.getServices(Number.parseInt(organizationId))
        setServices(servicesData)
      } catch (error) {
        console.error("Error loading services:", error)
      }

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, tax_id")
        .eq("id", clientId)
        .single()

      if (clientError) {
        console.error("Error al cargar cliente:", clientError)
      } else if (clientData) {
        setClient(clientData)
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

  const handleServiceChange = (serviceId: string) => {
    if (serviceId === "0" || serviceId === "") {
      setFormData((prev) => ({
        ...prev,
        service_id: null,
        service_price: null,
        business_name: "",
        reward: "",
      }))
    } else {
      const selectedService = services.find((s) => s.id === Number.parseInt(serviceId))
      if (selectedService) {
        setFormData((prev) => ({
          ...prev,
          service_id: selectedService.id,
          service_price: selectedService.price,
          business_name: selectedService.name,
          reward: selectedService.description || `Servicio: ${selectedService.name}`,
        }))
      }
    }
  }

  const handleChange = (field: keyof CardFormData, value: any) => {
    if (
      field === "organization_id" ||
      field === "client_id" ||
      field === "professional_id" ||
      field === "total_sessions" ||
      field === "service_id"
    ) {
      if (typeof value === "string") {
        const parsedValue = Number.parseInt(value, 10)
        if (isNaN(parsedValue)) {
          value = field === "professional_id" || field === "service_id" ? null : 0
        } else {
          value = parsedValue
        }
      } else if (value == null && field !== "professional_id" && field !== "service_id") {
        value = 0
      }
    }

    if (field === "service_price") {
      if (typeof value === "string") {
        const parsedValue = Number.parseFloat(value)
        value = isNaN(parsedValue) ? null : parsedValue
      }
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.business_name) {
        throw new Error("Debes ingresar el nombre del negocio")
      }
      if (!formData.total_sessions || formData.total_sessions < 1) {
        throw new Error("El número de sesiones debe ser mayor a 0")
      }
      if (!formData.reward) {
        throw new Error("Debes ingresar una recompensa")
      }

      if (isEditing && editingCard) {
        await LoyaltyCardService.updateCard(editingCard.id, {
          business_name: formData.business_name,
          total_sessions: formData.total_sessions,
          reward: formData.reward,
          expiry_date: formData.expiry_date,
          service_id: formData.service_id,
          service_price: formData.service_price,
        })

        toast({
          title: "Tarjeta actualizada",
          description: "La tarjeta de fidelización ha sido actualizada correctamente",
        })
      } else {
        const cardData = {
          organization_id: formData.organization_id,
          professional_id: formData.professional_id,
          client_id: formData.client_id,
          template_id: formData.template_id,
          business_name: formData.business_name,
          total_sessions: formData.total_sessions,
          completed_sessions: 0,
          reward: formData.reward,
          expiry_date: formData.expiry_date,
          status: "active" as const,
          service_id: formData.service_id,
          service_price: formData.service_price,
        }

        const { error } = await supabase.from("loyalty_cards").insert(cardData)

        if (error) {
          throw new Error(`No se pudo crear la tarjeta: ${error.message}`)
        }

        toast({
          title: "Tarjeta creada",
          description: "La tarjeta de fidelización ha sido creada correctamente",
        })
      }

      onCardCreated()
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving loyalty card:", error)
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `No se pudo ${isEditing ? "actualizar" : "crear"} la tarjeta de fidelización`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getSelectValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return ""
    }
    return value.toString()
  }

  const previewCard = {
    id: editingCard?.id || 0,
    created_at: editingCard?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organization_id: formData.organization_id || 0,
    professional_id: formData.professional_id,
    client_id: formData.client_id || 0,
    template_id: formData.template_id,
    business_name: formData.business_name || "Nombre del Negocio",
    total_sessions: formData.total_sessions || 10,
    completed_sessions: editingCard?.completed_sessions || 0,
    reward: formData.reward || "Recompensa por completar",
    expiry_date: formData.expiry_date,
    last_visit_date: editingCard?.last_visit_date || null,
    status: editingCard?.status || ("active" as const),
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Tarjeta de Fidelización" : "Nueva Tarjeta de Fidelización"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Edita la tarjeta de fidelización de ${client?.name || editingCard?.clients?.name}`
              : `Crea una nueva tarjeta de fidelización para ${client?.name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service_id">Servicio (opcional)</Label>
                <Select value={getSelectValue(formData.service_id)} onValueChange={handleServiceChange}>
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
                {formData.service_id && (
                  <p className="text-xs text-muted-foreground">Precio del servicio: €{formData.service_price}</p>
                )}
              </div>

              {!isEditing && (
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
              )}

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
            </form>
          </div>

          <div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Vista Previa</h3>
                <p className="text-sm text-muted-foreground">Así se verá la tarjeta de fidelización</p>
              </div>
              <PhysiaCard
                card={previewCard}
                customerName={client?.name || editingCard?.clients?.name || "Nombre del Cliente"}
                customerID={client?.tax_id || editingCard?.clients?.tax_id || "ID-CLIENTE"}
                readOnly={true}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? isEditing
                ? "Actualizando..."
                : "Creando..."
              : isEditing
                ? "Actualizar Tarjeta"
                : "Crear Tarjeta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
