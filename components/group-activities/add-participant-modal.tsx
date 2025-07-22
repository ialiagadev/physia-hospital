"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Search, Phone, User, UserPlus, Users, Mail, Loader2, CheckCircle, AlertTriangle } from "lucide-react"
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
    email: "",
  })

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
          phone: searchTerm,
          email: "",
        })
      } else if (searchTerm.includes("@")) {
        // Si contiene @, asumir que es email
        setNewClientData({
          name: "",
          phone: "",
          email: searchTerm,
        })
      } else {
        // Si no, asumir que es nombre
        setNewClientData({
          name: searchTerm,
          phone: "",
          email: "",
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

    if (!newClientData.phone.trim()) {
      toast.error("El teléfono es obligatorio")
      return
    }

    // Validar formato del teléfono
    if (!isValidPhoneNumber(newClientData.phone)) {
      toast.error("El formato del teléfono no es válido")
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
        phone: normalizePhoneNumber(newClientData.phone),
        email: newClientData.email.trim() || null,
        organization_id: orgId,
      }

      const { data: newClient, error } = await supabase.from("clients").insert([clientData]).select().single()

      if (error) {
        throw error
      }

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
    setNewClientData({ name: "", phone: "", email: "" })
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
            <div className="space-y-3">
              <Label className="text-blue-600 font-medium">Crear nuevo cliente</Label>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="new-name">Nombre completo *</Label>
                  <Input
                    id="new-name"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre y apellidos"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="new-phone">Teléfono *</Label>
                    <Input
                      id="new-phone"
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Teléfono"
                      required
                    />
                    {newClientData.phone && (
                      <p className="text-xs text-gray-600 mt-1">Formato: {formatPhoneNumber(newClientData.phone)}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="new-email">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="Email"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCreateAndAddClient}
                disabled={loading || !newClientData.name.trim() || !newClientData.phone.trim()}
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
