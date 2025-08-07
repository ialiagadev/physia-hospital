"use client"

import React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Phone, User, UserPlus, Users, Mail, Loader2, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react'
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/app/contexts/auth-context"

interface ClientMatch {
  id: number
  name: string
  phone: string
  email?: string | null
  matchType: "phone" | "name" | "email"
}

interface AddParticipantModalProps {
  isOpen: boolean
  onClose: () => void
  onAddParticipant: (clientId: number, notes?: string) => Promise<void>
  organizationId: number
  currentParticipants: number[]
  maxParticipants: number
  activityName?: string
  user?: any
  userProfile?: any
}

// Prefijos telefónicos comunes
const PHONE_PREFIXES = [
  { code: '+34', country: 'España', flag: '🇪🇸' },
  { code: '+33', country: 'Francia', flag: '🇫🇷' },
  { code: '+49', country: 'Alemania', flag: '🇩🇪' },
  { code: '+39', country: 'Italia', flag: '🇮🇹' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '+1', country: 'Estados Unidos', flag: '🇺🇸' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+212', country: 'Marruecos', flag: '🇲🇦' },
]

export function AddParticipantModal({
  isOpen,
  onClose,
  onAddParticipant,
  organizationId,
  currentParticipants,
  maxParticipants,
  activityName,
}: AddParticipantModalProps) {
  const { user, userProfile } = useAuth()

  // Estados principales
  const [searchTerm, setSearchTerm] = useState("")
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientMatch | null>(null)
  const [participantNotes, setParticipantNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  // Estados para nuevo cliente
  const [newClientData, setNewClientData] = useState({
    name: "",
    phone: "",
  })

  // 🆕 Estados para cliente nuevo con prefijo y NIF
  const [phonePrefix, setPhonePrefix] = useState('+34')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [taxId, setTaxId] = useState('')

  // Refs para timeouts
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Función para normalizar teléfono
  const normalizePhoneNumber = (phone: string): string => {
    return phone.replace(/\D/g, "")
  }

  // Función para formatear teléfono
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 9) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")
    }
    return phone
  }

  // Función para validar teléfono
  const isValidPhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, "")
    return cleaned.length >= 9
  }

  // Búsqueda de clientes con debounce
  const searchClients = useCallback(
    async (term: string) => {
      if (!term || term.length < 1 || !user || !userProfile) {
        setClientMatches([])
        setShowMatches(false)
        return
      }

      setSearching(true)
      try {
        const matches: ClientMatch[] = []
        const termLower = term.toLowerCase().trim()
        const phoneDigits = term.replace(/\D/g, "")

        // Usar la organización del usuario autenticado
        const orgId = userProfile.organization_id || organizationId

        // Buscar por teléfono si hay dígitos
        if (phoneDigits.length >= 3) {
          const { data: phoneMatches, error: phoneError } = await supabase
            .from("clients")
            .select("id, name, phone, email")
            .eq("organization_id", orgId)
            .ilike("phone", `%${phoneDigits}%`)
            .not("id", "in", `(${currentParticipants.join(",") || "0"})`)
            .limit(10)

          if (!phoneError && phoneMatches) {
            phoneMatches.forEach((client) => {
              matches.push({
                id: client.id,
                name: client.name,
                phone: client.phone || "",
                email: client.email,
                matchType: "phone",
              })
            })
          }
        }

        // Buscar por nombre si no es solo números
        if (!/^\d+$/.test(term)) {
          const { data: nameMatches, error: nameError } = await supabase
            .from("clients")
            .select("id, name, phone, email")
            .eq("organization_id", orgId)
            .ilike("name", `%${termLower}%`)
            .not("id", "in", `(${currentParticipants.join(",") || "0"})`)
            .limit(10)

          if (!nameError && nameMatches) {
            nameMatches.forEach((client) => {
              if (!matches.find((m) => m.id === client.id)) {
                matches.push({
                  id: client.id,
                  name: client.name,
                  phone: client.phone || "",
                  email: client.email,
                  matchType: "name",
                })
              }
            })
          }
        }

        // Buscar por email si parece un email
        if (term.includes("@")) {
          const { data: emailMatches, error: emailError } = await supabase
            .from("clients")
            .select("id, name, phone, email")
            .eq("organization_id", orgId)
            .ilike("email", `%${termLower}%`)
            .not("id", "in", `(${currentParticipants.join(",") || "0"})`)
            .limit(10)

          if (!emailError && emailMatches) {
            emailMatches.forEach((client) => {
              if (!matches.find((m) => m.id === client.id)) {
                matches.push({
                  id: client.id,
                  name: client.name,
                  phone: client.phone || "",
                  email: client.email,
                  matchType: "email",
                })
              }
            })
          }
        }

        setClientMatches(matches)
        setShowMatches(matches.length > 0)
      } catch (error) {
        console.error("Error searching clients:", error)
        setClientMatches([])
        setShowMatches(false)
      } finally {
        setSearching(false)
      }
    },
    [organizationId, currentParticipants, user, userProfile],
  )

  // Auto-completar datos para nuevo cliente basado en la búsqueda
  useEffect(() => {
    if (searchTerm && !selectedClient) {
      const phoneDigits = searchTerm.replace(/\D/g, "")
      if (/^\d+$/.test(searchTerm) && phoneDigits.length >= 3) {
        // Si es solo números, asumir que es teléfono
        setNewClientData({
          name: "",
          phone: "", // 🔧 Dejar vacío para evitar duplicación
        })
        setPhoneNumber(searchTerm) // 🔧 Solo actualizar phoneNumber
      } else if (searchTerm.includes("@")) {
        // Si contiene @, asumir que es email - pero no lo guardamos
        setNewClientData({
          name: "",
          phone: "",
        })
      } else {
        // Si no, asumir que es nombre
        setNewClientData({
          name: searchTerm,
          phone: "",
        })
      }
    }
  }, [searchTerm, selectedClient])

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchClients(searchTerm)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, searchClients])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    setSelectedClient(null) // Limpiar cliente seleccionado al cambiar búsqueda
  }, [])

  const handleSearchBlur = useCallback(() => {
    // Ocultar matches después de un pequeño delay para permitir clicks
    setTimeout(() => setShowMatches(false), 200)
  }, [])

  const selectClient = useCallback((client: ClientMatch) => {
    setSelectedClient(client)
    setSearchTerm(`${client.name} - ${client.phone}`)
    setShowMatches(false)

    // Separar prefijo y número para cliente existente
    const fullPhone = client.phone || ""
    const prefix = PHONE_PREFIXES.find(p => fullPhone.startsWith(p.code))
    if (prefix) {
      setPhonePrefix(prefix.code)
      setPhoneNumber(fullPhone.substring(prefix.code.length))
    } else {
      setPhoneNumber(fullPhone)
    }
  }, [])

  // 🆕 Handler para cambio de prefijo telefónico
  const handlePhonePrefixChange = useCallback((value: string) => {
    setPhonePrefix(value)
  }, [])

  // 🆕 Handler para cambio de número telefónico
  const handlePhoneNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    setPhoneNumber(value)
    // 🔧 REMOVER ESTA LÍNEA para evitar duplicación:
    // setNewClientData(prev => ({ ...prev, phone: value }))
  }, [])

  const handleAddExistingClient = async () => {
    if (!selectedClient) return

    setLoading(true)
    try {
      await onAddParticipant(selectedClient.id, participantNotes.trim() || undefined)
      handleClose()
      toast.success(`${selectedClient.name} añadido a la actividad`)
    } catch (error) {
      toast.error("Error al añadir participante")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAndAddClient = async () => {
    if (!newClientData.name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    if (!phoneNumber.trim()) {
      toast.error("El teléfono es obligatorio")
      return
    }

    if (!taxId.trim()) {
      toast.error("El NIF/CIF es obligatorio")
      return
    }

    // Validar que el número tenga al menos 9 dígitos
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error("El teléfono debe tener al menos 9 dígitos")
      return
    }

    if (!user || !userProfile) {
      toast.error("No estás autenticado")
      return
    }

    setLoading(true)
    try {
      const orgId = userProfile.organization_id || organizationId
      const clientData = {
        name: newClientData.name.trim(),
        phone: phoneNumber, // 🔧 Solo el número sin prefijo
        phone_prefix: phonePrefix, // 🔧 Solo el prefijo
        tax_id: taxId.trim(),
        organization_id: orgId,
      }

      console.log("🔧 Creando cliente con datos:", clientData)

      const { data: newClient, error } = await supabase.from("clients").insert([clientData]).select().single()

      if (error) {
        throw error
      }

      console.log("✅ Cliente creado:", newClient)

      await onAddParticipant(newClient.id, participantNotes.trim() || undefined)
      handleClose()
      toast.success(`${newClient.name} creado y añadido`)
    } catch (error) {
      console.error("Error creating client:", error)
      toast.error("Error al crear cliente")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSearchTerm("")
    setClientMatches([])
    setShowMatches(false)
    setSelectedClient(null)
    setParticipantNotes("")
    setNewClientData({ name: "", phone: "" })
    setPhonePrefix('+34')
    setPhoneNumber('')
    setTaxId('')
    onClose()
  }

  const remainingSlots = maxParticipants - currentParticipants.length

  const getMatchIcon = (matchType: string) => {
    switch (matchType) {
      case "phone":
        return <Phone className="h-4 w-4 text-blue-500" />
      case "email":
        return <Mail className="h-4 w-4 text-green-500" />
      default:
        return <User className="h-4 w-4 text-purple-500" />
    }
  }

  // Si no hay usuario autenticado, no mostrar el modal
  if (!user || !userProfile) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[800px] h-[700px] max-w-[90vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Añadir Participante
            {activityName && <span className="text-sm font-normal text-gray-600">- {activityName}</span>}
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {currentParticipants.length} / {maxParticipants} participantes
            </div>
            <Badge variant={remainingSlots > 0 ? "outline" : "destructive"}>
              {remainingSlots > 0 ? `${remainingSlots} cupos disponibles` : "Capacidad completa"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Buscador */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4" />
              Buscar cliente
            </Label>
            <div className="relative">
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={searchTerm}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                onFocus={() => searchTerm && searchClients(searchTerm)}
                className={`pl-10 ${selectedClient ? "border-green-500" : ""}`}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
              {selectedClient && !searching && (
                <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
              )}
            </div>

            {/* Lista de coincidencias */}
            {showMatches && clientMatches.length > 0 && (
              <div className="relative z-50">
                <div className="absolute top-0 left-0 right-0 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {clientMatches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b last:border-b-0 flex items-center gap-2"
                      onClick={() => selectClient(match)}
                    >
                      {getMatchIcon(match.matchType)}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{match.name}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {match.phone && formatPhoneNumber(match.phone)}
                          {match.email && ` • ${match.email}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cliente seleccionado */}
          {selectedClient && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-800">
                <strong>Cliente existente:</strong> {selectedClient.name}
                <br />
                <span className="text-sm">
                  {selectedClient.phone && `Teléfono: ${formatPhoneNumber(selectedClient.phone)}`}
                  {selectedClient.email && ` • Email: ${selectedClient.email}`}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Advertencia si es cliente nuevo */}
          {!selectedClient && searchTerm && !searching && clientMatches.length === 0 && searchTerm.length >= 2 && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-blue-800">
                <strong>Cliente nuevo</strong>
                <br />
                <span className="text-sm">Se creará un nuevo cliente con estos datos.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Botón para añadir cliente existente */}
          {selectedClient && (
            <Button
              onClick={handleAddExistingClient}
              disabled={loading || remainingSlots <= 0}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Añadir {selectedClient.name}
            </Button>
          )}

          {/* Separador */}
          {selectedClient && searchTerm && <Separator />}

          {/* Formulario para nuevo cliente */}
          {searchTerm && searchTerm.length >= 2 && remainingSlots > 0 && !selectedClient && (
            <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-blue-600" />
                <Label className="text-sm font-medium text-blue-800">Crear nuevo cliente</Label>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="new-name">Nombre completo *</Label>
                  <Input
                    id="new-name"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre y apellidos"
                  />
                </div>

                {/* Campo de teléfono con selector de prefijo */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-4 w-4" />
                    Teléfono *
                  </Label>
                  <div className="flex gap-2">
                    <Select value={phonePrefix} onValueChange={handlePhonePrefixChange}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHONE_PREFIXES.map((prefix) => (
                          <SelectItem key={prefix.code} value={prefix.code}>
                            <div className="flex items-center gap-2">
                              <span>{prefix.flag}</span>
                              <span>{prefix.code}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      placeholder="612345678"
                      required
                      className="flex-1"
                    />
                  </div>
                  {phonePrefix && phoneNumber && (
                    <p className="text-sm text-gray-600">
                      Teléfono completo: <strong>{phonePrefix}{phoneNumber}</strong>
                    </p>
                  )}
                </div>

                {/* Campo NIF - AHORA OBLIGATORIO */}
                <div className="space-y-2">
                  <Label htmlFor="taxId" className="flex items-center gap-2 text-sm font-medium">
                    <CreditCard className="h-4 w-4" />
                    NIF/CIF *
                  </Label>
                  <Input
                    id="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="12345678A o B12345678"
                    className="w-full"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Introduce el NIF para personas físicas o CIF para empresas
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCreateAndAddClient}
                disabled={loading || !newClientData.name.trim() || !phoneNumber.trim() || !taxId.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crear y Añadir Nuevo Cliente
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Notas */}
          {(selectedClient || (searchTerm && searchTerm.length >= 2)) && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notas del participante (opcional)</Label>
              <Textarea
                id="notes"
                value={participantNotes}
                onChange={(e) => setParticipantNotes(e.target.value)}
                placeholder="Notas específicas para este participante..."
                rows={2}
              />
            </div>
          )}

          {/* Estado vacío */}
          {!searching && !selectedClient && !searchTerm && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Busca clientes para añadir</p>
              <p className="text-sm">Escribe nombre, teléfono o email</p>
            </div>
          )}

          {!searching && !selectedClient && searchTerm && searchTerm.length < 2 && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Escribe al menos 2 caracteres</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
