"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import type { Service } from "@/types/services"

interface User {
  id: string
  name: string | null
  email: string | null
  role: string | null
  type: number
  organization_id: number // ✅ Agregado para coincidir con la consulta
}

interface ServiceFormProps {
  organizationId: number
  service?: Service | null
  onSuccess: () => void
  onCancel?: () => void
}

export function ServiceForm({ organizationId, service, onSuccess, onCancel }: ServiceFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [formData, setFormData] = useState({
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

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Si estamos editando, cargar datos del servicio
        if (service) {
          setFormData({
            name: service.name,
            description: service.description || "",
            price: service.price.toString(),
            vat_rate: service.vat_rate.toString(),
            irpf_rate: service.irpf_rate.toString(),
            retention_rate: service.retention_rate.toString(),
            category: service.category || "",
            duration: service.duration.toString(),
            color: service.color,
            active: service.active,
          })
          // Cargar usuarios asignados
          await fetchAssignedUsers(service.id.toString())
        }
        // Cargar usuarios para la organización
        await fetchUsers(organizationId)
      } catch (err) {
        setError("Error al cargar datos iniciales")
      }
    }

    fetchInitialData()
  }, [service, organizationId])

  // Función para cargar usuarios según la organización
  const fetchUsers = async (organizationId: number) => {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, type, organization_id")
        .eq("organization_id", organizationId)
        .eq("type", 1)
        .order("name")

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      setError("Error al cargar usuarios")
    } finally {
      setLoadingUsers(false)
    }
  }

  // Función para cargar usuarios asignados al servicio
  const fetchAssignedUsers = async (serviceId: string) => {
    try {
      const { data, error } = await supabase.from("user_services").select("user_id").eq("service_id", serviceId)

      if (error) throw error
      const assignedUserIds = data?.map((item) => item.user_id) || []
      setSelectedUsers(assignedUserIds)
    } catch (error) {
      // Error silencioso
    }
  }

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

  // Función para seleccionar/deseleccionar todos los usuarios
  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      // Seleccionar todos los usuarios
      setSelectedUsers(users.map((user) => user.id))
    } else {
      // Deseleccionar todos los usuarios
      setSelectedUsers([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!formData.name) {
        throw new Error("El nombre del servicio es obligatorio")
      }

      // Validar que el precio sea un número válido
      const price = Number.parseFloat(formData.price)
      if (isNaN(price) || price < 0) {
        throw new Error("El precio debe ser un número válido mayor o igual a cero")
      }

      // Parsear valores numéricos correctamente
      const vatRate = Number.parseInt(formData.vat_rate)
      const irpfRate = Number.parseInt(formData.irpf_rate)
      const retentionRate = Number.parseInt(formData.retention_rate)

      const serviceData = {
        organization_id: organizationId,
        name: formData.name,
        description: formData.description || null,
        price: price,
        vat_rate: isNaN(vatRate) ? 21 : vatRate,
        irpf_rate: isNaN(irpfRate) ? 0 : irpfRate,
        retention_rate: isNaN(retentionRate) ? 0 : retentionRate,
        category: formData.category || null,
        duration: Number.parseInt(formData.duration) || 30,
        color: formData.color,
        active: formData.active,
      }

      let serviceId: number
      if (service) {
        // Actualizar servicio existente
        const { error: updateError } = await supabase.from("services").update(serviceData).eq("id", service.id)

        if (updateError) throw new Error(updateError.message)
        serviceId = service.id
      } else {
        // Crear nuevo servicio
        const { data: newServiceData, error: insertError } = await supabase
          .from("services")
          .insert(serviceData)
          .select()
          .single()

        if (insertError) throw new Error(insertError.message)
        serviceId = newServiceData.id
      }

      // Actualizar relaciones usuario-servicio
      if (service) {
        // Eliminar relaciones existentes
        await supabase.from("user_services").delete().eq("service_id", serviceId)
      }

      // Crear nuevas relaciones
      if (selectedUsers.length > 0) {
        const userServiceRelations = selectedUsers.map((userId) => ({
          user_id: userId,
          service_id: serviceId,
        }))

        const { error: relationError } = await supabase.from("user_services").insert(userServiceRelations)

        if (relationError) {
          // Error silencioso para no bloquear la operación principal
        }
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el servicio")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
              {/* Checkbox para seleccionar todos */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="select-all-users"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onCheckedChange={handleSelectAllUsers}
                />
                <Label htmlFor="select-all-users" className="font-medium cursor-pointer">
                  Seleccionar todos
                </Label>
              </div>

              {/* Lista de usuarios individuales */}
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
          <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
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

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {service ? "Actualizando..." : "Guardando..."}
            </>
          ) : service ? (
            "Actualizar Servicio"
          ) : (
            "Guardar Servicio"
          )}
        </Button>
      </div>
    </form>
  )
}
