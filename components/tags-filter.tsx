"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"
import { Filter, X, Search, Tag } from 'lucide-react'

interface TagOption {
  tag_id: string
  tag_name: string
  color: string
  count: number
}

interface TagsFilterProps {
  selectedTags: string[] // ✨ Ahora son tag_ids
  onTagsChange: (tagIds: string[]) => void
  organizationId?: number
  className?: string
}

export function TagsFilter({ 
  selectedTags, 
  onTagsChange, 
  organizationId,
  className = "" 
}: TagsFilterProps) {
  const [availableTags, setAvailableTags] = useState<TagOption[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadAvailableTags()
  }, [organizationId])

  const loadAvailableTags = async () => {
    if (!organizationId) return
    
    setLoading(true)
    try {
      // ✨ Usar la vista optimizada
      const { data, error } = await supabase
        .from("tag_usage_stats")
        .select("*")
        .eq("organization_id", organizationId)
        .order("clients_count", { ascending: false })

      if (error) throw error

      const tags: TagOption[] = (data || []).map(item => ({
        tag_id: item.tag_id,
        tag_name: item.tag_name,
        color: item.color,
        count: item.clients_count
      }))

      setAvailableTags(tags)
    } catch (error) {
      console.error("Error loading available tags:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = availableTags.filter(tag =>
    tag.tag_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleTagToggle = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(t => t !== tagId)
      : [...selectedTags, tagId]
    
    onTagsChange(newSelectedTags)
  }

  const clearAllTags = () => {
    onTagsChange([])
  }

  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Etiquetas seleccionadas */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2">
          {selectedTags.map((tagId) => {
            const tag = availableTags.find(t => t.tag_id === tagId)
            if (!tag) return null
            const color = tag.color
            return (
              <Badge
                key={tagId}
                style={{ 
                  backgroundColor: color, 
                  color: getContrastColor(color),
                  boxShadow: `0 2px 8px ${color}40`
                }}
                className="text-sm px-3 py-1 rounded-xl font-medium cursor-pointer hover:scale-105 transition-all duration-200"
                onClick={() => handleTagToggle(tagId)}
              >
                {tag.tag_name}
                <X className="w-3 h-3 ml-1" />
              </Badge>
            )
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllTags}
            className="text-gray-500 hover:text-gray-700 px-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Botón de filtro */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={`rounded-xl ${selectedTags.length > 0 ? 'border-purple-300 bg-purple-50' : ''}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtrar por etiquetas
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-700">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 bg-white/95 backdrop-blur-sm border-white/20 rounded-2xl shadow-2xl" align="start">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-gray-800">Filtrar por etiquetas</h4>
            </div>

            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar etiquetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-gray-200"
              />
            </div>

            {/* Lista de etiquetas */}
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  </div>
                ) : filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <div
                      key={tag.tag_id}
                      onClick={() => handleTagToggle(tag.tag_id)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedTags.includes(tag.tag_id)
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
                          {tag.count} cliente{tag.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {selectedTags.includes(tag.tag_id) && (
                        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {searchTerm ? `No se encontraron etiquetas para "${searchTerm}"` : "No hay etiquetas disponibles"}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Acciones */}
            {selectedTags.length > 0 && (
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm text-gray-600">
                  {selectedTags.length} etiqueta{selectedTags.length !== 1 ? 's' : ''} seleccionada{selectedTags.length !== 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllTags}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Limpiar todo
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
