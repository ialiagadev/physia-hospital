"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { Plus, Search, X, ChevronLeft, ChevronRight, User, Tag, Sparkles, Phone, Mail, UserPlus, Palette } from 'lucide-react'
import { useAuth } from "@/app/contexts/auth-context"

interface Client {
  id: number
  name: string
  email: string | null
  phone: string | null
  full_phone: string | null
  city: string | null
  organization_id: number
}

interface ExistingTag {
  tag_name: string
  color: string
  count: number
}

interface AddTagToClientDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTagAdded: () => void
  trigger?: React.ReactNode
}

export function AddTagToClientDialog({ 
  isOpen, 
  onOpenChange, 
  onTagAdded,
  trigger 
}: AddTagToClientDialogProps) {
  const [step, setStep] = useState<'selectClient' | 'selectTags'>('selectClient')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [clientsLoading, setClientsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Estados para etiquetas
  const [existingTags, setExistingTags] = useState<ExistingTag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#8B5CF6")
  const [tagsLoading, setTagsLoading] = useState(false)
  const [assigningTags, setAssigningTags] = useState(false)

  const { userProfile } = useAuth()
  const pageSize = 10

  const predefinedColors = [
    "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", 
    "#EF4444", "#EC4899", "#6366F1", "#14B8A6"
  ]

  // Cargar clientes con búsqueda del servidor (solo de la organización)
  const loadClients = useCallback(async (page = 1, search = "") => {
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
        query = query.or(`name.ilike.%${searchLower}%,email.ilike.%${searchLower}%,phone.ilike.%${searchLower}%,full_phone.ilike.%${searchLower}%`)
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
  }, [userProfile?.organization_id])

  // Cargar etiquetas existentes (solo de la organización)
  const loadExistingTags = useCallback(async () => {
    if (!userProfile?.organization_id) return

    setTagsLoading(true)
    try {
      const { data, error } = await supabase
        .from("conversation_tags")
        .select("tag_name, color")
        .eq("organization_id", userProfile.organization_id)
        .not("tag_name", "is", null)

      if (error) throw error

      // Agrupar por tag_name y contar
      const tagMap = new Map<string, { color: string; count: number }>()
      
      data?.forEach(item => {
        const existing = tagMap.get(item.tag_name)
        if (existing) {
          existing.count++
        } else {
          tagMap.set(item.tag_name, { color: item.color || '#000000', count: 1 })
        }
      })

      const tags: ExistingTag[] = Array.from(tagMap.entries()).map(([tag_name, info]) => ({
        tag_name,
        color: info.color,
        count: info.count
      }))

      // Ordenar por popularidad
      tags.sort((a, b) => b.count - a.count)
      setExistingTags(tags)
    } catch (error) {
      console.error("Error loading existing tags:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las etiquetas existentes",
        variant: "destructive",
      })
    } finally {
      setTagsLoading(false)
    }
  }, [userProfile?.organization_id])

  // Resto de funciones igual que antes...
  useEffect(() => {
    if (isOpen && step === 'selectClient') {
      loadClients(1, clientSearch)
    }
  }, [isOpen, step, loadClients])

  useEffect(() => {
    if (isOpen && step === 'selectTags') {
      loadExistingTags()
    }
  }, [isOpen, step, loadExistingTags])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 'selectClient') {
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
    setStep('selectTags')
  }

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    )
  }

  const handleAddNewTag = () => {
    if (!newTagName.trim()) return
    
    const tagName = newTagName.trim()
    if (selectedTags.includes(tagName)) {
      toast({
        title: "Etiqueta duplicada",
        description: "Esta etiqueta ya está seleccionada",
        variant: "destructive",
      })
      return
    }

    setSelectedTags(prev => [...prev, tagName])
    setExistingTags(prev => [{
      tag_name: tagName,
      color: newTagColor,
      count: 0
    }, ...prev])
    setNewTagName("")
    setNewTagColor("#8B5CF6")
  }

  const handleAssignTags = async () => {
    if (!selectedClient || selectedTags.length === 0 || !userProfile?.organization_id) return

    setAssigningTags(true)
    try {
      // Crear las etiquetas para el cliente con organization_id
      const tagsToInsert = selectedTags.map(tagName => {
        const existingTag = existingTags.find(t => t.tag_name === tagName)
        return {
          tag_name: tagName,
          client_id: selectedClient.id,
          organization_id: userProfile.organization_id, // ✨ Añadir organization_id
          color: existingTag?.color || newTagColor,
          conversation_id: null,
          created_by: null
        }
      })

      const { error } = await supabase
        .from("conversation_tags")
        .insert(tagsToInsert)

      if (error) throw error

      toast({
        title: "🎉 Etiquetas asignadas",
        description: `Se asignaron ${selectedTags.length} etiqueta${selectedTags.length !== 1 ? 's' : ''} a ${selectedClient.name}`,
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
    setStep('selectClient')
    setSelectedClient(null)
    setClients([])
    setClientSearch("")
    setSelectedTags([])
    setNewTagName("")
    setNewTagColor("#8B5CF6")
    setCurrentPage(1)
    onOpenChange(false)
  }

  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  // El resto del JSX es igual que antes...
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white/95 backdrop-blur-sm border-white/20 rounded-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
            {step === 'selectClient' ? (
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

        {step === 'selectClient' ? (
          <div className="space-y-6">
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
            <ScrollArea className="h-96">
              <div className="space-y-3">
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
                            <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl">
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
                      {clientSearch ? `No se encontraron clientes para "${clientSearch}"` : "No hay clientes disponibles"}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} clientes
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
          </div>
        ) : (
          <div className="space-y-6">
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
                      <p className="text-sm text-gray-600">{selectedClient?.email || selectedClient?.full_phone}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('selectClient')}
                    className="rounded-xl"
                  >
                    Cambiar Cliente
                  </Button>
                </div>
              </div>
            </div>

            {/* Etiquetas seleccionadas */}
            {selectedTags.length > 0 && (
              <div>
                <Label className="text-lg font-medium text-gray-700 mb-3 block">
                  Etiquetas seleccionadas ({selectedTags.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tagName) => {
                    const existingTag = existingTags.find(t => t.tag_name === tagName)
                    const color = existingTag?.color || newTagColor
                    return (
                      <Badge
                        key={tagName}
                        style={{ 
                          backgroundColor: color, 
                          color: getContrastColor(color),
                          boxShadow: `0 4px 20px ${color}40`
                        }}
                        className="text-sm px-3 py-1 rounded-xl font-medium cursor-pointer hover:scale-105 transition-all duration-200"
                        onClick={() => handleTagToggle(tagName)}
                      >
                        {tagName}
                        <X className="w-3 h-3 ml-2" />
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}

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
                    onKeyPress={(e) => e.key === 'Enter' && handleAddNewTag()}
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-16 h-10 rounded-xl border-2 border-gray-200 cursor-pointer shadow-lg"
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
                    <Badge 
                      style={{ backgroundColor: newTagColor, color: getContrastColor(newTagColor) }}
                      className="text-sm px-3 py-1 rounded-xl shadow-lg"
                    >
                      {newTagName}
                    </Badge>
                  </div>
                )}
                
                {/* Colores sugeridos */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Colores sugeridos:</p>
                  <div className="flex flex-wrap gap-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTagColor(color)}
                        className={`w-8 h-8 rounded-lg shadow-lg transition-all duration-200 hover:scale-110 ${
                          newTagColor === color ? 'ring-2 ring-gray-400' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Etiquetas existentes */}
            <div className="space-y-4">
              <Label className="text-lg font-medium text-gray-700">
                Etiquetas existentes
              </Label>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {tagsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    </div>
                  ) : existingTags.length > 0 ? (
                    existingTags.map((tag) => (
                      <div
                        key={tag.tag_name}
                        onClick={() => handleTagToggle(tag.tag_name)}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedTags.includes(tag.tag_name)
                            ? 'bg-purple-100 border-2 border-purple-300'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            style={{ 
                              backgroundColor: tag.color, 
                              color: getContrastColor(tag.color)
                            }}
                            className="text-sm px-3 py-1 rounded-lg"
                          >
                            {tag.tag_name}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Usada {tag.count} vez{tag.count !== 1 ? 'es' : ''}
                          </span>
                        </div>
                        {selectedTags.includes(tag.tag_name) && (
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                            <X className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No hay etiquetas existentes</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                className="rounded-xl px-6"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAssignTags}
                disabled={selectedTags.length === 0 || assigningTags}
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
                    Asignar {selectedTags.length} Etiqueta{selectedTags.length !== 1 ? 's' : ''}
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
