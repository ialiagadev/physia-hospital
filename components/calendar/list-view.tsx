"use client"

import { useState, useMemo } from "react"
import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import { es } from "date-fns/locale"
import { Search, Calendar, Clock, User, Phone, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { Cita, Profesional } from "@/types/calendar-types"

interface ListViewProps {
  citas: Cita[]
  profesionales?: Profesional[] // ahora opcional
  onSelectCita: (cita: Cita) => void
  profesionalesSeleccionados?: number[] // now optional
}

const estadoLabels = {
  confirmada: "Confirmada",
  pendiente: "Pendiente",
  cancelada: "Cancelada",
  completada: "Completada",
  no_show: "No se presentó",
}

const estadoColors = {
  confirmada: "bg-green-100 text-green-800",
  pendiente: "bg-yellow-100 text-yellow-800",
  cancelada: "bg-red-100 text-red-800",
  completada: "bg-blue-100 text-blue-800",
  no_show: "bg-gray-100 text-gray-800",
}

const tipoLabels = {
  Consulta: "Consulta",
  Revisión: "Revisión",
  Urgencia: "Urgencia",
  Seguimiento: "Seguimiento",
  "Cirugía menor": "Cirugía menor",
  Vacunación: "Vacunación",
}

export function ListView({ citas, profesionales, onSelectCita, profesionalesSeleccionados }: ListViewProps) {
  // Fallback to empty array if the prop isn't provided
  const selProfesionales = profesionalesSeleccionados ?? []
  const profs = profesionales ?? []
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEstados, setSelectedEstados] = useState<string[]>(["confirmada", "pendiente"])
  const [selectedTipos, setSelectedTipos] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"fecha" | "paciente" | "profesional">("fecha")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Filtrar y ordenar citas
  const citasFiltradas = useMemo(() => {
    const filtered = citas.filter((cita) => {
      // Filtro por profesionales seleccionados (si se envían)
      if (selProfesionales.length && !selProfesionales.includes(cita.profesionalId)) return false

      // Filtro por búsqueda
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch =
          cita.nombrePaciente.toLowerCase().includes(searchLower) ||
          (cita.apellidosPaciente && cita.apellidosPaciente.toLowerCase().includes(searchLower)) ||
          (cita.telefonoPaciente && cita.telefonoPaciente.includes(searchTerm)) ||
          cita.tipo.toLowerCase().includes(searchLower)

        if (!matchesSearch) return false
      }

      // Filtro por estados
      if (selectedEstados.length > 0 && !selectedEstados.includes(cita.estado)) return false

      // Filtro por tipos
      if (selectedTipos.length > 0 && !selectedTipos.includes(cita.tipo)) return false

      return true
    })

    // Ordenar
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "fecha":
          const dateCompare =
            (typeof a.fecha === "string" ? new Date(a.fecha) : a.fecha).getTime() -
            (typeof b.fecha === "string" ? new Date(b.fecha) : b.fecha).getTime()
          if (comparison === 0) {
            comparison = a.hora.localeCompare(b.hora)
          }
          break
        case "paciente":
          comparison = a.nombrePaciente.localeCompare(b.nombrePaciente)
          break
        case "profesional":
          const profA = profs.find((p) => p.id === a.profesionalId)?.nombre || ""
          const profB = profs.find((p) => p.id === b.profesionalId)?.nombre || ""
          comparison = profA.localeCompare(profB)
          break
      }

      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [citas, selProfesionales, searchTerm, selectedEstados, selectedTipos, sortBy, sortOrder, profs])

  // Agrupar citas por fecha
  const citasAgrupadas = useMemo(() => {
    const grupos: { [key: string]: Cita[] } = {}

    citasFiltradas.forEach((cita) => {
      const fechaKey = format(cita.fecha, "yyyy-MM-dd")
      if (!grupos[fechaKey]) {
        grupos[fechaKey] = []
      }
      grupos[fechaKey].push(cita)
    })

    return grupos
  }, [citasFiltradas])

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString)
    if (isToday(date)) return "Hoy"
    if (isTomorrow(date)) return "Mañana"
    if (isYesterday(date)) return "Ayer"
    return format(date, "EEEE, d MMMM yyyy", { locale: es })
  }

  const getProfesionalInfo = (profesionalId: number) => {
    return profs.find((p) => p.id === profesionalId)
  }

  const handleEstadoToggle = (estado: string) => {
    setSelectedEstados((prev) => (prev.includes(estado) ? prev.filter((e) => e !== estado) : [...prev, estado]))
  }

  const handleTipoToggle = (tipo: string) => {
    setSelectedTipos((prev) => (prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]))
  }

  return (
    <div className="h-full flex flex-col">
      {/* Barra de filtros */}
      <div className="border-b p-4 space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por paciente, teléfono o tipo de cita..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Filtro por estado */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Estados:</span>
            {Object.entries(estadoLabels).map(([estado, label]) => (
              <div key={estado} className="flex items-center space-x-1">
                <Checkbox
                  id={`estado-${estado}`}
                  checked={selectedEstados.includes(estado)}
                  onCheckedChange={() => handleEstadoToggle(estado)}
                />
                <label htmlFor={`estado-${estado}`} className="text-sm cursor-pointer">
                  {label}
                </label>
              </div>
            ))}
          </div>

          {/* Filtro por tipo */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Tipos:</span>
            <Select
              value={selectedTipos.length > 0 ? selectedTipos[0] : ""}
              onValueChange={(value) => setSelectedTipos(value ? [value] : [])}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(tipoLabels).map(([tipo, label]) => (
                  <SelectItem key={tipo} value={tipo}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ordenar */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Ordenar:</span>
            <Select value={sortBy} onValueChange={(value: "fecha" | "paciente" | "profesional") => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fecha">Fecha</SelectItem>
                <SelectItem value="paciente">Paciente</SelectItem>
                <SelectItem value="profesional">Profesional</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de citas */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-6">
          {Object.entries(citasAgrupadas).map(([fechaKey, citasDelDia]) => (
            <div key={fechaKey} className="space-y-3">
              <h3 className="text-lg font-semibold capitalize sticky top-0 bg-white py-2 border-b">
                {getDateLabel(fechaKey)}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({citasDelDia.length} cita{citasDelDia.length !== 1 ? "s" : ""})
                </span>
              </h3>

              <div className="space-y-2">
                {citasDelDia.map((cita) => {
                  const profesional = getProfesionalInfo(cita.profesionalId)

                  return (
                    <Card
                      key={cita.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onSelectCita(cita)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            {/* Línea 1: Paciente y estado */}
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-lg">
                                {cita.nombrePaciente} {cita.apellidosPaciente}
                              </h4>
                              <Badge className={estadoColors[cita.estado]}>{estadoLabels[cita.estado]}</Badge>
                            </div>

                            {/* Línea 2: Información básica */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {cita.hora} - {cita.horaFin || "N/A"} ({cita.duracion} min)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>
                                    {profesional?.name} - {profesional?.settings?.specialty || "Sin especialidad"}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                {cita.telefonoPaciente && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    <span>{cita.telefonoPaciente}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{cita.tipo}</span>
                                </div>
                              </div>
                            </div>

                            {/* Línea 3: Notas si existen */}
                            {cita.notas && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-gray-600">
                                  <strong>Notas:</strong> {cita.notas}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}

          {Object.keys(citasAgrupadas).length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron citas</h3>
              <p className="text-gray-500">
                {searchTerm || selectedEstados.length > 0 || selectedTipos.length > 0
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "No hay citas programadas"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
