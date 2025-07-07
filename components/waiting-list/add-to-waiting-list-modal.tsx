"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Search, User, Clock, CalendarIcon as CalendarIconLucide } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useWaitingListData } from "@/hooks/use-waiting-list-data"
import type { CreateWaitingListEntry } from "@/hooks/use-waiting-list"

interface AddToWaitingListModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (entry: CreateWaitingListEntry) => Promise<boolean>
  organizationId: number
}

export function AddToWaitingListModal({ isOpen, onClose, onSubmit, organizationId }: AddToWaitingListModalProps) {
  const { professionals, services, searchClients, loading } = useWaitingListData(organizationId)

  const [formData, setFormData] = useState<CreateWaitingListEntry>({
    client_id: 0,
    professional_id: null,
    service_id: 0,
    preferred_date_start: format(new Date(), "yyyy-MM-dd"),
    preferred_date_end: null,
    preferred_time_preference: "any",
    notes: null,
  })

  const [clientSearch, setClientSearch] = useState("")
  const [clientResults, setClientResults] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showClientResults, setShowClientResults] = useState(false)
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const handleClientSearch = async (query: string) => {
    setClientSearch(query)
    if (query.length >= 2) {
      const results = await searchClients(query)
      setClientResults(results)
      setShowClientResults(true)
    } else {
      setClientResults([])
      setShowClientResults(false)
    }
  }

  const handleClientSelect = (client: any) => {
    setSelectedClient(client)
    setClientSearch(client.name)
    setFormData((prev) => ({ ...prev, client_id: client.id }))
    setShowClientResults(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedClient || !formData.service_id) {
      return
    }

    setSubmitting(true)

    const success = await onSubmit({
      ...formData,
      preferred_date_start: format(startDate, "yyyy-MM-dd"),
      preferred_date_end: endDate ? format(endDate, "yyyy-MM-dd") : null,
    })

    if (success) {
      handleClose()
    }

    setSubmitting(false)
  }

  const handleClose = () => {
    setFormData({
      client_id: 0,
      professional_id: null,
      service_id: 0,
      preferred_date_start: format(new Date(), "yyyy-MM-dd"),
      preferred_date_end: null,
      preferred_time_preference: "any",
      notes: null,
    })
    setClientSearch("")
    setSelectedClient(null)
    setClientResults([])
    setShowClientResults(false)
    setStartDate(new Date())
    setEndDate(undefined)
    onClose()
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
          {/* Búsqueda de Cliente */}
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="client"
                  placeholder="Buscar cliente por nombre..."
                  value={clientSearch}
                  onChange={(e) => handleClientSearch(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>

              {showClientResults && clientResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {clientResults.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleClientSelect(client)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">{client.name}</div>
                      {client.phone && <div className="text-sm text-gray-500">{client.phone}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">{selectedClient.name}</span>
                </div>
                {selectedClient.phone && <div className="text-sm text-green-600 mt-1">{selectedClient.phone}</div>}
              </div>
            )}
          </div>

          {/* Profesional */}
          <div className="space-y-2">
            <Label htmlFor="professional">Profesional</Label>
            <Select
              value={formData.professional_id || "any"}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  professional_id: value === "any" ? null : value,
                }))
              }
            >
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

          {/* Servicio */}
          <div className="space-y-2">
            <Label htmlFor="service">Servicio *</Label>
            <Select
              value={formData.service_id.toString()}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, service_id: Number.parseInt(value) }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: service.color }} />
                      <span>{service.name}</span>
                      <span className="text-sm text-muted-foreground">({service.duration} min)</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fechas Preferidas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Disponible desde *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Disponible hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: es }) : "Sin límite"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedClient || !formData.service_id || submitting}>
              {submitting ? "Añadiendo..." : "Añadir a Lista"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
