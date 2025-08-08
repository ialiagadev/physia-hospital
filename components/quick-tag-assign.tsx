"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { Plus, Tag, Sparkles } from 'lucide-react'

interface OrganizationTag {
  id: string
  tag_name: string
  color: string
}

interface QuickTagAssignProps {
  clientId: number
  organizationId: number
  existingTagIds: string[] // ✨ Ahora usamos tag_ids
  onTagAssigned: () => void
}

export function QuickTagAssign({ 
  clientId, 
  organizationId, 
  existingTagIds, 
  onTagAssigned 
}: QuickTagAssignProps) {
  const [availableTags, setAvailableTags] = useState<OrganizationTag[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadAvailableTags()
    }
  }, [isOpen, organizationId])

  const loadAvailableTags = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("organization_tags")
        .select("*")
        .eq("organization_id", organizationId)
        .order("tag_name", { ascending: true })

      if (error) throw error

      // ✨ Filtrar etiquetas que no están asignadas al cliente
      const filtered = (data || []).filter(tag => 
        !existingTagIds.includes(tag.id)
      )

      setAvailableTags(filtered)
    } catch (error) {
      console.error("Error loading available tags:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTag = async (tag: OrganizationTag) => {
    setAssigning(tag.id)
    try {
      // ✨ Insertar usando tag_id - mucho más limpio
      const { error } = await supabase
        .from("conversation_tags")
        .insert({
          tag_id: tag.id, // ✨ Referencia directa a organization_tags
          client_id: clientId,
          organization_id: organizationId,
          conversation_id: null, // Etiqueta de cliente
          created_by: null
        })

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "⚠️ Etiqueta ya asignada",
            description: `La etiqueta "${tag.tag_name}" ya está asignada a este cliente`,
            variant: "destructive",
          })
        } else {
          throw error
        }
        return
      }

      toast({
        title: "🎉 Etiqueta asignada",
        description: `Se asignó "${tag.tag_name}" al cliente y sus conversaciones`,
      })

      // Actualizar la lista local
      setAvailableTags(prev => prev.filter(t => t.id !== tag.id))
      
      // Cerrar el popover y notificar cambios
      setIsOpen(false)
      onTagAssigned()
    } catch (error) {
      console.error("Error assigning tag:", error)
      toast({
        title: "Error",
        description: "No se pudo asignar la etiqueta",
        variant: "destructive",
      })
    } finally {
      setAssigning(null)
    }
  }

  const getContrastColor = (hexColor: string): string => {
    const r = parseInt(hexColor.slice(1, 3), 16)
    const g = parseInt(hexColor.slice(3, 5), 16)
    const b = parseInt(hexColor.slice(5, 7), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? '#000000' : '#ffffff'
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          size="sm" 
          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-1" />
          Asignar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white/95 backdrop-blur-sm border-white/20 rounded-2xl shadow-2xl" align="end">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-green-600" />
            <h4 className="font-semibold text-gray-800">Asignar Etiqueta</h4>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                </div>
              ) : availableTags.length > 0 ? (
                availableTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 bg-gray-50 hover:bg-gray-100 hover:scale-[1.02]"
                  >
                    <Badge
                      style={{ 
                        backgroundColor: tag.color, 
                        color: getContrastColor(tag.color),
                        boxShadow: `0 2px 8px ${tag.color}40`
                      }}
                      className="text-sm px-3 py-1 rounded-lg"
                    >
                      {tag.tag_name}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={() => handleAssignTag(tag)}
                      disabled={assigning === tag.id}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg min-w-[60px]"
                    >
                      {assigning === tag.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    No hay etiquetas disponibles para asignar
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {availableTags.length > 0 && (
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Se sincronizará automáticamente con las conversaciones</span>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
