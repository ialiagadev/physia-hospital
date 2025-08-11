"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import {
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Tag,
  Sparkles,
  Phone,
  Mail,
  UserPlus,
  Palette,
} from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"
import { DynamicTagBadge } from "@/components/dynamic-tag-badge"

interface Client {
  id: number
  name: string
  email: string | null
  phone: string | null
  full_phone: string | null
  city: string | null
  organization_id: number
}

interface OrganizationTag {
  id: string
  tag_name: string
  color: string
  created_at: string
  usage_count: number
}

interface AddTagToClientDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTagAdded: () => void
  trigger?: React.ReactNode
}

// Etiquetas predefinidas con colores hex directamente
const predefinedTagStyles = [
  { name: "Consulta General", color: "#3B82F6" }, // Azul
  { name: "Urgente", color: "#EF4444" }, // Rojo
  { name: "Seguimiento", color: "#10B981" }, // Verde
  { name: "Cita Pendiente", color: "#F59E0B" }, // Amarillo
  { name: "Tratamiento", color: "#8B5CF6" }, // Morado
  { name: "Rehabilitación", color: "#6366F1" }, // Índigo
  { name: "Dolor Crónico", color: "#F97316" }, // Naranja
  { name: "Primera Consulta", color: "#06B6D4" }, // Cian
]

