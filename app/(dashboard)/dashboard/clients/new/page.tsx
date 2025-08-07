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
import { COMMON_PHONE_PREFIXES } from "@/types/chat"

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
  const [existingClientWarning, setExistingClientWarning] = useState<string | null>(null)
  
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
    phone_prefix: "+34", // ✅ Nuevo campo con valor por defecto
    birth_date: "",
    gender: "",
    medical_notes: "",
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

  // ✅ FUNCIÓN PARA COMPROBAR SI EL CLIENTE YA EXISTE
  const checkExistingClient = async (phone: string, phonePrefix: string, organizationId: string) => {
    if (!phone || !phonePrefix || !organizationId) return

    try {
      // Crear el teléfono completo para la búsqueda
      const fullPhone = `${phonePrefix}${phone}`
      
      // Buscar por teléfono completo O por teléfono sin prefijo (compatibilidad)
      const { data: existingClients, error } = await supabase
        .from("clients")
        .select("id, name, phone, phone_prefix, full_phone")
        .eq("organization_id", Number.parseInt(organizationId))
        .or(`full_phone.eq.${fullPhone},phone.eq.${phone}`)

      if (error) {
        console.error("Error checking existing client:", error)
        return
      }

      if (existingClients && existingClients.length > 0) {
        const client = existingClients[0]
        setExistingClientWarning(
          `⚠️ Ya existe un cliente con este teléfono: "${client.name}" (${client.full_phone || client.phone})`
        )
      } else {
        setExistingClientWarning(null)
      }
    } catch (err) {
      console.error("Error in checkExistingClient:", err)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // ✅ Comprobar cliente existente cuando cambie el teléfono
    if (name === "phone") {
      // Debounce la búsqueda para evitar muchas consultas
      setTimeout(() => {
        checkExistingClient(value, formData.phone_prefix, formData.organization_id)
      }, 500)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // ✅ Comprobar cliente existente cuando cambie el prefijo o organización
    if (name === "phone_prefix") {
      setTimeout(() => {
        checkExistingClient(formData.phone, value, formData.organization_id)
      }, 500)
    }
    
    if (name === "organization_id") {
      setTimeout(() => {
        checkExistingClient(formData.phone, formData.phone_prefix, value)
      }, 500)
    }
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

      // ✅ Verificación final antes de crear el cliente
      if (formData.phone && formData.phone_prefix) {
        const fullPhone = `${formData.phone_prefix}${formData.phone}`
        
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id, name")
          .eq("organization_id", Number.parseInt(formData.organization_id))
          .or(`full_phone.eq.${fullPhone},phone.eq.${formData.phone}`)
          .single()

        if (existingClient) {
          throw new Error(`Ya existe un cliente con este teléfono: "${existingClient.name}"`)
        }
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
          phone_prefix: formData.phone_prefix, // ✅ Guardar prefijo
          birth_date: formData.birth_date || null,
          gender: formData.gender || null,
          medical_notes: formData.medical_notes || null,
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

            {existingClientWarning && (
              <Alert variant="default" className="border-orange-200 bg-orange-50">
                <AlertDescription className="text-orange-800">
                  {existingClientWarning}
                </AlertDescription>
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
                {/* ✅ SELECTOR DE PREFIJO + TELÉFONO */}
                <div className="flex gap-2">
                  <Select
                    value={formData.phone_prefix}
                    onValueChange={(value) => handleSelectChange("phone_prefix", value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_PHONE_PREFIXES.map((prefix) => (
                        <SelectItem key={prefix.countryCode} value={prefix.prefix}>
                          <div className="flex items-center gap-2">
                            <span>{prefix.flag}</span>
                            <span>{prefix.prefix}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="123456789"
                    className="flex-1"
                    required
                  />
                </div>
                {/* Mostrar teléfono completo como preview */}
                {formData.phone && (
                  <p className="text-sm text-gray-500">
                    Teléfono completo: <strong>{formData.phone_prefix}{formData.phone}</strong>
                  </p>
                )}
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
            <Button type="submit" disabled={isLoading || !!existingClientWarning}>
              {isLoading ? "Guardando..." : "Guardar Cliente"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
