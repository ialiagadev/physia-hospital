"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { Plus, Tag, Phone, Mail, Edit2, Trash2, Search, Sparkles, Users, Palette, Star, UserPlus } from 'lucide-react'
import { AddTagToClientDialog } from "@/components/add-tag-to-client-dialog"
import { TagsFilter } from "@/components/tags-filter"
import { QuickTagAssign } from "@/components/quick-tag-assign"
import { useAuth } from "@/app/contexts/auth-context"

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
  const [selectedTagsFilter, setSelectedTagsFilter] = useState<string[]>([]) // ✨ Ahora son tag_ids
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isAddToClientDialogOpen, setIsAddToClientDialogOpen] = useState(false)
  
  const { userProfile } = useAuth()

  useEffect(() => {
    if (userProfile?.organization_id) {
      loadData()
    }
  }, [userProfile])

  useEffect(() => {
    // Aplicar filtros
    let filtered = clientsWithTags

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.tags.some(tag => tag.tag_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // ✨ Filtro por etiquetas seleccionadas (usando tag_ids)
    if (selectedTagsFilter.length > 0) {
      filtered = filtered.filter(client =>
        selectedTagsFilter.some(selectedTagId =>
          client.tags.some(tag => tag.tag_id === selectedTagId)
        )
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
      // ✨ Usar la vista de estadísticas optimizada
      const { data, error } = await supabase
        .from("tag_usage_stats")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("clients_count", { ascending: false })

      if (error) throw error

      const tagsWithUsage: OrganizationTag[] = (data || []).map(tag => ({
        id: tag.tag_id,
        tag_name: tag.tag_name,
        color: tag.color,
        created_at: '', // No necesario para esta vista
        usage_count: tag.clients_count
      }))

      setOrganizationTags(tagsWithUsage)
    } catch (error) {
      console.error("Error loading organization tags:", error)
    }
  }

  const loadClientsWithTags = async () => {
    if (!userProfile?.organization_id) return

    try {
      // ✨ Usar la vista optimizada client_tags_view
      const { data, error } = await supabase
        .from("client_tags_view")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("client_name", { ascending: true })

      if (error) throw error

      // ✨ Agrupar por cliente
      const clientsMap = new Map<number, ClientWithTags>()
      
      data?.forEach((item: any) => {
        const clientId = item.client_id
        
        // Crear cliente si no existe
        if (!clientsMap.has(clientId)) {
          clientsMap.set(clientId, {
            id: clientId,
            name: item.client_name,
            email: item.email,
            phone: item.phone,
            full_phone: item.full_phone,
            organization_id: item.organization_id,
            tags: []
          })
        }
        
        // Añadir etiqueta
        clientsMap.get(clientId)?.tags.push({
          tag_id: item.tag_id,
          tag_name: item.tag_name,
          color: item.color,
          assigned_at: item.assigned_at
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
          created_by: userProfile.id
        })
        .select()
        .single()

      if (error) throw error

      setOrganizationTags(prev => [{ ...data, usage_count: 0 }, ...prev])

      toast({
        title: "🎉 Etiqueta creada",
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
      // ✨ Al eliminar de organization_tags, CASCADE eliminará las asignaciones
      const { error: deleteError } = await supabase
        .from("organization_tags")
        .delete()
        .eq("id", tagId)

      if (deleteError) throw deleteError

      // Actualizar estados locales
      setOrganizationTags(prev => prev.filter(tag => tag.id !== tagId))
      setClientsWithTags(prev => 
        prev.map(client => ({
          ...client,
          tags: client.tags.filter(tag => tag.tag_id !== tagId)
        })).filter(client => client.tags.length > 0)
      )

      toast({
        title: "🗑️ Etiqueta eliminada",
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
      // ✨ Actualizar en organization_tags (tabla maestra)
      const { error } = await supabase
        .from("organization_tags")
        .update({ color: newColor })
        .eq("id", tagId)

      if (error) throw error

      // Actualizar el estado local
      setClientsWithTags(prev => 
        prev.map(client => ({
          ...client,
          tags: client.tags.map(tag => 
            tag.tag_id === tagId ? { ...tag, color: newColor } : tag
          )
        }))
      )

      setOrganizationTags(prev =>
        prev.map(tag => 
          tag.id === tagId ? { ...tag, color: newColor } : tag
        )
      )

      toast({
        title: "🎨 Color actualizado",
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
      // ✨ Eliminar todas las asignaciones de esta etiqueta
      const { error } = await supabase
        .from("conversation_tags")
        .delete()
        .eq("tag_id", tagId)
        .eq("organization_id", userProfile?.organization_id)

      if (error) throw error

      // Actualizar el estado local
      setClientsWithTags(prev => 
        prev.map(client => ({
          ...client,
          tags: client.tags.filter(tag => tag.tag_id !== tagId)
        })).filter(client => client.tags.length > 0)
      )

      // Recargar contadores de uso
      loadOrganizationTags()

      toast({
        title: "🗑️ Etiqueta eliminada",
        description: "La etiqueta se ha eliminado correctamente",
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
  const uniqueTagIds = new Set(clientsWithTags.flatMap(client => client.tags.map(tag => tag.tag_id)))

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-purple-600 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl opacity-10 blur-xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Tag className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Gestión de Etiquetas
                  </h1>
                  <p className="text-gray-600 mt-2 text-lg">Administra las etiquetas de tus clientes con estilo ✨</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <AddTagToClientDialog
                  isOpen={isAddToClientDialogOpen}
                  onOpenChange={setIsAddToClientDialogOpen}
                  onTagAdded={loadData}
                  trigger={
                    <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 text-lg">
                      <UserPlus className="w-5 h-5 mr-2" />
                      Asignar a Cliente
                      <Sparkles className="w-4 h-4 ml-2" />
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

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8" />
                  <div>
                    <p className="text-purple-100 text-sm">Total Clientes</p>
                    <p className="text-2xl font-bold">{clientsWithTags.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                  <Tag className="w-8 h-8" />
                  <div>
                    <p className="text-blue-100 text-sm">Etiquetas Únicas</p>
                    <p className="text-2xl font-bold">{totalTags}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8" />
                  <div>
                    <p className="text-indigo-100 text-sm">Tipos Únicos</p>
                    <p className="text-2xl font-bold">{uniqueTagIds.size}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-3">
                  <Palette className="w-8 h-8" />
                  <div>
                    <p className="text-green-100 text-sm">Etiquetas Globales</p>
                    <p className="text-2xl font-bold">{organizationTags.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Etiquetas globales */}
        {organizationTags.length > 0 && (
          <div className="mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 rounded-3xl opacity-10 blur-xl"></div>
              <Card className="relative bg-white/80 backdrop-blur-sm border-white/20 shadow-xl rounded-3xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Palette className="w-6 h-6 text-green-600" />
                    Etiquetas Globales de la Organización
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {organizationTags.map((tag) => (
                      <GlobalTagBadge
                        key={tag.id}
                        tag={tag}
                        onDelete={() => handleDeleteGlobalTag(tag.id, tag.tag_name)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="mb-8 space-y-4">
          {/* Barra de búsqueda */}
          <div className="relative max-w-md">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 rounded-2xl opacity-20 blur-lg"></div>
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                placeholder="Buscar por cliente, email o etiqueta... 🔍"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 bg-transparent border-0 focus:ring-2 focus:ring-purple-500/20 text-lg placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Filtro por etiquetas */}
          <TagsFilter
            selectedTags={selectedTagsFilter}
            onTagsChange={setSelectedTagsFilter}
            organizationId={userProfile?.organization_id}
          />
        </div>

        {/* Lista de clientes con etiquetas */}
        <div className="grid gap-6">
          {filteredClients.length === 0 ? (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl opacity-20 blur-xl"></div>
              <Card className="relative bg-white/80 backdrop-blur-sm border-white/20 shadow-xl rounded-3xl">
                <CardContent className="p-12 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Tag className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-3">
                    {selectedTagsFilter.length > 0 || searchTerm ? "No se encontraron resultados" : "No hay etiquetas"}
                  </h3>
                  <p className="text-gray-500 text-lg mb-6">
                    {selectedTagsFilter.length > 0 || searchTerm 
                      ? "Intenta ajustar los filtros de búsqueda" 
                      : "No se encontraron clientes con etiquetas. ¡Crea algunas! 🏷️"
                    }
                  </p>
                  {!selectedTagsFilter.length && !searchTerm && (
                    <AddTagToClientDialog
                      isOpen={false}
                      onOpenChange={() => {}}
                      onTagAdded={loadData}
                      trigger={
                        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl px-6 py-3">
                          <UserPlus className="w-5 h-5 mr-2" />
                          Asignar Primera Etiqueta
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            filteredClients.map((client, index) => (
              <div key={client.id} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500"></div>
                <Card className="relative bg-white/90 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-3xl group-hover:scale-[1.02] group-hover:bg-white/95">
                  <CardContent className="p-8">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                              <span className="text-white font-bold text-lg">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full border-2 border-white"></div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-800 mb-1">{client.name}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200 text-purple-700">
                                {client.tags.length} etiqueta{client.tags.length !== 1 ? 's' : ''} única{client.tags.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                          {/* ✨ Botón de asignación rápida con tag_ids */}
                          <QuickTagAssign
                            clientId={client.id}
                            organizationId={client.organization_id}
                            existingTagIds={client.tags.map(t => t.tag_id)}
                            onTagAssigned={loadData}
                          />
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          {client.email && (
                            <div className="flex items-center gap-3 text-gray-600 group/item hover:text-purple-600 transition-colors">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center group-hover/item:from-purple-100 group-hover/item:to-purple-200 transition-all">
                                <Mail className="w-5 h-5" />
                              </div>
                              <span className="text-lg">{client.email}</span>
                            </div>
                          )}
                          {client.full_phone && (
                            <div className="flex items-center gap-3 text-gray-600 group/item hover:text-green-600 transition-colors">
                              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center group-hover/item:from-green-100 group-hover/item:to-green-200 transition-all">
                                <Phone className="w-5 h-5" />
                              </div>
                              <span className="text-lg">{client.full_phone}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {client.tags.map((tag, tagIndex) => (
                            <TagBadge
                              key={tag.tag_id}
                              tag={tag}
                              index={tagIndex}
                              onColorChange={(newColor) => handleUpdateTagColor(tag.tag_id, newColor)}
                              onDelete={() => handleDeleteTag(tag.tag_id)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// Resto de componentes igual que antes pero usando tag_id...
function CreateTagDialog({ 
  isOpen, 
  onOpenChange, 
  onTagCreated 
}: { 
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTagCreated: (tagName: string, color: string) => Promise<boolean>
}) {
  const [tagName, setTagName] = useState("")
  const [tagColor, setTagColor] = useState("#8B5CF6")
  const [loading, setLoading] = useState(false)

  const predefinedColors = [
    "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", 
    "#EF4444", "#EC4899", "#6366F1", "#14B8A6"
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return

    setLoading(true)
    try {
      const success = await onTagCreated(tagName.trim(), tagColor)
      if (success) {
        setTagName("")
        setTagColor("#8B5CF6")
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 text-lg">
          <Plus className="w-5 h-5 mr-2" />
          Nueva Etiqueta
          <Sparkles className="w-4 h-4 ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
            <Palette className="w-6 h-6 text-purple-600" />
            Crear Nueva Etiqueta Global
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="tagName" className="text-lg font-medium text-gray-700">Nombre de la etiqueta</Label>
            <Input
              id="tagName"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Ej: Urgente, Seguimiento... ✨"
              className="mt-2 text-lg py-3 rounded-2xl border-gray-200 focus:ring-2 focus:ring-purple-500/20"
              required
            />
          </div>
          
          <div>
            <Label className="text-lg font-medium text-gray-700">Color</Label>
            <div className="mt-3 space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-16 h-16 rounded-2xl border-2 border-gray-200 cursor-pointer shadow-lg"
                />
                <Badge 
                  style={{ backgroundColor: tagColor, color: getContrastColor(tagColor) }}
                  className="text-lg px-4 py-2 rounded-xl shadow-lg"
                >
                  {tagName || "Vista previa"}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Colores sugeridos:</p>
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTagColor(color)}
                      className={`w-10 h-10 rounded-xl shadow-lg transition-all duration-200 hover:scale-110 ${
                        tagColor === color ? 'ring-4 ring-gray-300' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-2xl px-6 py-3"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !tagName.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-2xl px-6 py-3 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Crear Etiqueta
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Componente para etiquetas globales
function GlobalTagBadge({ 
  tag, 
  onDelete 
}: { 
  tag: OrganizationTag
  onDelete: () => void
}) {
  return (
    <div className="relative group">
      <Badge 
        style={{ 
          backgroundColor: tag.color, 
          color: getContrastColor(tag.color),
          boxShadow: `0 4px 20px ${tag.color}40`
        }}
        className="text-base px-4 py-2 rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg pr-16 border-0"
      >
        {tag.tag_name}
        <span className="ml-2 text-xs opacity-75">({tag.usage_count})</span>
      </Badge>
      
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-0 right-0 h-8 w-8 p-0 bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl rounded-xl text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-1 translate-x-1"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

function TagBadge({ 
  tag, 
  index,
  onColorChange, 
  onDelete 
}: { 
  tag: { tag_id: string; tag_name: string; color: string }
  index: number
  onColorChange: (color: string) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempColor, setTempColor] = useState(tag.color)

  const handleColorSave = () => {
    onColorChange(tempColor)
    setIsEditing(false)
  }

  return (
    <div className="relative group animate-in slide-in-from-left duration-500" style={{ animationDelay: `${index * 100}ms` }}>
      <div className="relative">
        <Badge 
          style={{ 
            backgroundColor: tag.color, 
            color: getContrastColor(tag.color),
            boxShadow: `0 4px 20px ${tag.color}40`
          }}
          className="text-base px-4 py-2 rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg pr-12 border-0"
        >
          {tag.tag_name}
        </Badge>
        
        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-1 -translate-y-1 translate-x-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl rounded-xl hover:scale-110 transition-all duration-200"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-3 w-3 text-gray-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl rounded-xl text-red-500 hover:text-red-600 hover:scale-110 transition-all duration-200"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isEditing && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="bg-white/95 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                Editar Color de Etiqueta
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-medium text-gray-700">Color actual</Label>
                <div className="flex items-center gap-4 mt-3">
                  <input
                    type="color"
                    value={tempColor}
                    onChange={(e) => setTempColor(e.target.value)}
                    className="w-16 h-16 rounded-2xl border-2 border-gray-200 cursor-pointer shadow-lg"
                  />
                  <Badge 
                    style={{ 
                      backgroundColor: tempColor, 
                      color: getContrastColor(tempColor),
                      boxShadow: `0 4px 20px ${tempColor}40`
                    }}
                    className="text-lg px-4 py-2 rounded-xl shadow-lg"
                  >
                    {tag.tag_name}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="rounded-2xl px-6"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleColorSave}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-2xl px-6 shadow-lg"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