export function AddTagToClientDialog({ isOpen, onOpenChange, onTagAdded, trigger }: AddTagToClientDialogProps) {
  const [step, setStep] = useState<"selectClient" | "selectTags">("selectClient")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [clientsLoading, setClientsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Estados para etiquetas
  const [organizationTags, setOrganizationTags] = useState<OrganizationTag[]>([])
  const [clientExistingTagIds, setClientExistingTagIds] = useState<string[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#3B82F6")
  const [tagsLoading, setTagsLoading] = useState(false)
  const [assigningTags, setAssigningTags] = useState(false)

  const { userProfile } = useAuth()
  const pageSize = 10

  // Cargar clientes con búsqueda del servidor (solo de la organización)
  const loadClients = useCallback(
    async (page = 1, search = "") => {
      if (!userProfile?.organization_id) return

      setClientsLoading(true)
      try {
        let query = supabase
          .from("clients")
          .select("id, name, email, phone, full_phone, city, organization_id", { count: "exact" })
          .eq("organization_id", userProfile.organization_id)

        // Aplicar búsqueda
        if (search.trim()) {
          const searchLower = search.toLowerCase().trim()
          query = query.or(
            `name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,phone.ilike.%${searchLower}%,full_phone.ilike.%${searchLower}%`,
          )
        }

        // Aplicar paginación
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.order("name", { ascending: true }).range(from, to)

        const { data, error, count } = await query

        if (error) throw error

        setClients(data || [])
        setTotalCount(count || 0)
        setTotalPages(Math.ceil((count || 0) / pageSize))
        setCurrentPage(page)
      } catch (error) {
        console.error("Error loading clients:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        })
      } finally {
        setClientsLoading(false)
      }
    },
    [userProfile?.organization_id],
  )

  // Cargar etiquetas ya asignadas al cliente seleccionado
  const loadClientExistingTags = useCallback(
    async (clientId: number) => {
      if (!userProfile?.organization_id) return

      try {
        const { data, error } = await supabase
          .from("conversation_tags")
          .select("tag_id")
          .eq("client_id", clientId)
          .eq("organization_id", userProfile.organization_id)
          .is("conversation_id", null) // Solo etiquetas directas al cliente

        if (error) throw error

        const existingTagIds = data?.map((item) => item.tag_id) || []
        setClientExistingTagIds(existingTagIds)
      } catch (error) {
        console.error("Error loading client existing tags:", error)
        setClientExistingTagIds([])
      }
    },
    [userProfile?.organization_id],
  )

  // Cargar etiquetas de la organización con estadísticas de uso
  const loadOrganizationTags = useCallback(async () => {
    if (!userProfile?.organization_id) return

    setTagsLoading(true)
    try {
      // Consultar etiquetas de la organización con conteo de uso
      const { data: tagsData, error: tagsError } = await supabase
        .from("organization_tags")
        .select("id, tag_name, color, created_at")
        .eq("organization_id", userProfile.organization_id)
        .order("tag_name", { ascending: true })

      if (tagsError) throw tagsError

      // Obtener conteo de uso para cada etiqueta
      const tagsWithUsage: OrganizationTag[] = []

      for (const tag of tagsData || []) {
        const { count, error: countError } = await supabase
          .from("conversation_tags")
          .select("*", { count: "exact", head: true })
          .eq("tag_id", tag.id)
          .eq("organization_id", userProfile.organization_id)

        if (countError) {
          console.error("Error counting tag usage:", countError)
        }

        tagsWithUsage.push({
          ...tag,
          usage_count: count || 0,
        })
      }

      // Ordenar por uso (más usadas primero)
      tagsWithUsage.sort((a, b) => b.usage_count - a.usage_count)

      setOrganizationTags(tagsWithUsage)
    } catch (error) {
      console.error("Error loading organization tags:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las etiquetas de la organización",
        variant: "destructive",
      })
    } finally {
      setTagsLoading(false)
    }
  }, [userProfile?.organization_id])

  useEffect(() => {
    if (isOpen && step === "selectClient") {
      loadClients(1, clientSearch)
    }
  }, [isOpen, step, loadClients])

  useEffect(() => {
    if (isOpen && step === "selectTags") {
      loadOrganizationTags()
    }
  }, [isOpen, step, loadOrganizationTags])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === "selectClient") {
        loadClients(1, clientSearch)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [clientSearch, loadClients, step])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadClients(page, clientSearch)
    }
  }

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setStep("selectTags")
    // Cargar etiquetas ya asignadas al cliente
    loadClientExistingTags(client.id)
  }

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
  }

  const handleAddNewTag = async () => {
    if (!newTagName.trim() || !userProfile?.organization_id) return

    try {
      // Verificar si ya existe una etiqueta con ese nombre
      const existingTag = organizationTags.find((tag) => tag.tag_name.toLowerCase() === newTagName.trim().toLowerCase())

      if (existingTag) {
        // Si ya existe, simplemente seleccionarla
        if (!selectedTagIds.includes(existingTag.id)) {
          setSelectedTagIds((prev) => [...prev, existingTag.id])
        }
        toast({
          title: "Etiqueta existente",
          description: "La etiqueta ya existe y ha sido seleccionada",
        })
      } else {
        // Crear nueva etiqueta en organization_tags
        const { data: newTag, error } = await supabase
          .from("organization_tags")
          .insert({
            organization_id: userProfile.organization_id,
            tag_name: newTagName.trim(),
            color: newTagColor,
            created_by: userProfile.id,
          })
          .select()
          .single()

        if (error) throw error

        // Agregar a la lista local
        const newTagWithUsage: OrganizationTag = {
          ...newTag,
          usage_count: 0,
        }

        setOrganizationTags((prev) => [newTagWithUsage, ...prev])
        setSelectedTagIds((prev) => [...prev, newTag.id])

        toast({
          title: "Etiqueta creada",
          description: `La etiqueta "${newTag.tag_name}" se ha creado y seleccionado`,
        })
      }

      setNewTagName("")
      setNewTagColor("#3B82F6")
    } catch (error) {
      console.error("Error creating tag:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la etiqueta",
        variant: "destructive",
      })
    }
  }

  const handlePredefinedTagSelect = async (tagName: string, tagColor: string) => {
    if (!userProfile?.organization_id) return

    try {
      // Verificar si ya existe
      const existingTag = organizationTags.find((tag) => tag.tag_name === tagName)

      if (existingTag) {
        handleTagToggle(existingTag.id)
      } else {
        // Crear la etiqueta predefinida
        const { data: newTag, error } = await supabase
          .from("organization_tags")
          .insert({
            organization_id: userProfile.organization_id,
            tag_name: tagName,
            color: tagColor,
            created_by: userProfile.id,
          })
          .select()
          .single()

        if (error) throw error

        const newTagWithUsage: OrganizationTag = {
          ...newTag,
          usage_count: 0,
        }

        setOrganizationTags((prev) => [newTagWithUsage, ...prev])
        setSelectedTagIds((prev) => [...prev, newTag.id])
      }
    } catch (error) {
      console.error("Error handling predefined tag:", error)
      toast({
        title: "Error",
        description: "No se pudo procesar la etiqueta predefinida",
        variant: "destructive",
      })
    }
  }

  const handleAssignTags = async () => {
    if (!selectedClient || selectedTagIds.length === 0 || !userProfile?.organization_id) return

    setAssigningTags(true)
    try {
      // Verificar qué etiquetas ya están asignadas al cliente
      const { data: existingAssignments, error: checkError } = await supabase
        .from("conversation_tags")
        .select("tag_id")
        .eq("client_id", selectedClient.id)
        .eq("organization_id", userProfile.organization_id)
        .is("conversation_id", null) // Solo etiquetas directas al cliente

      if (checkError) throw checkError

      const existingTagIds = existingAssignments?.map((assignment) => assignment.tag_id) || []
      const newTagIds = selectedTagIds.filter((tagId) => !existingTagIds.includes(tagId))

      if (newTagIds.length === 0) {
        toast({
          title: "Sin cambios",
          description: "Todas las etiquetas seleccionadas ya están asignadas a este cliente",
        })
        return
      }

      // Crear las asignaciones de etiquetas al cliente
      const tagsToInsert = newTagIds.map((tagId) => ({
        tag_id: tagId,
        client_id: selectedClient.id,
        organization_id: userProfile.organization_id,
        conversation_id: null, // Asignación directa al cliente
        created_by: userProfile.id,
      }))

      const { error } = await supabase.from("conversation_tags").insert(tagsToInsert)

      if (error) throw error

      toast({
        title: "🎉 Etiquetas asignadas",
        description: `Se asignaron ${newTagIds.length} etiqueta${newTagIds.length !== 1 ? "s" : ""} nueva${newTagIds.length !== 1 ? "s" : ""} a ${selectedClient.name}`,
      })

      // Reset y cerrar
      handleClose()
      onTagAdded()
    } catch (error) {
      console.error("Error assigning tags:", error)
      toast({
        title: "Error",
        description: "No se pudieron asignar las etiquetas",
        variant: "destructive",
      })
    } finally {
      setAssigningTags(false)
    }
  }

  const handleClose = () => {
    setStep("selectClient")
    setSelectedClient(null)
    setClients([])
    setClientSearch("")
    setClientExistingTagIds([])
    setSelectedTagIds([])
    setNewTagName("")
    setNewTagColor("#3B82F6")
    setCurrentPage(1)
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 bg-white rounded-2xl shadow-2xl">
        {/* Header fijo */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b border-gray-100">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
            {step === "selectClient" ? (
              <>
                <UserPlus className="w-6 h-6 text-purple-600" />
                Seleccionar Cliente
              </>
            ) : (
              <>
                <Tag className="w-6 h-6 text-purple-600" />
                Asignar Etiquetas a {selectedClient?.name}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6">
            <div className="py-4 space-y-6">
              {step === "selectClient" ? (
                <>
                  {/* Búsqueda de clientes */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-2xl opacity-20 blur-lg"></div>
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                      <Input
                        placeholder="Buscar cliente por nombre, email o teléfono... 🔍"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="pl-12 pr-4 py-3 bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 text-lg placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Lista de clientes */}
                  <div className="space-y-3 min-h-[300px]">
                    {clientsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                      </div>
                    ) : clients.length > 0 ? (
                      clients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className="relative group cursor-pointer"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-2xl opacity-0 group-hover:opacity-20 blur-lg transition-all duration-300"></div>
                          <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-lg">
                                  {client.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg text-gray-800">{client.name}</h3>
                                <div className="flex items-center gap-4 mt-1">
                                  {client.email && (
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                      <Mail className="w-4 h-4" />
                                      <span>{client.email}</span>
                                    </div>
                                  )}
                                  {client.full_phone && (
                                    <div className="flex items-center gap-1 text-sm text-gray-600">
                                      <Phone className="w-4 h-4" />
                                      <span>{client.full_phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl"
                                >
                                  Seleccionar
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {clientSearch
                            ? `No se encontraron clientes para "${clientSearch}"`
                            : "No hay clientes disponibles"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="text-sm text-gray-600">
                        Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, totalCount)} de{" "}
                        {totalCount} clientes
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage <= 1}
                          className="rounded-xl"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium">
                          {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="rounded-xl"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Cliente seleccionado */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 rounded-2xl opacity-20 blur-lg"></div>
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">
                              {selectedClient?.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{selectedClient?.name}</h3>
                            <p className="text-sm text-gray-600">
                              {selectedClient?.email || selectedClient?.full_phone}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setStep("selectClient")}
                          className="rounded-xl"
                        >
                          Cambiar Cliente
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Etiquetas ya asignadas al cliente (solo informativo) */}
                  {clientExistingTagIds.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-lg font-medium text-gray-700 flex items-center gap-2">
                        <Tag className="w-5 h-5 text-green-600" />
                        Etiquetas ya asignadas ({clientExistingTagIds.length})
                      </Label>
                      <div className="flex flex-wrap gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                        {clientExistingTagIds.map((tagId) => {
                          const tag = organizationTags.find((t) => t.id === tagId)
                          if (!tag) return null

                          return (
                            <DynamicTagBadge
                              key={tagId}
                              tagName={tag.tag_name}
                              color={tag.color}
                              className="text-sm rounded-xl opacity-75"
                            />
                          )
                        })}
                      </div>
                      <p className="text-sm text-green-700 bg-green-100 p-2 rounded-lg">
                        ✅ Estas etiquetas ya están asignadas a este cliente
                      </p>
                    </div>
                  )}

                  {/* Etiquetas seleccionadas */}
                  {selectedTagIds.length > 0 && (
                    <div>
                      <Label className="text-lg font-medium text-gray-700 mb-3 block">
                        Etiquetas seleccionadas ({selectedTagIds.length})
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedTagIds.map((tagId) => {
                          const tag = organizationTags.find((t) => t.id === tagId)
                          if (!tag) return null

                          return (
                            <DynamicTagBadge
                              key={tagId}
                              tagName={tag.tag_name}
                              color={tag.color}
                              className="text-sm rounded-xl cursor-pointer"
                              onClick={() => handleTagToggle(tagId)}
                            >
                              <X className="w-3 h-3 ml-2" />
                            </DynamicTagBadge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Etiquetas predefinidas */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium text-gray-700 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Etiquetas predefinidas
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {predefinedTagStyles
                        .filter((predefinedTag) => {
                          const existingTag = organizationTags.find((t) => t.tag_name === predefinedTag.name)
                          return !existingTag || !clientExistingTagIds.includes(existingTag.id)
                        })
                        .map((predefinedTag) => {
                          const existingTag = organizationTags.find((t) => t.tag_name === predefinedTag.name)
                          const isSelected = existingTag ? selectedTagIds.includes(existingTag.id) : false

                          return (
                            <div
                              key={predefinedTag.name}
                              onClick={() => handlePredefinedTagSelect(predefinedTag.name, predefinedTag.color)}
                              className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                                isSelected
                                  ? "border-purple-300 bg-purple-50"
                                  : "border-gray-200 hover:border-gray-300 bg-white"
                              }`}
                            >
                              <DynamicTagBadge
                                tagName={predefinedTag.name}
                                color={predefinedTag.color}
                                className="text-sm rounded-lg w-full justify-center"
                              />
                            </div>
                          )
                        })}
                    </div>
                  </div>

                  <Separator />

                  {/* Crear nueva etiqueta */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium text-gray-700 flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Crear nueva etiqueta
                    </Label>
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <Input
                          placeholder="Nombre de la etiqueta..."
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="flex-1 rounded-xl"
                          onKeyPress={(e) => e.key === "Enter" && handleAddNewTag()}
                        />
                        <Button
                          onClick={handleAddNewTag}
                          disabled={!newTagName.trim()}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl px-4"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Vista previa */}
                      {newTagName && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Vista previa:</span>
                          <DynamicTagBadge
                            tagName={newTagName}
                            color={newTagColor}
                            className="text-sm rounded-xl shadow-lg"
                          />
                        </div>
                      )}

                      {/* Selector de color simple */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Color de la etiqueta</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={newTagColor}
                            onChange={(e) => setNewTagColor(e.target.value)}
                            className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                          />
                          <div className="text-sm text-gray-600 font-mono">{newTagColor}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Etiquetas existentes */}
                  <div className="space-y-4">
                    <Label className="text-lg font-medium text-gray-700">Etiquetas disponibles</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {tagsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                        </div>
                      ) : organizationTags.filter((tag) => !clientExistingTagIds.includes(tag.id)).length > 0 ? (
                        organizationTags
                          .filter((tag) => !clientExistingTagIds.includes(tag.id))
                          .map((tag) => (
                            <div
                              key={tag.id}
                              onClick={() => handleTagToggle(tag.id)}
                              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                                selectedTagIds.includes(tag.id)
                                  ? "bg-purple-100 border-2 border-purple-300"
                                  : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <DynamicTagBadge
                                  tagName={tag.tag_name}
                                  color={tag.color}
                                  className="text-sm rounded-lg"
                                />
                                <span className="text-sm text-gray-500">
                                  Usada {tag.usage_count} vez{tag.usage_count !== 1 ? "es" : ""}
                                </span>
                              </div>
                              {selectedTagIds.includes(tag.id) && (
                                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                                  <X className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                          ))
                      ) : (
                        <div className="text-center py-4">
                          <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">
                            {clientExistingTagIds.length > 0
                              ? "Todas las etiquetas disponibles ya están asignadas a este cliente"
                              : "No hay etiquetas disponibles"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer fijo con botones */}
        {step === "selectTags" && (
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose} className="rounded-xl px-6 bg-white">
                Cancelar
              </Button>
              <Button
                onClick={handleAssignTags}
                disabled={selectedTagIds.length === 0 || assigningTags}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl px-6 shadow-lg"
              >
                {assigningTags ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Asignando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Asignar {selectedTagIds.length} Etiqueta{selectedTagIds.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
