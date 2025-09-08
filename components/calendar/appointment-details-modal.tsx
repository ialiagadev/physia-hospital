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
import { useAppointmentConflicts } from "@/hooks/use-appointment-conflicts"
import { toast } from "sonner"
import { autoSyncAppointment } from "@/lib/auto-sync"

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

  // 🆕 Estado para controlar cuando se están verificando conflictos después de un cambio
  const [isVerifyingConflicts, setIsVerifyingConflicts] = useState(false)

  // Determinar si el usuario es coordinador
  const isCoordinator = userProfile?.role === "coordinador"

  // Hook para verificar conflictos
  const { conflicts, loading: conflictsLoading, checkConflicts } = useAppointmentConflicts(userProfile?.organization_id)

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

  // 🆕 VERIFICAR CONFLICTOS CON ESTADO DE VERIFICACIÓN
  useEffect(() => {
    if (
      isEditing &&
      editedAppointment.date &&
      editedAppointment.start_time &&
      editedAppointment.duration &&
      editedAppointment.professional_id
    ) {
      // Activar estado de verificación
      setIsVerifyingConflicts(true)

      const timeoutId = setTimeout(async () => {
        try {
          await checkConflicts(
            editedAppointment.date,
            editedAppointment.start_time,
            editedAppointment.duration,
            editedAppointment.professional_id,
            appointment.id, // Excluir la cita actual
          )
        } finally {
          // Desactivar estado de verificación cuando termine
          setIsVerifyingConflicts(false)
        }
      }, 500) // Debounce para evitar muchas consultas

      return () => {
        clearTimeout(timeoutId)
        setIsVerifyingConflicts(false)
      }
    } else {
      setIsVerifyingConflicts(false)
    }
  }, [
    isEditing,
    editedAppointment.date,
    editedAppointment.start_time,
    editedAppointment.duration,
    editedAppointment.professional_id,
    checkConflicts,
    appointment.id,
  ])

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

  // 🆕 HANDLERS MODIFICADOS PARA ACTIVAR VERIFICACIÓN
  const handleStartTimeChange = (newStartTime: string) => {
    const newEndTime = calculateEndTime(newStartTime, editedAppointment.duration)
    setEditedAppointment({
      ...editedAppointment,
      start_time: newStartTime,
      end_time: newEndTime,
    })
    // El useEffect se encargará de activar isVerifyingConflicts
  }

  const handleEndTimeChange = (newEndTime: string) => {
    const newDuration = calculateDuration(editedAppointment.start_time, newEndTime)
    setEditedAppointment({
      ...editedAppointment,
      end_time: newEndTime,
      duration: newDuration,
    })
    // El useEffect se encargará de activar isVerifyingConflicts
  }

  const handleDurationChange = (newDuration: number) => {
    const newEndTime = calculateEndTime(editedAppointment.start_time, newDuration)
    setEditedAppointment({
      ...editedAppointment,
      duration: newDuration,
      end_time: newEndTime,
    })
    // El useEffect se encargará de activar isVerifyingConflicts
  }

  // 🆕 HANDLER PARA CAMBIO DE FECHA
  const handleDateChange = (newDate: string) => {
    setEditedAppointment({
      ...editedAppointment,
      date: newDate,
    })
    // El useEffect se encargará de activar isVerifyingConflicts
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

  // 🆕 FUNCIÓN DE ACTUALIZACIÓN MEJORADA CON MEJOR MANEJO DE ERRORES
  const handleSave = async () => {
    // Verificar conflictos antes de guardar
    if (conflicts.length > 0) {
      toast.error("No se puede guardar: hay conflictos de horario")
      return
    }

    setIsSaving(true)
    try {
      console.log("🔍 DEBUG - Updating appointment:", {
        id: appointment.id,
        organization_id: userProfile?.organization_id,
        user_id: userProfile?.id,
      })

      // 🆕 PRIMERO VERIFICAR QUE LA CITA EXISTE
      const { data: existingAppointment, error: checkError } = await supabase
        .from("appointments")
        .select("id, organization_id, professional_id")
        .eq("id", appointment.id)
        .single()

      if (checkError || !existingAppointment) {
        console.error("🔍 DEBUG - Appointment not found:", checkError)
        throw new Error("La cita no existe o no tienes permisos para editarla")
      }

      console.log("🔍 DEBUG - Existing appointment found:", existingAppointment)

      // Preparar los datos para la actualización
      const updateData = {
        date: editedAppointment.date,
        start_time: editedAppointment.start_time,
        end_time: editedAppointment.end_time,
        duration: editedAppointment.duration,
        status: editedAppointment.status,
        notes: editedAppointment.notes || null,
        service_id: editedAppointment.service_id, // Puede ser null
        modalidad: editedAppointment.modalidad, // Puede ser null
        virtual_link: editedAppointment.virtual_link || null,
        updated_at: new Date().toISOString(),
      }

      console.log("🔍 DEBUG - Update data:", updateData)

      // 🆕 ACTUALIZAR SIN .single() PRIMERO PARA EVITAR EL ERROR
      const { data: updateResult, error: updateError } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", appointment.id)
        .select("*")

      if (updateError) {
        console.error("🔍 DEBUG - Update error:", updateError)
        throw updateError
      }

      if (!updateResult || updateResult.length === 0) {
        throw new Error("No se pudo actualizar la cita")
      }

      console.log("🔍 DEBUG - Update successful:", updateResult[0])

      // 🆕 AHORA OBTENER LOS DATOS COMPLETOS CON RELACIONES
      const { data: fullAppointment, error: fetchError } = await supabase
        .from("appointments")
        .select(`          
          *,          
          client:clients(*),          
          service:services(*),          
          consultation:consultations(*),          
          professional:users!appointments_professional_id_fkey(name),          
          appointment_type:appointment_types(name)        
        `)
        .eq("id", appointment.id)
        .single()

      if (fetchError || !fullAppointment) {
        console.error("🔍 DEBUG - Fetch error:", fetchError)
        // Si no puede obtener los datos completos, usar los datos básicos
        const basicAppointment: AppointmentWithDetails = {
          ...updateResult[0],
          client: appointment.client, // Mantener datos existentes
          service: editedAppointment.service,
          consultation: appointment.consultation,
          professional: appointment.professional,
          appointment_type: appointment.appointment_type,
          modalidad: editedAppointment.modalidad,
          virtual_link: editedAppointment.virtual_link,
        }
        await onUpdate(basicAppointment)
      } else {
        // Usar los datos completos
        await onUpdate(fullAppointment)
      }

      setIsEditing(false)
      toast.success("Cita actualizada correctamente")

      // 🆕 SINCRONIZACIÓN AUTOMÁTICA CON GOOGLE CALENDAR
      if (userProfile?.id && userProfile?.organization_id) {
        console.log("🔄 Iniciando sincronización automática después de actualizar...")
        try {
          const syncResult = await autoSyncAppointment(appointment.id, userProfile.id, userProfile.organization_id)
          if (syncResult.success) {
            console.log("✅ Cita sincronizada automáticamente con Google Calendar")
          } else {
            console.log("ℹ️ Cita no sincronizada:", syncResult.message || syncResult.error)
          }
        } catch (syncError) {
          console.error("❌ Error en sincronización automática:", syncError)
          // No mostramos error al usuario para no interrumpir el flujo
        }
      }

      onClose()
    } catch (error) {
      console.error("🔍 DEBUG - Error al actualizar la cita:", error)
      // 🆕 MENSAJES DE ERROR MÁS ESPECÍFICOS
      if (error instanceof Error) {
        if (error.message.includes("PGRST116")) {
          toast.error("Error: La cita no se encontró o no tienes permisos para editarla")
        } else if (error.message.includes("foreign key")) {
          toast.error("Error: Hay un problema con los datos relacionados")
        } else {
          toast.error(`Error al actualizar: ${error.message}`)
        }
      } else {
        toast.error("Error desconocido al actualizar la cita")
      }
    } finally {
      setIsSaving(false)
    }
  }
  const handleDelete = async () => {
    console.log("🚨 handleDelete llamado para cita:", appointment?.id)

    setIsDeleting(true)
    try {
      // 🆕 Obtener google_calendar_event_id actualizado desde Supabase
      const { data: citaActualizada, error: fetchError } = await supabase
        .from("appointments")
        .select("google_calendar_event_id")
        .eq("id", appointment.id)
        .single()

      const calendarEventId = citaActualizada?.google_calendar_event_id
      const professionalId = appointment?.professional_id
      const orgId = userProfile?.organization_id

      console.log("🔍 Intentando eliminar de Google Calendar:", {
        eventId: calendarEventId,
        professionalId,
        organizationId: orgId,
      })

      // Solo eliminar si tenemos todos los datos
      if (calendarEventId && professionalId && orgId) {
        try {
          const response = await fetch("/api/sync", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              appointmentId: appointment.id,
              userId: professionalId,
              organizationId: orgId,
            }),
          })

          const result = await response.json()
          if (!response.ok && response.status !== 404) {
            console.warn("❌ Fallo al eliminar de Google Calendar:", result)
          } else {
            console.log("✅ Evento eliminado de Google Calendar")
          }
        } catch (syncError) {
          console.error("❌ Error al eliminar del calendario:", syncError)
        }
      } else {
        console.log("⚠️ No se elimina de Google Calendar: falta algún dato obligatorio")
      }

      // Eliminar en Supabase después de la sincronización
      await onDelete(appointment.id)
      console.log("✅ Cita eliminada de Supabase")

      setShowDeleteDialog(false)
      onClose()
    } catch (error) {
      console.error("❌ Error general al eliminar la cita:", error)
      toast.error("Error al eliminar la cita")
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleCancel = () => {
    setEditedAppointment(appointment)
    setIsEditing(false)
    setIsVerifyingConflicts(false) // 🆕 Resetear estado de verificación
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

  const getConflictTypeColor = (type: string) => {
    switch (type) {
      case "appointment":
        return "bg-red-100 text-red-800 border-red-200"
      case "group_activity":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "work_break":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "outside_hours":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-red-100 text-red-800 border-red-200"
    }
  }

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case "appointment":
        return "👤"
      case "group_activity":
        return "👥"
      case "work_break":
        return "☕"
      case "outside_hours":
        return "🚫"
      default:
        return "⚠️"
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

  // 🆕 FUNCIÓN PARA DETERMINAR SI EL BOTÓN DEBE ESTAR DESHABILITADO
  const isSaveDisabled = () => {
    return (
      isSaving ||
      conflictsLoading ||
      isVerifyingConflicts || // 🆕 Deshabilitar mientras se verifican conflictos
      conflicts.length > 0
    )
  }

  // 🆕 FUNCIÓN PARA OBTENER EL TÍTULO DEL BOTÓN
  const getSaveButtonTitle = () => {
    if (isVerifyingConflicts) return "Verificando conflictos..."
    if (conflictsLoading) return "Verificando conflictos..."
    if (conflicts.length > 0) return "No se puede guardar: hay conflictos de horario"
    return ""
  }

  // 🆕 FUNCIÓN PARA OBTENER EL TEXTO DEL BOTÓN
  const getSaveButtonText = () => {
    if (isSaving) return "Guardando..."
    if (isVerifyingConflicts) return "Verificando..."
    if (conflicts.length > 0) return "No se puede guardar"
    return "Guardar"
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
          className={`flex w-full ${
            isCoordinator ? "justify-center" : "max-w-7xl gap-2"
          } max-h-[calc(100vh-4rem)] my-auto`}
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
                      {userProfile?.role !== "user" && (
                        <IndividualBillingButton
                          appointment={appointment}
                          onBillingComplete={() => {
                            // Recargar estado de factura después de facturar
                            checkExistingInvoice()
                          }}
                        />
                      )}
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
                          onChange={(e) => handleDateChange(e.target.value)} // 🆕 Usar handler modificado
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
                      {/* 🆕 INDICADOR DE VERIFICACIÓN */}
                      {isVerifyingConflicts && (
                        <div className="flex items-center gap-1 text-xs text-blue-600">
                          <Clock className="h-3 w-3 animate-spin" />
                          <span>Verificando...</span>
                        </div>
                      )}
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

                  {/* MODALIDAD - Display and editing */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Modalidad:</span>
                    {isEditing ? (
                      <Select
                        value={editedAppointment.modalidad}
                        onValueChange={(value) =>
                          setEditedAppointment({
                            ...editedAppointment,
                            modalidad: value as "presencial" | "virtual",
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presencial">Presencial</SelectItem>
                          <SelectItem value="virtual">Virtual</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={
                          appointment.modalidad === "virtual"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-gray-100 text-gray-800 border-gray-200"
                        }
                      >
                        {appointment.modalidad === "virtual" ? "Virtual" : "Presencial"}
                      </Badge>
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

                {/* SECCIÓN DE CONFLICTOS - Solo mostrar si está editando y hay conflictos */}
                {isEditing && conflicts.length > 0 && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-red-700">Conflictos detectados:</span>
                          {(conflictsLoading || isVerifyingConflicts) && (
                            <Clock className="h-3 w-3 animate-spin text-red-600" />
                          )}
                        </div>
                        <div className="space-y-2">
                          {conflicts.map((conflict, index) => (
                            <div key={conflict.id} className="flex items-center gap-2 text-xs">
                              <span className="text-sm">{getConflictTypeIcon(conflict.type)}</span>
                              <Badge className={getConflictTypeColor(conflict.type)}>
                                {conflict.start_time} - {conflict.end_time}
                              </Badge>
                              <span className="text-red-700 flex-1">{conflict.client_name}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-red-600 mt-2">
                          ⚠️ Hay conflictos de horario. Revisa los horarios antes de guardar.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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

                {/* SECCIÓN 6: ENLACE VIRTUAL - Solo si la modalidad es virtual */}
                {(appointment.modalidad === "virtual" || (isEditing && editedAppointment.modalidad === "virtual")) && (
                  <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Enlace Virtual:</span>
                    </div>
                    {isEditing ? (
                      <div className="flex-1">
                        <Input
                          type="url"
                          value={editedAppointment.virtual_link || ""}
                          onChange={(e) =>
                            setEditedAppointment({
                              ...editedAppointment,
                              virtual_link: e.target.value,
                            })
                          }
                          placeholder="https://meet.jit.si/sala-ejemplo"
                          className="h-8 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        {appointment.virtual_link ? (
                          <a
                            href={appointment.virtual_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {appointment.virtual_link}
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500">Sin enlace configurado</span>
                        )}
                      </div>
                    )}
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
                  disabled={isSaveDisabled()} // 🆕 Usar función mejorada
                  className={`gap-2 ${isSaveDisabled() ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={getSaveButtonTitle()} // 🆕 Usar función para título
                >
                  <Save className="h-4 w-4" />
                  {conflicts.length > 0 && <AlertTriangle className="h-3 w-3" />}
                  {isVerifyingConflicts && <Clock className="h-3 w-3 animate-spin" />} {/* 🆕 Icono de verificación */}
                  {getSaveButtonText()} {/* 🆕 Usar función para texto */}
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
