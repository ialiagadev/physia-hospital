"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function NewClientPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [formData, setFormData] = useState({
    organization_id: "",
    name: "",
    tax_id: "",
    address: "",
    postal_code: "",
    city: "",
    province: "",
    country: "España",
    client_type: "private",
    email: "",
    phone: "",
    dir3_codes: {
      CentroGestor: "",
      UnidadTramitadora: "",
      OficinaContable: "",
    },
  })

  // Cargar organizaciones al montar el componente
  React.useEffect(() => {
    const fetchOrganizations = async () => {
      const { data } = await supabase.from("organizations").select("id, name")
      if (data && data.length > 0) {
        setOrganizations(data)
        setFormData((prev) => ({ ...prev, organization_id: data[0].id.toString() }))
      }
    }

    fetchOrganizations()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDir3Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      dir3_codes: { ...prev.dir3_codes, [name]: value },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!formData.organization_id) {
        throw new Error("Debes seleccionar una organización")
      }

      // Crear el cliente
      const { data, error: insertError } = await supabase
        .from("clients")
        .insert({
          organization_id: Number.parseInt(formData.organization_id),
          name: formData.name,
          tax_id: formData.tax_id,
          address: formData.address,
          postal_code: formData.postal_code,
          city: formData.city,
          province: formData.province,
          country: formData.country,
          client_type: formData.client_type,
          email: formData.email || null,
          phone: formData.phone || null,
          dir3_codes: formData.client_type === "public" ? formData.dir3_codes : null,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      router.push("/dashboard/clients")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el cliente")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Nuevo Cliente</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del cliente</CardTitle>
            <CardDescription>Introduce los datos del nuevo cliente</CardDescription>
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
              <Label htmlFor="name">Nombre o Razón Social</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">CIF/NIF</Label>
              <Input id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea id="address" name="address" value={formData.address} onChange={handleChange} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input id="province" name="province" value={formData.province} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" name="country" value={formData.country} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
              <RadioGroup
                value={formData.client_type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, client_type: value }))}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private">Privado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" />
                  <Label htmlFor="public">Administración Pública</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.client_type === "public" && (
              <div className="space-y-4 border p-4 rounded-md">
                <h3 className="font-medium">Códigos DIR3</h3>
                <div className="space-y-2">
                  <Label htmlFor="CentroGestor">Centro Gestor</Label>
                  <Input
                    id="CentroGestor"
                    name="CentroGestor"
                    value={formData.dir3_codes.CentroGestor}
                    onChange={handleDir3Change}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="UnidadTramitadora">Unidad Tramitadora</Label>
                  <Input
                    id="UnidadTramitadora"
                    name="UnidadTramitadora"
                    value={formData.dir3_codes.UnidadTramitadora}
                    onChange={handleDir3Change}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="OficinaContable">Oficina Contable</Label>
                  <Input
                    id="OficinaContable"
                    name="OficinaContable"
                    value={formData.dir3_codes.OficinaContable}
                    onChange={handleDir3Change}
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/clients")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cliente"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
