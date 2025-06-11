"use client"

import React, { useState, useRef, useCallback, useMemo } from "react"
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  parseISO,
  addMinutes,
} from "date-fns"
import { es } from "date-fns/locale"
import { v4 as uuidv4 } from "uuid"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Icons
import {
  Clock,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Settings,
  Search,
  MapPin,
  Edit,
  Trash2,
  Copy,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Stethoscope,
} from "lucide-react"

// UI Components (you'll need to install these from shadcn/ui)
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import type { TipoCita, EstadoCita } from "@/types/citas"

// Types
interface Profesional {
  id: string
  nombre: string
  especialidad: string
  color: string
  activo: boolean
  horarios: HorarioProfesional[]
  avatar?: string
}

interface HorarioProfesional {
  dia: number // 0 = domingo, 1 = lunes, etc.
  horaInicio: string
  horaFin: string
  activo: boolean
}

interface Paciente {
  id: string
  nombre: string
  apellidos: string
  telefono: string
  email: string
  fechaNacimiento: string
  direccion: string
  notas: string
  historialMedico: string[]
  etiquetas: string[]
}

interface Cita {
  id: string
  pacienteId: string
  profesionalId: string
  fecha: string
  horaInicio: string
  horaFin: string
  tipo: TipoCita
  estado: EstadoCita
  notas: string
  tratamiento: string
  sala: string
  precio: number
  pagado: boolean
  recordatorioEnviado: boolean
  motivoConsulta: string
  diagnostico: string
  proximaCita?: string
}

interface ConfiguracionCalendario {
  horaInicio: string
  horaFin: string
  intervaloMinutos: number
  diasTrabajo: number[]
  mostrarFinDeSemana: boolean
  vistaDefecto: "dia" | "semana" | "mes"
  colorTema: string
  notificaciones: boolean
  recordatoriosAutomaticos: boolean
  tiempoRecordatorio: number
}

interface DragState {
  isDragging: boolean
  draggedCita: Cita | null
  dragOffset: { x: number; y: number }
  dropZone: { profesionalId: string; fecha: string; hora: string } | null
}

// Default data
const defaultProfesionales: Profesional[] = [
  {
    id: "1",
    nombre: "Dr. Juan Pérez",
    especialidad: "Fisioterapia General",
    color: "#3B82F6",
    activo: true,
    horarios: [
      { dia: 1, horaInicio: "08:00", horaFin: "16:00", activo: true },
      { dia: 2, horaInicio: "08:00", horaFin: "16:00", activo: true },
      { dia: 3, horaInicio: "08:00", horaFin: "16:00", activo: true },
      { dia: 4, horaInicio: "08:00", horaFin: "16:00", activo: true },
      { dia: 5, horaInicio: "08:00", horaFin: "14:00", activo: true },
    ],
  },
  {
    id: "2",
    nombre: "Dra. María García",
    especialidad: "Fisioterapia Deportiva",
    color: "#10B981",
    activo: true,
    horarios: [
      { dia: 1, horaInicio: "09:00", horaFin: "17:00", activo: true },
      { dia: 2, horaInicio: "09:00", horaFin: "17:00", activo: true },
      { dia: 3, horaInicio: "09:00", horaFin: "17:00", activo: true },
      { dia: 4, horaInicio: "09:00", horaFin: "17:00", activo: true },
      { dia: 5, horaInicio: "09:00", horaFin: "15:00", activo: true },
    ],
  },
  {
    id: "3",
    nombre: "Dr. Carlos López",
    especialidad: "Rehabilitación",
    color: "#F59E0B",
    activo: true,
    horarios: [
      { dia: 1, horaInicio: "10:00", horaFin: "18:00", activo: true },
      { dia: 2, horaInicio: "10:00", horaFin: "18:00", activo: true },
      { dia: 3, horaInicio: "10:00", horaFin: "18:00", activo: true },
      { dia: 4, horaInicio: "10:00", horaFin: "18:00", activo: true },
      { dia: 5, horaInicio: "10:00", horaFin: "16:00", activo: true },
    ],
  },
]

const defaultPacientes: Paciente[] = [
  {
    id: "1",
    nombre: "Ana",
    apellidos: "Martínez González",
    telefono: "+34 666 123 456",
    email: "ana.martinez@email.com",
    fechaNacimiento: "1985-03-15",
    direccion: "Calle Mayor 123, Madrid",
    notas: "Paciente regular, muy puntual",
    historialMedico: ["Lesión lumbar 2023", "Rehabilitación rodilla 2022"],
    etiquetas: ["VIP", "Deportista"],
  },
  {
    id: "2",
    nombre: "Pedro",
    apellidos: "Sánchez Ruiz",
    telefono: "+34 677 234 567",
    email: "pedro.sanchez@email.com",
    fechaNacimiento: "1978-07-22",
    direccion: "Avenida de la Paz 45, Barcelona",
    notas: "Requiere seguimiento especial",
    historialMedico: ["Fractura brazo 2023", "Fisioterapia hombro 2022"],
    etiquetas: ["Seguimiento"],
  },
]

