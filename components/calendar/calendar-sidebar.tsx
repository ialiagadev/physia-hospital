"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Activity, UserPlus, ClipboardList } from "lucide-react"
import type { AppointmentWithDetails } from "@/types/calendar"

interface CalendarSidebarProps {
  selectedDate: Date
  selectedCita: AppointmentWithDetails | null
  showDetails: boolean
  profesionales: Array<{
    id: number
    nombre: string
    especialidad: string
    color: string
  }>
  profesionalesSeleccionados: number[]
  citaParaSeguimiento: any | null
  onAddCita: (cita: any) => void
  onUpdateCita: (cita: any) => void
  onCloseDetails: () => void
  onRegistrarSeguimiento: (cita: any) => void
  onProfesionalesChange: (profesionales: number[]) => void
  onToggleAllProfesionales: () => void
}

export function CalendarSidebar({
  selectedDate,
  selectedCita,
  showDetails,
  profesionales,
  profesionalesSeleccionados,
  citaParaSeguimiento,
  onAddCita,
  onUpdateCita,
  onCloseDetails,
  onRegistrarSeguimiento,
  onProfesionalesChange,
  onToggleAllProfesionales,
}: CalendarSidebarProps) {
  return (
    <div className="w-80 border-l bg-gray-50/50 p-4 space-y-4 overflow-y-auto">
      {/* Formulario de cita rápida */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Cita Rápida
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-gray-600">Fecha seleccionada: {selectedDate.toLocaleDateString("es-ES")}</div>
          <Button
            size="sm"
            className="w-full"
            onClick={() =>
              onAddCita({
                fecha: selectedDate,
                hora: "09:00",
                duracion: 30,
                nombrePaciente: "",
                apellidosPaciente: "",
                telefonoPaciente: "",
                estado: "confirmada",
                notas: "",
              })
            }
          >
            Nueva Cita
          </Button>
        </CardContent>
      </Card>

      {/* Leyenda de Profesionales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Profesionales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {profesionales.map((prof) => (
              <div key={prof.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`prof-${prof.id}`}
                  checked={profesionalesSeleccionados.includes(prof.id)}
                  onChange={() => onProfesionalesChange([prof.id])}
                  className="rounded"
                />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prof.color }} />
                <label htmlFor={`prof-${prof.id}`} className="text-xs cursor-pointer flex-1">
                  {prof.nombre}
                </label>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs bg-transparent"
            onClick={onToggleAllProfesionales}
          >
            {profesionalesSeleccionados.length === profesionales.length ? "Deseleccionar todos" : "Seleccionar todos"}
          </Button>
        </CardContent>
      </Card>

      {/* Estados de Citas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Estados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              Confirmada
            </Badge>
            <span className="text-xs text-gray-600">✅</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Pendiente
            </Badge>
            <span className="text-xs text-gray-600">⏳</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              Cancelada
            </Badge>
            <span className="text-xs text-gray-600">❌</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Completada
            </Badge>
            <span className="text-xs text-gray-600">✅</span>
          </div>
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start text-xs bg-transparent">
            <UserPlus className="h-3 w-3 mr-2" />
            Agregar Paciente
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs bg-transparent">
            <Calendar className="h-3 w-3 mr-2" />
            Ver Agenda Completa
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs bg-transparent">
            <Activity className="h-3 w-3 mr-2" />
            Seguimiento Pacientes
          </Button>
        </CardContent>
      </Card>

      {/* Estadísticas del día */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Resumen del Día</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Total citas:</span>
            <span className="font-medium">0</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Confirmadas:</span>
            <span className="font-medium text-green-600">0</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Pendientes:</span>
            <span className="font-medium text-yellow-600">0</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Canceladas:</span>
            <span className="font-medium text-red-600">0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
