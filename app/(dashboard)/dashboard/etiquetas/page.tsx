"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { Plus, Tag, Phone, Mail, Edit2, Trash2, Search, Users, Palette, Star, UserPlus, Check, X } from "lucide-react"
import { AddTagToClientDialog } from "@/components/add-tag-to-client-dialog"
import { TagsFilter } from "@/components/tags-filter"
import { QuickTagAssign } from "@/components/quick-tag-assign"
import { useAuth } from "@/app/contexts/auth-context"
import { generateTagStyle } from "@/lib/dynamic-tag-colors"

interface ClientWithTags {
  id: number
  name: string
  email: string | null
  phone: string | null
  full_phone: string | null
  organization_id: number
  tags: {
    tag_id: string
    tag_name: string
    color: string
    assigned_at: string
  }[]
}

interface OrganizationTag {
  id: string
  tag_name: string
  color: string
  created_at: string
  usage_count: number
}

export default function TagsPage() {
  const [clientsWithTags, setClientsWithTags] = useState<ClientWithTags[]>([])
  const [organizationTags, setOrganizationTags] = useState<OrganizationTag[]>([])
  const [filteredClients, setFilteredClients] = useState<ClientWithTags[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTagsFilter, setSelectedTagsFilter] = useState<string[]>([])

  // Estados para controlar modales principales
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAddToClientDialogOpen, setIsAddToClientDialogOpen] = useState(false)

  const { userProfile } = useAuth()

  useEffect(() => {
    if (userProfile?.organization_id) {
      loadData()
    }
  }, [userProfile])

  useEffect(() => {
    let filtered = clientsWithTags

    if (searchTerm) {
      filtered = filtered.filter(
        (client) =>
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.tags.some((tag) => tag.tag_name.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (selectedTagsFilter.length > 0) {
      filtered = filtered.filter((client) =>
        selectedTagsFilter.some((selectedTagId) => client.tags.some((tag) => tag.tag_id === selectedTagId)),
      )
    }

    setFilteredClients(filtered)
  }, [clientsWithTags, searchTerm, selectedTagsFilter])

  const loadData = async () => {
    if (!userProfile?.organization_id) return
    setLoading(true)
    try {
      await loadOrganizationTags()
      await loadClientsWithTags()
    } finally {
      setLoading(false)
    }
  }

  const loadOrganizationTags = async () => {
    if (!userProfile?.organization_id) return

    try {
      const { data, error } = await supabase
        .from("tag_usage_stats")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("clients_count", { ascending: false })

      if (error) throw error

      const tagsWithUsage: OrganizationTag[] = (data || []).map((tag) => ({
        id: tag.tag_id,
        tag_name: tag.tag_name,
        color: tag.color,
        created_at: "",
        usage_count: tag.clients_count,
      }))

      setOrganizationTags(tagsWithUsage)
    } catch (error) {
      console.error("Error loading organization tags:", error)
    }
  }

  const loadClientsWithTags = async () => {
    if (!userProfile?.organization_id) return

    try {
      const { data, error } = await supabase
        .from("client_tags_view")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("client_name", { ascending: true })

      if (error) throw error

      const clientsMap = new Map<number, ClientWithTags>()

      data?.forEach((item: any) => {
        const clientId = item.client_id
        if (!clientsMap.has(clientId)) {
          clientsMap.set(clientId, {
            id: clientId,
            name: item.client_name,
            email: item.email,
            phone: item.phone,
            full_phone: item.full_phone,
            organization_id: item.organization_id,
            tags: [],
          })
        }

        clientsMap.get(clientId)?.tags.push({
          tag_id: item.tag_id,
          tag_name: item.tag_name,
          color: item.color,
          assigned_at: item.assigned_at,
        })
      })

      setClientsWithTags(Array.from(clientsMap.values()))
    } catch (error) {
      console.error("Error loading clients with tags:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes con etiquetas",
        variant: "destructive",
      })
    }
  }

  const handleCreateGlobalTag = async (tagName: string, color: string): Promise<boolean> => {
    if (!userProfile?.organization_id) {
      toast({
        title: "Error",
        description: "No se pudo obtener la información de la organización",
        variant: "destructive",
      })
      return false
    }

    try {
      const { data, error } = await supabase
        .from("organization_tags")
        .insert({
          organization_id: userProfile.organization_id,
          tag_name: tagName,
          color: color,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) throw error

      setOrganizationTags((prev) => [{ ...data, usage_count: 0 }, ...prev])

      toast({
        title: "Etiqueta creada",
        description: `La etiqueta "${tagName}" se ha creado correctamente`,
      })

      return true
    } catch (error) {
      console.error("Error creating global tag:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la etiqueta",
        variant: "destructive",
      })
      return false
    }
  }

  const handleDeleteGlobalTag = async (tagId: string, tagName: string) => {
    try {
      const { error: deleteError } = await supabase.from("organization_tags").delete().eq("id", tagId)

      if (deleteError) throw deleteError

      setOrganizationTags((prev) => prev.filter((tag) => tag.id !== tagId))
      setClientsWithTags((prev) =>
        prev
          .map((client) => ({
            ...client,
            tags: client.tags.filter((tag) => tag.tag_id !== tagId),
          }))
          .filter((client) => client.tags.length > 0),
      )

      toast({
        title: "Etiqueta eliminada",
        description: "La etiqueta y todas sus asignaciones se han eliminado",
      })
    } catch (error) {
      console.error("Error deleting global tag:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la etiqueta",
        variant: "destructive",
      })
    }
  }

  const handleUpdateTagColor = async (tagId: string, newColor: string) => {
    try {
      const { error } = await supabase.from("organization_tags").update({ color: newColor }).eq("id", tagId)

      if (error) throw error

      setClientsWithTags((prev) =>
        prev.map((client) => ({
          ...client,
          tags: client.tags.map((tag) => (tag.tag_id === tagId ? { ...tag, color: newColor } : tag)),
        })),
      )

      setOrganizationTags((prev) => prev.map((tag) => (tag.id === tagId ? { ...tag, color: newColor } : tag)))

      toast({
        title: "Color actualizado",
        description: "El color de la etiqueta se ha actualizado correctamente",
      })
    } catch (error) {
      console.error("Error updating tag color:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el color de la etiqueta",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from("conversation_tags")
        .delete()
        .eq("tag_id", tagId)
        .eq("organization_id", userProfile?.organization_id)

      if (error) throw error

      setClientsWithTags((prev) =>
        prev
          .map((client) => ({
            ...client,
            tags: client.tags.filter((tag) => tag.tag_id !== tagId),
          }))
          .filter((client) => client.tags.length > 0),
      )

      loadOrganizationTags()

      toast({
        title: "Etiqueta eliminada",
        description: "La etiqueta se ha eliminado correctamente de todas las conversaciones y clientes",
      })
    } catch (error) {
      console.error("Error deleting tag:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la etiqueta",
        variant: "destructive",
      })
    }
  }

  const totalTags = clientsWithTags.reduce((acc, client) => acc + client.tags.length, 0)
  const uniqueTagIds = new Set(clientsWithTags.flatMap((client) => client.tags.map((tag) => tag.tag_id)))

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Tag className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Gestión de Etiquetas</h1>
                  <p className="text-slate-600 mt-1">Administra las etiquetas de tus clientes</p>
                </div>
              </div>
              <div className="flex gap-3">
                <AddTagToClientDialog
                  isOpen={isAddToClientDialogOpen}
                  onOpenChange={setIsAddToClientDialogOpen}
                  onTagAdded={loadData}
                  trigger={
                    <Button
                      variant="outline"
                      className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-transparent"
                    >
                      <UserPlus className="w-4 h-4" />
                      Asignar a Cliente
                    </Button>
                  }
                />
                <CreateTagDialog
                  isOpen={isCreateDialogOpen}
                  onOpenChange={setIsCreateDialogOpen}
                  onTagCreated={handleCreateGlobalTag}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Total Clientes</p>
                    <p className="text-2xl font-bold text-blue-900">{clientsWithTags.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-700 font-medium">Etiquetas Asignadas</p>
                    <p className="text-2xl font-bold text-emerald-900">{totalTags}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Tipos Únicos</p>
                    <p className="text-2xl font-bold text-purple-900">{uniqueTagIds.size}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 font-medium">Etiquetas Globales</p>
                    <p className="text-2xl font-bold text-amber-900">{organizationTags.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Tags */}
        {organizationTags.length > 0 && (
          <div className="mb-8">
            <Card className="border-slate-200 shadow-sm bg-white rounded-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Palette className="w-4 h-4 text-white" />
                  </div>
                  Etiquetas Globales
                  <div className="ml-2 px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                    {organizationTags.length}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {organizationTags.map((tag) => (
                    <GlobalTagBadge
                      key={tag.id}
                      tag={tag}
                      onDelete={() => handleDeleteGlobalTag(tag.id, tag.tag_name)}
                      onColorChange={(newColor) => handleUpdateTagColor(tag.id, newColor)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar clientes, emails o etiquetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg"
              />
            </div>
          </div>
          <TagsFilter
            selectedTags={selectedTagsFilter}
            onTagsChange={setSelectedTagsFilter}
            organizationId={userProfile?.organization_id}
          />
        </div>

        {/* Client List */}
        <div className="space-y-4">
          {filteredClients.length === 0 ? (
            <Card className="border-slate-200 shadow-sm bg-white rounded-xl">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Tag className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {selectedTagsFilter.length > 0 || searchTerm ? "No se encontraron resultados" : "No hay etiquetas"}
                </h3>
                <p className="text-slate-600 mb-6">
                  {selectedTagsFilter.length > 0 || searchTerm
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "No se encontraron clientes con etiquetas. ¡Crea algunas!"}
                </p>
                {!selectedTagsFilter.length && !searchTerm && (
                  <AddTagToClientDialog
                    isOpen={false}
                    onOpenChange={() => {}}
                    onTagAdded={loadData}
                    trigger={
                      <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                        <UserPlus className="w-4 h-4" />
                        Asignar Primera Etiqueta
                      </Button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client) => (
              <Card
                key={client.id}
                className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 bg-white rounded-xl hover:border-slate-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-white font-semibold text-lg">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-slate-900 mb-1">{client.name}</h3>
                          <div className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium inline-block">
                            {client.tags.length} etiqueta{client.tags.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <QuickTagAssign
                          clientId={client.id}
                          organizationId={client.organization_id}
                          existingTagIds={client.tags.map((t) => t.tag_id)}
                          onTagAssigned={loadData}
                        />
                      </div>

                      <div className="space-y-2 mb-4">
                        {client.email && (
                          <div className="flex items-center gap-3 text-slate-600">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Mail className="w-4 h-4 text-blue-600" />
                            </div>
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.full_phone && (
                          <div className="flex items-center gap-3 text-slate-600">
                            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                              <Phone className="w-4 h-4 text-emerald-600" />
                            </div>
                            <span>{client.full_phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {client.tags.map((tag) => (
                          <TagBadge
                            key={tag.tag_id}
                            tag={tag}
                            onColorChange={(newColor) => handleUpdateTagColor(tag.tag_id, newColor)}
                            onDelete={() => handleDeleteTag(tag.tag_id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function CreateTagDialog({
  isOpen,
  onOpenChange,
  onTagCreated,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTagCreated: (tagName: string, color: string) => Promise<boolean>
}) {
  const [tagName, setTagName] = useState("")
  const [tagColor, setTagColor] = useState("#3B82F6")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return

    setLoading(true)
    try {
      const success = await onTagCreated(tagName.trim(), tagColor)
      if (success) {
        setTagName("")
        setTagColor("#3B82F6")
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  // Generar estilo dinámico para la vista previa
  const previewStyle = generateTagStyle(tagColor)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
          <Plus className="w-4 h-4" />
          Nueva Etiqueta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            Crear Nueva Etiqueta
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="tagName" className="text-slate-700 font-medium">
              Nombre de la etiqueta
            </Label>
            <Input
              id="tagName"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Ej: Urgente, Seguimiento..."
              className="mt-1 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <Label className="text-slate-700 font-medium">Color</Label>
            <div className="mt-2 space-y-3">
              {/* Vista previa */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">Vista previa:</span>
                <div className="px-3 py-1 rounded-lg text-sm font-medium border" style={previewStyle.style}>
                  {tagName || "Etiqueta de ejemplo"}
                </div>
              </div>

              {/* Selector de color simple */}
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <div className="text-sm text-slate-600 font-mono">{tagColor}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-slate-200">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !tagName.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creando...
                </>
              ) : (
                "Crear Etiqueta"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GlobalTagBadge({
  tag,
  onDelete,
  onColorChange,
}: {
  tag: OrganizationTag
  onDelete: () => void
  onColorChange: (color: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempColor, setTempColor] = useState(tag.color)

  const handleColorSave = () => {
    onColorChange(tempColor)
    setIsEditing(false)
  }

  const handleColorCancel = () => {
    setTempColor(tag.color)
    setIsEditing(false)
  }

  // Generar estilo dinámico
  const tagStyle = generateTagStyle(tag.color)

  return (
    <div className="relative group">
      <div
        className="px-3 py-1 pr-16 border-0 shadow-sm font-medium rounded-lg text-sm cursor-pointer"
        style={tagStyle.style}
      >
        {tag.tag_name} ({tag.usage_count})
      </div>

      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 -translate-y-1 translate-x-1">
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50"
            >
              <Edit2 className="h-3 w-3 text-slate-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">Editar Color</h4>
              </div>

              <div>
                <Label className="text-sm text-slate-700 font-medium">Etiqueta: {tag.tag_name}</Label>
                <div className="mt-2 space-y-3">
                  {/* Vista previa */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">Vista previa:</span>
                    <div
                      className="px-3 py-1 rounded-lg text-sm font-medium border"
                      style={generateTagStyle(tempColor).style}
                    >
                      {tag.tag_name}
                    </div>
                  </div>

                  {/* Selector de color */}
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      className="w-10 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <div className="text-sm text-slate-600 font-mono">{tempColor}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={handleColorCancel} className="h-8 bg-transparent">
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleColorSave} className="h-8 bg-blue-600 hover:bg-blue-700">
                  <Check className="w-3 h-3 mr-1" />
                  Guardar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 bg-white border border-slate-200 shadow-sm rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function TagBadge({
  tag,
  onColorChange,
  onDelete,
}: {
  tag: { tag_id: string; tag_name: string; color: string }
  onColorChange: (color: string) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempColor, setTempColor] = useState(tag.color)

  const handleColorSave = () => {
    onColorChange(tempColor)
    setIsEditing(false)
  }

  const handleColorCancel = () => {
    setTempColor(tag.color)
    setIsEditing(false)
  }

  // Generar estilo dinámico
  const tagStyle = generateTagStyle(tag.color)

  return (
    <div className="relative group">
      <div
        className="px-3 py-1 pr-12 border-0 shadow-sm font-medium rounded-lg text-sm cursor-pointer"
        style={tagStyle.style}
      >
        {tag.tag_name}
      </div>

      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 -translate-y-1 translate-x-1">
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50"
            >
              <Edit2 className="h-3 w-3 text-slate-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-slate-600" />
                <h4 className="font-medium text-slate-900">Editar Color</h4>
              </div>

              <div>
                <Label className="text-sm text-slate-700 font-medium">Etiqueta: {tag.tag_name}</Label>
                <div className="mt-2 space-y-3">
                  {/* Vista previa */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">Vista previa:</span>
                    <div
                      className="px-3 py-1 rounded-lg text-sm font-medium border"
                      style={generateTagStyle(tempColor).style}
                    >
                      {tag.tag_name}
                    </div>
                  </div>

                  {/* Selector de color */}
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      className="w-10 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <div className="text-sm text-slate-600 font-mono">{tempColor}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={handleColorCancel} className="h-8 bg-transparent">
                  <X className="w-3 h-3 mr-1" />
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleColorSave} className="h-8 bg-blue-600 hover:bg-blue-700">
                  <Check className="w-3 h-3 mr-1" />
                  Guardar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 bg-white border border-slate-200 shadow-sm rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
