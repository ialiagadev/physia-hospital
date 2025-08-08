"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useClientTags } from "@/hooks/use-client-tags"
import { Tag, X, Plus } from 'lucide-react'

interface ClientTagsSectionProps {
  clientId: number
  currentUserId: string
  className?: string
}

// Etiquetas predefinidas para clientes (pueden ser diferentes a las de conversaciones)
const predefinedClientTags = [
  { name: "VIP", color: "bg-purple-100 text-purple-800" },
  { name: "Nuevo Cliente", color: "bg-green-100 text-green-800" },
  { name: "Cliente Frecuente", color: "bg-blue-100 text-blue-800" },
  { name: "Seguimiento Especial", color: "bg-orange-100 text-orange-800" },
  { name: "Campaña Email", color: "bg-cyan-100 text-cyan-800" },
  { name: "Campaña WhatsApp", color: "bg-green-100 text-green-800" },
  { name: "Interesado en Promociones", color: "bg-yellow-100 text-yellow-800" },
  { name: "Cliente Corporativo", color: "bg-indigo-100 text-indigo-800" },
  { name: "Referido", color: "bg-pink-100 text-pink-800" },
  { name: "Inactivo", color: "bg-gray-100 text-gray-800" },
]

const getTagColor = (tagName: string) => {
  const predefined = predefinedClientTags.find(t => t.name === tagName)
  return predefined?.color || "bg-blue-100 text-blue-800"
}

export function ClientTagsSection({ clientId, currentUserId, className }: ClientTagsSectionProps) {
  const { tags, loading, addTag, removeTag } = useClientTags(clientId)
  const [newTagName, setNewTagName] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const handleAddTag = async () => {
    if (!newTagName.trim()) return

    const tagName = newTagName.trim()
    
    // Verificar si la etiqueta ya existe
    if (tags.some(tag => tag.tag_name === tagName)) {
      return
    }

    setIsAdding(true)
    try {
      await addTag(tagName, currentUserId, 'manual')
      setNewTagName("")
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddPredefinedTag = async (tagName: string) => {
    // Verificar si la etiqueta ya existe
    if (tags.some(tag => tag.tag_name === tagName)) {
      return
    }

    await addTag(tagName, currentUserId, 'manual')
  }

  const handleRemoveTag = async (tagName: string) => {
    await removeTag(tagName)
  }

  if (loading && tags.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Etiquetas del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-sm text-gray-500">Cargando etiquetas...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Etiquetas del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Etiquetas actuales */}
        {tags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Etiquetas asignadas:</h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className={`text-xs ${getTagColor(tag.tag_name)} cursor-pointer group`}
                  onClick={() => handleRemoveTag(tag.tag_name)}
                >
                  {tag.tag_name}
                  <X className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Input para nueva etiqueta */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Añadir etiqueta:</h4>
          <div className="flex gap-2">
            <Input
              placeholder="Nueva etiqueta..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="text-sm"
              disabled={isAdding}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddTag()
                }
              }}
            />
            <Button 
              size="sm" 
              onClick={handleAddTag} 
              disabled={!newTagName.trim() || isAdding}
            >
              {isAdding ? (
                <div className="w-4 h-4 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Etiquetas predefinidas disponibles */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Etiquetas disponibles:</h4>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {predefinedClientTags
              .filter(predefinedTag => !tags.some(tag => tag.tag_name === predefinedTag.name))
              .map((predefinedTag) => (
                <Badge
                  key={predefinedTag.name}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-gray-50"
                  onClick={() => handleAddPredefinedTag(predefinedTag.name)}
                >
                  {predefinedTag.name}
                </Badge>
              ))}
          </div>
        </div>

        {/* Información sobre sincronización */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          💡 Las etiquetas de las conversaciones se sincronizan automáticamente con el cliente para campañas de marketing.
        </div>
      </CardContent>
    </Card>
  )
}
