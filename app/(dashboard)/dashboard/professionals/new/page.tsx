"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export default function NewProfessionalPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<any[]>([])

  const [formData, setFormData] = useState({
    organization_id: "",
    name: "",
    active: true,
  })

  // Cargar organizaciones al montar el componente
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data: orgsData } = await supabase.from("organizations").select("id, name").order("name")
        if (orgsData && orgsData.length > 0) {
          setOrganizations(orgsData)
          setFormData((prev) => ({ ...prev, organization_id: orgsData[0].id.toString() }))
        }
      } catch (err) {
        console.error("Error al cargar organizaciones:", err)
        setError("No se pudieron cargar las organizaciones")
      }
    }

    fetchOrganizations()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        throw new Error("El nombre del profesional es obligatorio")
      }

      // Crear un nuevo profesional
      const { data, error: insertError } = await supabase
        .from("professionals")
        .insert({
          organization_id: Number.parseInt(formData.organization_id),
          name: formData.name,
          active: formData.active,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      router.push("/dashboard/professionals")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el profesional")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Nuevo Profesional</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del profesional</CardTitle>
            <CardDescription>Introduce los datos del nuevo profesional</CardDescription>
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
              <Label htmlFor="name">Nombre del Profesional</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch id="active" checked={formData.active} onCheckedChange={handleSwitchChange} />
              <Label htmlFor="active">Profesional activo</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/professionals")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Profesional"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
