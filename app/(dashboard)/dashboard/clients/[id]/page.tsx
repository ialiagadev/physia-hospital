"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Skeleton } from "@/components/ui/skeleton"

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const clientId = params.id

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
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

  // Cargar datos del cliente y organizaciones
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Cargar organizaciones
        const { data: orgsData } = await supabase.from("organizations").select("id, name").order("name")
        if (orgsData) {
          setOrganizations(orgsData)
        }

        // Cargar datos del cliente
        const { data: clientData, error: clientError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .single()

        if (clientError) {
          throw new Error("No se pudo cargar la información del cliente")
        }

        if (clientData) {
          setFormData({
            organization_id: clientData.organization_id.toString(),
            name: clientData.name || "",
            tax_id: clientData.tax_id || "",
            address: clientData.address || "",
            postal_code: clientData.postal_code || "",
            city: clientData.city || "",
            province: clientData.province || "",
            country: clientData.country || "España",
            client_type: clientData.client_type || "private",
            email: clientData.email || "",
            phone: clientData.phone || "",
            dir3_codes: clientData.dir3_codes || {
              CentroGestor: "",
              UnidadTramitadora: "",
              OficinaContable: "",
            },
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar los datos")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [clientId])

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
    setIsSaving(true)
    setError(null)

    try {
      if (!formData.organization_id) {
        throw new Error("Debes seleccionar una organización")
      }

      // Actualizar el cliente
      const { error: updateError } = await supabase
        .from("clients")
        .update({
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
        .eq("id", clientId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar el cliente")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const breadcrumbItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Clientes", href: "/dashboard/clients" },
    { label: formData.name, href: `/dashboard/clients/${clientId}` },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{formData.name}</h1>
        {!isEditing && <Button onClick={() => setIsEditing(true)}>Editar Cliente</Button>}
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del cliente</CardTitle>
            <CardDescription>{isEditing ? "Edita los datos del cliente" : "Detalles del cliente"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="organization_id">Organización</Label>
              {isEditing ? (
                <Select
                  value={formData.organization_id}
                  onValueChange={(value) => handleSelectChange("organization_id", value)}
                  disabled={!isEditing}
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
              ) : (
                <div className="p-2 border rounded-md bg-muted">
                  {organizations.find((org) => org.id.toString() === formData.organization_id)?.name ||
                    "No especificada"}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre o Razón Social</Label>
              {isEditing ? (
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              ) : (
                <div className="p-2 border rounded-md bg-muted">{formData.name}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">CIF/NIF</Label>
              {isEditing ? (
                <Input id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleChange} required />
              ) : (
                <div className="p-2 border rounded-md bg-muted">{formData.tax_id}</div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              {isEditing ? (
                <Textarea id="address" name="address" value={formData.address} onChange={handleChange} required />
              ) : (
                <div className="p-2 border rounded-md bg-muted whitespace-pre-wrap">{formData.address}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Código Postal</Label>
                {isEditing ? (
                  <Input
                    id="postal_code"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleChange}
                    required
                  />
                ) : (
                  <div className="p-2 border rounded-md bg-muted">{formData.postal_code}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                {isEditing ? (
                  <Input id="city" name="city" value={formData.city} onChange={handleChange} required />
                ) : (
                  <div className="p-2 border rounded-md bg-muted">{formData.city}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                {isEditing ? (
                  <Input id="province" name="province" value={formData.province} onChange={handleChange} required />
                ) : (
                  <div className="p-2 border rounded-md bg-muted">{formData.province}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                {isEditing ? (
                  <Input id="country" name="country" value={formData.country} onChange={handleChange} required />
                ) : (
                  <div className="p-2 border rounded-md bg-muted">{formData.country}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                ) : (
                  <div className="p-2 border rounded-md bg-muted">{formData.email || "-"}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                {isEditing ? (
                  <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                ) : (
                  <div className="p-2 border rounded-md bg-muted">{formData.phone || "-"}</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
              {isEditing ? (
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
              ) : (
                <div className="p-2 border rounded-md bg-muted">
                  {formData.client_type === "public" ? "Administración Pública" : "Privado"}
                </div>
              )}
            </div>

            {formData.client_type === "public" && isEditing && (
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

            {formData.client_type === "public" && !isEditing && formData.dir3_codes && (
              <div className="space-y-4 border p-4 rounded-md">
                <h3 className="font-medium">Códigos DIR3</h3>
                <div className="space-y-2">
                  <Label htmlFor="CentroGestor">Centro Gestor</Label>
                  <div className="p-2 border rounded-md bg-muted">{formData.dir3_codes.CentroGestor || "-"}</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="UnidadTramitadora">Unidad Tramitadora</Label>
                  <div className="p-2 border rounded-md bg-muted">{formData.dir3_codes.UnidadTramitadora || "-"}</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="OficinaContable">Oficina Contable</Label>
                  <div className="p-2 border rounded-md bg-muted">{formData.dir3_codes.OficinaContable || "-"}</div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false)
                } else {
                  router.push("/dashboard/clients")
                }
              }}
            >
              {isEditing ? "Cancelar" : "Volver"}
            </Button>
            {isEditing && (
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
