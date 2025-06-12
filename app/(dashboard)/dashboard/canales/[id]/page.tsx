"use client"

import { useState, useEffect } from "react"
import { Plus, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

interface Canal {
  id: number
  nombre: string
  descripcion: string | null
  imagen: string | null
  href_button_action: string | null
  estado: number | null
}

// Datos ficticios específicos para cada canal (por ID o nombre)
const getChannelData = (canalNombre: string) => {
  const dataMap: Record<string, any[]> = {
    whatsapp: [
      {
        id: 1,
        numero: "3434966945876",
        nombre: "FOODEE AI",
        descripcion: "FOODEE AI",
        estado: "PENDIENTE",
        fecha_estado: "10/10/2024",
      },
      {
        id: 2,
        numero: "349669458760",
        nombre: "Foodee",
        descripcion: "Foodee",
        estado: "PENDIENTE",
        fecha_estado: "21/02/2025",
      },
      {
        id: 3,
        numero: "349178944630",
        nombre: "Asistente Virtual Bcombinator",
        descripcion: "Asistente Virtual Bcombinator",
        estado: "PENDIENTE",
        fecha_estado: "28/01/2025",
      },
      {
        id: 4,
        numero: "34966945075",
        nombre: "Gianluca",
        descripcion: "Gianluca Strazzeri-contactos",
        estado: "ACTIVO",
        fecha_estado: "12/09/2024",
      },
      {
        id: 5,
        numero: "34966944876",
        nombre: "Physia",
        descripcion: "Número original de Physia.",
        estado: "ACTIVO",
        fecha_estado: "08/11/2024",
      },
      {
        id: 6,
        numero: "34910470017",
        nombre: "Sergio Lozano",
        descripcion: "Sergio Lozano",
        estado: "ACTIVO",
        fecha_estado: "02/01/2025",
      },
      {
        id: 7,
        numero: "34665444333",
        nombre: "roebr",
        descripcion: "hola",
        estado: "PENDIENTE",
        fecha_estado: "31/10/2024",
      },
      {
        id: 8,
        numero: "34653118408",
        nombre: "Prueba usuarios",
        descripcion: "Asistente de prueba para usuarios",
        estado: "ACTIVO",
        fecha_estado: "03/01/2025",
      },
    ],
    facebook: [
      {
        id: 1,
        pagina: "Physia Official",
        nombre: "Página Principal",
        descripcion: "Página oficial de Physia",
        estado: "ACTIVO",
        fecha_estado: "15/12/2024",
      },
      {
        id: 2,
        pagina: "Physia Support",
        nombre: "Soporte Técnico",
        descripcion: "Página de soporte al cliente",
        estado: "ACTIVO",
        fecha_estado: "20/11/2024",
      },
    ],
    instagram: [
      {
        id: 1,
        cuenta: "@physia_official",
        nombre: "Cuenta Principal",
        descripcion: "Cuenta oficial de Instagram",
        estado: "ACTIVO",
        fecha_estado: "10/01/2025",
      },
    ],
  }

  return dataMap[canalNombre.toLowerCase()] || []
}

// Configuración específica para cada canal
const getChannelConfig = (canalNombre: string) => {
  const configMap: Record<string, any> = {
    whatsapp: {
      title: "WhatsApp",
      icon: "📱",
      color: "green",
      addButtonText: "Añadir número",
      columns: ["NÚMERO", "NOMBRE", "DESCRIPCIÓN", "ESTADO", "F. ESTADO", "ACCIONES"],
      searchPlaceholder: "Buscar números...",
      firstColumnKey: "numero",
    },
    facebook: {
      title: "Facebook",
      icon: "📘",
      color: "blue",
      addButtonText: "Añadir página",
      columns: ["PÁGINA", "NOMBRE", "DESCRIPCIÓN", "ESTADO", "F. ESTADO", "ACCIONES"],
      searchPlaceholder: "Buscar páginas...",
      firstColumnKey: "pagina",
    },
    instagram: {
      title: "Instagram",
      icon: "📷",
      color: "purple",
      addButtonText: "Añadir cuenta",
      columns: ["CUENTA", "NOMBRE", "DESCRIPCIÓN", "ESTADO", "F. ESTADO", "ACCIONES"],
      searchPlaceholder: "Buscar cuentas...",
      firstColumnKey: "cuenta",
    },
  }

  return (
    configMap[canalNombre.toLowerCase()] || {
      title: canalNombre,
      icon: "💬",
      color: "gray",
      addButtonText: "Añadir elemento",
      columns: ["ELEMENTO", "NOMBRE", "DESCRIPCIÓN", "ESTADO", "F. ESTADO", "ACCIONES"],
      searchPlaceholder: "Buscar...",
      firstColumnKey: "elemento",
    }
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={status === "ACTIVO" ? "default" : "secondary"}
      className={
        status === "ACTIVO"
          ? "bg-green-100 text-green-800 hover:bg-green-100"
          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      }
    >
      {status}
    </Badge>
  )
}

function ActionButtons({ status, id }: { status: string; id: number }) {
  if (status === "PENDIENTE") {
    return (
      <div className="flex gap-2">
        <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
          📘 Registrar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Button variant="ghost" size="sm">
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function TableRowComponent({ item, config }: { item: any; config: any }) {
  const firstColumnValue = item[config.firstColumnKey]

  return (
    <tr className="hover:bg-gray-50 border-b">
      <td className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-8 bg-blue-400 rounded"></div>
          <span className="font-mono">{firstColumnValue}</span>
        </div>
      </td>
      <td className="p-4 font-medium">{item.nombre}</td>
      <td className="p-4 text-gray-600">{item.descripcion}</td>
      <td className="p-4">
        <StatusBadge status={item.estado} />
      </td>
      <td className="p-4 text-gray-600">{item.fecha_estado}</td>
      <td className="p-4">
        <ActionButtons status={item.estado} id={item.id} />
      </td>
    </tr>
  )
}

export default function CanalPage({ params }: PageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [canal, setCanal] = useState<Canal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const itemsPerPage = 8

  useEffect(() => {
    const fetchCanal = async () => {
      try {
        setLoading(true)
        const resolvedParams = await params
        const canalId = Number.parseInt(resolvedParams.id)

        if (isNaN(canalId)) {
          notFound()
          return
        }

        const { data, error } = await supabase.from("canales").select("*").eq("id", canalId).single()

        if (error) {
          console.error("Error fetching canal:", error)
          setError(error.message)
        } else if (!data) {
          notFound()
        } else {
          setCanal(data)
          setError(null)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setError("Error inesperado al cargar canal")
      } finally {
        setLoading(false)
      }
    }

    fetchCanal()
  }, [params])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    )
  }

  if (error || !canal) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-500">
          <p>Error al cargar canal</p>
          <p className="text-sm">{error || "Canal no encontrado"}</p>
        </div>
      </div>
    )
  }

  const config = getChannelConfig(canal.nombre)
  const data = getChannelData(canal.nombre)

  const filteredData = data.filter((item) => {
    const searchFields = Object.values(item).join(" ").toLowerCase()
    return searchFields.includes(searchQuery.toLowerCase())
  })

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  return (
    <div className="container mx-auto p-6">
      {/* Breadcrumb */}
      <div className="mb-4">
        <nav className="text-sm text-gray-500">
          <Link href="/dashboard/canales" className="hover:text-gray-700">
            Canales
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{canal.nombre}</span>
        </nav>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl">{config.icon}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{canal.nombre}</h1>
        </div>
        <Button className="bg-green-500 hover:bg-green-600">
          <Plus className="h-4 w-4 mr-2" />
          {config.addButtonText}
        </Button>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Buscar:</span>
          <div className="relative max-w-md">
            <Input
              placeholder={config.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-3"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead className="bg-green-50">
            <tr>
              {config.columns.map((column: string) => (
                <th key={column} className="h-12 px-4 text-left align-middle font-semibold text-gray-700">
                  {column} {column.includes("NÚMERO") || column.includes("NOMBRE") ? "▼" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.map((item) => (
              <TableRowComponent key={item.id} item={item} config={config} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mensaje si no hay datos */}
      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {searchQuery ? "No se encontraron resultados." : `No hay ${canal.nombre.toLowerCase()} configurados.`}
          </p>
        </div>
      )}

      {/* Paginación */}
      {filteredData.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-600">
            Mostrando de {startIndex + 1} a {Math.min(endIndex, filteredData.length)} entradas de {filteredData.length}{" "}
            resultados totales
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
