"use client"

import { useState, useCallback } from "react"
import { Plus, Edit, Trash2, MapPin, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useAuth } from "@/app/contexts/auth-context"
import type { Consultation } from "@/types/calendar"
import { ConsultationService } from "@/lib/services/consultations"

interface ConsultationsViewProps {
  consultations: Consultation[]
  onRefreshConsultations: () => void
}

const COLORES_DISPONIBLES = [
  { value: "#14B8A6", label: "Teal", class: "bg-teal-100 border-teal-500" },
  { value: "#3B82F6", label: "Azul", class: "bg-blue-100 border-blue-500" },
  { value: "#8B5CF6", label: "Morado", class: "bg-purple-100 border-purple-500" },
  { value: "#F59E0B", label: "Ámbar", class: "bg-amber-100 border-amber-500" },
  { value: "#EF4444", label: "Rojo", class: "bg-red-100 border-red-500" },
  { value: "#10B981", label: "Esmeralda", class: "bg-emerald-100 border-emerald-500" },
  { value: "#EC4899", label: "Rosa", class: "bg-pink-100 border-pink-500" },
  { value: "#F97316", label: "Naranja", class: "bg-orange-100 border-orange-500" },
]

export function ConsultationsView({ consultations, onRefreshConsultations }: ConsultationsViewProps) {
  const { user, userProfile } = useAuth()
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    equipment: [] as string[],
    is_active: true,
    sort_order: 0,
  })

  const [newEquipment, setNewEquipment] = useState("")

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      color: "#3B82F6",
      equipment: [],
      is_active: true,
      sort_order: 0,
    })
    setNewEquipment("")
  }, [])

  const handleEdit = useCallback((consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setFormData({
      name: consultation.name,
      description: consultation.description || "",
      color: consultation.color || "#3B82F6",
      equipment: Array.isArray(consultation.equipment) ? consultation.equipment : [],
      is_active: consultation.is_active ?? true,
      sort_order: consultation.sort_order || 0,
    })
    setShowEditModal(true)
  }, [])

  const handleAdd = useCallback(() => {
    resetForm()
    setFormData((prev) => ({
      ...prev,
      sort_order: consultations.length + 1,
    }))
    setShowAddModal(true)
  }, [consultations.length, resetForm])

  const handleDelete = useCallback((consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setShowDeleteModal(true)
  }, [])

  const handleSave = async () => {
    try {
      // Verificar autenticación usando el contexto
      if (!user) {
        toast.error("Debes iniciar sesión para realizar esta acción")
        return
      }

      if (!userProfile?.organization_id) {
        toast.error("No tienes una organización asignada")
        return
      }

      setLoading(true)

      if (!formData.name.trim()) {
        toast.error("El nombre es obligatorio")
        return
      }

      console.log("🔄 Guardando consulta...", {
        user: user.id,
        org: userProfile.organization_id,
        userProfile: userProfile,
      })

      const consultationData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        equipment: formData.equipment,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
      }

      if (selectedConsultation) {
        // Actualizar consulta existente
        await ConsultationService.updateConsultation(selectedConsultation.id, consultationData)
        toast.success("Consulta actualizada correctamente")
        setShowEditModal(false)
      } else {
        // Crear nueva consulta - pasar userProfile como parámetro
        await ConsultationService.createConsultation(consultationData, userProfile)
        toast.success("Consulta creada correctamente")
        setShowAddModal(false)
      }

      onRefreshConsultations()
      setSelectedConsultation(null)
      resetForm()
    } catch (error) {
      console.error("Error saving consultation:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al guardar la consulta"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedConsultation) return

    try {
      setLoading(true)
      await ConsultationService.deleteConsultation(selectedConsultation.id)
      toast.success("Consulta eliminada correctamente")
      setShowDeleteModal(false)
      setSelectedConsultation(null)
      onRefreshConsultations()
    } catch (error) {
      console.error("Error deleting consultation:", error)
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar la consulta"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const addEquipment = useCallback(() => {
    if (newEquipment.trim() && !formData.equipment.includes(newEquipment.trim())) {
      setFormData((prev) => ({
        ...prev,
        equipment: [...prev.equipment, newEquipment.trim()],
      }))
      setNewEquipment("")
    }
  }, [newEquipment, formData.equipment])

  const removeEquipment = useCallback((equipment: string) => {
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((e) => e !== equipment),
    }))
  }, [])

  const getColorClass = useCallback((color: string) => {
    const colorConfig = COLORES_DISPONIBLES.find((c) => c.value === color)
    return colorConfig?.class || "bg-blue-100 border-blue-500"
  }, [])

  // Verificar autenticación
  if (!user) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso denegado</h3>
          <p className="text-gray-600">Debes iniciar sesión para gestionar consultas</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Consultas</h2>
          <p className="text-gray-600 mt-1">
            {consultations.length} consulta{consultations.length !== 1 ? "s" : ""} configurada
            {consultations.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Añadir Consulta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {consultations.map((consultation) => (
          <Card key={consultation.id} className="h-fit">
            <CardHeader
              className="rounded-t-lg border-l-4"
              style={{
                backgroundColor: `${consultation.color}15`,
                borderLeftColor: consultation.color,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2" style={{ backgroundColor: consultation.color }} />
                  <div>
                    <CardTitle className="text-lg">{consultation.name}</CardTitle>
                    {!consultation.is_active && (
                      <Badge variant="secondary" className="mt-1">
                        Inactiva
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(consultation)}
                    className="h-8 w-8 p-0"
                    title="Editar consulta"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(consultation)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    title="Eliminar consulta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {consultation.description && <p className="text-sm text-gray-600 mb-3">{consultation.description}</p>}

          

              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-gray-500">
                <span>Orden: {consultation.sort_order || 0}</span>
                <div className="flex items-center gap-1">
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {consultations.length === 0 && (
          <div className="col-span-full text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay consultas configuradas</h3>
            <p className="text-gray-600 mb-4">Crea tu primera consulta para comenzar a programar citas</p>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Primera Consulta
            </Button>
          </div>
        )}
      </div>

      {/* Modal para añadir/editar consulta */}
      <Dialog
        open={showAddModal || showEditModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false)
            setShowEditModal(false)
            setSelectedConsultation(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedConsultation ? "Editar Consulta" : "Añadir Consulta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Consulta 1, Sala de Rayos X..."
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción opcional de la consulta..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLORES_DISPONIBLES.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded border" style={{ backgroundColor: color.value }} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

           

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Consulta activa</Label>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="sort_order" className="text-sm">
                  Orden:
                </Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, sort_order: Number.parseInt(e.target.value) || 0 }))
                  }
                  className="w-20"
                  min="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false)
                  setShowEditModal(false)
                  setSelectedConsultation(null)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar Consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              ¿Estás seguro de que quieres eliminar la consulta <strong>"{selectedConsultation?.name}"</strong>?
            </p>
            <p className="text-sm text-red-600">
              Esta acción no se puede deshacer. Las citas programadas en esta consulta podrían verse afectadas.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={loading}>
                {loading ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
