"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Phone, User, CheckCircle, AlertTriangle, MapPin } from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { useConsultations } from "@/hooks/use-consultations"
import { useAuth } from "@/app/contexts/auth-context"
import { normalizePhoneNumber, arePhoneNumbersEqual, formatPhoneNumber, isValidPhoneNumber } from "@/utils/phone-utils"
import { EmoticonSelector } from "./emoticon-selector"
import type { Cita } from "@/types/calendar-types"
import { toast } from "sonner"

interface AppointmentFormModalProps {
  fecha: Date
  hora: string
  profesionalId?: number
  position?: { x: number; y: number }
  citaExistente?: Cita
  onClose: () => void
  onSubmit: (cita: Partial<Cita>) => void
}

const tiposCita = ["Consulta", "Revisión", "Urgencia", "Seguimiento", "Cirugía menor", "Vacunación"]

const estadosCita = [
  { value: "confirmada", label: "Confirmada" },
  { value: "pendiente", label: "Pendiente" },
  { value: "cancelada", label: "Cancelada" },
]

export function AppointmentFormModal({
  fecha,
  hora,
  profesionalId,
  position,
  citaExistente,
  onClose,
  onSubmit,
}: AppointmentFormModalProps) {
  const { userProfile } = useAuth()
  const organizationId = userProfile?.organization_id ? Number(userProfile.organization_id) : undefined

  const { searchClients, clients } = useClients(organizationId)
  const { users } = useUsers(organizationId)
  const {
    consultations,
    loading: consultationsLoading,
    getAvailableConsultations,
    organizationId: consultationsOrgId,
  } = useConsultations(organizationId)

  // Función para calcular hora fin
  const calcularHoraFin = (horaInicio: string, duracion: number) => {
    const [horas, minutos] = horaInicio.split(":").map(Number)
    const totalMinutos = horas * 60 + minutos + duracion
    const nuevasHoras = Math.floor(totalMinutos / 60)
    const nuevosMinutos = totalMinutos % 60
    return `${nuevasHoras.toString().padStart(2, "0")}:${nuevosMinutos.toString().padStart(2, "0")}`
  }

  const [formData, setFormData] = useState({
    telefonoPaciente: citaExistente?.telefonoPaciente || "",
    nombrePaciente: citaExistente?.nombrePaciente || "",
    apellidosPaciente: citaExistente?.apellidosPaciente || "",
    hora: citaExistente?.hora || hora,
    duracion: citaExistente?.duracion || 30,
    tipo: citaExistente?.tipo || "Consulta",
    notas: citaExistente?.notas || "",
    profesionalId: citaExistente?.profesionalId || profesionalId || 1,
    estado: citaExistente?.estado || "confirmada",
    consultationId: citaExistente?.consultationId || "",
    emoticonos: citaExistente?.emoticonos || [],
  })

  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null)
  const [buscandoCliente, setBuscandoCliente] = useState(false)
  const [telefonoValidado, setTelefonoValidado] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [telefonoFormateado, setTelefonoFormateado] = useState("")
  const [availableConsultations, setAvailableConsultations] = useState(consultations)
  const [checkingConsultations, setCheckingConsultations] = useState(false)

  // Inicializar consultas disponibles cuando se cargan las consultas
  useEffect(() => {
    setAvailableConsultations(consultations)
  }, [consultations])

  // Verificar consultas disponibles cuando cambie la hora o duración
  const checkAvailableConsultations = async () => {
    if (!formData.hora || !formData.duracion) {
      return
    }

    if (!organizationId) {
      return
    }

    if (consultations.length === 0) {
      return
    }

    setCheckingConsultations(true)
    try {
      const endTime = calcularHoraFin(formData.hora, formData.duracion)
      const dateString = fecha.toISOString().split("T")[0]

      const available = await getAvailableConsultations(
        dateString,
        formData.hora,
        endTime,
        citaExistente?.id?.toString(),
      )

      setAvailableConsultations(available)

      // Si la consulta seleccionada ya no está disponible, limpiar la selección
      if (formData.consultationId && !available.find((c) => c.id === formData.consultationId)) {
        setFormData((prev) => ({ ...prev, consultationId: "" }))
        toast.warning("La consulta seleccionada ya no está disponible en este horario")
      }
    } catch (error) {
      toast.error("Error al verificar disponibilidad de consultas")
      // En caso de error, mostrar todas las consultas
      setAvailableConsultations(consultations)
    } finally {
      setCheckingConsultations(false)
    }
  }

  // Ejecutar verificación cuando cambien hora, duración o consultations
  useEffect(() => {
    if (organizationId && consultations.length > 0) {
      checkAvailableConsultations()
    }
  }, [formData.hora, formData.duracion, organizationId, consultations.length])

  // Buscar cliente por teléfono con normalización
  const buscarClientePorTelefono = async (telefono: string) => {
    if (!telefono || !isValidPhoneNumber(telefono)) {
      setClienteEncontrado(null)
      setTelefonoValidado(false)
      return
    }

    setBuscandoCliente(true)
    try {
      // Buscar en todos los clientes usando normalización
      const telefonoNormalizado = normalizePhoneNumber(telefono)
      const clienteExacto = clients.find((cliente) => {
        if (!cliente.phone) return false
        return arePhoneNumbersEqual(cliente.phone, telefono)
      })

      if (clienteExacto) {
        setClienteEncontrado(clienteExacto)
        setTelefonoValidado(true)
        // Autocompletar campos
        const nombreCompleto = clienteExacto.name.split(" ")
        const nombre = nombreCompleto[0] || ""
        const apellidos = nombreCompleto.slice(1).join(" ") || ""

        setFormData((prev) => ({
          ...prev,
          nombrePaciente: nombre,
          apellidosPaciente: apellidos,
        }))

        // Formatear teléfono para mostrar
        setTelefonoFormateado(formatPhoneNumber(telefono))
        toast.success(`Cliente encontrado: ${clienteExacto.name}`, {
          description: `Teléfono: ${clienteExacto.phone}`,
        })
      } else {
        setClienteEncontrado(null)
        setTelefonoValidado(true)
        // Formatear teléfono para mostrar
        setTelefonoFormateado(formatPhoneNumber(telefono))
        // Limpiar campos de nombre si no se encuentra
        if (!citaExistente) {
          setFormData((prev) => ({
            ...prev,
            nombrePaciente: "",
            apellidosPaciente: "",
          }))
        }
        toast.info("Cliente nuevo - completa los datos", {
          description: `Teléfono: ${formatPhoneNumber(telefono)}`,
        })
      }
    } catch (error) {
      toast.error("Error al buscar cliente")
      setClienteEncontrado(null)
      setTelefonoValidado(false)
    } finally {
      setBuscandoCliente(false)
    }
  }

  // Validar teléfono
  const validarTelefono = (telefono: string) => {
    if (!telefono.trim()) {
      setErrors((prev) => ({ ...prev, telefono: "El teléfono es obligatorio" }))
      return false
    }

    if (!isValidPhoneNumber(telefono)) {
      setErrors((prev) => ({
        ...prev,
        telefono: "Formato de teléfono inválido. Debe tener entre 9 y 15 dígitos",
      }))
      return false
    }

    setErrors((prev) => ({ ...prev, telefono: "" }))
    return true
  }

  // Manejar cambio de teléfono
  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const telefono = e.target.value
    setFormData((prev) => ({ ...prev, telefonoPaciente: telefono }))

    // Resetear estado de búsqueda
    setClienteEncontrado(null)
    setTelefonoValidado(false)
    setTelefonoFormateado("")

    // Validar formato
    validarTelefono(telefono)
  }

  // Manejar cuando se sale del campo teléfono
  const handleTelefonoBlur = () => {
    const telefono = formData.telefonoPaciente.trim()
    if (validarTelefono(telefono)) {
      buscarClientePorTelefono(telefono)
    }
  }

  // Manejar cambio de emojis
  const handleEmojisChange = (emojis: string[]) => {
    setFormData((prev) => ({ ...prev, emoticonos: emojis }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    const newErrors: { [key: string]: string } = {}

    if (!formData.telefonoPaciente.trim()) {
      newErrors.telefono = "El teléfono es obligatorio"
    } else if (!isValidPhoneNumber(formData.telefonoPaciente)) {
      newErrors.telefono = "Formato de teléfono inválido"
    }

    if (!formData.nombrePaciente.trim()) {
      newErrors.nombre = "El nombre es obligatorio"
    }

    if (!formData.consultationId) {
      newErrors.consultation = "Debes seleccionar una consulta"
    }

    if (!telefonoValidado) {
      newErrors.telefono = "Debes validar el teléfono primero (sal del campo para validar)"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error("Por favor corrige los errores en el formulario")
      return
    }

    const nuevaCita: Partial<Cita> = {
      ...formData,
      // Guardar teléfono normalizado para consistencia
      telefonoPaciente: normalizePhoneNumber(formData.telefonoPaciente),
      fecha,
      horaFin: calcularHoraFin(formData.hora, formData.duracion),
      id: citaExistente?.id || Date.now(),
      emoticonos: formData.emoticonos,
    }

    onSubmit(nuevaCita)
    onClose()
  }

  // Mostrar mensaje si no hay organizationId
  if (!organizationId) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p>No se pudo obtener la información de la organización.</p>
            <Button onClick={onClose} className="mt-4">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {citaExistente ? "Editar Cita" : "Nueva Cita"}
            {clienteEncontrado && <CheckCircle className="h-4 w-4 text-green-600" />}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Teléfono - Campo principal y obligatorio */}
          <div>
            <Label htmlFor="telefonoPaciente" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Teléfono del paciente *
            </Label>
            <div className="relative">
              <Input
                id="telefonoPaciente"
                value={formData.telefonoPaciente}
                onChange={handleTelefonoChange}
                onBlur={handleTelefonoBlur}
                placeholder="Ej: +34 612 345 678 o 612345678"
                required
                className={`${errors.telefono ? "border-red-500" : ""} ${telefonoValidado ? "border-green-500" : ""}`}
              />
              {buscandoCliente && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
              {telefonoValidado && !buscandoCliente && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
            </div>
            {errors.telefono && <p className="text-sm text-red-600 mt-1">{errors.telefono}</p>}
            {telefonoFormateado && <p className="text-sm text-gray-600 mt-1">Formato: {telefonoFormateado}</p>}
          </div>

          {/* Información del cliente encontrado */}
          {clienteEncontrado && (
            <Alert className="border-green-200 bg-green-50">
              <User className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                <strong>Cliente existente:</strong> {clienteEncontrado.name}
                <br />
                <span className="text-sm">Teléfono registrado: {clienteEncontrado.phone}</span>
                <br />
                <span className="text-sm">Los datos se han completado automáticamente</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Advertencia si es cliente nuevo */}
          {telefonoValidado && !clienteEncontrado && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <strong>Cliente nuevo</strong>
                <br />
                <span className="text-sm">Este teléfono no está registrado. Se creará un nuevo cliente.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Datos del paciente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nombrePaciente">Nombre *</Label>
              <Input
                id="nombrePaciente"
                value={formData.nombrePaciente}
                onChange={(e) => setFormData({ ...formData, nombrePaciente: e.target.value })}
                required
                className={errors.nombre ? "border-red-500" : ""}
                placeholder="Nombre del paciente"
              />
              {errors.nombre && <p className="text-sm text-red-600 mt-1">{errors.nombre}</p>}
            </div>

            <div>
              <Label htmlFor="apellidosPaciente">Apellidos</Label>
              <Input
                id="apellidosPaciente"
                value={formData.apellidosPaciente}
                onChange={(e) => setFormData({ ...formData, apellidosPaciente: e.target.value })}
                placeholder="Apellidos del paciente"
              />
            </div>
          </div>

          {/* Horario */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="duracion">Duración (min)</Label>
              <Select
                value={formData.duracion.toString()}
                onValueChange={(value) => setFormData({ ...formData, duracion: Number.parseInt(value) })}
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
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Consulta */}
          <div>
            <Label htmlFor="consultation" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Consulta *
              {(checkingConsultations || consultationsLoading) && <Loader2 className="h-3 w-3 animate-spin" />}
            </Label>
            <Select
              value={formData.consultationId}
              onValueChange={(value) => setFormData({ ...formData, consultationId: value })}
              disabled={consultationsLoading}
            >
              <SelectTrigger className={errors.consultation ? "border-red-500" : ""}>
                <SelectValue placeholder={consultationsLoading ? "Cargando consultas..." : "Selecciona una consulta"} />
              </SelectTrigger>
              <SelectContent>
                {availableConsultations.map((consultation) => (
                  <SelectItem key={consultation.id} value={consultation.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: consultation.color }} />
                      {consultation.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.consultation && <p className="text-sm text-red-600 mt-1">{errors.consultation}</p>}
            {!consultationsLoading && availableConsultations.length === 0 && consultations.length > 0 && (
              <p className="text-sm text-amber-600 mt-1">No hay consultas disponibles en este horario</p>
            )}
            {!consultationsLoading && consultations.length === 0 && (
              <p className="text-sm text-red-600 mt-1">No hay consultas configuradas</p>
            )}
          </div>

          {/* Profesional */}
          <div>
            <Label htmlFor="profesional">Profesional</Label>
            <Select
              value={formData.profesionalId.toString()}
              onValueChange={(value) => setFormData({ ...formData, profesionalId: Number.parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={Number.parseInt(user.id.slice(-8), 16).toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de cita */}
          <div>
            <Label htmlFor="tipo">Tipo de cita</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposCita.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado */}
          <div>
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={formData.estado}
              onValueChange={(value: "confirmada" | "pendiente" | "cancelada") =>
                setFormData({ ...formData, estado: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {estadosCita.map((estado) => (
                  <SelectItem key={estado.value} value={estado.value}>
                    {estado.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de emojis */}
          <EmoticonSelector
            selectedEmoticonos={formData.emoticonos}
            onEmoticonosChange={handleEmojisChange}
            maxEmoticonos={5}
          />

          {/* Notas */}
          <div>
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Notas adicionales..."
              rows={3}
            />
          </div>

          {/* Información adicional */}
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded">
            <p>
              <strong>💡 Consejos:</strong>
            </p>
            <p>• El teléfono es obligatorio para enviar recordatorios</p>
            <p>• Debes seleccionar una consulta disponible</p>
            <p>• Las consultas se verifican automáticamente según el horario</p>
            <p>• Los emojis ayudan a identificar rápidamente el tipo de cita</p>
            <p>• Sal del campo teléfono para validar y buscar cliente</p>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!telefonoValidado || buscandoCliente || checkingConsultations || consultationsLoading}
              className="gap-2"
            >
              {(buscandoCliente || checkingConsultations || consultationsLoading) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {citaExistente ? "Actualizar" : "Crear"} Cita
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
