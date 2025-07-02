"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { X, Smile, Plus } from "lucide-react"

// Librería de emojis organizada por categorías
const EMOJI_CATEGORIES = {
  "Caras y Emociones": [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😗",
    "😙",
    "😚",
    "😋",
    "😛",
    "😝",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🤩",
    "🥳",
    "😏",
    "😒",
    "😞",
    "😔",
    "😟",
    "😕",
    "🙁",
    "☹️",
    "😣",
    "😖",
    "😫",
    "😩",
    "🥺",
    "😢",
    "😭",
    "😤",
    "😠",
    "😡",
    "🤬",
    "🤯",
    "😳",
    "🥵",
    "🥶",
    "😱",
    "😨",
    "😰",
    "😥",
    "😓",
    "🤗",
    "🤔",
    "🤭",
    "🤫",
    "🤥",
    "😶",
    "😐",
    "😑",
    "😬",
    "🙄",
    "😯",
    "😦",
    "😧",
    "😮",
    "😲",
    "🥱",
    "😴",
    "🤤",
    "😪",
    "😵",
    "🤐",
  ],
  "Salud y Medicina": [
    "🤒",
    "🤕",
    "🤢",
    "🤮",
    "🤧",
    "😷",
    "🤠",
    "🥴",
    "😵‍💫",
    "🤯",
    "🩹",
    "💊",
    "💉",
    "🩺",
    "🏥",
    "⚕️",
    "🧑‍⚕️",
    "👩‍⚕️",
    "👨‍⚕️",
  ],
  "Gestos y Manos": [
    "👍",
    "👎",
    "👌",
    "🤌",
    "🤏",
    "✌️",
    "🤞",
    "🤟",
    "🤘",
    "🤙",
    "👈",
    "👉",
    "👆",
    "🖕",
    "👇",
    "☝️",
    "👋",
    "🤚",
    "🖐️",
    "✋",
    "🖖",
    "👏",
    "🙌",
    "🤲",
    "🤝",
    "🙏",
  ],
  Corazones: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"],
}

interface EmoticonSelectorProps {
  selectedEmoticonos: string[]
  onEmoticonosChange: (emoticonos: string[]) => void
  maxEmoticonos?: number
}

export function EmoticonSelector({ selectedEmoticonos, onEmoticonosChange, maxEmoticonos = 5 }: EmoticonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState("Caras y Emociones")

  const handleEmoticonClick = (emoji: string) => {
    if (selectedEmoticonos.includes(emoji)) {
      // Remover emoji si ya está seleccionado
      onEmoticonosChange(selectedEmoticonos.filter((e) => e !== emoji))
    } else if (selectedEmoticonos.length < maxEmoticonos) {
      // Añadir emoji si no se ha alcanzado el máximo
      onEmoticonosChange([...selectedEmoticonos, emoji])
    }
  }

  const handleRemoveEmoji = (emoji: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onEmoticonosChange(selectedEmoticonos.filter((e) => e !== emoji))
  }

  const handleCategoryClick = (category: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setActiveCategory(category)
  }

  const handleTriggerClick = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsOpen(!isOpen)
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Smile className="h-4 w-4" />
        Emojis de la cita
        <span className="text-xs text-gray-500">
          ({selectedEmoticonos.length}/{maxEmoticonos})
        </span>
      </Label>

      {/* Emojis seleccionados */}
      {selectedEmoticonos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEmoticonos.map((emoji, index) => (
            <Badge key={`${emoji}-${index}`} variant="secondary" className="flex items-center gap-1 px-2 py-1">
              <span className="text-lg">{emoji}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-red-100"
                onClick={(e) => handleRemoveEmoji(emoji, e)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Selector de emojis */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent"
            disabled={selectedEmoticonos.length >= maxEmoticonos}
            onClick={handleTriggerClick}
          >
            <Plus className="h-4 w-4" />
            {selectedEmoticonos.length === 0
              ? "Añadir emojis"
              : selectedEmoticonos.length >= maxEmoticonos
                ? `Máximo alcanzado (${maxEmoticonos})`
                : `Añadir más emojis (${selectedEmoticonos.length}/${maxEmoticonos})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="p-3" onClick={(e) => e.stopPropagation()}>
            {/* Pestañas de categorías */}
            <div className="flex flex-wrap gap-1 mb-3 border-b pb-2">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant={activeCategory === category ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={(e) => handleCategoryClick(category, e)}
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Grid de emojis */}
            <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
              {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => {
                const isSelected = selectedEmoticonos.includes(emoji)
                const isDisabled = !isSelected && selectedEmoticonos.length >= maxEmoticonos

                return (
                  <Button
                    key={emoji}
                    type="button"
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 w-8 p-0 text-lg hover:scale-110 transition-transform ${
                      isDisabled ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!isDisabled) {
                        handleEmoticonClick(emoji)
                      }
                    }}
                    disabled={isDisabled}
                    title={isSelected ? "Click para quitar" : "Click para añadir"}
                  >
                    {emoji}
                  </Button>
                )
              })}
            </div>

            {/* Información */}
            <div className="mt-3 pt-2 border-t text-xs text-gray-500 text-center">
              💡 Puedes seleccionar hasta {maxEmoticonos} emojis por cita
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Mensaje de ayuda */}
      {selectedEmoticonos.length === 0 && (
        <p className="text-xs text-gray-500">Los emojis ayudan a identificar rápidamente el estado o tipo de cita</p>
      )}
    </div>
  )
}
