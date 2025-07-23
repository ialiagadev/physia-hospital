"use client"
import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, User, Clock, CalendarIcon as CalendarIconLucide, Phone, CheckCircle, AlertTriangle, Loader2, Briefcase } from 'lucide-react'
import { format } from "date-fns"
import { useWaitingListData } from "@/hooks/use-waiting-list-data"
import { useUserServices } from "../services/use-user-services"
import { useClients } from "@/hooks/use-clients"
import { useAuth } from "@/app/contexts/auth-context"
import { formatPhoneNumber } from "@/utils/phone-utils"
import { supabase } from "@/lib/supabase/client"
import type { CreateWaitingListEntry } from "@/hooks/use-waiting-list"
import type { Service } from "@/hooks/use-waiting-list-data" // ✅ IMPORTAR TIPO

interface AddToWaitingListModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (entry: CreateWaitingListEntry) => Promise<boolean>
  organizationId: number
}

interface ClientMatch {
  id: number
  name: string
  phone: string
  matchType: "phone" | "name"
}

export function AddToWaitingListModal({ isOpen, onClose, onSubmit, organizationId }: AddToWaitingListModalProps) {
  const { userProfile } = useAuth()
  const { professionals, services, loading: dataLoading } = useWaitingListData(organizationId)
  const { getServicesByUser, loading: userServicesLoading } = useUserServices(organizationId) // ✅ NUEVO HOOK
  const { clients, createClient } = useClients(organizationId)

  const [formData, setFormData] = useState({
    client_id: 0,
    professional_id: null as string | null,
    service_id: null as number | null,
    preferred_date_start: format(new Date(), "yyyy-MM-dd"),
    preferred_date_end: null as string | null,
    preferred_time_preference: "any" as "morning" | "afternoon" | "any",
    notes: null as string | null,
  })

  // Estados para búsqueda de clientes
  const [searchTerm, setSearchTerm] = useState("")
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [searchingClients, setSearchingClients] = useState(false)
  const [clienteEncontrado, setClienteEncontrado] = useState<any>(null)
  const [telefonoValidado, setTelefonoValidado] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [telefonoFormateado, setTelefonoFormateado] = useState("")

  // Estados adicionales para cliente nuevo
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientData, setNewClientData] = useState({
    name: "",
    phone: "",
    email: "",
  })

  // ✅ NUEVOS ESTADOS PARA SERVICIOS FILTRADOS
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loadingProfessionalServices, setLoadingProfessionalServices] = useState(false)

  // Estados para fechas y envío
  const [submitting, setSubmitting] = useState(false)

  // Refs para timeouts
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // ✅ NUEVA FUNCIÓN: Actualizar servicios cuando cambie el profesional
  const updateServicesForProfessional = useCallback(
    async (professionalId: string | null) => {
      if (!professionalId) {
        // Si no hay profesional específico, mostrar todos los servicios
        setFilteredServices(services)
        return
      }

      setLoadingProfessionalServices(true)
      try {
        const professionalServices = await getServicesByUser(professionalId)
        setFilteredServices(professionalServices)
      } catch (error) {
        console.error("Error loading professional services:", error)
        setFilteredServices([])
      } finally {
        setLoadingProfessionalServices(false)
      }
    },
    [services, getServicesByUser],
  )

  // ✅ EFECTO: Inicializar servicios filtrados
  useEffect(() => {
    if (!dataLoading && services.length > 0) {
      if (formData.professional_id) {
        updateServicesForProfessional(formData.professional_id)
      } else {
        setFilteredServices(services)
      }
    }
  }, [services, dataLoading, formData.professional_id, updateServicesForProfessional])

  // Función para buscar clientes
  const searchClients = useCallback(async (term: string) => {
    if (!term || term.length < 1) {
      setClientMatches([])
      setShowMatches(false)
      return
    }

    setSearchingClients(true)
    try {
      const matches: ClientMatch[] = []
      const termLower = term.toLowerCase().trim()
      const phoneDigits = term.replace(/\D/g, "")

      if (phoneDigits.length >= 3) {
        const { data: phoneMatches, error: phoneError } = await supabase
          .from("clients")
          .select("id, name, phone")
          .eq("organization_id", organizationId)
          .ilike("phone", `%${phoneDigits}%`)
          .limit(10)

        if (!phoneError && phoneMatches) {
          phoneMatches.forEach((client) => {
            matches.push({
              id: client.id,
              name: client.name,
              phone: client.phone || "",
              matchType: "phone",
            })
          })
        }
      }

      if (!/^\d+$/.test(term)) {
        const { data: nameMatches, error: nameError } = await supabase
          .from("clients")
          .select("id, name, phone")
          .eq("organization_id", organizationId)
          .ilike("name", `%${termLower}%`)
          .limit(10)

        if (!nameError && nameMatches) {
          nameMatches.forEach((client) => {
            if (!matches.find((m) => m.id === client.id)) {
              matches.push({
                id: client.id,
                name: client.name,
                phone: client.phone || "",
                matchType: "name",
              })
            }
          })
        }
      }

      setClientMatches(matches)
      setShowMatches(matches.length > 0)
    } catch (error) {
      setClientMatches([])
      setShowMatches(false)
    } finally {
      setSearchingClients(false)
    }
  }, [organizationId])

  // Handlers
  const selectClient = useCallback((client: ClientMatch) => {
    setClienteEncontrado(client)
    setTelefonoValidado(true)
    setShowMatches(false)
    setShowNewClientForm(false)
    setFormData((prev) => ({
      ...prev,
      client_id: client.id,
    }))
    setSearchTerm(`${client.name} - ${client.phone}`)
    setTelefonoFormateado(formatPhoneNumber(client.phone || ""))
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchTerm(value)
      setClienteEncontrado(null)
      setTelefonoValidado(false)
      setTelefonoFormateado("")
      setFormData((prev) => ({ ...prev, client_id: 0 }))

      // Actualizar datos del nuevo cliente
      setNewClientData((prev) => ({ ...prev, name: value }))

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      searchTimeoutRef.current = setTimeout(async () => {
        await searchClients(value)
        // Mostrar formulario de cliente nuevo si no hay coincidencias y hay texto
        if (value.trim() && clientMatches.length === 0) {
          setShowNewClientForm(true)
        } else {
          setShowNewClientForm(false)
        }
      }, 300)
    },
    [searchClients, clientMatches.length],
  )

  const handleSearchBlur = useCallback(() => {
    setTimeout(() => setShowMatches(false), 200)
  }, [])

  // ✅ NUEVO HANDLER: Para cambio de profesional con control de servicios
  const handleProfessionalChange = useCallback(
    (value: string) => {
      const newProfessionalId = value === "any" ? null : value

      setFormData((prev) => ({
        ...prev,
        professional_id: newProfessionalId,
        service_id: null, // ✅ Reset servicio cuando cambie profesional
      }))

      // ✅ Actualizar servicios disponibles
      updateServicesForProfessional(newProfessionalId)
    },
    [updateServicesForProfessional],
  )

  // ✅ NUEVO HANDLER: Para cambio de servicio con validación
  const handleServiceChange = useCallback((value: string) => {
    const serviceId = value === "none" ? null : Number.parseInt(value)
    setFormData((prev) => ({
      ...prev,
      service_id: serviceId,
    }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}

    // Validar cliente
    if (!clienteEncontrado && !showNewClientForm) {
      newErrors.cliente = "Debes buscar y seleccionar un cliente"
    }

    // Si es cliente nuevo, validar campos obligatorios
    if (showNewClientForm) {
      if (!newClientData.name.trim()) {
        newErrors.nombreCompleto = "El nombre completo es obligatorio"
      }
      if (!newClientData.phone.trim()) {
        newErrors.telefonoNuevo = "El teléfono es obligatorio"
      }
    }

    // ✅ NUEVA VALIDACIÓN: Verificar compatibilidad profesional-servicio
    if (formData.professional_id && formData.service_id) {
      const serviceExists = filteredServices.find((s) => s.id === formData.service_id)
      if (!serviceExists) {
        newErrors.service = "El servicio seleccionado no está disponible para este profesional"
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      let clientId = formData.client_id

      // Si es cliente nuevo, crearlo
      if (showNewClientForm) {
        const newClient = await createClient({
          name: newClientData.name.trim(),
          phone: newClientData.phone.trim() || null,
          email: newClientData.email.trim() || null,
          organization_id: organizationId,
        })
        clientId = newClient.id
      }

      const success = await onSubmit({
        client_id: clientId,
        professional_id: formData.professional_id,
        service_id: formData.service_id,
        preferred_date_start: formData.preferred_date_start,
        preferred_date_end: formData.preferred_date_end,
        preferred_time_preference: formData.preferred_time_preference,
        notes: formData.notes,
      } as CreateWaitingListEntry)

      if (success) {
        handleClose()
      }
    } catch (error) {
      console.error("Error submitting waiting list entry:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      client_id: 0,
      professional_id: null as string | null,
      service_id: null as number | null,
      preferred_date_start: format(new Date(), "yyyy-MM-dd"),
      preferred_date_end: null as string | null,
      preferred_time_preference: "any" as "morning" | "afternoon" | "any",
      notes: null as string | null,
    })
    setSearchTerm("")
    setClienteEncontrado(null)
    setClientMatches([])
    setShowMatches(false)
    setShowNewClientForm(false)
    setNewClientData({ name: "", phone: "", email: "" })
    setErrors({})
    setTelefonoFormateado("")
    setTelefonoValidado(false)
    setFilteredServices([]) // ✅ Reset servicios filtrados
    onClose()
  }

  // Limpiar timeouts
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const isFormValid = () => {
    // Si hay cliente encontrado, el formulario es válido
    if (clienteEncontrado && formData.client_id > 0) {
      return true
    }

    // Si estamos creando cliente nuevo, validar campos obligatorios
    if (showNewClientForm && newClientData.name.trim() && newClientData.phone.trim()) {
      return true
    }

    return false
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Añadir a Lista de Espera
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo de búsqueda de cliente */}
          <div className="space-y-2">
            <Label htmlFor="searchTerm" className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4" />
              Buscar paciente *
            </Label>
            <div className="relative">
              <Input
                id="searchTerm"
                value={searchTerm}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                onFocus={() => searchTerm && searchClients(searchTerm)}
                placeholder="Buscar por teléfono (3+ dígitos), nombre o apellido..."
                required
                className={`w-full ${errors.cliente ? "border-red-500" : ""} ${
                  clienteEncontrado ? "border-green-500" : ""
                }`}
              />
              {searchingClients && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
              {clienteEncontrado && !searchingClients && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
            </div>

            {/* Lista de coincidencias */}
            {showMatches && clientMatches.length > 0 && (
              <div className="relative z-50">
                <div className="absolute top-0 left-0 right-0 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {clientMatches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0 flex items-center gap-2"
                      onClick={() => selectClient(match)}
                    >
                      {match.matchType === "phone" ? (
                        <Phone className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      ) : (
                        <User className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{match.name}</div>
                        <div className="text-sm text-gray-500 truncate">{match.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errors.cliente && <p className="text-sm text-red-600">{errors.cliente}</p>}
            {telefonoFormateado && <p className="text-sm text-gray-600">Formato: {telefonoFormateado}</p>}
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

          {/* Formulario de cliente nuevo */}
          {showNewClientForm && !clienteEncontrado && (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-blue-800">
                  <strong>Cliente nuevo</strong>
                  <br />
                  <span className="text-sm">Se creará un nuevo cliente con estos datos.</span>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Crear nuevo cliente
                </h4>

                {/* Nombre completo */}
                <div className="space-y-2">
                  <Label htmlFor="newClientName" className="text-sm font-medium">
                    Nombre completo *
                  </Label>
                  <Input
                    id="newClientName"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre y apellidos del cliente"
                    required
                    className={errors.nombreCompleto ? "border-red-500" : ""}
                  />
                  {errors.nombreCompleto && <p className="text-sm text-red-600">{errors.nombreCompleto}</p>}
                </div>

                {/* Teléfono y Email en grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newClientPhone" className="text-sm font-medium">
                      Teléfono *
                    </Label>
                    <Input
                      id="newClientPhone"
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Teléfono"
                      required
                      className={errors.telefonoNuevo ? "border-red-500" : ""}
                    />
                    {errors.telefonoNuevo && <p className="text-sm text-red-600">{errors.telefonoNuevo}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newClientEmail" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="newClientEmail"
                      type="email"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Email"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ PROFESIONAL MODIFICADO */}
          <div className="space-y-2">
            <Label htmlFor="professional">Profesional</Label>
            <Select value={formData.professional_id || "any"} onValueChange={handleProfessionalChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar profesional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquier profesional</SelectItem>
                {professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ✅ SERVICIO MODIFICADO CON FILTRADO */}
          <div className="space-y-2">
            <Label htmlFor="service" className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4" />
              Servicio
              {(loadingProfessionalServices || userServicesLoading) && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
            </Label>

            <Select
              value={formData.service_id?.toString() || "none"}
              onValueChange={handleServiceChange}
              disabled={loadingProfessionalServices || userServicesLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingProfessionalServices || userServicesLoading
                      ? "Cargando servicios..."
                      : formData.professional_id && filteredServices.length === 0
                      ? "No hay servicios disponibles para este profesional"
                      : "Seleccionar servicio"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin servicio específico</SelectItem>
                {filteredServices.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                      <span>{service.name}</span>
                      <span className="text-sm text-muted-foreground">({service.duration} min)</span>
                      {service.category && (
                        <span className="text-xs text-gray-400">• {service.category}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* ✅ INDICADORES DE ESTADO */}
            {(loadingProfessionalServices || userServicesLoading) && formData.professional_id && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Cargando servicios del profesional...
              </div>
            )}

            {formData.professional_id &&
              !loadingProfessionalServices &&
              !userServicesLoading &&
              filteredServices.length === 0 && (
                <p className="text-sm text-amber-600">Este profesional no tiene servicios asignados</p>
              )}

            {formData.professional_id &&
              !loadingProfessionalServices &&
              !userServicesLoading &&
              filteredServices.length > 0 && (
                <p className="text-sm text-blue-600">
                  {filteredServices.length} servicio(s) disponible(s) para este profesional
                </p>
              )}

            {!formData.professional_id && filteredServices.length > 0 && (
              <p className="text-sm text-gray-600">
                Mostrando todos los servicios ({filteredServices.length} disponibles)
              </p>
            )}

            {errors.service && <p className="text-sm text-red-600">{errors.service}</p>}
          </div>

          {/* Fechas Preferidas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Disponible desde *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.preferred_date_start}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    preferred_date_start: e.target.value,
                  }))
                }
                min={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Disponible hasta</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.preferred_date_end || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    preferred_date_end: e.target.value || null,
                  }))
                }
                min={formData.preferred_date_start}
              />
            </div>
          </div>

          {/* Preferencia de Horario */}
          <div className="space-y-3">
            <Label>Preferencia de horario</Label>
            <RadioGroup
              value={formData.preferred_time_preference}
              onValueChange={(value: "morning" | "afternoon" | "any") =>
                setFormData((prev) => ({ ...prev, preferred_time_preference: value }))
              }
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="morning" id="morning" />
                <Label htmlFor="morning" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Mañanas
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="afternoon" id="afternoon" />
                <Label htmlFor="afternoon" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tardes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="any" id="any" />
                <Label htmlFor="any" className="flex items-center gap-2">
                  <CalendarIconLucide className="h-4 w-4" />
                  Cualquier hora
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones especiales, preferencias, etc."
              value={formData.notes || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value || null }))}
              rows={3}
            />
          </div>

          {/* ✅ INFORMACIÓN ADICIONAL ACTUALIZADA */}
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded">
            <p className="flex items-center gap-1">
              <Search className="h-3 w-3 flex-shrink-0" />
              <strong>Consejos:</strong>
            </p>
            <p>• Busca por teléfono (3+ dígitos), nombre o apellido para encontrar clientes existentes</p>
            <p>• Si no encuentras el cliente, se creará automáticamente uno nuevo</p>
            <p>• Selecciona "Cualquier profesional" si el paciente no tiene preferencia</p>
            <p>• Al seleccionar un profesional específico, solo verás sus servicios asignados</p>
            <p>• Las fechas de disponibilidad ayudan a priorizar la programación</p>
            <p className="text-blue-600">
              • ✅ El sistema garantiza que solo se asignen servicios compatibles con el profesional
            </p>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isFormValid() || submitting}>
              {submitting
                ? "Añadiendo..."
                : showNewClientForm
                ? "Crear Cliente y Añadir a Lista"
                : "Añadir a Lista"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}