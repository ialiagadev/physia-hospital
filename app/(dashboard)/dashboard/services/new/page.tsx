"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  name: string | null
  email: string | null
  role: string | null
  type: number
}

export default function NewServicePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [formData, setFormData] = useState({
    organization_id: "",
    name: "",
    description: "",
    price: "0",
    vat_rate: "21",
    irpf_rate: "0",
    retention_rate: "0",
    category: "",
    duration: "30",
    color: "#3B82F6",
    active: true,
  })

  // Cargar organizaciones al montar el componente
  useEffect(() => {
    const fetchOrganizations = async () => {
      const { data } = await supabase.from("organizations").select("id, name").order("name")
      if (data && data.length > 0) {
        setOrganizations(data)
        setFormData((prev) => ({ ...prev, organization_id: data[0].id.toString() }))
        // Cargar usuarios para la primera organización
        fetchUsers(data[0].id)
      }
    }
    fetchOrganizations()
  }, [])

  // Función para cargar usuarios según la organización seleccionada
  const fetchUsers = async (organizationId: number) => {
    setLoadingUsers(true)
    try {
      console.log("Cargando usuarios para organización:", organizationId)

      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, type, organization_id")
        .eq("organization_id", organizationId)
        .eq("type", 1)
        .order("name")

      if (error) {
        console.error("Error en consulta de usuarios:", error)
        throw error
      }

      console.log("Usuarios encontrados:", data)
      setUsers(data || [])
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
      setError("Error al cargar usuarios")
    } finally {
      setLoadingUsers(false)
    }
  }

  // Actualizar usuarios cuando cambia la organización
  useEffect(() => {
    if (formData.organization_id) {
      fetchUsers(Number.parseInt(formData.organization_id))
      setSelectedUsers([]) // Limpiar selección al cambiar organización
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

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
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

      // Crear el servicio
      const { data: serviceData, error: insertError } = await supabase
        .from("services")
        .insert({
          organization_id: Number.parseInt(formData.organization_id),
          name: formData.name,
          description: formData.description || null,
          price: price,
          vat_rate: Number.parseInt(formData.vat_rate) || 21,
          irpf_rate: Number.parseInt(formData.irpf_rate) || 0,
          retention_rate: Number.parseInt(formData.retention_rate) || 0,
          category: formData.category || null,
          duration: Number.parseInt(formData.duration) || 30,
          color: formData.color,
          active: formData.active,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      // Crear las relaciones usuario-servicio
      if (selectedUsers.length > 0) {
        const userServiceRelations = selectedUsers.map((userId) => ({
          user_id: userId,
          service_id: serviceData.id,
        }))

        const { error: relationError } = await supabase.from("user_services").insert(userServiceRelations)

        if (relationError) {
          console.error("Error al crear relaciones usuario-servicio:", relationError)
          // No lanzamos error aquí para no bloquear la creación del servicio
        }
      }

      router.push("/dashboard/services")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el servicio")
    } finally {
      setIsLoading(false)
    }
  }

  const debugUsers = () => {
    console.log("=== DEBUG USUARIOS ===")
    console.log("Organization ID:", formData.organization_id)
    console.log("Usuarios cargados:", users)
    console.log("Usuarios seleccionados:", selectedUsers)
    console.log("Loading users:", loadingUsers)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Nuevo Servicio</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del servicio</CardTitle>
            <CardDescription>Introduce los datos del nuevo servicio</CardDescription>
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

            {/* Usuarios Asignados */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Usuarios Asignados (opcional)
                {loadingUsers && <Loader2 className="h-4 w-4 animate-spin" />}
              </Label>

              <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Cargando usuarios...</span>
                  </div>
                ) : users.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay usuarios disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => handleUserToggle(user.id)}
                        />
                        <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                          <div className="flex flex-col">
                            <span>{user.name || user.email}</span>
                            {user.role && <span className="text-xs text-gray-500">({user.role})</span>}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600">{selectedUsers.length} usuarios seleccionados</p>

              {/* Botón de debug */}
              <Button type="button" variant="outline" size="sm" onClick={debugUsers}>
                Recargar usuarios (Debug)
              </Button>
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

              <div>
                <Label htmlFor="duration">Duración (min)</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(value) => setFormData({ ...formData, duration: value })}
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

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" type="color" value={formData.color} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-3 gap-4">
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
              {isLoading ? "Guardando..." : "Guardar Servicio"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
