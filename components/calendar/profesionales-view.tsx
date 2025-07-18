"use client"

import { useState } from "react"
import { Calendar, Clock, Plus, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Cita, Profesional } from "@/types/calendar-types"
import type { User } from "@/types/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ScheduleConfigModal } from "./schedule-config-modal"
import { useWorkSchedules } from "@/hooks/use-work-schedules"
import { useAuth } from "@/app/contexts/auth-context"
import { UserService } from "@/lib/services/users"
import { toast } from "sonner"

interface ProfesionalesViewProps {
  profesionales: Profesional[]
  citas: Cita[]
  onSelectCita: (cita: Cita) => void
  onUpdateProfesional?: (profesional: Profesional) => void
  onAddProfesional?: (profesional: Omit<Profesional, "id">) => void
  users?: User[]
  onRefreshUsers?: () => void
  vacationRequests?: any[]
  isUserOnVacationDate?: (userId: string, date: Date | string) => boolean
  getUserVacationOnDate?: (userId: string, date: Date | string) => any
}

const COLORES_DISPONIBLES = [
  { value: "#14B8A6", label: "Teal", class: "bg-teal-100 border-teal-500" },
  { value: "#3B82F6", label: "Azul", class: "bg-blue-100 border-blue-500" },
  { value: "#8B5CF6", label: "Morado", class: "bg-purple-100 border-purple-500" },
  { value: "#F59E0B", label: "Ámbar", class: "bg-amber-100 border-amber-500" },
  { value: "#EF4444", label: "Rojo", class: "bg-red-100 border-red-500" },
  { value: "#10B981", label: "Esmeralda", class: "bg-emerald-100 border-emerald-500" },
]

const especialidades = [
  "Medicina General",
  "Cardiología",
  "Dermatología",
  "Pediatría",
  "Ginecología",
  "Traumatología",
  "Neurología",
  "Psiquiatría",
  "Oftalmología",
  "Otorrinolaringología",
]

