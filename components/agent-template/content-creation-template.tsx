"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LiquidGlass } from "@/components/liquid-glass"
import { ArrowLeft, FileText, Eye } from "lucide-react"

interface ContentCreationTemplateProps {
  onBack: () => void
  onSave: (data: { agentName: string; prompt: string }) => Promise<void>
}

export default function ContentCreationTemplate({ onBack, onSave }: ContentCreationTemplateProps) {
  const [activeTab, setActiveTab] = useState<"config" | "preview">("config")
  const [formData, setFormData] = useState({
    agentName: "",
    contentType: "",
    targetAudience: "",
    brandVoice: "",
    communicationTone: "",
    keywords: "",
    desiredStructure: "",
    wordCount: "",
    callToAction: "",
  })

  const generatePrompt = () => {
    return `Eres ${formData.agentName}, un asistente especializado en creación de contenido.

INFORMACIÓN BÁSICA:
- Tipo de contenido: ${formData.contentType || "No especificado"}
- Público objetivo: ${formData.targetAudience || "No especificado"}
- Guía de estilo/Voz de marca: ${formData.brandVoice || "No especificado"}
- Tono de comunicación: ${formData.communicationTone || "No especificado"}

ESPECIFICACIONES DE CONTENIDO:
- Palabras clave (SEO): ${formData.keywords || "No especificado"}
- Estructura deseada: ${formData.desiredStructure || "No especificado"}
- Longitud aproximada: ${formData.wordCount ? `${formData.wordCount} palabras` : "No especificado"}
- Call to Action: ${formData.callToAction || "No especificado"}

INSTRUCCIONES:
1. Crea contenido optimizado para el público objetivo especificado
2. Mantén siempre la voz de marca y el tono de comunicación establecido
3. Incluye las palabras clave de manera natural para SEO
4. Sigue la estructura deseada cuando sea proporcionada
5. Respeta la longitud aproximada solicitada
6. Incluye el call to action de manera efectiva
7. Asegúrate de que el contenido sea engaging y valioso para la audiencia

Responde siempre de manera profesional y creativa, adaptando el contenido al formato solicitado (blog, redes sociales, newsletter, etc.).`
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
          <FileText className="h-5 w-5 text-green-600" />
          <span className="font-semibold">Creación de Contenido</span>
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
                Configura los parámetros específicos para Creación de Contenido.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="agentName">Nombre del agente *</Label>
                <Input
                  id="agentName"
                  value={formData.agentName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, agentName: e.target.value }))}
                  placeholder="Ej: Asistente de Creación de Contenido"
                />
              </div>

              <div>
                <Label htmlFor="contentType">Tipo de contenido *</Label>
                <Input
                  id="contentType"
                  value={formData.contentType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contentType: e.target.value }))}
                  placeholder="Blog, Instagram, Newsletter..."
                />
                <p className="text-xs text-gray-500 mt-1">Formato o canal deseado</p>
              </div>

              <div>
                <Label htmlFor="targetAudience">Público objetivo *</Label>
                <Textarea
                  id="targetAudience"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData((prev) => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="Pacientes deportistas, adultos mayores..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">Perfil al que va dirigido el contenido</p>
              </div>

              <div>
                <Label htmlFor="brandVoice">Guía de estilo / Voz de marca</Label>
                <Textarea
                  id="brandVoice"
                  value={formData.brandVoice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, brandVoice: e.target.value }))}
                  placeholder="Formal, cercano, humorístico..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">Define el estilo y la personalidad de la marca</p>
              </div>

              <div>
                <Label htmlFor="communicationTone">Tono de comunicación</Label>
                <Input
                  id="communicationTone"
                  value={formData.communicationTone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, communicationTone: e.target.value }))}
                  placeholder="Informativo y atractivo"
                />
                <p className="text-xs text-gray-500 mt-1">Emociones y matices a transmitir</p>
              </div>

              <div>
                <Label htmlFor="keywords">Palabras clave (SEO)</Label>
                <Input
                  id="keywords"
                  value={formData.keywords}
                  onChange={(e) => setFormData((prev) => ({ ...prev, keywords: e.target.value }))}
                  placeholder="rehabilitación, bienestar"
                />
                <p className="text-xs text-gray-500 mt-1">Términos clave para posicionamiento</p>
              </div>

              <div>
                <Label htmlFor="desiredStructure">Estructura deseada</Label>
                <Textarea
                  id="desiredStructure"
                  value={formData.desiredStructure}
                  onChange={(e) => setFormData((prev) => ({ ...prev, desiredStructure: e.target.value }))}
                  placeholder="Título, introducción, secciones, conclusión..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">Define encabezados y flujo del contenido</p>
              </div>

              <div>
                <Label htmlFor="wordCount">Longitud aproximada (palabras)</Label>
                <Input
                  id="wordCount"
                  type="number"
                  value={formData.wordCount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, wordCount: e.target.value }))}
                  placeholder="500"
                />
                <p className="text-xs text-gray-500 mt-1">Extensión estimada del texto</p>
              </div>

              <div>
                <Label htmlFor="callToAction">Call to Action</Label>
                <Textarea
                  id="callToAction"
                  value={formData.callToAction}
                  onChange={(e) => setFormData((prev) => ({ ...prev, callToAction: e.target.value }))}
                  placeholder="Agenda tu cita hoy!"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Mensaje final para invitar a la acción</p>
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
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
          Crear Agente
        </Button>
      </div>
    </div>
  )
}