const defaultCitas: Cita[] = [
  {
    id: "1",
    pacienteId: "1",
    profesionalId: "1",
    fecha: format(new Date(), "yyyy-MM-dd"),
    horaInicio: "10:00",
    horaFin: "11:00",
    tipo: "consulta",
    estado: "programada",
    notas: "Primera consulta",
    tratamiento: "Evaluación inicial",
    sala: "Sala 1",
    precio: 60,
    pagado: false,
    recordatorioEnviado: false,
    motivoConsulta: "Dolor lumbar",
    diagnostico: "",
  },
  {
    id: "2",
    pacienteId: "2",
    profesionalId: "2",
    fecha: format(addDays(new Date(), 1), "yyyy-MM-dd"),
    horaInicio: "14:00",
    horaFin: "15:00",
    tipo: "seguimiento",
    estado: "confirmada",
    notas: "Revisión semanal",
    tratamiento: "Ejercicios de rehabilitación",
    sala: "Sala 2",
    precio: 45,
    pagado: true,
    recordatorioEnviado: true,
    motivoConsulta: "Seguimiento rehabilitación",
    diagnostico: "Evolución favorable",
  },
]

const defaultConfiguracion: ConfiguracionCalendario = {
  horaInicio: "08:00",
  horaFin: "20:00",
  intervaloMinutos: 30,
  diasTrabajo: [1, 2, 3, 4, 5],
  mostrarFinDeSemana: false,
  vistaDefecto: "semana",
  colorTema: "#3B82F6",
  notificaciones: true,
  recordatoriosAutomaticos: true,
  tiempoRecordatorio: 24,
}

