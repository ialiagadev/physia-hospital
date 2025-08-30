"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Bot, Edit, Trash2, MessageSquare, AlertTriangle, Loader2, Settings, Crown, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { LiquidGlass } from "@/components/liquid-glass"
import { useAgents } from "@/hooks/use-agents"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@/types/chat"

interface AIFunction {
  id: string
  name: string
  description: string | null
  http_method: string
  url_template: string
  run_on_load: boolean
  is_active: boolean
  base_price: number | null
  usage_price: number | null
  created_at: string
  updated_at: string
  name_front: string | null
  description_front: string | null
}

interface Organization {
  id: number
  subscription_tier: string
  name: string
}

const SUBSCRIPTION_LIMITS = {
  inicial: 1,
  avanzado: 3,
  premium: Number.POSITIVE_INFINITY,
  free: 1, // fallback for free tier
} as const

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
  const [aiFunctions, setAiFunctions] = useState<AIFunction[]>([])
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([])
  const [loadingFunctions, setLoadingFunctions] = useState(true)

  const loadAIFunctions = async () => {
    try {
      setLoadingFunctions(true)
      const { data, error } = await supabase
        .from("ai_functions")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (error) {
        console.error("Error loading AI functions:", error)
      } else {
        setAiFunctions(data || [])
      }
    } catch (err) {
      console.error("Error loading AI functions:", err)
    } finally {
      setLoadingFunctions(false)
    }
  }

  const loadAgentFunctions = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from("ai_functions_users")
        .select("function_id")
        .eq("user_id", agentId)
        .eq("enabled", true)

      if (error) {
        console.error("Error loading agent functions:", error)
      } else {
        const functionIds = data?.map((item) => item.function_id) || []
        setSelectedFunctions(functionIds)
      }
    } catch (err) {
      console.error("Error loading agent functions:", err)
    }
  }

  const saveAgentFunctions = async (agentId: string, functionIds: string[]) => {
    try {
      // Primero eliminar todas las relaciones existentes
      const { error: deleteError } = await supabase.from("ai_functions_users").delete().eq("user_id", agentId)

      if (deleteError) {
        console.error("Error deleting existing agent functions:", deleteError)
        throw deleteError
      }

      // Luego insertar las nuevas relaciones
      if (functionIds.length > 0) {
        const relations = functionIds.map((functionId) => ({
          user_id: agentId,
          function_id: functionId,
          enabled: true,
        }))

        const { error: insertError } = await supabase.from("ai_functions_users").insert(relations)

        if (insertError) {
          console.error("Error inserting agent functions:", insertError)
          throw insertError
        }
      }
    } catch (err) {
      console.error("Error saving agent functions:", err)
      throw err
    }
  }

  const handleFunctionToggle = (functionId: string, checked: boolean) => {
    if (checked) {
      setSelectedFunctions((prev) => [...prev, functionId])
    } else {
      setSelectedFunctions((prev) => prev.filter((id) => id !== functionId))
    }
  }

  useEffect(() => {
    if (open && agent) {
      console.log("Loading agent data for editing:", agent)
      setFormData({
        name: agent.name || "",
        prompt: agent.prompt || "",
      })
      loadAgentFunctions(agent.id)
    } else if (open && !agent) {
      setFormData({
        name: "",
        prompt: "",
      })
      setSelectedFunctions([])
    }

    if (open) {
      loadAIFunctions()
    }
  }, [agent, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.prompt.trim()) {
      alert("Por favor, completa todos los campos")
      return
    }

    setSaving(true)
    try {
      console.log("Submitting form data:", formData)
      const savedAgent = await onSave({ ...formData, selectedFunctions })

      // Si es un agente existente o si onSave devuelve el ID del agente creado
      const agentId = agent?.id || (savedAgent as any)?.id
      if (agent?.id) {
        await saveAgentFunctions(agent.id, selectedFunctions)
      }

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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agent ? "Editar Agente IA" : "Crear Agente IA"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
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
                  rows={20}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Funciones AI</h3>
                    <p className="text-sm text-gray-600">Selecciona las funciones disponibles para este agente</p>
                  </div>
                </div>
                {!loadingFunctions && aiFunctions.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    <span>
                      {selectedFunctions.length}/{aiFunctions.length}
                    </span>
                  </div>
                )}
              </div>

              {loadingFunctions ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span className="text-gray-600">Cargando funciones...</span>
                </div>
              ) : aiFunctions.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No hay funciones AI disponibles</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {aiFunctions.map((func) => (
                    <LiquidGlass
                      key={func.id}
                      variant="card"
                      intensity="subtle"
                      className="p-3 hover:shadow-sm transition-all duration-200"
                      style={{
                        background: "rgba(255, 255, 255, 0.6)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id={func.id}
                          checked={selectedFunctions.includes(func.id)}
                          onCheckedChange={(checked) => handleFunctionToggle(func.id, checked as boolean)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={func.id} className="cursor-pointer">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-800 text-sm">{func.name_front || func.name}</h4>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                {func.http_method}
                              </span>
                            </div>
                            {(func.description_front || func.description) && (
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {func.description_front || func.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {func.base_price && <span>Base: €{func.base_price}</span>}
                              {func.usage_price && <span>Uso: €{func.usage_price}</span>}
                              {func.run_on_load && <span className="text-green-600">Auto-ejecuta</span>}
                            </div>
                          </label>
                        </div>
                      </div>
                    </LiquidGlass>
                  ))}
                </div>
              )}

              {selectedFunctions.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>{selectedFunctions.length}</strong> función{selectedFunctions.length !== 1 ? "es" : ""}{" "}
                    seleccionada{selectedFunctions.length !== 1 ? "s" : ""} de <strong>{aiFunctions.length}</strong>{" "}
                    disponibles
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
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
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loadingOrganization, setLoadingOrganization] = useState(true)
  const { userProfile } = useAuth()

  const { agents, loading, error, createAgent, updateAgent, deleteAgent } = useAgents(
    userProfile?.organization_id ? String(userProfile.organization_id) : undefined,
  )

  const loadOrganization = async () => {
    if (!userProfile?.organization_id) return

    try {
      setLoadingOrganization(true)
      const { data, error } = await supabase
        .from("organizations")
        .select("id, subscription_tier, name")
        .eq("id", userProfile.organization_id)
        .single()

      if (error) {
        console.error("Error loading organization:", error)
      } else {
        setOrganization(data)
      }
    } catch (err) {
      console.error("Error loading organization:", err)
    } finally {
      setLoadingOrganization(false)
    }
  }

  const canCreateMoreAgents = () => {
    if (!organization) return false

    const tier = organization.subscription_tier as keyof typeof SUBSCRIPTION_LIMITS
    const limit = SUBSCRIPTION_LIMITS[tier] || Number.POSITIVE_INFINITY

    return agents.length < limit
  }

  const getRemainingAgents = () => {
    if (!organization) return 0

    const tier = organization.subscription_tier as keyof typeof SUBSCRIPTION_LIMITS
    const limit = SUBSCRIPTION_LIMITS[tier] || Number.POSITIVE_INFINITY

    if (limit === Number.POSITIVE_INFINITY) return Number.POSITIVE_INFINITY
    return Math.max(0, limit - agents.length)
  }

  const getSubscriptionTierName = (tier: string) => {
    const names = {
      inicial: "Inicial",
      avanzado: "Avanzado",
      premium: "Premium",
      free: "Gratuito",
    } as const
    return names[tier as keyof typeof names] || tier.charAt(0).toUpperCase() + tier.slice(1)
  }

  useEffect(() => {
    if (userProfile?.organization_id) {
      loadOrganization()
    }
  }, [userProfile?.organization_id])

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
      throw error
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-indigo-200/20 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
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
              {organization && !loadingOrganization && (
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <Crown className="h-4 w-4" />
                    Plan {getSubscriptionTierName(organization.subscription_tier)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {agents.length} /{" "}
                    {SUBSCRIPTION_LIMITS[organization.subscription_tier as keyof typeof SUBSCRIPTION_LIMITS] ===
                    Number.POSITIVE_INFINITY
                      ? "∞"
                      : SUBSCRIPTION_LIMITS[organization.subscription_tier as keyof typeof SUBSCRIPTION_LIMITS] ||
                        "∞"}{" "}
                    agentes
                  </div>
                </div>
              )}
            </div>
            {loadingOrganization ? (
              <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-gray-600">Cargando...</span>
              </div>
            ) : canCreateMoreAgents() ? (
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
            ) : (
              <div className="text-center">
                <LiquidGlass
                  variant="card"
                  intensity="subtle"
                  className="px-6 py-3 cursor-not-allowed"
                  style={{
                    background: "rgba(156, 163, 175, 0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(156, 163, 175, 0.3)",
                    boxShadow: "0 4px 16px rgba(156, 163, 175, 0.1)",
                  }}
                >
                  <div className="flex items-center text-gray-500 font-medium">
                    <Lock className="mr-2.5 h-5 w-5" />
                    Límite alcanzado
                  </div>
                </LiquidGlass>
                <p className="text-xs text-gray-500 mt-2 max-w-48">
                  Has alcanzado el límite de agentes para tu plan{" "}
                  {getSubscriptionTierName(organization?.subscription_tier || "free")}
                </p>
              </div>
            )}
          </div>
        </LiquidGlass>

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
            {canCreateMoreAgents() ? (
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
            ) : (
              <div className="text-center">
                <LiquidGlass
                  variant="card"
                  intensity="subtle"
                  className="px-6 py-3 cursor-not-allowed"
                  style={{
                    background: "rgba(156, 163, 175, 0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(156, 163, 175, 0.3)",
                    boxShadow: "0 4px 16px rgba(156, 163, 175, 0.1)",
                  }}
                >
                  <div className="flex items-center text-gray-500 font-medium">
                    <Lock className="mr-2.5 h-5 w-5" />
                    Límite alcanzado
                  </div>
                </LiquidGlass>
                <p className="text-xs text-gray-500 mt-2 max-w-48">
                  Tu plan {getSubscriptionTierName(organization?.subscription_tier || "free")} no permite crear agentes
                </p>
              </div>
            )}
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
