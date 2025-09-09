"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { LiquidGlass } from "@/components/liquid-glass"
import { ArrowLeft, TrendingUp, Eye } from "lucide-react"

interface SalesTemplateProps {
  onBack: () => void
  onSave: (data: { agentName: string; prompt: string }) => Promise<void>
}

export default function SalesTemplate({ onBack, onSave }: SalesTemplateProps) {
  const [activeTab, setActiveTab] = useState<"config" | "preview">("config")
  const [formData, setFormData] = useState({
    agentName: "",
    products: "",
    targetAudience: "",
    salesApproach: "",
    priceRange: "",
    objectionHandling: true,
    followUpStrategy: "",
    conversionGoals: "",
    communicationStyle: "",
  })

  const generatePrompt = () => {
    return `Eres ${formData.agentName}, un asistente especializado en ventas y conversión.

INFORMACIÓN DE PRODUCTOS/SERVICIOS:
- Productos/Servicios: ${formData.products || "No especificado"}
- Rango de precios: ${formData.priceRange || "No especificado"}

ESTRATEGIA DE VENTAS:
- Público objetivo: ${formData.targetAudience || "No especificado"}
- Enfoque de ventas: ${formData.salesApproach || "No especificado"}
- Estilo de comunicación: ${formData.communicationStyle || "No especificado"}
- Manejo de objeciones: ${formData.objectionHandling ? "Activado" : "Desactivado"}

OBJETIVOS Y SEGUIMIENTO:
- Objetivos de conversión: ${formData.conversionGoals || "No especificado"}
- Estrategia de seguimiento: ${formData.followUpStrategy || "No especificado"}

INSTRUCCIONES:
1. Identifica las necesidades específicas del cliente potencial
2. Presenta los productos/servicios de manera atractiva y personalizada
3. Utiliza el enfoque de ventas establecido para guiar la conversación
4. ${formData.objectionHandling ? "Maneja las objeciones de manera empática y con argumentos sólidos" : "Deriva las objeciones a un especialista humano"}
5. Proporciona información clara sobre precios y beneficios
6. Guía al cliente hacia la conversión siguiendo los objetivos establecidos
7. Implementa la estrategia de seguimiento para mantener el interés
8. Mantén siempre un tono profesional y orientado al cliente

PROTOCOLO DE VENTAS:
- Escucha activa: Comprende las necesidades del cliente
- Presentación de valor: Destaca beneficios relevantes
- Manejo de objeciones: Responde con empatía y datos
- Cierre: Guía hacia la acción deseada
- Seguimiento: Mantén la relación post-venta

Responde siempre de manera profesional, persuasiva y centrada en el valor que puedes aportar al cliente.`
  }

  const handleSave = async () => {
    if (!formData.agentName.trim()) {
      alert("Por favor, ingresa un nombre para el agente")
      return
    }

    await onSave({
      agentName: formData.agentName,
      prompt: generatePrompt(),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-600" />
          <span className="font-semibold">Ventas</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("config")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "config" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Configuración
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "preview" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Vista Previa
        </button>
      </div>

      {/* Content */}
      <LiquidGlass
        variant="card"
        intensity="medium"
        className="p-6 min-h-[600px]"
        style={{
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0, 0, 0, 0.1)",
        }}
      >
        {activeTab === "config" ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Configuración del Agente</h3>
              <p className="text-sm text-gray-600 mb-6">
                Configura los parámetros específicos para Ventas y Conversión.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="agentName">Nombre del agente *</Label>
                <Input
                  id="agentName"
                  value={formData.agentName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, agentName: e.target.value }))}
                  placeholder="Ej: Asistente de Ventas"
                />
              </div>

              <div>
                <Label htmlFor="products">Productos/Servicios *</Label>
                <Textarea
                  id="products"
                  value={formData.products}
                  onChange={(e) => setFormData((prev) => ({ ...prev, products: e.target.value }))}
                  placeholder="Fisioterapia, osteopatía, podología, tratamientos de rehabilitación..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">Describe los productos o servicios que ofreces</p>
              </div>

              <div>
                <Label htmlFor="targetAudience">Público objetivo *</Label>
                <Textarea
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData((prev) => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="Deportistas, personas con dolor crónico, adultos mayores..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">Define tu cliente ideal</p>
              </div>

              <div>
                <Label htmlFor="salesApproach">Enfoque de ventas</Label>
                <Select
                  value={formData.salesApproach}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, salesApproach: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el enfoque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultivo">Consultivo</SelectItem>
                    <SelectItem value="educativo">Educativo</SelectItem>
                    <SelectItem value="directo">Directo</SelectItem>
                    <SelectItem value="relacional">Relacional</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Metodología de venta preferida</p>
              </div>

              <div>
                <Label htmlFor="priceRange">Rango de precios</Label>
                <Input
                  id="priceRange"
                  value={formData.priceRange}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priceRange: e.target.value }))}
                  placeholder="Desde 50€ hasta 200€ por sesión"
                />
                <p className="text-xs text-gray-500 mt-1">Información sobre precios de tus servicios</p>
              </div>

              <div>
                <Label htmlFor="communicationStyle">Estilo de comunicación</Label>
                <Select
                  value={formData.communicationStyle}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, communicationStyle: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el estilo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesional">Profesional</SelectItem>
                    <SelectItem value="amigable">Amigable</SelectItem>
                    <SelectItem value="empático">Empático</SelectItem>
                    <SelectItem value="directo">Directo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Tono y manera de comunicarse</p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="objectionHandling"
                  checked={formData.objectionHandling}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, objectionHandling: checked }))}
                />
                <Label htmlFor="objectionHandling">Manejo automático de objeciones</Label>
              </div>

              <div>
                <Label htmlFor="conversionGoals">Objetivos de conversión</Label>
                <Textarea
                  id="conversionGoals"
                  value={formData.conversionGoals}
                  onChange={(e) => setFormData((prev) => ({ ...prev, conversionGoals: e.target.value }))}
                  placeholder="Agendar cita de evaluación, suscripción a plan mensual..."
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Acciones específicas que quieres lograr</p>
              </div>

              <div>
                <Label htmlFor="followUpStrategy">Estrategia de seguimiento</Label>
                <Textarea
                  id="followUpStrategy"
                  value={formData.followUpStrategy}
                  onChange={(e) => setFormData((prev) => ({ ...prev, followUpStrategy: e.target.value }))}
                  placeholder="Contacto a las 24h, recordatorio semanal, ofertas especiales..."
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Cómo mantener el contacto con prospectos</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Vista Previa del Prompt</h3>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">{generatePrompt()}</pre>
            </div>
          </div>
        )}
      </LiquidGlass>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
          Crear Agente
        </Button>
      </div>
    </div>
  )
}
