"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Plus, Trash2, ChevronLeft, ChevronRight, Search, MessageCircle, Facebook, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AssignmentCard } from "@/components/assignment-card"

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

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface UserAssignment {
  waba_id: number
  user_id: string
  user: User // Changed back to 'user' (singular)
}

// Prefijos de países más comunes
const countryPrefixes = [
  { code: "ES", prefix: "+34", name: "España", flag: "🇪🇸" },
  { code: "US", prefix: "+1", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "MX", prefix: "+52", name: "México", flag: "🇲🇽" },
  { code: "AR", prefix: "+54", name: "Argentina", flag: "🇦🇷" },
  { code: "CO", prefix: "+57", name: "Colombia", flag: "🇨🇴" },
  { code: "PE", prefix: "+51", name: "Perú", flag: "🇵🇪" },
  { code: "CL", prefix: "+56", name: "Chile", flag: "🇨🇱" },
  { code: "VE", prefix: "+58", name: "Venezuela", flag: "🇻🇪" },
  { code: "EC", prefix: "+593", name: "Ecuador", flag: "🇪🇨" },
  { code: "BO", prefix: "+591", name: "Bolivia", flag: "🇧🇴" },
]

// Función para obtener datos reales de WhatsApp
const getChannelData = async (canalId: number, organizationId: number) => {
  try {
    console.log("🔍 Buscando datos:", { canalId, organizationId })
    // Primero obtener el id de canales_organizations
    const { data: canalOrgs, error: canalOrgError } = await supabase
      .from("canales_organizations")
      .select("id")
      .eq("id_canal", canalId)
      .eq("id_organization", organizationId)

    console.log("📋 Resultado canales_organizations:", { canalOrgs, canalOrgError })

    if (canalOrgError) {
      console.error("❌ Error obteniendo canales_organizations:", canalOrgError)
      return []
    }

    if (!canalOrgs || canalOrgs.length === 0) {
      console.log("⚠️ No existe relación canal-organización para:", { canalId, organizationId })
      return []
    }

    const canalOrg = canalOrgs[0]

    // Luego obtener los datos de waba
    const { data, error } = await supabase
      .from("waba")
      .select("*")
      .eq("id_canales_organization", canalOrg.id)
      .order("fecha_alta", { ascending: false })

    console.log("📋 Resultado waba:", { data, error })

    if (error) {
      console.error("❌ Error fetching waba data:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("💥 Error inesperado obteniendo datos del canal:", error)
    return []
  }
}

// Función para obtener usuarios de la organización
const getOrganizationUsers = async (organizationId: number) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, role")
      .eq("organization_id", organizationId)
      .in("role", ["user", "admin"]) // Incluir tanto usuarios tipo 1 (user) como tipo 2 (admin)
      .order("name")

    if (error) {
      console.error("❌ Error fetching users:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("💥 Error inesperado obteniendo usuarios:", error)
    return []
  }
}

// Función para obtener asignaciones de usuarios
const getUserAssignments = async (wabaId: number): Promise<UserAssignment[]> => {
  try {
    const { data, error } = await supabase
      .from("users_waba")
      .select(`
        waba_id,
        user_id,
        users:user_id (
          id,
          name,
          email,
          role
        )
      `)
      .eq("waba_id", wabaId)

    if (error) {
      console.error("❌ Error fetching user assignments:", error)
      return []
    }

    // Transform the data to match our interface
    const transformedData: UserAssignment[] = (data || [])
      .filter((item) => item.users) // Filter out null users
      .map((item) => ({
        waba_id: item.waba_id,
        user_id: item.user_id,
        user: Array.isArray(item.users) ? item.users[0] : item.users, // Handle both array and object cases
      }))

    return transformedData
  } catch (error) {
    console.error("💥 Error inesperado obteniendo asignaciones:", error)
    return []
  }
}

// Configuración específica para cada canal
const getChannelConfig = (canalNombre: string) => {
  const configMap: Record<string, any> = {
    whatsapp: {
      title: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-600",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      addButtonText: "Añadir número",
      columns: ["NÚMERO", "NOMBRE", "DESCRIPCIÓN", "ESTADO", "F. REGISTRO", "ACCIONES"],
      searchPlaceholder: "Buscar números...",
      firstColumnKey: "numero",
    },
  }

  return (
    configMap[canalNombre.toLowerCase()] || {
      title: canalNombre,
      icon: MessageCircle,
      color: "bg-gray-600",
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
      addButtonText: "Añadir elemento",
      columns: ["ELEMENTO", "NOMBRE", "DESCRIPCIÓN", "ESTADO", "F. REGISTRO", "ACCIONES"],
      searchPlaceholder: "Buscar...",
      firstColumnKey: "elemento",
    }
  )
}

function StatusBadge({ status }: { status: number }) {
  const isActive = status === 1
  return (
    <Badge
      variant={isActive ? "default" : "secondary"}
      className={
        isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"
      }
    >
      <div className={`w-2 h-2 rounded-full mr-2 ${isActive ? "bg-emerald-500" : "bg-gray-400"}`} />
      {isActive ? "ACTIVO" : "NO REGISTRADO"}
    </Badge>
  )
}

function ActionButtons({
  status,
  id,
  onRegister,
  onViewAssignments,
  facebookUrl,
  onStatusUpdate, // Added callback to update parent state
}: {
  status: number
  id: number
  onRegister: (id: number) => void
  onViewAssignments: (id: number) => void
  facebookUrl?: string
  onStatusUpdate?: (id: number, newStatus: number) => void // Added callback type
}) {
  const [isActivating, setIsActivating] = useState(false)

  const handleFacebookClick = () => {
    if (facebookUrl) {
      window.open(facebookUrl, "_blank")
    }
  }

  const handleActivate = async () => {
    setIsActivating(true)
    try {
      const response = await fetch("/api/aisensy/update-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wabaId: id }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log("Webhook actualizado exitosamente:", result)

        const updateResponse = await fetch("/api/waba/update-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ wabaId: id, status: 1 }),
        })

        if (updateResponse.ok) {
          console.log("Estado del WABA actualizado a 1")
          if (onStatusUpdate) {
            onStatusUpdate(id, 1)
          }
        } else {
          console.error("Error al actualizar estado del WABA")
        }
      } else {
        console.error("Error al actualizar webhook:", result.error)
      }
    } catch (error) {
      console.error("Error en la llamada API:", error)
    } finally {
      setIsActivating(false)
    }
  }

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
        onClick={() => onViewAssignments(id)}
      >
        <Users className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-3 hover:bg-green-50 hover:text-green-600 disabled:opacity-50"
        onClick={handleActivate}
        disabled={isActivating}
      >
        {isActivating ? "Activando..." : "Activar"}
      </Button>
      {status === 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
          onClick={handleFacebookClick}
        >
          <Facebook className="h-4 w-4" />
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

function TableRowComponent({
  item,
  onRegister,
  onViewAssignments,
  onStatusUpdate, // Added callback prop
}: {
  item: any
  onRegister: (id: number) => void
  onViewAssignments: (id: number) => void
  onStatusUpdate?: (id: number, newStatus: number) => void // Added callback type
}) {
  const firstColumnValue = item.numero
  const IconComponent = MessageCircle

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("es-ES")
  }

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-10 bg-green-600 rounded-full"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <IconComponent className="h-4 w-4 text-green-700" />
            </div>
            <span className="font-mono text-sm font-medium text-gray-900">{firstColumnValue}</span>
          </div>
        </div>
      </td>
      <td className="p-4">
        <span className="font-medium text-gray-900">{item.nombre}</span>
      </td>
      <td className="p-4">
        <span className="text-gray-600 text-sm">{item.descripcion}</span>
      </td>
      <td className="p-4">
        <StatusBadge status={item.estado} />
      </td>
      <td className="p-4">
        <span className="text-gray-500 text-sm">{formatDate(item.fecha_alta)}</span>
      </td>
      <td className="p-4">
        <ActionButtons
          status={item.estado}
          id={item.id}
          onRegister={onRegister}
          onViewAssignments={onViewAssignments}
          facebookUrl={item.url_register_facebook}
          onStatusUpdate={onStatusUpdate} // Pass callback to ActionButtons
        />
      </td>
    </tr>
  )
}

function AddNumberModal({
  isOpen,
  onClose,
  onAdd,
  canalOrganizationId,
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (data: any) => void
  canalOrganizationId: number | null
}) {
  const [formData, setFormData] = useState({
    nombre: "",
    numero: "",
    descripcion: "",
    prefix: "+34",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [aisensyStatus, setAisensyStatus] = useState<string>("")

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre es obligatorio"
    }

    if (!formData.numero.trim()) {
      newErrors.numero = "El número es obligatorio"
    } else if (!/^\d{6,15}$/.test(formData.numero.replace(/\s/g, ""))) {
      newErrors.numero = "El número debe tener entre 6 y 15 dígitos"
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = "La descripción es obligatoria"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!canalOrganizationId) {
      console.error("No canal organization ID available")
      return
    }

    setIsSubmitting(true)
    setAisensyStatus("Guardando número...")

    try {
      const { data, error } = await supabase
        .from("waba")
        .insert({
          nombre: formData.nombre,
          numero: (formData.prefix + formData.numero).replace(/^\+/, ""),
          descripcion: formData.descripcion,
          id_canales_organization: canalOrganizationId,
          estado: 0, // Initially not registered
          fecha_alta: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating WABA:", error)
        setAisensyStatus("Error al guardar el número")
        return
      }

      setAisensyStatus("Registrando en Aisensy...")

      try {
        const response = await fetch("/api/aisensy/register-number", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wabaId: data.id,
            phoneNumber: formData.prefix + formData.numero,
            name: formData.nombre,
            description: formData.descripcion,
          }),
        })

        const aisensyResult = await response.json()

        if (response.ok) {
          setAisensyStatus("¡Número registrado exitosamente!")
          console.log("Aisensy registration successful:", aisensyResult)

          const updatedData = {
            ...data,
            aisensy_status: aisensyResult.status || "registered",
            facebook_url: aisensyResult.facebook_url || null,
          }

          onAdd(updatedData)
        } else {
          console.error("Aisensy registration failed:", aisensyResult)
          setAisensyStatus(`Error en Aisensy: ${aisensyResult.error || "Error desconocido"}`)

          onAdd({
            ...data,
            aisensy_status: "failed",
            aisensy_error: aisensyResult.error,
          })
        }
      } catch (aisensyError) {
        console.error("Error calling Aisensy API:", aisensyError)
        setAisensyStatus("Error de conexión con Aisensy")

        onAdd({
          ...data,
          aisensy_status: "error",
          aisensy_error: "Error de conexión",
        })
      }

      setTimeout(() => {
        setFormData({
          nombre: "",
          numero: "",
          descripcion: "",
          prefix: "+34",
        })
        setErrors({})
        setAisensyStatus("")
        onClose()
      }, 2000)
    } catch (err) {
      console.error("Unexpected error:", err)
      setAisensyStatus("Error inesperado")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      nombre: "",
      numero: "",
      descripcion: "",
      prefix: "+34",
    })
    setErrors({})
    setAisensyStatus("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Número</DialogTitle>
          <p className="text-sm text-muted-foreground">Configura un nuevo número de WhatsApp para tu organización</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre identificativo *</Label>
            <Input
              id="nombre"
              placeholder="Ej: Soporte Principal, Ventas, etc."
              value={formData.nombre}
              onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
              className={errors.nombre ? "border-red-500" : ""}
            />
            {errors.nombre && <p className="text-sm text-red-500">{errors.nombre}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero">Número de teléfono *</Label>
            <div className="flex gap-2">
              <Select
                value={formData.prefix}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, prefix: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countryPrefixes.map((country) => (
                    <SelectItem key={country.code} value={country.prefix}>
                      <div className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.prefix}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="numero"
                placeholder="123456789"
                value={formData.numero}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d\s]/g, "")
                  setFormData((prev) => ({ ...prev, numero: value }))
                }}
                className={`flex-1 ${errors.numero ? "border-red-500" : ""}`}
              />
            </div>
            {errors.numero && <p className="text-sm text-red-500">{errors.numero}</p>}
            <p className="text-xs text-muted-foreground">Introduce solo el número sin el prefijo del país</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              placeholder="Describe el propósito de este número..."
              value={formData.descripcion}
              onChange={(e) => setFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
              className={`resize-none ${errors.descripcion ? "border-red-500" : ""}`}
              rows={3}
            />
            {errors.descripcion && <p className="text-sm text-red-500">{errors.descripcion}</p>}
          </div>

          {aisensyStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2">
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                )}
                <p className="text-sm text-blue-700">{aisensyStatus}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 bg-transparent"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  {aisensyStatus || "Procesando..."}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Número
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function CanalPage({ params }: PageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [canal, setCanal] = useState<Canal | null>(null)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAssignmentsModalOpen, setIsAssignmentsModalOpen] = useState(false)
  const [selectedWabaId, setSelectedWabaId] = useState<number | null>(null)
  const [selectedWabaName, setSelectedWabaName] = useState("")
  const [canalOrganizationId, setCanalOrganizationId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("numbers")

  const itemsPerPage = 8
  const { userProfile, isLoading: authLoading } = useAuth()

  const handleRegister = async (wabaId: number) => {
    try {
      const { error } = await supabase.from("waba").update({ estado: 1 }).eq("id", wabaId)

      if (error) {
        console.error("Error registering WABA:", error)
        return
      }

      setData((prevData) => prevData.map((item) => (item.id === wabaId ? { ...item, estado: 1 } : item)))
    } catch (err) {
      console.error("Error updating WABA status:", err)
    }
  }

  const handleAddNumber = (newNumber: any) => {
    setData((prevData) => [newNumber, ...prevData])
  }

  const handleViewAssignments = (wabaId: number) => {
    const waba = data.find((item) => item.id === wabaId)
    setSelectedWabaId(wabaId)
    setSelectedWabaName(waba?.nombre || "")
    setIsAssignmentsModalOpen(true)
  }

  const handleStatusUpdate = (wabaId: number, newStatus: number) => {
    setData((prevData) => prevData.map((item) => (item.id === wabaId ? { ...item, estado: newStatus } : item)))
  }

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return

      if (!userProfile?.organization_id) {
        setError("No se pudo obtener la organización del usuario")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const resolvedParams = await params
        const canalId = Number.parseInt(resolvedParams.id)

        if (isNaN(canalId)) {
          notFound()
          return
        }

        const { data: canalData, error: canalError } = await supabase
          .from("canales")
          .select("*")
          .eq("id", canalId)
          .single()

        if (canalError || !canalData) {
          setError(canalError?.message || "Canal no encontrado")
          return
        }

        setCanal(canalData)

        const { data: canalOrgs, error: canalOrgError } = await supabase
          .from("canales_organizations")
          .select("id")
          .eq("id_canal", canalId)
          .eq("id_organization", userProfile.organization_id)

        // Si no existe el canal_organization, crearlo
        if (!canalOrgError && (!canalOrgs || canalOrgs.length === 0)) {
          console.log("Creating canal_organization for canal:", canalId, "organization:", userProfile.organization_id)

          const { data: newCanalOrg, error: createError } = await supabase
            .from("canales_organizations")
            .insert({
              id_canal: canalId,
              id_organization: userProfile.organization_id,
              estado: true,
            })
            .select("id")
            .single()

          if (!createError && newCanalOrg) {
            setCanalOrganizationId(newCanalOrg.id)
            console.log("Canal organization created with ID:", newCanalOrg.id)
          } else {
            console.error("Error creating canal_organization:", createError)
            setError("Error creando relación canal-organización")
            return
          }
        } else if (!canalOrgError && canalOrgs && canalOrgs.length > 0) {
          setCanalOrganizationId(canalOrgs[0].id)
          console.log("Canal organization found with ID:", canalOrgs[0].id)
        } else {
          console.error("Error fetching canal_organizations:", canalOrgError)
          setError("Error obteniendo relación canal-organización")
          return
        }

        if (canalData.nombre?.toLowerCase() === "whatsapp") {
          const channelData = await getChannelData(canalId, userProfile.organization_id)
          setData(channelData)
        } else {
          setData([])
        }

        setError(null)
      } catch (err) {
        console.error("Unexpected error:", err)
        setError("Error inesperado al cargar datos")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params, userProfile, authLoading])

  const filteredData = data.filter((item) => {
    const searchFields = Object.values(item).join(" ").toLowerCase()
    return searchFields.includes(searchQuery.toLowerCase())
  })

  const config = canal ? getChannelConfig(canal.nombre) : getChannelConfig("")
  const IconComponent = config.icon

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
              <p className="text-gray-600 font-medium">Cargando canal...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !canal || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-6">
          <Card className="max-w-md mx-auto mt-20">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-500 text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar canal</h3>
              <p className="text-gray-600">{error || "Canal no encontrado o usuario no autenticado"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = filteredData.slice(startIndex, endIndex)

  const activeCount = data.filter((item) => item.estado === 1).length
  const pendingCount = data.filter((item) => item.estado === 0).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 space-y-6">
        <nav className="text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Link href="/dashboard/canales" className="hover:text-gray-700">
              Canales
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{canal.nombre}</span>
          </div>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{canal.nombre}</h1>
              <p className="text-gray-600">Gestiona tus conexiones de {canal.nombre.toLowerCase()}</p>
            </div>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            {config.addButtonText}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{data.length}</p>
                </div>
                <div className={`w-10 h-10 ${config.bgColor} rounded-lg flex items-center justify-center`}>
                  <IconComponent className={`h-5 w-5 ${config.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Activos</p>
                  <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">No Registrados</p>
                  <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                </div>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="numbers">Números</TabsTrigger>
            <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="numbers" className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={config.searchPlaceholder}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    {filteredData.length} resultado{filteredData.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      {config.columns.map((column: string) => (
                        <th key={column} className="h-12 px-4 text-left text-sm font-medium text-gray-700">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((item) => (
                      <TableRowComponent
                        key={item.id}
                        item={item}
                        onRegister={handleRegister}
                        onViewAssignments={handleViewAssignments}
                        onStatusUpdate={handleStatusUpdate} // Pass callback to TableRowComponent
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {filteredData.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchQuery ? "No se encontraron resultados" : `No hay ${canal.nombre.toLowerCase()} configurados`}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? "Intenta con otros términos de búsqueda"
                      : `Comienza añadiendo tu primer ${canal.nombre.toLowerCase()}`}
                  </p>
                </CardContent>
              </Card>
            )}

            {filteredData.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                      <span className="font-medium">{Math.min(endIndex, filteredData.length)}</span> de{" "}
                      <span className="font-medium">{filteredData.length}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-10 h-10 p-0"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            {data.map((waba) => (
              <AssignmentCard
                key={waba.id}
                waba={waba}
                organizationId={userProfile?.organization_id || 0}
                onAssignmentsChange={() => {}}
              />
            ))}
          </TabsContent>
        </Tabs>

        <AddNumberModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddNumber}
          canalOrganizationId={canalOrganizationId}
        />
        <Dialog open={isAssignmentsModalOpen} onOpenChange={setIsAssignmentsModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Asignaciones de Usuario</DialogTitle>
              <p className="text-sm text-muted-foreground">Gestiona las asignaciones para: {selectedWabaName}</p>
            </DialogHeader>

            <div className="mt-4">
              {selectedWabaId && (
                <AssignmentCard
                  waba={
                    data.find((item) => item.id === selectedWabaId) || {
                      id: selectedWabaId,
                      numero: "",
                      nombre: selectedWabaName,
                    }
                  }
                  organizationId={userProfile?.organization_id || 0}
                  onAssignmentsChange={() => {
                    // Optionally refresh data or update UI
                  }}
                />
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={() => setIsAssignmentsModalOpen(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