export function ProfesionalesView({
  profesionales,
  citas = [],
  onSelectCita,
  onUpdateProfesional,
  onAddProfesional,
  users = [],
  onRefreshUsers,
}: ProfesionalesViewProps) {
  const { userProfile } = useAuth()
  const organizationId = userProfile?.organization_id?.toString()

  // CORREGIDO: Usar el hook correctamente
  const {
    schedules,
    saveSchedules,
    getUserSchedules,
    refetch,
    loading: schedulesLoading,
  } = useWorkSchedules(organizationId)

  // Filtrar solo usuarios de tipo 1 (profesionales)
  const professionalUsers = users.filter((user) => user.type === 1)

  // MEJORADO: Lógica más clara para filtrar profesionales
  const filteredProfesionales = profesionales.filter((profesional) => {
    return professionalUsers.some((user) => {
      // Comparar IDs de manera más robusta
      const userIdNumber = Number.parseInt(user.id.slice(-8), 16)
      return userIdNumber === profesional.id
    })
  })

  const [selectedProfesional, setSelectedProfesional] = useState<Profesional | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editForm, setEditForm] = useState({
    nombre: "",
    especialidad: "",
    color: "#3B82F6",
  })
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedUserForSchedule, setSelectedUserForSchedule] = useState<User | null>(null)

  // Obtener estadísticas de un profesional
  const getEstadisticasProfesional = (profesionalId: number) => {
    const citasProfesional = citas.filter((c) => c.profesionalId === profesionalId)
    const hoy = new Date()
    const citasHoy = citasProfesional.filter((c) => {
      const fechaCita = typeof c.fecha === "string" ? new Date(c.fecha) : c.fecha
      return fechaCita.toDateString() === hoy.toDateString()
    })

    return {
      totalCitas: citasProfesional.length,
      citasHoy: citasHoy.length,
      citasConfirmadas: citasProfesional.filter((c) => c.estado === "confirmada").length,
      citasPendientes: citasProfesional.filter((c) => c.estado === "pendiente").length,
      citasCanceladas: citasProfesional.filter((c) => c.estado === "cancelada").length,
    }
  }

  // Obtener próximas citas de un profesional
  const getProximasCitas = (profesionalId: number, limit = 5) => {
    const ahora = new Date()
    return citas
      .filter((c) => {
        const fechaCita = typeof c.fecha === "string" ? new Date(c.fecha) : c.fecha
        return (
          c.profesionalId === profesionalId && (fechaCita > ahora || fechaCita.toDateString() === ahora.toDateString())
        )
      })
      .sort((a, b) => {
        const dateCompare =
          (typeof a.fecha === "string" ? new Date(a.fecha) : a.fecha).getTime() -
          (typeof b.fecha === "string" ? new Date(b.fecha) : b.fecha).getTime()
        if (dateCompare === 0) {
          return a.hora.localeCompare(b.hora)
        }
        return dateCompare
      })
      .slice(0, limit)
  }

  const handleEditProfesional = (profesional: Profesional) => {
    setEditForm({
      nombre: profesional.nombre || profesional.name || "",
      especialidad: profesional.especialidad || "", // Mantener pero no mostrar
      color: profesional.color || "#3B82F6",
    })
    setSelectedProfesional(profesional)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedProfesional) return

    try {
      // Buscar el usuario real correspondiente
      const realUser = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === selectedProfesional.id)

      if (realUser) {
        // Actualizar en la base de datos
        await UserService.updateProfessionalColor(realUser.id, editForm.color)
        toast.success("Profesional actualizado correctamente")

        // Refrescar usuarios si hay función disponible
        if (onRefreshUsers) {
          onRefreshUsers()
        }
      } else {
        // Actualizar datos mock
        if (onUpdateProfesional) {
          onUpdateProfesional({
            ...selectedProfesional,
            nombre: editForm.nombre,
            especialidad: selectedProfesional.especialidad, // Mantener especialidad existente
            name: editForm.nombre,
            color: editForm.color,
          })
        }
      }

      setShowEditModal(false)
      setSelectedProfesional(null)
    } catch (error) {
      console.error("Error updating professional:", error)
      toast.error("Error al actualizar el profesional")
    }
  }

  const handleAddNew = () => {
    if (!editForm.nombre.trim() || !editForm.especialidad) return

    if (onAddProfesional) {
      const newProfesional: Omit<Profesional, "id"> = {
        nombre: editForm.nombre.trim(),
        especialidad: editForm.especialidad,
        color: editForm.color,
        name: editForm.nombre.trim(),
        settings: {
          specialty: editForm.especialidad,
          calendar_color: editForm.color,
        },
      }
      onAddProfesional(newProfesional)
    }

    setShowAddModal(false)
    setEditForm({ nombre: "", especialidad: "", color: "#3B82F6" })
  }

  const getInitials = (nombre: string) => {
    return nombre
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleScheduleConfig = (profesional: Profesional) => {
    // Buscar el usuario real correspondiente
    const realUser = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesional.id)

    if (realUser) {
      setSelectedUserForSchedule(realUser)
    } else {
      toast.error("Este profesional no tiene usuario asociado de tipo profesional")
      return
    }
    setShowScheduleModal(true)
  }

  // CORREGIDO: Función handleSaveSchedules simplificada
  const handleSaveSchedules = async (newSchedules: any[]) => {
    if (!selectedUserForSchedule) {
      toast.error("No hay usuario seleccionado")
      return
    }

    try {
      await saveSchedules(selectedUserForSchedule.id, newSchedules)
      toast.success("Horarios guardados correctamente")
      setShowScheduleModal(false)
      setSelectedUserForSchedule(null)

      // Refrescar datos
      await refetch()
      if (onRefreshUsers) {
        onRefreshUsers()
      }
    } catch (error) {
      console.error("Error saving schedules:", error)
      toast.error("Error al guardar horarios")
    }
  }

  // NUEVA: Función para obtener horarios de un profesional
  const getProfessionalSchedules = (profesionalId: number) => {
    const user = professionalUsers.find((u) => Number.parseInt(u.id.slice(-8), 16) === profesionalId)
    if (!user) return []
    return getUserSchedules(user.id)
  }

  // Si no hay profesionales filtrados, mostrar mensaje
  if (filteredProfesionales.length === 0) {
    return (
      <div className="h-full p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Gestión de Profesionales</h2>
            <p className="text-sm text-muted-foreground">No hay profesionales disponibles</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <h3 className="text-lg font-semibold mb-2">No hay profesionales</h3>
          <p className="text-muted-foreground mb-4">Añade el primer profesional para comenzar</p>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Añadir Primer Profesional
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Profesionales</h2>
          <p className="text-sm text-muted-foreground">{filteredProfesionales.length} profesionales disponibles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProfesionales.map((profesional) => {
          const estadisticas = getEstadisticasProfesional(profesional.id)
          const proximasCitas = getProximasCitas(profesional.id)

          // MEJORADO: Obtener horarios del profesional
          const professionalSchedules = getProfessionalSchedules(profesional.id)
          const hasSchedules = professionalSchedules.length > 0

          return (
            <Card key={profesional.id} className="h-fit">
              <CardHeader
                className="rounded-t-lg"
                style={{
                  backgroundColor: `${profesional.color}20`,
                  borderColor: profesional.color,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-white text-gray-700 font-semibold">
                        {getInitials(profesional?.nombre || profesional?.name || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{profesional?.nombre || profesional?.name}</CardTitle>
                      {hasSchedules && (
                        <p className="text-xs text-gray-600">
                          {professionalSchedules.filter((s) => s.is_active).length} días configurados
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditProfesional(profesional)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleScheduleConfig(profesional)}
                      className="h-8 w-8 p-0"
                      title="Configurar horarios"
                    >
                      <Clock className={`h-4 w-4 ${hasSchedules ? "text-green-600" : "text-gray-400"}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <Tabs defaultValue="estadisticas" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
                    <TabsTrigger value="citas">Próximas Citas</TabsTrigger>
                  </TabsList>

                  <TabsContent value="estadisticas" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{estadisticas.citasHoy}</div>
                        <div className="text-sm text-blue-600">Hoy</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">{estadisticas.totalCitas}</div>
                        <div className="text-sm text-gray-600">Total</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Confirmadas</span>
                        <Badge className="bg-green-100 text-green-800">{estadisticas.citasConfirmadas}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pendientes</span>
                        <Badge className="bg-yellow-100 text-yellow-800">{estadisticas.citasPendientes}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Canceladas</span>
                        <Badge className="bg-red-100 text-red-800">{estadisticas.citasCanceladas}</Badge>
                      </div>
                    </div>

                    {/* Mostrar horarios si existen */}
                    {hasSchedules && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium mb-2">Horarios configurados:</h4>
                        <div className="space-y-1">
                          {professionalSchedules
                            .filter((s) => s.is_active)
                            .map((schedule) => {
                              const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
                              return (
                                <div key={schedule.id} className="text-xs text-gray-600">
                                  {dayNames[schedule.day_of_week || 0]}: {schedule.start_time} - {schedule.end_time}
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="citas" className="space-y-3 mt-4">
                    {proximasCitas.length > 0 ? (
                      proximasCitas.map((cita) => (
                        <div
                          key={cita.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => onSelectCita(cita)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">
                                {cita.nombrePaciente} {cita.apellidosPaciente}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" />
                                {format(typeof cita.fecha === "string" ? new Date(cita.fecha) : cita.fecha, "d MMM", {
                                  locale: es,
                                })}
                                <Clock className="h-3 w-3 ml-2" />
                                {cita.hora}
                              </div>
                            </div>
                            <Badge
                              className={
                                cita.estado === "confirmada"
                                  ? "bg-green-100 text-green-800"
                                  : cita.estado === "pendiente"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }
                            >
                              {cita.estado}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay próximas citas</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modal para editar profesional */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Profesional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input
                id="edit-nombre"
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="edit-color"
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="w-12 h-9 rounded border border-input cursor-pointer"
                />
                <div className="text-sm text-muted-foreground">{editForm.color}</div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para añadir profesional */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Profesional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-nombre">Nombre</Label>
              <Input
                id="add-nombre"
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                placeholder="Ej: Dr. Juan Pérez"
              />
            </div>
            <div>
              <Label htmlFor="add-especialidad">Especialidad</Label>
              <Select
                value={editForm.especialidad}
                onValueChange={(value) => setEditForm({ ...editForm, especialidad: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una especialidad" />
                </SelectTrigger>
                <SelectContent>
                  {especialidades.map((esp) => (
                    <SelectItem key={esp} value={esp}>
                      {esp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-color">Color</Label>
              <Select value={editForm.color} onValueChange={(value) => setEditForm({ ...editForm, color: value })}>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddNew}>Añadir</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para configurar horarios */}
      {showScheduleModal && selectedUserForSchedule && (
        <ScheduleConfigModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false)
            setSelectedUserForSchedule(null)
          }}
          user={selectedUserForSchedule}
          onSave={handleSaveSchedules}
        />
      )}
    </div>
  )
}
