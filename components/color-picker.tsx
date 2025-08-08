"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Palette, Check } from 'lucide-react'
import { predefinedTagColors, generateTagStyle, isLightColor } from "@/lib/dynamic-tag-colors"

interface ColorPickerProps {
  value: string // Hex color
  onChange: (color: string) => void
  previewText?: string
}

export function ColorPicker({ value, onChange, previewText = "Vista previa" }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value)
  const [isOpen, setIsOpen] = useState(false)

  const handleCustomColorChange = (newColor: string) => {
    setCustomColor(newColor)
    onChange(newColor)
  }

  const handlePredefinedColorSelect = (hexColor: string) => {
    setCustomColor(hexColor)
    onChange(hexColor)
    setIsOpen(false)
  }

  const tagStyle = generateTagStyle(value)

  return (
    <div className="space-y-3">
      {/* Vista previa */}
      <div className="flex items-center gap-3">
        <Badge 
          className="px-3 py-1 border-0 shadow-sm font-medium"
          style={tagStyle.style}
        >
          {previewText}
        </Badge>
        <div 
          className="w-6 h-6 rounded-full border-2 border-gray-200 shadow-sm"
          style={{ backgroundColor: value }}
        />
      </div>

      {/* Selector de colores */}
      <div className="space-y-3">
        {/* Colores predefinidos */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Colores sugeridos
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {predefinedTagColors.map((colorOption) => (
              <button
                key={colorOption.hex}
                type="button"
                onClick={() => handlePredefinedColorSelect(colorOption.hex)}
                className={`relative p-2 rounded-lg border-2 transition-all hover:scale-105 ${
                  value === colorOption.hex ? 'border-gray-400 shadow-lg' : 'border-gray-200'
                }`}
                title={colorOption.name}
              >
                <div className={`w-full h-6 rounded`} style={{ backgroundColor: colorOption.hex }} />
                {value === colorOption.hex && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-lg" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Color personalizado */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            Color personalizado
          </Label>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-10"
              >
                <div 
                  className="w-5 h-5 rounded border border-gray-300"
                  style={{ backgroundColor: value }}
                />
                <Palette className="w-4 h-4" />
                Seleccionar color personalizado
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Selector de color</Label>
                  <div className="mt-2 space-y-3">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className="w-full h-12 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={customColor}
                        onChange={(e) => {
                          const color = e.target.value
                          if (color.match(/^#[0-9A-Fa-f]{6}$/)) {
                            handleCustomColorChange(color)
                          }
                          setCustomColor(color)
                        }}
                        placeholder="#FF0000"
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        onClick={() => {
                          if (customColor.match(/^#[0-9A-Fa-f]{6}$/)) {
                            onChange(customColor)
                            setIsOpen(false)
                          }
                        }}
                        disabled={!customColor.match(/^#[0-9A-Fa-f]{6}$/)}
                        size="sm"
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Vista previa en el popover */}
                <div>
                  <Label className="text-sm font-medium">Vista previa</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <Badge 
                      className="px-3 py-1 border-0 shadow-sm font-medium"
                      style={generateTagStyle(customColor).style}
                    >
                      {previewText}
                    </Badge>
                  </div>
                </div>

                {/* Paleta de colores populares */}
                <div>
                  <Label className="text-sm font-medium">Colores populares</Label>
                  <div className="mt-2 grid grid-cols-8 gap-1">
                    {[
                      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
                      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2', '#A3E4D7'
                    ].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleCustomColorChange(color)}
                        className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
