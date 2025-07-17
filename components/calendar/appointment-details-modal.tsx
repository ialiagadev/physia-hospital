"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { Calendar, Clock, User, Phone, FileText, Edit2, Trash2, Save, X, DollarSign, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PatientHistoryModal } from "./patient-history-modal"
import type { AppointmentWithDetails, Service } from "@/types/calendar"
import { IndividualBillingButton } from "./individual-billing-button"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"

interface AppointmentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: AppointmentWithDetails
  onUpdate: (appointment: AppointmentWithDetails) => Promise<void>
  onDelete: (appointmentId: string) => Promise<void>
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  onUpdate,
  onDelete,
}: AppointmentDetailsModalProps) {
  const { userProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [availableServices, setAvailableServices] = useState<Service[]>([])
  const [existingInvoice, setExistingInvoice] = useState<{
    invoice_number: string
    created_at: string
    id: string
  } | null>(null)
  const [checkingInvoice, setCheckingInvoice] = useState(true)

  // Determinar si el usuario es coordinador
  const isCoordinator = userProfile?.role === "coordinador"

  // Form states
  const [editedAppointment, setEditedAppointment] = useState<AppointmentWithDetails>(appointment)

  useEffect(() => {
    setEditedAppointment(appointment)
    setIsEditing(false)
  }, [appointment])

  // Cargar servicios disponibles cuando se abre el modal de edición
  useEffect(() => {
    if (isEditing && userProfile?.organization_id) {
      loadAvailableServices()
    }
  }, [isEditing, userProfile])

  // ✅ VERIFICAR FACTURA EXISTENTE
  useEffect(() => {
    if (isOpen && userProfile?.organization_id && appointment.id) {
      checkExistingInvoice()
    }
  }, [isOpen, appointment.id, userProfile])

  const checkExistingInvoice = async () => {
    if (!userProfile?.organization_id || !appointment.id) {
      setCheckingInvoice(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, created_at")
        .eq("organization_id", userProfile.organization_id)
        .eq("appointment_id", appointment.id)
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        setExistingInvoice(data[0])
      } else {
        setExistingInvoice(null)
      }
    } catch (error) {
      console.error("Error checking existing invoice:", error)
      setExistingInvoice(null)
    } finally {
      setCheckingInvoice(false)
    }
  }

  const loadAvailableServices = async () => {
    try {
      const { data: services, error } = await supabase
        .from("services")
        .select(
          "id, name, description, price, duration, color, category, active, organization_id, created_at, updated_at, vat_rate, irpf_rate, retention_rate",
        )
        .eq("organization_id", userProfile!.organization_id)
        .eq("active", true)
        .order("name")

      if (error) throw error

      setAvailableServices(services || [])
    } catch (error) {
      console.error("Error loading services:", error)
    }
  }

  // Funciones helper para manejar tiempos
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  const calculateEndTime = (startTime: string, duration: number): string => {
    const startMinutes = timeToMinutes(startTime)
    const endMinutes = startMinutes + duration
    return minutesToTime(endMinutes)
  }

  const calculateDuration = (startTime: string, endTime: string): number => {
    const startMinutes = timeToMinutes(startTime)
    const endMinutes = timeToMinutes(endTime)
    return Math.max(0, endMinutes - startMinutes)
  }

  // Handlers para sincronizar tiempos
  const handleStartTimeChange = (newStartTime: string) => {
    const newEndTime = calculateEndTime(newStartTime, editedAppointment.duration)
    setEditedAppointment({
      ...editedAppointment,
      start_time: newStartTime,
      end_time: newEndTime,
    })
  }

  const handleEndTimeChange = (newEndTime: string) => {
    const newDuration = calculateDuration(editedAppointment.start_time, newEndTime)
    setEditedAppointment({
      ...editedAppointment,
      end_time: newEndTime,
      duration: newDuration,
    })
  }

  const handleDurationChange = (newDuration: number) => {
    const newEndTime = calculateEndTime(editedAppointment.start_time, newDuration)
    setEditedAppointment({
      ...editedAppointment,
      duration: newDuration,
      end_time: newEndTime,
    })
  }

  // Handler para cambio de servicio
  const handleServiceChange = (value: string) => {
    if (value === "none") {
      setEditedAppointment({
        ...editedAppointment,
        service_id: null,
        service: undefined,
      })
      return
    }

    const serviceId = Number.parseInt(value)
    const selectedService = availableServices.find((s) => s.id === serviceId)

    if (selectedService) {
      const newEndTime = calculateEndTime(editedAppointment.start_time, selectedService.duration)
      setEditedAppointment({
        ...editedAppointment,
        service_id: serviceId,
        duration: selectedService.duration,
        end_time: newEndTime,
        service: selectedService,
      })
    }
  }

  // Función de actualización mejorada
  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Preparar los datos para la actualización
      const updateData = {
        date: editedAppointment.date,
        start_time: editedAppointment.start_time,
        end_time: editedAppointment.end_time,
        duration: editedAppointment.duration,
        status: editedAppointment.status,
        notes: editedAppointment.notes || null,
        service_id: editedAppointment.service_id, // Puede ser null
        updated_at: new Date().toISOString(),
      }

      // Actualizar en la base de datos
      const { data, error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", appointment.id)
        .select(`
          *,
          client:clients(*),
          service:services(*),
          consultation:consultations(*)
        `)
        .single()

      if (error) {
        throw error
      }

      // Crear el objeto actualizado con la estructura correcta
      const updatedAppointment: AppointmentWithDetails = {
        ...data,
        client: data.client,
        service: data.service,
        consultation: data.consultation,
      }

      // Llamar a la función onUpdate del componente padre
      await onUpdate(updatedAppointment)
      setIsEditing(false)
      onClose()
    } catch (error) {
      console.error("Error al actualizar la cita:", error)
      // Aquí podrías mostrar un toast o mensaje de error
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(appointment.id)
      setShowDeleteDialog(false)
      onClose() // Cerrar el modal principal también
    } catch (error) {
      console.error("Error al eliminar la cita:", error)
      // Resetear estados incluso si hay error
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleCancel = () => {
    setEditedAppointment(appointment)
    setIsEditing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmada"
      case "pending":
        return "Pendiente"
      case "cancelled":
        return "Cancelada"
      default:
        return status
    }
  }

  // Función para verificar si realmente hay una consulta seleccionada
  const hasValidConsultation = () => {
    return (
      appointment.consultation &&
      appointment.consultation_id &&
      appointment.consultation_id !== "none" &&
      appointment.consultation_id !== "" &&
      appointment.consultation_id !== null &&
      appointment.consultation_id !== undefined &&
      appointment.consultation.name &&
      appointment.consultation.name.trim() !== ""
    )
  }

  // Función para verificar si hay un servicio válido
  const hasValidService = () => {
    return (
      editedAppointment.service &&
      editedAppointment.service_id &&
      editedAppointment.service.name &&
      editedAppointment.service.name.trim() !== ""
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 py-8 px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        {/* Contenedor principal que se ajusta al contenido - CENTRADO VERTICALMENTE */}
        <div
          className={`flex w-full ${isCoordinator ? "justify-center" : "max-w-7xl gap-2"} max-h-[calc(100vh-4rem)] my-auto`}
        >
          {/* Modal de detalles de la cita - Ajustar ancho según si es coordinador */}
          <div
            className={`${isCoordinator ? "w-full max-w-2xl" : "w-1/2"} bg-white shadow-2xl rounded-lg overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-1.5 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Detalles de la Cita</h2>
                    <p className="text-sm text-gray-600">
                      {format(new Date(appointment.date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <IndividualBillingButton
                        appointment={appointment}
                        onBillingComplete={() => {
                          // Recargar estado de factura después de facturar
                          checkExistingInvoice()
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsEditing(true)
                        }}
                        className="gap-2"
                      >
                        <Edit2 className="h-4 w-4" />
                        Editar
                      </Button>
                      {/* ✅ MOSTRAR MENSAJE DE AVISO O BOTÓN ELIMINAR */}
                      {checkingInvoice ? (
                        <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 animate-spin" />
                            <span>Verificando...</span>
                          </div>
                        </div>
                      ) : existingInvoice ? (
                        <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200 max-w-48">
                          <div className="flex items-center gap-1 mb-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="font-medium">No se puede eliminar</span>
                          </div>
                          <div className="text-xs">Cita facturada #{existingInvoice.invoice_number}</div>
                          <div className="text-xs text-gray-600">
                            {format(new Date(existingInvoice.created_at), "dd/MM/yyyy")}
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowDeleteDialog(true)
                          }}
                          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onClose()
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content - SE AJUSTA AL CONTENIDO */}
            <div className="p-4">
              <div className="space-y-4">
                {/* SECCIÓN 1: PACIENTE - Información en una sola línea */}
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Paciente:</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <Link href={`/dashboard/clients/${appointment.client.id}`}>
                      <span className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer transition-colors duration-200">
                        {appointment.client.name}
                      </span>
                    </Link>
                    <Link href={`/dashboard/clients/${appointment.client.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Ver/editar datos del cliente"
                      >
                        <User className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{appointment.client.phone || "Sin teléfono"}</span>
                  </div>
                </div>

                {/* SECCIÓN 2: SERVICIO - Solo mostrar si hay servicio válido */}
                {(hasValidService() || isEditing) && (
                  <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Servicio:</span>
                    </div>
                    {isEditing ? (
                      <div className="flex-1">
                        <Select
                          value={editedAppointment.service_id ? editedAppointment.service_id.toString() : "none"}
                          onValueChange={handleServiceChange}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Seleccionar servicio..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin servicio</SelectItem>
                            {availableServices.map((service) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                {service.name} - {formatCurrency(service.price)} ({service.duration} min)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-4">
                        <span className="font-medium text-gray-900">{editedAppointment.service?.name}</span>
                        {editedAppointment.service?.price && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                            {formatCurrency(editedAppointment.service.price)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SECCIÓN 3: HORARIO Y DURACIÓN - Todo en una línea */}
                <div className="flex items-center gap-6 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Horario:</span>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={format(new Date(editedAppointment.date), "yyyy-MM-dd")}
                          onChange={(e) =>
                            setEditedAppointment({
                              ...editedAppointment,
                              date: e.target.value,
                            })
                          }
                          className="h-8 text-sm w-36"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="time"
                          value={editedAppointment.start_time}
                          onChange={(e) => handleStartTimeChange(e.target.value)}
                          className="h-8 text-sm w-20"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-gray-500">-</span>
                        <Input
                          type="time"
                          value={editedAppointment.end_time}
                          onChange={(e) => handleEndTimeChange(e.target.value)}
                          className="h-8 text-sm w-20"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-600">Duración:</span>
                        <Input
                          type="number"
                          value={editedAppointment.duration}
                          onChange={(e) => handleDurationChange(Number.parseInt(e.target.value) || 30)}
                          className="h-8 text-sm w-16"
                          min="15"
                          step="15"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm text-gray-600">min</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 flex-1">
                      <span className="font-medium text-gray-900">
                        {appointment.start_time} - {appointment.end_time}
                      </span>
                      <span className="text-sm text-gray-600">({appointment.duration} minutos)</span>
                    </div>
                  )}
                </div>

                {/* SECCIÓN 4: ESTADO, TIPO Y CONSULTA - Todo en una línea */}
                <div className="flex items-center gap-6 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Estado:</span>
                    {isEditing ? (
                      <Select
                        value={editedAppointment.status}
                        onValueChange={(value) =>
                          setEditedAppointment({
                            ...editedAppointment,
                            status: value as any,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="confirmed">Confirmada</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getStatusColor(appointment.status)}>{getStatusLabel(appointment.status)}</Badge>
                    )}
                  </div>

                  {/* MOTIVO DE CONSULTA - Solo mostrar si existe */}
                  {appointment.motivo_consulta && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Motivo:</span>
                      <span className="text-sm text-gray-900 max-w-48 truncate" title={appointment.motivo_consulta}>
                        {appointment.motivo_consulta}
                      </span>
                    </div>
                  )}

                  {/* DIAGNÓSTICO - Solo mostrar si existe */}
                  {appointment.diagnostico && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Diagnóstico:</span>
                      <span className="text-sm text-gray-900 max-w-48 truncate" title={appointment.diagnostico}>
                        {appointment.diagnostico}
                      </span>
                    </div>
                  )}

                  {/* CONSULTA - Solo mostrar si realmente hay una consulta válida seleccionada */}
                  {hasValidConsultation() && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Consulta:</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: appointment.consultation.color || "#3B82F6" }}
                        />
                        <span className="text-sm text-gray-900">{appointment.consultation.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECCIÓN 5: NOTAS - Solo si hay notas o está editando */}
                {(appointment.notes || isEditing) && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Notas:</span>
                        {isEditing ? (
                          <Textarea
                            value={editedAppointment.notes || ""}
                            onChange={(e) =>
                              setEditedAppointment({
                                ...editedAppointment,
                                notes: e.target.value,
                              })
                            }
                            placeholder="Agregar notas sobre la cita..."
                            className="mt-2 text-sm min-h-[80px] resize-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                            {appointment.notes || "Sin notas adicionales"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Solo aparece cuando está editando */}
            {isEditing && (
              <div className="border-t bg-gray-50 px-4 py-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCancel()
                  }}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSave()
                  }}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            )}
          </div>

          {/* Modal de historial del paciente - Lado derecho - Solo visible si NO es coordinador */}
          {!isCoordinator && (
            <div
              className="w-1/2 bg-white shadow-2xl border-l border-gray-200 rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <PatientHistoryModal client={appointment.client} isOpen={true} onClose={() => {}} isEmbedded={true} />
            </div>
          )}
        </div>
      </div>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Eliminar Cita
            </DialogTitle>
            <DialogDescription className="text-left">
              ¿Estás seguro de que quieres eliminar esta cita?
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{appointment.client.name}</p>
            <p className="text-sm text-gray-600">
              {format(new Date(appointment.date), "d 'de' MMMM 'de' yyyy", { locale: es })} a las{" "}
              {appointment.start_time}
            </p>
          </div>
          <p className="mt-3 text-sm text-red-600">Esta acción no se puede deshacer.</p>
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Eliminando..." : "Eliminar Cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AppointmentDetailsModal
