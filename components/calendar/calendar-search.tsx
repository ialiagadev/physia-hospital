"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Cita } from "@/types/calendar-types"

interface CalendarSearchProps {
  citas: Cita[]
  onSelectCita: (cita: Cita) => void
  placeholder?: string
}

export function CalendarSearch({ citas, onSelectCita, placeholder = "Buscar citas..." }: CalendarSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showResults, setShowResults] = useState(false)

  const filteredCitas = citas.filter((cita) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      cita.nombrePaciente.toLowerCase().includes(searchLower) ||
      (cita.apellidosPaciente && cita.apellidosPaciente.toLowerCase().includes(searchLower)) ||
      (cita.telefonoPaciente && cita.telefonoPaciente.includes(searchTerm)) ||
      cita.tipo.toLowerCase().includes(searchLower)
    )
  })

  const handleSelectCita = (cita: Cita) => {
    onSelectCita(cita)
    setSearchTerm("")
    setShowResults(false)
  }

  const clearSearch = () => {
    setSearchTerm("")
    setShowResults(false)
  }

  // Función auxiliar para formatear fecha
  const formatearFecha = (fecha: Date | string): string => {
    const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha
    return fechaObj.toLocaleDateString("es-ES")
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setShowResults(e.target.value.length > 0)
          }}
          onFocus={() => setShowResults(searchTerm.length > 0)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {showResults && filteredCitas.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredCitas.slice(0, 10).map((cita) => (
            <div
              key={cita.id}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              onClick={() => handleSelectCita(cita)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    {cita.nombrePaciente} {cita.apellidosPaciente || ""}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatearFecha(cita.fecha)} - {cita.hora} - {cita.tipo}
                  </div>
                  {cita.telefonoPaciente && <div className="text-xs text-gray-400">📞 {cita.telefonoPaciente}</div>}
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    cita.estado === "confirmada"
                      ? "bg-green-500"
                      : cita.estado === "pendiente"
                        ? "bg-amber-400"
                        : "bg-red-500"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && searchTerm && filteredCitas.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 p-4 text-center text-gray-500">
          No se encontraron citas
        </div>
      )}
    </div>
  )
}
