"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { Plus, Tag, Sparkles } from 'lucide-react'
import { DynamicTagBadge } from "@/components/dynamic-tag-badge"

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
      toast({
        title: "Error",
        description: "No se pudieron cargar las etiquetas disponibles",
        variant: "destructive",
      })
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
        description: `Se asignó "${tag.tag_name}" al cliente correctamente`,
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
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-semibold text-gray-800">Asignar Etiqueta</h4>
          </div>

          <ScrollArea className="h-64">
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                </div>
              ) : availableTags.length > 0 ? (
                availableTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 rounded-xl opacity-0 group-hover:opacity-20 blur-lg transition-all duration-300"></div>
                    <div className="relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 bg-white/80 backdrop-blur-sm border border-white/20 shadow-sm hover:shadow-lg group-hover:scale-[1.02]">
                      <DynamicTagBadge
                        tagName={tag.tag_name}
                        color={tag.color}
                        className="text-sm rounded-lg shadow-sm"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAssignTag(tag)}
                        disabled={assigning === tag.id}
                        className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-lg min-w-[70px] shadow-lg"
                      >
                        {assigning === tag.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-1" />
                            Asignar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Tag className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No hay etiquetas disponibles
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Todas las etiquetas ya están asignadas a este cliente
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {availableTags.length > 0 && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-400 rounded-xl opacity-10 blur-lg"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-xl p-3 border border-white/20 shadow-sm">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Se sincronizará automáticamente con las conversaciones</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
