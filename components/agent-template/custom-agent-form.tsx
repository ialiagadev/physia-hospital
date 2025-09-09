"use client"
import { useState } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Bot } from "lucide-react"

interface CustomAgentFormProps {
  onComplete: (agentData: { name: string; prompt: string }) => Promise<void>
  onBack: () => void
}

export function CustomAgentForm({ onComplete, onBack }: CustomAgentFormProps) {
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !prompt.trim()) return

    setIsLoading(true)
    try {
      await onComplete({ name: name.trim(), prompt: prompt.trim() })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            <DialogTitle className="text-xl font-semibold">Crear Agente Personalizado</DialogTitle>
          </div>
        </div>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="agent-name" className="text-sm font-medium">
            Nombre del agente *
          </Label>
          <Input
            id="agent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Asistente de Ventas"
            className="w-full"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-prompt" className="text-sm font-medium">
            Prompt del agente *
          </Label>
          <Textarea
            id="agent-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Escribe aquí las instrucciones completas para tu agente IA..."
            className="min-h-[400px] w-full resize-none font-mono text-sm"
            required
          />
          <p className="text-xs text-gray-500">
            Define el rol, personalidad, conocimientos y comportamiento de tu agente IA
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onBack}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || !prompt.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? "Creando..." : "Crear Agente"}
          </Button>
        </div>
      </form>
    </div>
  )
}
