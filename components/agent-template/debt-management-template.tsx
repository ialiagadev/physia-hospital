"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LiquidGlass } from "@/components/liquid-glass"
import { ArrowLeft, CreditCard, Eye } from "lucide-react"

interface DebtManagementTemplateProps {
  onBack: () => void
  onSave: (data: { agentName: string; prompt: string }) => Promise<void>
}

export default function DebtManagementTemplate({ onBack, onSave }: DebtManagementTemplateProps) {
  const [activeTab, setActiveTab] = useState<"config" | "preview">("config")
  const [formData, setFormData] = useState({
    agentName: "",
    entityName: "",
    reminderFrequency: "",
    gracePeriod: "",
    lateCharge: "",
    paymentLink: "",
    escalationThreshold: "",
  })

  const generatePrompt = () => {
    return `Eres ${formData.agentName}, un asistente especializado en gestión de impagos de ${formData.entityName || "la clínica"}.

INFORMACIÓN DE LA ENTIDAD:
- Nombre de la entidad: ${formData.entityName || "No especificado"}
- Enlace de pago: ${formData.paymentLink || "No especificado"}

CONFIGURACIÓN DE RECORDATORIOS:
- Frecuencia de recordatorio: ${formData.reminderFrequency || "No especificado"}
- Período de gracia: ${formData.gracePeriod ? `${formData.gracePeriod} días` : "No especificado"}
- Recargo por demora: ${formData.lateCharge ? `${formData.lateCharge}%` : "No especificado"}
- Umbral de escalación: ${formData.escalationThreshold ? `${formData.escalationThreshold} días` : "No especificado"}

INSTRUCCIONES:
1. Mantén siempre un tono profesional y empático al comunicarte sobre pagos pendientes
2. Proporciona información clara sobre el estado de la deuda y las opciones de pago
3. Incluye el enlace de pago cuando sea apropiado
4. Explica los recargos por demora de manera transparente
5. Ofrece opciones de pago flexibles cuando sea posible
6. Escala a supervisión humana cuando se alcance el umbral de escalación
7. Registra todas las interacciones para seguimiento

PROTOCOLO DE COMUNICACIÓN:
- Primer contacto: Recordatorio amable del pago pendiente
- Segundo contacto: Información sobre recargos y consecuencias
- Escalación: Derivar a personal especializado en cobros

Responde siempre de manera profesional, clara y empática, buscando resolver la situación de pago de la mejor manera para ambas partes.`
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
          <CreditCard className="h-5 w-5 text-red-600" />
          <span className="font-semibold">Gestión de Impagos</span>
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
                Configura los parámetros específicos para Gestión de Impagos.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="agentName">Nombre del agente *</Label>
                <Input
                  id="agentName"
                  value={formData.agentName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, agentName: e.target.value }))}
                  placeholder="Ej: Asistente de Gestión de Impagos"
                />
              </div>

              <div>
                <Label htmlFor="entityName">Nombre de la entidad *</Label>
                <Input
                  id="entityName"
                  value={formData.entityName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, entityName: e.target.value }))}
                  placeholder="Clínica SaludPlus"
                />
                <p className="text-xs text-gray-500 mt-1">Nombre de tu clínica o empresa</p>
              </div>

              <div>
                <Label htmlFor="reminderFrequency">Frecuencia de recordatorio</Label>
                <Select
                  value={formData.reminderFrequency}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, reminderFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">Diario</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Intervalo para enviar notificaciones</p>
              </div>

              <div>
                <Label htmlFor="gracePeriod">Período de gracia (días)</Label>
                <Input
                  id="gracePeriod"
                  type="number"
                  value={formData.gracePeriod}
                  onChange={(e) => setFormData((prev) => ({ ...prev, gracePeriod: e.target.value }))}
                  placeholder="7"
                />
                <p className="text-xs text-gray-500 mt-1">Días antes de aplicar recargos</p>
              </div>

              <div>
                <Label htmlFor="lateCharge">Recargo por demora</Label>
                <Input
                  id="lateCharge"
                  value={formData.lateCharge}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lateCharge: e.target.value }))}
                  placeholder="5%"
                />
                <p className="text-xs text-gray-500 mt-1">Porcentaje o monto fijo adicional</p>
              </div>

              <div>
                <Label htmlFor="paymentLink">Enlace de pago *</Label>
                <Input
                  id="paymentLink"
                  value={formData.paymentLink}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paymentLink: e.target.value }))}
                  placeholder="https://pay.example.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">URL para abonar la deuda</p>
              </div>

              <div>
                <Label htmlFor="escalationThreshold">Umbral de escalación (días)</Label>
                <Input
                  id="escalationThreshold"
                  type="number"
                  value={formData.escalationThreshold}
                  onChange={(e) => setFormData((prev) => ({ ...prev, escalationThreshold: e.target.value }))}
                  placeholder="30"
                />
                <p className="text-xs text-gray-500 mt-1">Días tras los cuales escalar internamente</p>
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
        <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">
          Crear Agente
        </Button>
      </div>
    </div>
  )
}
