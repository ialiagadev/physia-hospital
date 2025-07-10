"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Search, CheckCircle, UserPlus, X, Phone, User, Loader2, AlertCircle, Info } from "lucide-react"
import { useClients } from "@/hooks/use-clients"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"

interface Participant {
  id?: number
  name: string
  phone: string
  isExisting: boolean
}

interface ClientMatch {
  id: number
  name: string
  phone: string
  matchType: "phone" | "name"
}

interface GroupActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (participants: Participant[], maxParticipants: number) => void
  initialParticipants?: Participant[]
  initialMaxParticipants?: number
}

export function GroupActivityModal({
  isOpen,
  onClose,
  onConfirm,
  initialParticipants = [],
  initialMaxParticipants = 10,
}: GroupActivityModalProps) {
  const { userProfile } = useAuth()
  const organizationId = userProfile?.organization_id ? Number(userProfile.organization_id) : undefined
  const { clients } = useClients(organizationId)

  // Estados
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants)
  const [maxParticipants, setMaxParticipants] = useState(initialMaxParticipants)
  const [searchTerm, setSearchTerm] = useState("")
  const [clientMatches, setClientMatches] = useState<ClientMatch[]>([])
  const [showMatches, setShowMatches] = useState(false)
  const [searchingClients, setSearchingClients] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Refs
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Función para buscar clientes
  const searchClients = useCallback(
    async (term: string) => {
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

        // Buscar por teléfono
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

        // Buscar por nombre
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
    },
    [organizationId],
  )

  // Handler para cambio en búsqueda
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchTerm(value)

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      searchTimeoutRef.current = setTimeout(() => {
        searchClients(value)
      }, 300)
    },
    [searchClients],
  )

  // Añadir participante
  const addParticipant = useCallback((participant: Participant) => {
    setParticipants((prev) => {
      // Evitar duplicados por teléfono
      if (prev.find((p) => p.phone === participant.phone)) {
        return prev
      }
      return [...prev, participant]
    })
    setSearchTerm("")
    setClientMatches([])
    setShowMatches(false)
  }, [])

  // Seleccionar cliente existente
  const selectClient = useCallback(
    (client: ClientMatch) => {
      addParticipant({
        id: client.id,
        name: client.name,
        phone: client.phone,
        isExisting: true,
      })
    },
    [addParticipant],
  )

  // Remover participante
  const removeParticipant = useCallback((index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Handler para blur en búsqueda (crear cliente nuevo)
  const handleSearchBlur = useCallback(() => {
    if (searchTerm.trim() && !searchingClients && clientMatches.length === 0) {
      // Si hay texto pero no hay coincidencias, crear participante nuevo
      const trimmedTerm = searchTerm.trim()

      // Intentar extraer nombre y teléfono del texto
      const phoneDigits = trimmedTerm.replace(/\D/g, "")

      if (phoneDigits.length >= 9) {
        // Si parece un teléfono, usarlo como teléfono
        addParticipant({
          name: `Cliente ${phoneDigits.slice(-4)}`, // Nombre temporal
          phone: phoneDigits,
          isExisting: false,
        })
      } else {
        // Si no parece teléfono, usarlo como nombre
        addParticipant({
          name: trimmedTerm,
          phone: "",
          isExisting: false,
        })
      }
    }
    setTimeout(() => setShowMatches(false), 200)
  }, [searchTerm, searchingClients, clientMatches.length, addParticipant])

  // Validar y confirmar
  const handleConfirm = useCallback(() => {
    const newErrors: { [key: string]: string } = {}

    if (participants.length === 0) {
      newErrors.participants = "Debes añadir al menos un participante"
    }

    if (participants.length > maxParticipants) {
      newErrors.participants = `No puedes exceder el aforo máximo de ${maxParticipants} participantes`
    }

    if (maxParticipants < 2) {
      newErrors.maxParticipants = "El aforo mínimo para actividades grupales es 2"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onConfirm(participants, maxParticipants)
    onClose()
  }, [participants, maxParticipants, onConfirm, onClose])

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Filtrar clientes ya añadidos
  const availableMatches = clientMatches.filter((match) => !participants.find((p) => p.phone === match.phone))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-full max-w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Configurar Actividad Grupal
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4">
          {/* Configuración de aforo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-shrink-0">
            <Label htmlFor="maxParticipants" className="text-sm font-medium mb-2 block">
              Aforo máximo
            </Label>
            <Input
              id="maxParticipants"
              type="number"
              min="2"
              max="100"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number.parseInt(e.target.value) || 10)}
              className="w-32"
            />
            {errors.maxParticipants && <p className="text-sm text-red-600 mt-1">{errors.maxParticipants}</p>}
            <p className="text-xs text-blue-600 mt-1">
              Especifica cuántas personas pueden participar en esta actividad
            </p>
          </div>

          {/* Lista de participantes */}
          {participants.length > 0 && (
            <div className="space-y-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Participantes ({participants.length}/{maxParticipants})
                </Label>
                {participants.length >= maxParticipants && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    Aforo completo
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-48 w-full border rounded-md">
                <div className="space-y-2 p-2">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {participant.isExisting ? (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <UserPlus className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{participant.name}</div>
                          {participant.phone && (
                            <div className="text-sm text-gray-500 truncate flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {participant.phone}
                            </div>
                          )}
                          {!participant.isExisting && <div className="text-xs text-blue-600">Cliente nuevo</div>}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParticipant(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {errors.participants && <p className="text-sm text-red-600">{errors.participants}</p>}
            </div>
          )}

          {/* Búsqueda de participantes */}
          <div className="space-y-2 flex-shrink-0">
            <Label htmlFor="searchParticipants" className="flex items-center gap-2 text-sm font-medium">
              <Search className="h-4 w-4" />
              Añadir participantes
            </Label>

            <div className="relative">
              <Input
                id="searchParticipants"
                value={searchTerm}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                onFocus={() => searchTerm && searchClients(searchTerm)}
                placeholder="Buscar por nombre o teléfono, o escribe para crear nuevo..."
                className="w-full"
                disabled={participants.length >= maxParticipants}
              />
              {searchingClients && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>

            {participants.length >= maxParticipants && (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Has alcanzado el aforo máximo de participantes
              </p>
            )}

            {/* Lista de coincidencias */}
            {showMatches && availableMatches.length > 0 && participants.length < maxParticipants && (
              <div className="relative z-50">
                <div className="absolute top-0 left-0 right-0 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {availableMatches.map((match) => (
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
                      <Badge variant="outline" className="text-xs">
                        Cliente existente
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Información de ayuda */}
          <Alert className="border-blue-200 bg-blue-50 flex-shrink-0">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-blue-800">
              <div className="space-y-1 text-sm">
                <p>
                  <strong>💡 Consejos:</strong>
                </p>
                <p>• Busca clientes existentes por nombre o teléfono</p>
                <p>• Si no encuentras coincidencias, se creará un cliente nuevo automáticamente</p>
                <p>• Los clientes con ✓ ya existen, los con + son nuevos</p>
                <p>• Puedes mezclar clientes existentes con nuevos participantes</p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between items-center px-6 py-4 border-t flex-shrink-0">
          <div className="text-sm text-gray-600">
            {participants.length > 0 && (
              <span>
                {participants.filter((p) => p.isExisting).length} existentes,{" "}
                {participants.filter((p) => !p.isExisting).length} nuevos
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={participants.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirmar ({participants.length} participantes)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
