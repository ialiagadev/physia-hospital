"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTagStats, useMarketingTargets } from "@/hooks/use-client-tags"
import { ClientTagsService } from "@/lib/services/client-tags"
import { Mail, MessageCircle, Users, Target, Search, Download } from 'lucide-react'
import { toast } from "@/hooks/use-toast"

interface MarketingCampaignBuilderProps {
  organizationId: number
  className?: string
}

export function MarketingCampaignBuilder({ organizationId, className }: MarketingCampaignBuilderProps) {
  const { stats, loading: statsLoading } = useTagStats(organizationId)
  const { targets, loading: targetsLoading, getTargetsByTags } = useMarketingTargets(organizationId)
  
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [matchAll, setMatchAll] = useState(false)
  const [campaignName, setCampaignName] = useState("")
  const [campaignMessage, setCampaignMessage] = useState("")
  const [campaignChannel, setCampaignChannel] = useState<string>("")
  const [showTargets, setShowTargets] = useState(false)

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    )
  }

  const handleSearchTargets = async () => {
    if (selectedTags.length === 0) {
      toast({
        title: "Selecciona etiquetas",
        description: "Debes seleccionar al menos una etiqueta para buscar clientes",
        variant: "destructive"
      })
      return
    }

    await getTargetsByTags(selectedTags, matchAll)
    setShowTargets(true)
  }

  const handleExportTargets = () => {
    if (targets.length === 0) return

    const csvContent = [
      ['Nombre', 'Email', 'Teléfono', 'Canal', 'Etiquetas'],
      ...targets.map(target => [
        target.client_name,
        target.client_email || '',
        target.client_phone || '',
        target.client_channel || '',
        target.matching_tags.join('; ')
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campana-${campaignName || 'clientes'}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getChannelColor = (channel?: string) => {
    switch (channel) {
      case 'whatsapp':
        return 'bg-green-100 text-green-800'
      case 'instagram':
        return 'bg-pink-100 text-pink-800'
      case 'facebook':
        return 'bg-blue-100 text-blue-800'
      case 'webchat':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  if (statsLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="w-6 h-6 border border-gray-400 border-t-transparent rounded-full animate-spin mr-3"></div>
          <span>Cargando estadísticas...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuración de campaña */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Constructor de Campañas de Marketing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nombre de la campaña</label>
              <Input
                placeholder="Ej: Promoción Primavera 2024"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Canal de comunicación</label>
              <Select value={campaignChannel} onValueChange={setCampaignChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="mixed">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Mensaje de la campaña</label>
            <Textarea
              placeholder="Escribe el mensaje que enviarás a los clientes seleccionados..."
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Selección de etiquetas */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Audiencia por Etiquetas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="match-all"
              checked={matchAll}
              onCheckedChange={(checked) => setMatchAll(checked as boolean)}
            />
            <label htmlFor="match-all" className="text-sm">
              El cliente debe tener TODAS las etiquetas seleccionadas (en lugar de al menos una)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.tag_name}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedTags.includes(stat.tag_name)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleTagToggle(stat.tag_name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {stat.tag_name}
                  </Badge>
                  <span className="text-sm font-medium">{stat.client_count} clientes</span>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>📧 Con email:</span>
                    <span>{stat.clients_with_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>📱 Con teléfono:</span>
                    <span>{stat.clients_with_phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💬 WhatsApp:</span>
                    <span>{stat.whatsapp_clients}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSearchTargets}
              disabled={selectedTags.length === 0 || targetsLoading}
              className="flex items-center gap-2"
            >
              {targetsLoading ? (
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Buscar Clientes ({selectedTags.length} etiquetas)
            </Button>
            
            {targets.length > 0 && (
              <Button 
                variant="outline"
                onClick={handleExportTargets}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar ({targets.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultados de la búsqueda */}
      {showTargets && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clientes Objetivo ({targets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {targets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No se encontraron clientes con las etiquetas seleccionadas
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {targets.map((target) => (
                  <div
                    key={target.client_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{target.client_name}</div>
                      <div className="text-sm text-gray-600">
                        {target.client_email && (
                          <span className="mr-4">📧 {target.client_email}</span>
                        )}
                        {target.client_phone && (
                          <span className="mr-4">📱 {target.client_phone}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {target.client_channel && (
                        <Badge variant="outline" className={getChannelColor(target.client_channel)}>
                          {target.client_channel}
                        </Badge>
                      )}
                      
                      <div className="flex flex-wrap gap-1">
                        {target.matching_tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {target.matching_tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{target.matching_tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
