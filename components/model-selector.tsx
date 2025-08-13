"use client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Zap, Clock, Brain, DollarSign } from "lucide-react"

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

const models = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Más potente y versátil",
    icon: Brain,
    badge: "Recomendado",
    badgeColor: "bg-green-500",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    description: "Rápido y eficiente",
    icon: Zap,
    badge: "Rápido",
    badgeColor: "bg-blue-500",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "Contexto largo",
    icon: Clock,
    badge: "Contexto largo",
    badgeColor: "bg-purple-500",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Económico y rápido",
    icon: DollarSign,
    badge: "Económico",
    badgeColor: "bg-orange-500",
  },
]

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const currentModel = models.find((m) => m.id === selectedModel) || models[0]
  const CurrentIcon = currentModel.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2 h-9 px-3">
          <CurrentIcon className="h-4 w-4" />
          <span className="font-medium">{currentModel.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>Seleccionar Modelo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {models.map((model) => {
          const Icon = model.icon
          const isSelected = selectedModel === model.id

          return (
            <DropdownMenuItem
              key={model.id}
              onClick={() => onModelChange(model.id)}
              className={`flex items-center space-x-3 p-3 cursor-pointer ${isSelected ? "bg-accent" : ""}`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{model.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${model.badgeColor}`}>
                    {model.badge}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{model.description}</p>
              </div>
              {isSelected && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
