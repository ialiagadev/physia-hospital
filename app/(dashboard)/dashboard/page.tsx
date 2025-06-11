// app/page.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, List, Search, Settings, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useRouter } from "next/navigation"

// Datos de ejemplo
const professionals = [
  {
    id: 1,
    name: "Dra. Ana García",
    specialty: "Medicina General",
    color: "emerald",
    bgColor: "bg-emerald-100",
    borderColor: "border-emerald-300"
  },
  {
    id: 2,
    name: "Dr. Carlos Rodríguez", 
    specialty: "Cardiología",
    color: "blue",
    bgColor: "bg-blue-100",
    borderColor: "border-blue-300"
  },
  {
    id: 3,
    name: "Dra. Laura Martínez",
    specialty: "Pediatría", 
    color: "purple",
    bgColor: "bg-purple-100",
    borderColor: "border-purple-300"
  },
  {
    id: 4,
    name: "Dr. Miguel Fernández",
    specialty: "Dermatología",
    color: "amber",
    bgColor: "bg-amber-100", 
    borderColor: "border-amber-300"
  }
]

const appointments = [
  {
    id: 1,
    professionalId: 1,
    time: "09:00-09:45",
    patient: "Cristina Moreno Santos",
    phone: "646578901",
    status: "confirmed"
  },
  {
    id: 2,
    professionalId: 1,
    time: "11:00-11:30",
    patient: "",
    phone: "",
    status: "available"
  },
  {
    id: 3,
    professionalId: 2,
    time: "09:00-09:45",
    patient: "Antonio Ruiz Gómez",
    phone: "678901234",
    status: "confirmed"
  },
  {
    id: 4,
    professionalId: 2,
    time: "10:30-11:15",
    patient: "Sara Jiménez Rodríguez",
    phone: "623456789",
    status: "confirmed"
  },
  {
    id: 5,
    professionalId: 3,
    time: "11:00-11:45",
    patient: "Beatriz Ramos Molina",
    phone: "667890123",
    status: "confirmed"
  },
  {
    id: 6,
    professionalId: 4,
    time: "11:00-12:00",
    patient: "Javier Gómez Torres",
    phone: "690123456",
    status: "confirmed"
  }
]

const timeSlots = [
  "08:00 - 09:00",
  "09:00 - 10:00", 
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 13:00"
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Día")
  const [searchTerm, setSearchTerm] = useState("")
  const [timeInterval, setTimeInterval] = useState("30")
  const router = useRouter()

  const tabs = ["Día", "Semana", "Mes", "Lista", "Horario", "Profesionales"]

  const getAppointmentsForProfessional = (professionalId: number) => {
    return appointments.filter(apt => apt.professionalId === professionalId)
  }

  const AppointmentCard = ({ appointment, professional }: { appointment: any, professional: any }) => {
    if (appointment.status === "available") {
      return (
        <div className={`p-2 rounded-md border-2 border-dashed ${professional.borderColor} ${professional.bgColor} mb-2`}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{appointment.time}</span>
            <Plus className="h-4 w-4 text-gray-400" />
          </div>
          <span className="text-sm text-gray-500">Hueco libre</span>
        </div>
      )
    }

    return (
      <div className={`p-3 rounded-md ${professional.bgColor} border ${professional.borderColor} mb-2`}>
        <div className="flex items-center justify-between mb-1">
          <Badge variant="secondary" className="text-xs">
            {appointment.time}
          </Badge>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        </div>
        <div className="text-sm font-medium text-gray-900">
          {appointment.patient}
        </div>
        <div className="text-xs text-gray-600">
          📞 {appointment.phone}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span className="font-medium">Calendario</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-500">
              <List className="h-5 w-5" />
              <span>Lista de espera</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Ir al Dashboard
            </Button>
            <Button onClick={() => router.push("/dashboard/facturacion")} variant="outline">
              Sistema de Facturación
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {tabs.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={activeTab === tab ? "bg-blue-100 text-blue-700" : ""}
              >
                {tab}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar citas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <div className="flex items-center space-x-2">
              <ChevronLeft className="h-5 w-5 text-gray-400" />
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <Settings className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Mostrar horas cada:</span>
          <Select value={timeInterval} onValueChange={setTimeInterval}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutos</SelectItem>
              <SelectItem value="30">30 minutos</SelectItem>
              <SelectItem value="60">60 minutos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          lunes, 9 de junio de 2025 - Vista de Horario
        </h2>

        <div className="grid grid-cols-4 gap-6">
          {professionals.map((professional) => (
            <Card key={professional.id} className="overflow-hidden">
              <div className={`${professional.bgColor} border-b ${professional.borderColor} p-4`}>
                <h3 className="font-semibold text-gray-900">{professional.name}</h3>
                <p className="text-sm text-gray-600">{professional.specialty}</p>
              </div>
              <CardContent className="p-4">
                {timeSlots.map((timeSlot) => {
                  const appointment = getAppointmentsForProfessional(professional.id).find(
                    apt => apt.time.includes(timeSlot.split(' - ')[0])
                  )
                  
                  if (appointment) {
                    return (
                      <AppointmentCard 
                        key={`${professional.id}-${timeSlot}`}
                        appointment={appointment} 
                        professional={professional} 
                      />
                    )
                  }
                  
                  return (
                    <AppointmentCard 
                      key={`${professional.id}-${timeSlot}`}
                      appointment={{ time: timeSlot, status: "available" }} 
                      professional={professional} 
                    />
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}