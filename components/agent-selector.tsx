"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Bot, Brain, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface Agent {
  id: string
  name: string
  prompt: string
  is_active: boolean
  created_at: string
}

interface AgentSelectorProps {
  selectedAgentId: string | null
  onAgentChange: (agentId: string | null, agentName: string | null) => void
  organizationId: string
}

const AgentSelector = ({ selectedAgentId, onAgentChange, organizationId }: AgentSelectorProps) => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAgents()
  }, [organizationId])

  const loadAgents = async () => {
    if (!organizationId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, prompt, created_at, is_active")
        .eq("organization_id", organizationId)
        .eq("type", 2) // Solo agentes IA
        .eq("is_active", true) // Solo agentes activos
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading agents:", error)
      } else {
        const mapped: Agent[] = (data || []).map((u) => ({
          id: u.id,
          name: u.name || "Agente Sin Nombre",
          prompt: u.prompt || "Agente IA especializado",
          is_active: u.is_active ?? true,
          created_at: u.created_at,
        }))
        setAgents(mapped)
      }
    } catch (err) {
      console.error("Error loading agents:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAgentChange = (value: string) => {
    if (value === "default") {
      onAgentChange(null, null)
    } else {
      const agent = agents.find((a) => a.id === value)
      onAgentChange(value, agent?.name || null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-600">Cargando agentes...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={selectedAgentId || "default"} onValueChange={handleAgentChange}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Seleccionar agente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span>PHYSIA AI (Por defecto)</span>
            </div>
          </SelectItem>
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <span>{agent.name}</span>
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                  Agente IA
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default AgentSelector