// Main Component
export default function MedicalCalendar() {
  // States
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<"dia" | "semana" | "mes">("semana")
  const [profesionales, setProfesionales] = useState<Profesional[]>(defaultProfesionales)
  const [pacientes, setPacientes] = useState<Paciente[]>(defaultPacientes)
  const [citas, setCitas] = useState<Cita[]>(defaultCitas)
  const [configuracion, setConfiguracion] = useState<ConfiguracionCalendario>(defaultConfiguracion)
  const [filtros, setFiltros] = useState({
    profesional: "",
    estado: "",
    tipo: "",
    busqueda: "",
  })

  // Modal states
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [showPatientForm, setShowPatientForm] = useState(false)
  const [showProfessionalForm, setShowProfessionalForm] = useState(false)
  const [showConfigForm, setShowConfigForm] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Cita | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Profesional | null>(null)

  // Drag & Drop states
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedCita: null,
    dragOffset: { x: 0, y: 0 },
    dropZone: null,
  })

  // Form states
  const [appointmentForm, setAppointmentForm] = useState({
    pacienteId: "",
    profesionalId: "",
    fecha: format(selectedDate, "yyyy-MM-dd"),
    horaInicio: "",
    horaFin: "",
    tipo: "consulta" as TipoCita,
    estado: "programada" as EstadoCita,
    notas: "",
    tratamiento: "",
    sala: "",
    precio: 0,
    pagado: false,
    motivoConsulta: "",
    diagnostico: "",
  })

  const [patientForm, setPatientForm] = useState({
    nombre: "",
    apellidos: "",
    telefono: "",
    email: "",
    fechaNacimiento: "",
    direccion: "",
    notas: "",
    historialMedico: "",
    etiquetas: "",
  })

  const [professionalForm, setProfessionalForm] = useState({
    nombre: "",
    especialidad: "",
    color: "#3B82F6",
    activo: true,
    horarios: defaultProfesionales[0].horarios,
  })

  // Refs
  const calendarRef = useRef<HTMLDivElement>(null)
  const dragPreviewRef = useRef<HTMLDivElement>(null)

  // Computed values
  const citasFiltradas = useMemo(() => {
    return citas.filter((cita) => {
      const paciente = pacientes.find((p) => p.id === cita.pacienteId)
      const profesional = profesionales.find((p) => p.id === cita.profesionalId)

      if (filtros.profesional && cita.profesionalId !== filtros.profesional) return false
      if (filtros.estado && cita.estado !== filtros.estado) return false
      if (filtros.tipo && cita.tipo !== filtros.tipo) return false
      if (filtros.busqueda) {
        const busqueda = filtros.busqueda.toLowerCase()
        const nombrePaciente = `${paciente?.nombre} ${paciente?.apellidos}`.toLowerCase()
        const nombreProfesional = profesional?.nombre.toLowerCase() || ""
        if (
          !nombrePaciente.includes(busqueda) &&
          !nombreProfesional.includes(busqueda) &&
          !cita.notas.toLowerCase().includes(busqueda)
        ) {
          return false
        }
      }

      return true
    })
  }, [citas, pacientes, profesionales, filtros])

  const horasDelDia = useMemo(() => {
    const horas = []
    const inicio = Number.parseInt(configuracion.horaInicio.split(":")[0])
    const fin = Number.parseInt(configuracion.horaFin.split(":")[0])

    for (let hora = inicio; hora <= fin; hora++) {
      for (let minuto = 0; minuto < 60; minuto += configuracion.intervaloMinutos) {
        const horaStr = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`
        horas.push(horaStr)
      }
    }

    return horas
  }, [configuracion])

  const diasSemana = useMemo(() => {
    const inicio = startOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({
      start: inicio,
      end: endOfWeek(currentDate, { weekStartsOn: 1 }),
    })
  }, [currentDate])

  const diasMes = useMemo(() => {
    const inicio = startOfMonth(currentDate)
    const fin = endOfMonth(currentDate)
    return eachDayOfInterval({ start: inicio, end: fin })
  }, [currentDate])

  // Utility functions
  const getPacienteById = useCallback(
    (id: string) => {
      return pacientes.find((p) => p.id === id)
    },
    [pacientes],
  )

  const getProfesionalById = useCallback(
    (id: string) => {
      return profesionales.find((p) => p.id === id)
    },
    [profesionales],
  )

  const getCitasForDate = useCallback(
    (fecha: string, profesionalId?: string) => {
      return citasFiltradas.filter(
        (cita) => cita.fecha === fecha && (!profesionalId || cita.profesionalId === profesionalId),
      )
    },
    [citasFiltradas],
  )

  const getEstadoColor = (estado: string) => {
    const colores = {
      programada: "bg-blue-100 text-blue-800 border-blue-200",
      confirmada: "bg-green-100 text-green-800 border-green-200",
      "en-curso": "bg-yellow-100 text-yellow-800 border-yellow-200",
      completada: "bg-gray-100 text-gray-800 border-gray-200",
      cancelada: "bg-red-100 text-red-800 border-red-200",
      "no-asistio": "bg-orange-100 text-orange-800 border-orange-200",
    }
    return colores[estado as keyof typeof colores] || colores.programada
  }

  const getTipoIcon = (tipo: string) => {
    const iconos = {
      consulta: Stethoscope,
      seguimiento: Activity,
      urgencia: AlertCircle,
      revision: CheckCircle,
    }
    return iconos[tipo as keyof typeof iconos] || Stethoscope
  }

  const getEstadoIcon = (estado: string) => {
    const iconos = {
      programada: Clock,
      confirmada: CheckCircle,
      "en-curso": Activity,
      completada: CheckCircle,
      cancelada: XCircle,
      "no-asistio": AlertCircle,
    }
    return iconos[estado as keyof typeof iconos] || Clock
  }

  // Event handlers
  const handleDateChange = (direction: "prev" | "next") => {
    if (currentView === "dia") {
      setCurrentDate((prev) => (direction === "next" ? addDays(prev, 1) : addDays(prev, -1)))
    } else if (currentView === "semana") {
      setCurrentDate((prev) => (direction === "next" ? addWeeks(prev, 1) : subWeeks(prev, 1)))
    } else {
      setCurrentDate((prev) => (direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)))
    }
  }

  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !appointmentForm.pacienteId ||
      !appointmentForm.profesionalId ||
      !appointmentForm.horaInicio ||
      !appointmentForm.horaFin
    ) {
      toast.error("Por favor completa todos los campos obligatorios")
      return
    }

    const nuevaCita: Cita = {
      id: selectedAppointment?.id || uuidv4(),
      ...appointmentForm,
      recordatorioEnviado: false,
      proximaCita: undefined,
    }

    if (selectedAppointment) {
      setCitas((prev) => prev.map((cita) => (cita.id === selectedAppointment.id ? nuevaCita : cita)))
      toast.success("Cita actualizada correctamente")
    } else {
      setCitas((prev) => [...prev, nuevaCita])
      toast.success("Cita creada correctamente")
    }

    setShowAppointmentForm(false)
    setSelectedAppointment(null)
    resetAppointmentForm()
  }

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!patientForm.nombre || !patientForm.apellidos) {
      toast.error("Por favor completa el nombre y apellidos")
      return
    }

    const nuevoPaciente: Paciente = {
      id: selectedPatient?.id || uuidv4(),
      ...patientForm,
      historialMedico: patientForm.historialMedico ? patientForm.historialMedico.split(",").map((h) => h.trim()) : [],
      etiquetas: patientForm.etiquetas ? patientForm.etiquetas.split(",").map((e) => e.trim()) : [],
    }

    if (selectedPatient) {
      setPacientes((prev) => prev.map((paciente) => (paciente.id === selectedPatient.id ? nuevoPaciente : paciente)))
      toast.success("Paciente actualizado correctamente")
    } else {
      setPacientes((prev) => [...prev, nuevoPaciente])
      toast.success("Paciente creado correctamente")
    }

    setShowPatientForm(false)
    setSelectedPatient(null)
    resetPatientForm()
  }

  const handleProfessionalSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!professionalForm.nombre || !professionalForm.especialidad) {
      toast.error("Por favor completa el nombre y especialidad")
      return
    }

    const nuevoProfesional: Profesional = {
      id: selectedProfessional?.id || uuidv4(),
      ...professionalForm,
    }

    if (selectedProfessional) {
      setProfesionales((prev) => prev.map((prof) => (prof.id === selectedProfessional.id ? nuevoProfesional : prof)))
      toast.success("Profesional actualizado correctamente")
    } else {
      setProfesionales((prev) => [...prev, nuevoProfesional])
      toast.success("Profesional creado correctamente")
    }

    setShowProfessionalForm(false)
    setSelectedProfessional(null)
    resetProfessionalForm()
  }

  const resetAppointmentForm = () => {
    setAppointmentForm({
      pacienteId: "",
      profesionalId: "",
      fecha: format(selectedDate, "yyyy-MM-dd"),
      horaInicio: "",
      horaFin: "",
      tipo: "consulta" as TipoCita,
      estado: "programada" as EstadoCita,
      notas: "",
      tratamiento: "",
      sala: "",
      precio: 0,
      pagado: false,
      motivoConsulta: "",
      diagnostico: "",
    })
  }

  const resetPatientForm = () => {
    setPatientForm({
      nombre: "",
      apellidos: "",
      telefono: "",
      email: "",
      fechaNacimiento: "",
      direccion: "",
      notas: "",
      historialMedico: "",
      etiquetas: "",
    })
  }

  const resetProfessionalForm = () => {
    setProfessionalForm({
      nombre: "",
      especialidad: "",
      color: "#3B82F6",
      activo: true,
      horarios: defaultProfesionales[0].horarios,
    })
  }

  const handleEditAppointment = (cita: Cita) => {
    setSelectedAppointment(cita)
    setAppointmentForm({
      pacienteId: cita.pacienteId,
      profesionalId: cita.profesionalId,
      fecha: cita.fecha,
      horaInicio: cita.horaInicio,
      horaFin: cita.horaFin,
      tipo: cita.tipo,
      estado: cita.estado,
      notas: cita.notas,
      tratamiento: cita.tratamiento,
      sala: cita.sala,
      precio: cita.precio,
      pagado: cita.pagado,
      motivoConsulta: cita.motivoConsulta,
      diagnostico: cita.diagnostico,
    })
    setShowAppointmentForm(true)
  }

  const handleEditPatient = (paciente: Paciente) => {
    setSelectedPatient(paciente)
    setPatientForm({
      nombre: paciente.nombre,
      apellidos: paciente.apellidos,
      telefono: paciente.telefono,
      email: paciente.email,
      fechaNacimiento: paciente.fechaNacimiento,
      direccion: paciente.direccion,
      notas: paciente.notas,
      historialMedico: paciente.historialMedico.join(", "),
      etiquetas: paciente.etiquetas.join(", "),
    })
    setShowPatientForm(true)
  }

  const handleEditProfessional = (profesional: Profesional) => {
    setSelectedProfessional(profesional)
    setProfessionalForm({
      nombre: profesional.nombre,
      especialidad: profesional.especialidad,
      color: profesional.color,
      activo: profesional.activo,
      horarios: profesional.horarios,
    })
    setShowProfessionalForm(true)
  }

  const handleDeleteAppointment = (citaId: string) => {
    setCitas((prev) => prev.filter((cita) => cita.id !== citaId))
    toast.success("Cita eliminada correctamente")
  }

  const handleDeletePatient = (pacienteId: string) => {
    setPacientes((prev) => prev.filter((paciente) => paciente.id !== pacienteId))
    // También eliminar las citas del paciente
    setCitas((prev) => prev.filter((cita) => cita.pacienteId !== pacienteId))
    toast.success("Paciente eliminado correctamente")
  }

  const handleDeleteProfessional = (profesionalId: string) => {
    setProfesionales((prev) => prev.filter((prof) => prof.id !== profesionalId))
    // También eliminar las citas del profesional
    setCitas((prev) => prev.filter((cita) => cita.profesionalId !== profesionalId))
    toast.success("Profesional eliminado correctamente")
  }

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, cita: Cita) => {
    setDragState({
      isDragging: true,
      draggedCita: cita,
      dragOffset: { x: 0, y: 0 },
      dropZone: null,
    })

    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", cita.id)
  }

  const handleDragEnd = () => {
    setDragState({
      isDragging: false,
      draggedCita: null,
      dragOffset: { x: 0, y: 0 },
      dropZone: null,
    })
  }

  const handleDragOver = (e: React.DragEvent, profesionalId: string, fecha: string, hora: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    setDragState((prev) => ({
      ...prev,
      dropZone: { profesionalId, fecha, hora },
    }))
  }

  const handleDrop = (e: React.DragEvent, profesionalId: string, fecha: string, hora: string) => {
    e.preventDefault()

    const citaId = e.dataTransfer.getData("text/plain")
    const cita = citas.find((c) => c.id === citaId)

    if (cita) {
      const horaFin = addMinutes(parseISO(`${fecha}T${hora}`), configuracion.intervaloMinutos)

      setCitas((prev) =>
        prev.map((c) =>
          c.id === citaId
            ? {
                ...c,
                profesionalId,
                fecha,
                horaInicio: hora,
                horaFin: format(horaFin, "HH:mm"),
              }
            : c,
        ),
      )

      toast.success("Cita movida correctamente")
    }

    handleDragEnd()
  }

  // Quick actions
  const handleQuickStatusChange = (citaId: string, nuevoEstado: Cita["estado"]) => {
    setCitas((prev) => prev.map((cita) => (cita.id === citaId ? { ...cita, estado: nuevoEstado } : cita)))
    toast.success(`Estado cambiado a ${nuevoEstado}`)
  }

  const handleDuplicateAppointment = (cita: Cita) => {
    const nuevaCita: Cita = {
      ...cita,
      id: uuidv4(),
      fecha: format(addDays(parseISO(cita.fecha), 7), "yyyy-MM-dd"),
      estado: "programada",
      recordatorioEnviado: false,
    }

    setCitas((prev) => [...prev, nuevaCita])
    toast.success("Cita duplicada para la próxima semana")
  }

  // Components
  const AppointmentCard = ({ cita }: { cita: Cita }) => {
    const paciente = getPacienteById(cita.pacienteId)
    const profesional = getProfesionalById(cita.profesionalId)
    const TipoIcon = getTipoIcon(cita.tipo)
    const EstadoIcon = getEstadoIcon(cita.estado)

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, cita)}
        onDragEnd={handleDragEnd}
        className={cn(
          "p-3 rounded-lg border-l-4 cursor-move transition-all duration-200 hover:shadow-md",
          getEstadoColor(cita.estado),
          dragState.isDragging && dragState.draggedCita?.id === cita.id && "opacity-50 scale-95",
        )}
        style={{ borderLeftColor: profesional?.color }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <TipoIcon className="h-4 w-4" />
            <span className="font-medium text-sm">
              {paciente ? `${paciente.nombre} ${paciente.apellidos}` : "Paciente no encontrado"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <EstadoIcon className="h-3 w-3" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleEditAppointment(cita)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleDuplicateAppointment(cita)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </Button>
                  <Separator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600"
                    onClick={() => handleDeleteAppointment(cita.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>
              {cita.horaInicio} - {cita.horaFin}
            </span>
          </div>
          {cita.sala && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              <span>{cita.sala}</span>
            </div>
          )}
          {cita.motivoConsulta && <div className="text-gray-600 truncate">{cita.motivoConsulta}</div>}
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            {cita.estado === "programada" && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={() => handleQuickStatusChange(cita.id, "confirmada")}
              >
                Confirmar
              </Button>
            )}
            {cita.estado === "confirmada" && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={() => handleQuickStatusChange(cita.id, "en-curso")}
              >
                Iniciar
              </Button>
            )}
            {cita.estado === "en-curso" && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={() => handleQuickStatusChange(cita.id, "completada")}
              >
                Completar
              </Button>
            )}
          </div>

          {!cita.pagado && (
            <Badge variant="outline" className="text-xs">
              €{cita.precio}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  const TimeSlot = ({ hora, profesionalId, fecha }: { hora: string; profesionalId: string; fecha: string }) => {
    const citasEnHora = getCitasForDate(fecha, profesionalId).filter((cita) => cita.horaInicio === hora)
    const isDropZone =
      dragState.dropZone?.profesionalId === profesionalId &&
      dragState.dropZone?.fecha === fecha &&
      dragState.dropZone?.hora === hora

    return (
      <div
        className={cn(
          "min-h-[60px] border-b border-gray-100 p-1 transition-colors",
          isDropZone && "bg-blue-50 border-blue-300 border-dashed",
          citasEnHora.length === 0 && "hover:bg-gray-50",
        )}
        onDragOver={(e) => handleDragOver(e, profesionalId, fecha, hora)}
        onDrop={(e) => handleDrop(e, profesionalId, fecha, hora)}
        onClick={() => {
          if (citasEnHora.length === 0) {
            setAppointmentForm((prev) => ({
              ...prev,
              profesionalId,
              fecha,
              horaInicio: hora,
              horaFin: addMinutes(parseISO(`${fecha}T${hora}`), configuracion.intervaloMinutos)
                .toTimeString()
                .slice(0, 5),
            }))
            setShowAppointmentForm(true)
          }
        }}
      >
        {citasEnHora.map((cita) => (
          <AppointmentCard key={cita.id} cita={cita} />
        ))}
      </div>
    )
  }

  const DayView = () => (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-[80px_1fr] gap-0">
        {/* Time column */}
        <div className="border-r border-gray-200">
          {horasDelDia.map((hora) => (
            <div
              key={hora}
              className="h-[60px] border-b border-gray-100 flex items-center justify-center text-sm text-gray-500"
            >
              {hora}
            </div>
          ))}
        </div>

        {/* Appointments column */}
        <div>
          {horasDelDia.map((hora) => (
            <TimeSlot
              key={hora}
              hora={hora}
              profesionalId={filtros.profesional || profesionales[0]?.id || ""}
              fecha={format(selectedDate, "yyyy-MM-dd")}
            />
          ))}
        </div>
      </div>
    </div>
  )

  const WeekView = () => (
    <div className="flex-1 overflow-auto">
      <div className="grid gap-0" style={{ gridTemplateColumns: `80px repeat(${diasSemana.length}, 1fr)` }}>
        {/* Header */}
        <div className="border-r border-gray-200 p-2"></div>
        {diasSemana.map((dia) => (
          <div key={dia.toISOString()} className="border-r border-gray-200 p-2 text-center">
            <div className="font-medium">{format(dia, "EEE", { locale: es })}</div>
            <div
              className={cn(
                "text-2xl",
                isSameDay(dia, new Date()) &&
                  "bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto",
              )}
            >
              {format(dia, "d")}
            </div>
          </div>
        ))}

        {/* Time slots */}
        {horasDelDia.map((hora) => (
          <React.Fragment key={hora}>
            <div className="border-r border-gray-200 border-b border-gray-100 h-[60px] flex items-center justify-center text-sm text-gray-500">
              {hora}
            </div>
            {diasSemana.map((dia) => (
              <TimeSlot
                key={`${hora}-${dia.toISOString()}`}
                hora={hora}
                profesionalId={filtros.profesional || profesionales[0]?.id || ""}
                fecha={format(dia, "yyyy-MM-dd")}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  )

  const MonthView = () => (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 gap-1 p-4">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => (
          <div key={dia} className="p-2 text-center font-medium text-gray-500">
            {dia}
          </div>
        ))}

        {diasMes.map((dia) => {
          const citasDelDia = getCitasForDate(format(dia, "yyyy-MM-dd"))
          return (
            <div
              key={dia.toISOString()}
              className={cn(
                "min-h-[100px] p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50",
                !isSameMonth(dia, currentDate) && "text-gray-400 bg-gray-50",
                isSameDay(dia, new Date()) && "bg-blue-50 border-blue-300",
              )}
              onClick={() => {
                setSelectedDate(dia)
                setCurrentView("dia")
              }}
            >
              <div className="font-medium mb-1">{format(dia, "d")}</div>
              <div className="space-y-1">
                {citasDelDia.slice(0, 3).map((cita) => {
                  const paciente = getPacienteById(cita.pacienteId)
                  return (
                    <div key={cita.id} className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate">
                      {cita.horaInicio} {paciente?.nombre}
                    </div>
                  )
                })}
                {citasDelDia.length > 3 && <div className="text-xs text-gray-500">+{citasDelDia.length - 3} más</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Calendario Médico</h1>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDateChange("prev")}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Hoy
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDateChange("next")}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="text-lg font-medium ml-4">
                  {currentView === "mes"
                    ? format(currentDate, "MMMM yyyy", { locale: es })
                    : format(currentDate, "dd MMMM yyyy", { locale: es })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
                <TabsList>
                  <TabsTrigger value="dia">Día</TabsTrigger>
                  <TabsTrigger value="semana">Semana</TabsTrigger>
                  <TabsTrigger value="mes">Mes</TabsTrigger>
                </TabsList>
              </Tabs>

              <Dialog open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
                <DialogTrigger asChild>
                  <Button onClick={resetAppointmentForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Cita
                  </Button>
                </DialogTrigger>
              </Dialog>

              <Dialog open={showConfigForm} onOpenChange={setShowConfigForm}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar paciente, profesional o notas..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
                className="w-64"
              />
            </div>

            <Select
              value={filtros.profesional}
              onValueChange={(value) => setFiltros((prev) => ({ ...prev, profesional: value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los profesionales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los profesionales</SelectItem>
                {profesionales.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filtros.estado}
              onValueChange={(value) => setFiltros((prev) => ({ ...prev, estado: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
                <SelectItem value="programada">Programada</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="en-curso">En curso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="no-asistio">No asistió</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtros.tipo} onValueChange={(value) => setFiltros((prev) => ({ ...prev, tipo: value }))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los tipos</SelectItem>
                <SelectItem value="consulta">Consulta</SelectItem>
                <SelectItem value="seguimiento">Seguimiento</SelectItem>
                <SelectItem value="urgencia">Urgencia</SelectItem>
                <SelectItem value="revision">Revisión</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 flex" ref={calendarRef}>
          {currentView === "dia" && <DayView />}
          {currentView === "semana" && <WeekView />}
          {currentView === "mes" && <MonthView />}
        </div>

        {/* Appointment Form Dialog */}
        <Dialog open={showAppointmentForm} onOpenChange={setShowAppointmentForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedAppointment ? "Editar Cita" : "Nueva Cita"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAppointmentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paciente">Paciente *</Label>
                  <Select
                    value={appointmentForm.pacienteId}
                    onValueChange={(value) => setAppointmentForm((prev) => ({ ...prev, pacienteId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {pacientes.map((paciente) => (
                        <SelectItem key={paciente.id} value={paciente.id}>
                          {paciente.nombre} {paciente.apellidos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="profesional">Profesional *</Label>
                  <Select
                    value={appointmentForm.profesionalId}
                    onValueChange={(value) => setAppointmentForm((prev) => ({ ...prev, profesionalId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar profesional" />
                    </SelectTrigger>
                    <SelectContent>
                      {profesionales.map((profesional) => (
                        <SelectItem key={profesional.id} value={profesional.id}>
                          {profesional.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input
                    type="date"
                    value={appointmentForm.fecha}
                    onChange={(e) => setAppointmentForm((prev) => ({ ...prev, fecha: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="horaInicio">Hora Inicio *</Label>
                  <Input
                    type="time"
                    value={appointmentForm.horaInicio}
                    onChange={(e) => setAppointmentForm((prev) => ({ ...prev, horaInicio: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="horaFin">Hora Fin *</Label>
                  <Input
                    type="time"
                    value={appointmentForm.horaFin}
                    onChange={(e) => setAppointmentForm((prev) => ({ ...prev, horaFin: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={appointmentForm.tipo}
                    onValueChange={(value) => setAppointmentForm((prev) => ({ ...prev, tipo: value as TipoCita }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consulta">Consulta</SelectItem>
                      <SelectItem value="seguimiento">Seguimiento</SelectItem>
                      <SelectItem value="urgencia">Urgencia</SelectItem>
                      <SelectItem value="revision">Revisión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Select
                    value={appointmentForm.estado}
                    onValueChange={(value) => setAppointmentForm((prev) => ({ ...prev, estado: value as EstadoCita }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programada">Programada</SelectItem>
                      <SelectItem value="confirmada">Confirmada</SelectItem>
                      <SelectItem value="en-curso">En curso</SelectItem>
                      <SelectItem value="completada">Completada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                      <SelectItem value="no-asistio">No asistió</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sala">Sala</Label>
                  <Input
                    value={appointmentForm.sala}
                    onChange={(e) => setAppointmentForm((prev) => ({ ...prev, sala: e.target.value }))}
                    placeholder="Ej: Sala 1"
                  />
                </div>

                <div>
                  <Label htmlFor="precio">Precio (€)</Label>
                  <Input
                    type="number"
                    value={appointmentForm.precio}
                    onChange={(e) =>
                      setAppointmentForm((prev) => ({ ...prev, precio: Number.parseFloat(e.target.value) || 0 }))
                    }
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="motivoConsulta">Motivo de Consulta</Label>
                <Input
                  value={appointmentForm.motivoConsulta}
                  onChange={(e) => setAppointmentForm((prev) => ({ ...prev, motivoConsulta: e.target.value }))}
                  placeholder="Ej: Dolor lumbar"
                />
              </div>

              <div>
                <Label htmlFor="tratamiento">Tratamiento</Label>
                <Textarea
                  value={appointmentForm.tratamiento}
                  onChange={(e) => setAppointmentForm((prev) => ({ ...prev, tratamiento: e.target.value }))}
                  placeholder="Descripción del tratamiento..."
                />
              </div>

              <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  value={appointmentForm.notas}
                  onChange={(e) => setAppointmentForm((prev) => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas adicionales..."
                />
              </div>

              <div>
                <Label htmlFor="diagnostico">Diagnóstico</Label>
                <Textarea
                  value={appointmentForm.diagnostico}
                  onChange={(e) => setAppointmentForm((prev) => ({ ...prev, diagnostico: e.target.value }))}
                  placeholder="Diagnóstico médico..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pagado"
                  checked={appointmentForm.pagado}
                  onCheckedChange={(checked) => setAppointmentForm((prev) => ({ ...prev, pagado: checked as boolean }))}
                />
                <Label htmlFor="pagado">Pagado</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAppointmentForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{selectedAppointment ? "Actualizar" : "Crear"} Cita</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Quick Add Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-2">
          <Dialog open={showPatientForm} onOpenChange={setShowPatientForm}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={resetPatientForm}>
                <User className="h-4 w-4 mr-2" />
                Nuevo Paciente
              </Button>
            </DialogTrigger>
          </Dialog>

          <Dialog open={showProfessionalForm} onOpenChange={setShowProfessionalForm}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={resetProfessionalForm}>
                <Users className="h-4 w-4 mr-2" />
                Nuevo Profesional
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>

        {/* Patient Form Dialog */}
        <Dialog open={showPatientForm} onOpenChange={setShowPatientForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPatient ? "Editar Paciente" : "Nuevo Paciente"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handlePatientSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    value={patientForm.nombre}
                    onChange={(e) => setPatientForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre"
                  />
                </div>

                <div>
                  <Label htmlFor="apellidos">Apellidos *</Label>
                  <Input
                    value={patientForm.apellidos}
                    onChange={(e) => setPatientForm((prev) => ({ ...prev, apellidos: e.target.value }))}
                    placeholder="Apellidos"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    value={patientForm.telefono}
                    onChange={(e) => setPatientForm((prev) => ({ ...prev, telefono: e.target.value }))}
                    placeholder="+34 666 123 456"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    type="email"
                    value={patientForm.email}
                    onChange={(e) => setPatientForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                <Input
                  type="date"
                  value={patientForm.fechaNacimiento}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, fechaNacimiento: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  value={patientForm.direccion}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, direccion: e.target.value }))}
                  placeholder="Dirección completa"
                />
              </div>

              <div>
                <Label htmlFor="historialMedico">Historial Médico</Label>
                <Textarea
                  value={patientForm.historialMedico}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, historialMedico: e.target.value }))}
                  placeholder="Separar por comas: Lesión lumbar 2023, Rehabilitación rodilla 2022"
                />
              </div>

              <div>
                <Label htmlFor="etiquetas">Etiquetas</Label>
                <Input
                  value={patientForm.etiquetas}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, etiquetas: e.target.value }))}
                  placeholder="Separar por comas: VIP, Deportista, Seguimiento"
                />
              </div>

              <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  value={patientForm.notas}
                  onChange={(e) => setPatientForm((prev) => ({ ...prev, notas: e.target.value }))}
                  placeholder="Notas adicionales sobre el paciente..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowPatientForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{selectedPatient ? "Actualizar" : "Crear"} Paciente</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Professional Form Dialog */}
        <Dialog open={showProfessionalForm} onOpenChange={setShowProfessionalForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProfessional ? "Editar Profesional" : "Nuevo Profesional"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleProfessionalSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    value={professionalForm.nombre}
                    onChange={(e) => setProfessionalForm((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Dr. Juan Pérez"
                  />
                </div>

                <div>
                  <Label htmlFor="especialidad">Especialidad *</Label>
                  <Input
                    value={professionalForm.especialidad}
                    onChange={(e) => setProfessionalForm((prev) => ({ ...prev, especialidad: e.target.value }))}
                    placeholder="Fisioterapia General"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    type="color"
                    value={professionalForm.color}
                    onChange={(e) => setProfessionalForm((prev) => ({ ...prev, color: e.target.value }))}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="activo"
                    checked={professionalForm.activo}
                    onCheckedChange={(checked) =>
                      setProfessionalForm((prev) => ({ ...prev, activo: checked as boolean }))
                    }
                  />
                  <Label htmlFor="activo">Activo</Label>
                </div>
              </div>

              <div>
                <Label>Horarios de Trabajo</Label>
                <div className="space-y-2 mt-2">
                  {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((dia, index) => {
                    const horario = professionalForm.horarios.find((h) => h.dia === index + 1) || {
                      dia: index + 1,
                      horaInicio: "09:00",
                      horaFin: "17:00",
                      activo: false,
                    }

                    return (
                      <div key={dia} className="flex items-center gap-4 p-3 border rounded">
                        <div className="w-20">
                          <Checkbox
                            checked={horario.activo}
                            onCheckedChange={(checked) => {
                              const nuevosHorarios = professionalForm.horarios.filter((h) => h.dia !== index + 1)
                              if (checked) {
                                nuevosHorarios.push({ ...horario, activo: true })
                              }
                              setProfessionalForm((prev) => ({ ...prev, horarios: nuevosHorarios }))
                            }}
                          />
                          <Label className="ml-2">{dia}</Label>
                        </div>

                        {horario.activo && (
                          <>
                            <div>
                              <Label className="text-xs">Inicio</Label>
                              <Input
                                type="time"
                                value={horario.horaInicio}
                                onChange={(e) => {
                                  const nuevosHorarios = professionalForm.horarios.map((h) =>
                                    h.dia === index + 1 ? { ...h, horaInicio: e.target.value } : h,
                                  )
                                  setProfessionalForm((prev) => ({ ...prev, horarios: nuevosHorarios }))
                                }}
                                className="w-24"
                              />
                            </div>

                            <div>
                              <Label className="text-xs">Fin</Label>
                              <Input
                                type="time"
                                value={horario.horaFin}
                                onChange={(e) => {
                                  const nuevosHorarios = professionalForm.horarios.map((h) =>
                                    h.dia === index + 1 ? { ...h, horaFin: e.target.value } : h,
                                  )
                                  setProfessionalForm((prev) => ({ ...prev, horarios: nuevosHorarios }))
                                }}
                                className="w-24"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowProfessionalForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{selectedProfessional ? "Actualizar" : "Crear"} Profesional</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Configuration Dialog */}
        <Dialog open={showConfigForm} onOpenChange={setShowConfigForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Configuración del Calendario</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horaInicio">Hora de Inicio</Label>
                  <Input
                    type="time"
                    value={configuracion.horaInicio}
                    onChange={(e) => setConfiguracion((prev) => ({ ...prev, horaInicio: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="horaFin">Hora de Fin</Label>
                  <Input
                    type="time"
                    value={configuracion.horaFin}
                    onChange={(e) => setConfiguracion((prev) => ({ ...prev, horaFin: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="intervalo">Intervalo (minutos)</Label>
                <Select
                  value={configuracion.intervaloMinutos.toString()}
                  onValueChange={(value) =>
                    setConfiguracion((prev) => ({ ...prev, intervaloMinutos: Number.parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Vista por Defecto</Label>
                <Select
                  value={configuracion.vistaDefecto}
                  onValueChange={(value) => setConfiguracion((prev) => ({ ...prev, vistaDefecto: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dia">Día</SelectItem>
                    <SelectItem value="semana">Semana</SelectItem>
                    <SelectItem value="mes">Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mostrarFinDeSemana"
                    checked={configuracion.mostrarFinDeSemana}
                    onCheckedChange={(checked) =>
                      setConfiguracion((prev) => ({ ...prev, mostrarFinDeSemana: checked as boolean }))
                    }
                  />
                  <Label htmlFor="mostrarFinDeSemana">Mostrar fin de semana</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notificaciones"
                    checked={configuracion.notificaciones}
                    onCheckedChange={(checked) =>
                      setConfiguracion((prev) => ({ ...prev, notificaciones: checked as boolean }))
                    }
                  />
                  <Label htmlFor="notificaciones">Notificaciones</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recordatoriosAutomaticos"
                    checked={configuracion.recordatoriosAutomaticos}
                    onCheckedChange={(checked) =>
                      setConfiguracion((prev) => ({ ...prev, recordatoriosAutomaticos: checked as boolean }))
                    }
                  />
                  <Label htmlFor="recordatoriosAutomaticos">Recordatorios automáticos</Label>
                </div>
              </div>

              {configuracion.recordatoriosAutomaticos && (
                <div>
                  <Label htmlFor="tiempoRecordatorio">Tiempo de recordatorio (horas)</Label>
                  <Input
                    type="number"
                    value={configuracion.tiempoRecordatorio}
                    onChange={(e) =>
                      setConfiguracion((prev) => ({
                        ...prev,
                        tiempoRecordatorio: Number.parseInt(e.target.value) || 24,
                      }))
                    }
                    min="1"
                    max="168"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowConfigForm(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    setShowConfigForm(false)
                    toast.success("Configuración guardada")
                  }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Professional Legend */}
        <div className="fixed bottom-6 left-6">
          <Card className="w-64">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Profesionales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profesionales
                .filter((p) => p.activo)
                .map((profesional) => (
                  <div key={profesional.id} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: profesional.color }} />
                    <span className="text-sm">{profesional.nombre}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-auto"
                      onClick={() => handleEditProfessional(profesional)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
