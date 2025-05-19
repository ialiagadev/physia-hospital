"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function NewOrganizationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    tax_id: "",
    address: "",
    postal_code: "",
    city: "",
    province: "",
    country: "España",
    email: "",
    phone: "",
    invoice_prefix: "FACT",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log("Intentando crear organización:", formData)

      // Verificar conexión a Supabase
      try {
        const { data: testData, error: testError } = await supabase.from("organizations").select("id").limit(1)

        if (testError) {
          console.error("Error de conexión a Supabase:", testError)
          throw new Error(`Error de conexión a Supabase: ${testError.message}`)
        }

        console.log("Conexión a Supabase exitosa")
      } catch (connectionError) {
        console.error("Error al verificar la conexión:", connectionError)
        throw new Error(
          `Error al verificar la conexión: ${connectionError instanceof Error ? connectionError.message : String(connectionError)}`,
        )
      }

      // Crear la organización
      const { data, error: insertError } = await supabase
        .from("organizations")
        .insert({
          name: formData.name,
          tax_id: formData.tax_id,
          address: formData.address,
          postal_code: formData.postal_code,
          city: formData.city,
          province: formData.province,
          country: formData.country,
          email: formData.email || null,
          phone: formData.phone || null,
          invoice_prefix: formData.invoice_prefix,
          last_invoice_number: 0,
          active: true,
          subscription_tier: "basic",
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error al insertar organización:", insertError)
        throw new Error(insertError.message)
      }

      console.log("Organización creada exitosamente:", data)

      router.push("/dashboard/organizations")
      router.refresh()
    } catch (err) {
      console.error("Error completo:", err)
      setError(err instanceof Error ? err.message : "Error al crear la organización")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Nueva Organización</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información de la organización</CardTitle>
            <CardDescription>Introduce los datos de tu empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
              <Label htmlFor="invoice_prefix">Prefijo de Factura</Label>
              <Input
                id="invoice_prefix"
                name="invoice_prefix"
                value={formData.invoice_prefix}
                onChange={handleChange}
                required
              />
              <p className="text-sm text-muted-foreground">
                Este prefijo se utilizará para generar los números de factura (ej: FACT0001)
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/organizations")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Organización"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
