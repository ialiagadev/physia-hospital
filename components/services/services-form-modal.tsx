"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useServices } from "@/hooks/use-services"
import type { Service, ServiceInsert } from "@/types/services"

interface ServiceFormModalProps {
  organizationId?: number
  service?: Service | null
  onClose: () => void
  onSuccess: () => void
}

const serviceCategories = [
  "Consulta",
  "Tratamiento",
  "Diagnóstico",
  "Cirugía",
  "Rehabilitación",
  "Prevención",
  "Urgencia",
  "Revisión",
]

const serviceColors = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6B7280", // Gray
]

export function ServiceFormModal({ organizationId, service, onClose, onSuccess }: ServiceFormModalProps) {
  const { createService, updateService } = useServices(organizationId)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: service?.name || "",
    description: service?.description || "",
    price: service?.price || 0,
    vat_rate: service?.vat_rate || 21,
    irpf_rate: service?.irpf_rate || 0,
    retention_rate: service?.retention_rate || 0,
    active: service?.active ?? true,
    category: service?.category || "",
    duration: service?.duration || 30,
    color: service?.color || "#3B82F6",
    icon: service?.icon || "",
    sort_order: service?.sort_order || 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!organizationId) {
      return
    }

    setLoading(true)
    try {
      const serviceData: ServiceInsert = {
        organization_id: organizationId,
        ...formData,
      }

      if (service) {
        await updateService(service.id, serviceData)
      } else {
        await createService(serviceData)
      }

      onSuccess()
    } catch (error) {
      console.error("Error saving service:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{service ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Nombre del servicio *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: Consulta general"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del servicio..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {serviceCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="duration">Duración (minutos)</Label>
              <Select
                value={formData.duration.toString()}
                onValueChange={(value) => setFormData({ ...formData, duration: Number.parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Precios e impuestos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Precio (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number.parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <Label htmlFor="vat_rate">IVA (%)</Label>
              <Input
                id="vat_rate"
                type="number"
                min="0"
                max="100"
                value={formData.vat_rate}
                onChange={(e) => setFormData({ ...formData, vat_rate: Number.parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="irpf_rate">IRPF (%)</Label>
              <Input
                id="irpf_rate"
                type="number"
                min="0"
                max="100"
                value={formData.irpf_rate}
                onChange={(e) => setFormData({ ...formData, irpf_rate: Number.parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="retention_rate">Retención (%)</Label>
              <Input
                id="retention_rate"
                type="number"
                min="0"
                max="100"
                value={formData.retention_rate}
                onChange={(e) => setFormData({ ...formData, retention_rate: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Apariencia */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2 mt-2">
                {serviceColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? "border-gray-800" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="icon">Icono (emoji)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🩺"
                maxLength={2}
              />
            </div>

            <div>
              <Label htmlFor="sort_order">Orden</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: Number.parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label htmlFor="active">Servicio activo</Label>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : service ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
