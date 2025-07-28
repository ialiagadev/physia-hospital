"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Users, Plus, Search, Filter, Calendar, Clock, Phone, Trash2, CalendarPlus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useWaitingList } from "@/hooks/use-waiting-list"
import { useWaitingListData } from "@/hooks/use-waiting-list-data"
import { AddToWaitingListModal } from "./add-to-waiting-list-modal"

interface WaitingListViewProps {
  organizationId: number
  onScheduleAppointment?: (entry: any) => Promise<boolean>
}

export function WaitingListView({ organizationId, onScheduleAppointment }: WaitingListViewProps) {
  const { entries, loading, addToWaitingList, removeFromWaitingList, getDaysWaiting, getTimePreferenceLabel } =
    useWaitingList(organizationId)

  const { professionals, services } = useWaitingListData(organizationId)

  const [showAddModal, setShowAddModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [professionalFilter, setProfessionalFilter] = useState("all")
  const [serviceFilter, setServiceFilter] = useState("all")

  // Filtrar entradas
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch = entry.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProfessional =
      professionalFilter === "all" ||
      (professionalFilter === "any" && !entry.professional_id) ||
      entry.professional_id === professionalFilter
    const matchesService = serviceFilter === "all" || entry.service_id.toString() === serviceFilter

    return matchesSearch && matchesProfessional && matchesService
  })

  const handleScheduleAppointment = async (entry: any) => {
    if (onScheduleAppointment) {
      // Call the parent's schedule appointment function
      const success = await onScheduleAppointment(entry)

      // If the appointment was scheduled successfully, refresh the waiting list
      if (success) {
        // Remove the entry from waiting list since it was scheduled
        await removeFromWaitingList(entry.id)
      }
    }
  }

  const handleRemoveEntry = async (entryId: number) => {
    await removeFromWaitingList(entryId)
  }

  const getStatusBadge = (entry: any) => {
    const daysWaiting = getDaysWaiting(entry.created_at)

    if (daysWaiting >= 7) {
      return <Badge variant="destructive">Urgente ({daysWaiting} días)</Badge>
    } else if (daysWaiting >= 3) {
      return <Badge variant="secondary">Pendiente ({daysWaiting} días)</Badge>
    } else {
      return <Badge variant="outline">Reciente ({daysWaiting} días)</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando lista de espera...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Lista de Espera</h2>
            <p className="text-muted-foreground">
              {entries.length} {entries.length === 1 ? "paciente esperando" : "pacientes esperando"}
            </p>
          </div>
        </div>

        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Añadir a Lista
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por Profesional */}
            <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los profesionales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los profesionales</SelectItem>
                <SelectItem value="any">Cualquier profesional</SelectItem>
                {professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por Servicio */}
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los servicios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los servicios</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Espera */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {entries.length === 0 ? "No hay pacientes en lista de espera" : "No se encontraron resultados"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {entries.length === 0
                  ? "Cuando no haya citas disponibles, puedes añadir pacientes a la lista de espera."
                  : "Intenta ajustar los filtros para encontrar lo que buscas."}
              </p>
              {entries.length === 0 && (
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Añadir Primer Paciente
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Profesional</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fechas Disponibles</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{entry.client_name}</div>
                      {entry.client_phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {entry.client_phone}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>{entry.professional_name || <Badge variant="outline">Cualquiera</Badge>}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.service_color }} />
                      <div>
                        <div className="font-medium">{entry.service_name}</div>
                        <div className="text-sm text-muted-foreground">{entry.service_duration} min</div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      <span>Desde {format(new Date(entry.preferred_date_start), "dd/MM/yyyy", { locale: es })}</span>
                    </div>
                    {entry.preferred_date_end && (
                      <div className="text-xs text-muted-foreground">
                        Hasta {format(new Date(entry.preferred_date_end), "dd/MM/yyyy", { locale: es })}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getTimePreferenceLabel(entry.preferred_time_preference)}
                    </div>
                  </TableCell>

                  <TableCell>{getStatusBadge(entry)}</TableCell>

                  <TableCell>
                    {entry.notes && (
                      <div className="text-sm text-muted-foreground max-w-32 truncate" title={entry.notes}>
                        {entry.notes}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" onClick={() => handleScheduleAppointment(entry)} className="gap-1">
                        <CalendarPlus className="h-3 w-3" />
                        Programar
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1 bg-transparent">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar de la lista?</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Estás seguro de que quieres eliminar a {entry.client_name} de la lista de espera? Esta
                              acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveEntry(entry.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal para añadir */}
      <AddToWaitingListModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={addToWaitingList}
        organizationId={organizationId}
      />
    </div>
  )
}
