"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface Professional {
  id: number
  name: string
  active: boolean
}

export default function EditServicePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])

  const [formData, setFormData] = useState({
    organization_id: "",
    name: "",
    description: "",
    price: "0",
    vat_rate: "21",
    irpf_rate: "0",
    retention_rate: "0",
    category: "",
    active: true,
    professional_id: "", // Nuevo campo para el profesional asignado
  })

  // Cargar organizaciones y datos del servicio al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar organizaciones
        const { data: orgsData } = await supabase.from("organizations").select("id, name").order("name")
        if (orgsData) {
          setOrganizations(orgsData)
        }

        // Cargar datos del servicio
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("*")
          .eq("id", params.id)
          .single()

        if (serviceError) throw serviceError

        if (serviceData) {
          setFormData({
            organization_id: serviceData.organization_id.toString(),
            name: serviceData.name,
            description: serviceData.description || "",
            price: serviceData.price.toString(),
            vat_rate: serviceData.vat_rate.toString(),
            irpf_rate: serviceData.irpf_rate.toString(),
            retention_rate: serviceData.retention_rate.toString(),
            category: serviceData.category || "",
            active: serviceData.active,
            professional_id: serviceData.professional_id ? serviceData.professional_id.toString() : "",
          })

          // Cargar profesionales para esta organización
          fetchProfessionals(serviceData.organization_id)
        }
      } catch (err) {
        console.error("Error al cargar datos:", err)
        setError("No se pudo cargar la información del servicio")
      }
    }

    fetchData()
  }, [params.id])

  // Función para cargar profesionales según la organización seleccionada
  const fetchProfessionals = async (organizationId: number) => {
    try {
      const { data } = await supabase
        .from("professionals")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("name")

      setProfessionals(data || [])
    } catch (error) {
      console.error("Error al cargar profesionales:", error)
    }
  }

  // Actualizar profesionales cuando cambia la organización
  useEffect(() => {
    if (formData.organization_id) {
      fetchProfessionals(Number.parseInt(formData.organization_id))
    }
  }, [formData.organization_id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, active: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!formData.organization_id) {
        throw new Error("Debes seleccionar una organización")
      }

      if (!formData.name) {
        throw new Error("El nombre del servicio es obligatorio")
      }

      // Validar que el precio sea un número válido
      const price = Number.parseFloat(formData.price)
      if (isNaN(price) || price < 0) {
        throw new Error("El precio debe ser un número válido mayor o igual a cero")
      }

      // Actualizar el servicio
      const { error: updateError } = await supabase
        .from("services")
        .update({
          organization_id: Number.parseInt(formData.organization_id),
          name: formData.name,
          description: formData.description || null,
          price: price,
          vat_rate: Number.parseInt(formData.vat_rate) || 21,
          irpf_rate: Number.parseInt(formData.irpf_rate) || 0,
          retention_rate: Number.parseInt(formData.retention_rate) || 0,
          category: formData.category || null,
          active: formData.active,
          professional_id: formData.professional_id ? Number.parseInt(formData.professional_id) : null,
        })
        .eq("id", params.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      router.push("/dashboard/services")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el servicio")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Editar Servicio</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del servicio</CardTitle>
            <CardDescription>Modifica los datos del servicio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="organization_id">Organización</Label>
              <Select
                value={formData.organization_id}
                onValueChange={(value) => handleSelectChange("organization_id", value)}
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
              <Label htmlFor="name">Nombre del Servicio</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descripción detallada del servicio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="Ej: Fisioterapia, Masaje, Pilates..."
              />
            </div>

            {/* Nuevo selector de profesional */}
            <div className="space-y-2">
              <Label htmlFor="professional_id">Profesional Asignado (opcional)</Label>
              <Select
                value={formData.professional_id}
                onValueChange={(value) => handleSelectChange("professional_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un profesional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  {professionals.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id.toString()}>
                      {professional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (€)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat_rate">IVA (%)</Label>
                <Input
                  id="vat_rate"
                  name="vat_rate"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.vat_rate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="irpf_rate">IRPF (%)</Label>
                <Input
                  id="irpf_rate"
                  name="irpf_rate"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.irpf_rate}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retention_rate">Retención (%)</Label>
                <Input
                  id="retention_rate"
                  name="retention_rate"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.retention_rate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch id="active" checked={formData.active} onCheckedChange={handleSwitchChange} />
              <Label htmlFor="active">Servicio activo</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/services")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
