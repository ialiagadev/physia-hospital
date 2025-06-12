"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Bot, Edit, Trash2, MessageSquare, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LiquidGlass } from "@/components/liquid-glass"
import { useAgents } from "@/hooks/use-agents"
import { useAuth } from "@/app/contexts/auth-context"
import type { User } from "@/types/chat"

function AgentDialog({
  agent,
  open,
  onOpenChange,
  onSave,
}: {
  agent?: User
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: any) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    name: "",
    prompt: "",
  })
  const [saving, setSaving] = useState(false)

  // Actualizar el formulario cuando cambia el agente o se abre el diálogo
  useEffect(() => {
    if (open && agent) {
      console.log("Loading agent data for editing:", agent)
      setFormData({
        name: agent.name || "",
        prompt: agent.prompt || "",
      })
    } else if (open && !agent) {
      // Resetear el formulario cuando se abre para crear un nuevo agente
      setFormData({
        name: "",
        prompt: "",
      })
    }
  }, [agent, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar que los campos no estén vacíos
    if (!formData.name.trim() || !formData.prompt.trim()) {
      alert("Por favor, completa todos los campos")
      return
    }

    setSaving(true)
    try {
      console.log("Submitting form data:", formData)
      await onSave(formData)
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving agent:", error)
      alert("Error al guardar el agente. Por favor, inténtalo de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{agent ? "Editar Agente IA" : "Crear Agente IA"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del agente</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Asistente de Ventas"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt del agente</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              placeholder="Eres un asistente de ventas especializado en..."
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : agent ? (
                "Actualizar"
              ) : (
                "Crear"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AgentCard({ agent, onEdit, onDelete }: { agent: User; onEdit: () => void; onDelete: () => void }) {
  return (
    <LiquidGlass
      variant="card"
      intensity="medium"
      className="group relative flex flex-col h-full transition-all duration-300 hover:shadow-xl"
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(0, 0, 0, 0.1)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
      rippleEffect={true}
      flowOnHover={true}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-3">
        <div className="flex items-center space-x-3">
          <LiquidGlass
            variant="floating"
            intensity="subtle"
            className="w-12 h-12 flex items-center justify-center"
            style={{
              background: "rgba(147, 51, 234, 0.15)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(147, 51, 234, 0.3)",
              boxShadow: "0 4px 16px rgba(147, 51, 234, 0.1)",
            }}
          >
            <Bot className="h-6 w-6 text-purple-600" />
          </LiquidGlass>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
              {agent.name}
            </h3>
            <div className="flex items-center text-sm text-gray-500">
              <MessageSquare className="h-3 w-3 mr-1" />
              Agente IA
            </div>
          </div>
        </div>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 flex-1">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Prompt:</p>
          <LiquidGlass
            variant="card"
            intensity="subtle"
            className="p-3"
            style={{
              background: "rgba(255, 255, 255, 0.5)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}
          >
            <p className="text-sm text-gray-600 line-clamp-3">{agent.prompt || "Sin prompt configurado"}</p>
          </LiquidGlass>
        </div>
      </div>
    </LiquidGlass>
  )
}

export default function AgentsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<User | null>(null)
  const { userProfile } = useAuth()

  const { agents, loading, error, createAgent, updateAgent, deleteAgent } = useAgents(userProfile?.organization_id)

  const handleCreateAgent = async (data: any) => {
    console.log("Creating agent with data:", data)
    await createAgent(data)
  }

  const handleUpdateAgent = async (data: any) => {
    if (!editingAgent) {
      console.error("No editing agent found")
      return
    }

    try {
      console.log("Updating agent:", editingAgent.id, "with data:", data)
      await updateAgent(editingAgent.id, data)
      setEditingAgent(null)
      console.log("Agent updated successfully, closing dialog")
    } catch (error) {
      console.error("Error in handleUpdateAgent:", error)
      throw error // Re-throw para que el diálogo maneje el error
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este agente?")) {
      try {
        await deleteAgent(agentId)
      } catch (error) {
        console.error("Error deleting agent:", error)
        alert("Error al eliminar el agente. Por favor, inténtalo de nuevo.")
      }
    }
  }

  const handleEditAgent = (agent: User) => {
    console.log("Starting to edit agent:", agent)
    setEditingAgent(agent)
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Efectos de fondo sutiles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-indigo-200/20 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <LiquidGlass
          variant="card"
          intensity="medium"
          className="mb-8 p-8"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-800 sm:text-5xl mb-3">Agentes IA</h1>
              <p className="text-lg text-gray-600 max-w-2xl">
                Gestiona tus asistentes de inteligencia artificial para automatizar conversaciones
              </p>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <LiquidGlass
                  variant="button"
                  intensity="medium"
                  className="cursor-pointer px-6 py-3"
                  style={{
                    background: "rgba(147, 51, 234, 0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(147, 51, 234, 0.3)",
                    boxShadow: "0 4px 16px rgba(147, 51, 234, 0.1)",
                  }}
                  rippleEffect={true}
                >
                  <div className="flex items-center text-purple-700 font-medium">
                    <Plus className="mr-2.5 h-5 w-5" />
                    Crear Agente
                  </div>
                </LiquidGlass>
              </DialogTrigger>
              <AgentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSave={handleCreateAgent} />
            </Dialog>
          </div>
        </LiquidGlass>

        {/* Error State */}
        {error && (
          <LiquidGlass
            variant="card"
            intensity="medium"
            className="mb-8 p-6"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              boxShadow: "0 8px 32px rgba(239, 68, 68, 0.1)",
            }}
          >
            <div className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p>Error: {error}</p>
            </div>
          </LiquidGlass>
        )}

        {/* Content */}
        {loading ? (
          <LiquidGlass
            variant="card"
            intensity="medium"
            className="flex flex-col items-center justify-center p-12 text-center min-h-[200px]"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(20px)",
              border: "2px dashed rgba(0, 0, 0, 0.2)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600">Cargando agentes...</p>
          </LiquidGlass>
        ) : agents.length === 0 ? (
          <LiquidGlass
            variant="card"
            intensity="medium"
            className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(20px)",
              border: "2px dashed rgba(0, 0, 0, 0.2)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            }}
          >
            <LiquidGlass
              variant="floating"
              intensity="subtle"
              className="w-20 h-20 flex items-center justify-center mb-6"
              style={{
                background: "rgba(147, 51, 234, 0.15)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(147, 51, 234, 0.3)",
                boxShadow: "0 4px 16px rgba(147, 51, 234, 0.1)",
              }}
            >
              <Bot className="h-10 w-10 text-purple-600" />
            </LiquidGlass>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">No hay agentes IA</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              Crea tu primer agente IA para automatizar las respuestas en tus conversaciones
            </p>
            <LiquidGlass
              variant="button"
              intensity="medium"
              className="cursor-pointer px-6 py-3"
              style={{
                background: "rgba(147, 51, 234, 0.15)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(147, 51, 234, 0.3)",
                boxShadow: "0 4px 16px rgba(147, 51, 234, 0.1)",
              }}
              rippleEffect={true}
              onClick={() => setCreateDialogOpen(true)}
            >
              <div className="flex items-center text-purple-700 font-medium">
                <Plus className="mr-2 h-5 w-5" />
                Crear primer agente
              </div>
            </LiquidGlass>
          </LiquidGlass>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={() => handleEditAgent(agent)}
                onDelete={() => handleDeleteAgent(agent.id)}
              />
            ))}
          </div>
        )}

        {/* Diálogo de edición */}
        <AgentDialog
          agent={editingAgent || undefined}
          open={!!editingAgent}
          onOpenChange={(open) => !open && setEditingAgent(null)}
          onSave={handleUpdateAgent}
        />
      </div>
    </div>
  )
}
