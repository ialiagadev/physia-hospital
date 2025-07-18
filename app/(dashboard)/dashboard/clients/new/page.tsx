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

// Componente personalizado para labels con asterisco rojo
const RequiredLabel = ({
  children,
  htmlFor,
  required = false,
}: {
  children: React.ReactNode
  htmlFor?: string
  required?: boolean
}) => (
  <Label htmlFor={htmlFor} className="flex items-center gap-1">
    {children}
    {required && <span className="text-red-500">*</span>}
  </Label>
)

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
    birth_date: "", // Campo de fecha de nacimiento
    gender: "", // Campo de género (opcional)
    medical_notes: "", // Campo de notas médicas
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
          phone: formData.phone,
          birth_date: formData.birth_date || null, // Guardar fecha de nacimiento
          gender: formData.gender || null, // Guardar género
          medical_notes: formData.medical_notes || null, // Guardar notas médicas
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
              <RequiredLabel htmlFor="organization_id" required>
                Organización
              </RequiredLabel>
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
              <RequiredLabel htmlFor="name" required>
                Nombre o Razón Social
              </RequiredLabel>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <RequiredLabel htmlFor="tax_id" required>
                CIF/NIF
              </RequiredLabel>
              <Input id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleChange} required />
            </div>

            {/* Campos de información personal */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <RequiredLabel htmlFor="birth_date">Fecha de Nacimiento</RequiredLabel>
                <Input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <RequiredLabel htmlFor="gender">Género</RequiredLabel>
                <Select value={formData.gender} onValueChange={(value) => handleSelectChange("gender", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar género" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                    <SelectItem value="no-especificar">Prefiero no especificar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <RequiredLabel htmlFor="address" required>
                Dirección
              </RequiredLabel>
              <Textarea id="address" name="address" value={formData.address} onChange={handleChange} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <RequiredLabel htmlFor="postal_code" required>
                  Código Postal
                </RequiredLabel>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <RequiredLabel htmlFor="city" required>
                  Ciudad
                </RequiredLabel>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <RequiredLabel htmlFor="province" required>
                  Provincia
                </RequiredLabel>
                <Input id="province" name="province" value={formData.province} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <RequiredLabel htmlFor="country" required>
                  País
                </RequiredLabel>
                <Input id="country" name="country" value={formData.country} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <RequiredLabel htmlFor="email">Email</RequiredLabel>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <RequiredLabel htmlFor="phone" required>
                  Teléfono
                </RequiredLabel>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>
            </div>

            {/* Campo de notas médicas */}
            <div className="space-y-2">
              <RequiredLabel htmlFor="medical_notes">Notas Médicas</RequiredLabel>
              <Textarea
                id="medical_notes"
                name="medical_notes"
                value={formData.medical_notes}
                onChange={handleChange}
                placeholder="Añadir notas médicas adicionales..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <RequiredLabel required>Tipo de Cliente</RequiredLabel>
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
                  <RequiredLabel htmlFor="CentroGestor" required>
                    Centro Gestor
                  </RequiredLabel>
                  <Input
                    id="CentroGestor"
                    name="CentroGestor"
                    value={formData.dir3_codes.CentroGestor}
                    onChange={handleDir3Change}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="UnidadTramitadora" required>
                    Unidad Tramitadora
                  </RequiredLabel>
                  <Input
                    id="UnidadTramitadora"
                    name="UnidadTramitadora"
                    value={formData.dir3_codes.UnidadTramitadora}
                    onChange={handleDir3Change}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <RequiredLabel htmlFor="OficinaContable" required>
                    Oficina Contable
                  </RequiredLabel>
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
