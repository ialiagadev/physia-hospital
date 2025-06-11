"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import type { PlantillaTarea, Profesional } from "@/types/tasks"

interface TaskTemplatesProps {
  onCreateFromTemplate: (plantilla: PlantillaTarea) => void
  profesionales: Profesional[]
}

const PLANTILLAS_PREDEFINIDAS: PlantillaTarea[] = [
  {
    id: 1,
    nombre: "Revisar inventario médico",
    descripcion: "Verificar stock de medicamentos y material médico del centro",
    prioridad: "alta",
    etiquetas: ["inventario", "urgente"],
    categoria: "Administración",
  },
  {
    id: 2,
    nombre: "Mantenimiento equipos",
    descripcion: "Programar y realizar mantenimiento preventivo de equipos médicos",
    prioridad: "media",
    etiquetas: ["mantenimiento", "equipos"],
    categoria: "Técnico",
  },
  {
    id: 3,
    nombre: "Actualizar protocolos",
    descripcion: "Revisar y actualizar protocolos de seguridad y procedimientos",
    prioridad: "media",
    etiquetas: ["protocolos", "seguridad"],
    categoria: "Calidad",
  },
  {
    id: 4,
    nombre: "Formación personal",
    descripcion: "Organizar sesión de formación para el personal del centro",
    prioridad: "baja",
    etiquetas: ["formación", "personal"],
    categoria: "Recursos Humanos",
  },
  {
    id: 5,
    nombre: "Limpieza profunda",
    descripcion: "Realizar limpieza y desinfección profunda de instalaciones",
    prioridad: "alta",
    etiquetas: ["limpieza", "desinfección"],
    categoria: "Mantenimiento",
  },
  {
    id: 6,
    nombre: "Revisión facturas",
    descripcion: "Revisar y procesar facturas pendientes del mes",
    prioridad: "media",
    etiquetas: ["facturas", "contabilidad"],
    categoria: "Administración",
  },
]

const PRIORIDADES_CONFIG = {
  alta: { color: "bg-red-100 text-red-800 border-red-300", texto: "Alta" },
  media: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", texto: "Media" },
  baja: { color: "bg-green-100 text-green-800 border-green-300", texto: "Baja" },
}

export function TaskTemplates({ onCreateFromTemplate, profesionales }: TaskTemplatesProps) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("todas")

  const categorias = ["todas", ...Array.from(new Set(PLANTILLAS_PREDEFINIDAS.map((p) => p.categoria)))]

  const plantillasFiltradas =
    categoriaSeleccionada === "todas"
      ? PLANTILLAS_PREDEFINIDAS
      : PLANTILLAS_PREDEFINIDAS.filter((p) => p.categoria === categoriaSeleccionada)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Plantillas de Tareas</h3>
        <div className="flex gap-2">
          {categorias.map((categoria) => (
            <Button
              key={categoria}
              variant={categoriaSeleccionada === categoria ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoriaSeleccionada(categoria)}
            >
              {categoria === "todas" ? "Todas" : categoria}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plantillasFiltradas.map((plantilla) => (
          <Card key={plantilla.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{plantilla.nombre}</CardTitle>
                <Badge variant="outline" className={`text-xs ${PRIORIDADES_CONFIG[plantilla.prioridad].color}`}>
                  {PRIORIDADES_CONFIG[plantilla.prioridad].texto}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 line-clamp-2">{plantilla.descripcion}</p>

              <div className="flex flex-wrap gap-1">
                {plantilla.etiquetas.map((etiqueta, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {etiqueta}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-gray-500">{plantilla.categoria}</span>
                <Button size="sm" onClick={() => onCreateFromTemplate(plantilla)} className="flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  Usar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plantillasFiltradas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay plantillas disponibles para esta categoría</p>
        </div>
      )}
    </div>
  )
}

export type { PlantillaTarea }
