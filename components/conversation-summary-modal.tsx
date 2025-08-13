"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Download, FileText, Info, Sparkles, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/app/contexts/auth-context"

interface ConversationSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  conversationId: string
  clientName: string
}

type TimeFilter = "all" | "3months" | "2months" | "1month" | "2weeks" | "1week"

interface SummaryStats {
  clientName: string
  conversationDate: string
  durationMinutes: number
  totalMessages: number
  analyzedMessages: number
  wasLimited?: boolean
  timeRange?: string
}

export function ConversationSummaryModal({
  isOpen,
  onClose,
  conversationId,
  clientName,
}: ConversationSummaryModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [conversationSummary, setConversationSummary] = useState<string>("")
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all")
  const { userProfile } = useAuth()

  // Si no está abierto, no renderizar nada
  if (!isOpen) return null

  const generateSummary = async () => {
    if (!conversationId || !userProfile?.organization_id) return

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-conversation-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          organizationId: userProfile.organization_id,
          timeFilter,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Error al generar resumen")
      }

      setConversationSummary(result.summary)
      setSummaryStats(result.statistics)

      toast({
        title: "Resumen generado",
        description: "El resumen de la conversación se ha generado correctamente",
      })
    } catch (error) {
      console.error("Error generando resumen:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el resumen",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopySummary = () => {
    if (conversationSummary) {
      navigator.clipboard.writeText(conversationSummary)
      toast({
        title: "Copiado",
        description: "El resumen ha sido copiado al portapapeles",
      })
    }
  }

  const handleDownloadSummary = () => {
    if (conversationSummary && summaryStats) {
      const timeRangeText = summaryStats.timeRange ? ` (${summaryStats.timeRange})` : ""

      const content = `RESUMEN DE CONVERSACIÓN${timeRangeText}
Cliente: ${summaryStats.clientName}
Fecha: ${summaryStats.conversationDate}
Duración: ${summaryStats.durationMinutes} minutos
Total mensajes: ${summaryStats.totalMessages}
Mensajes analizados: ${summaryStats.analyzedMessages}

${conversationSummary}`

      const blob = new Blob([content], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `resumen-${summaryStats.clientName}-${summaryStats.conversationDate}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Descargado",
        description: "El resumen ha sido descargado como archivo de texto",
      })
    }
  }

  const getTimeFilterLabel = (filter: TimeFilter): string => {
    switch (filter) {
      case "all":
        return "Toda la conversación"
      case "3months":
        return "Últimos 3 meses"
      case "2months":
        return "Últimos 2 meses"
      case "1month":
        return "Último mes"
      case "2weeks":
        return "Últimas 2 semanas"
      case "1week":
        return "Última semana"
      default:
        return "Toda la conversación"
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 sm:p-6 text-white flex-shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg flex-shrink-0">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-semibold truncate">Resumen de Conversación</h3>
                <p className="text-purple-100 text-sm">Generado con IA</p>
              </div>
            </div>
            <div className="flex gap-1 sm:gap-2 flex-shrink-0 ml-2">
              {conversationSummary && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopySummary}
                    className="text-white hover:bg-white hover:bg-opacity-20 h-8 w-8 sm:h-10 sm:w-10"
                    title="Copiar resumen"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownloadSummary}
                    className="text-white hover:bg-white hover:bg-opacity-20 h-8 w-8 sm:h-10 sm:w-10"
                    title="Descargar resumen"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 h-8 w-8 sm:h-10 sm:w-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {!conversationSummary ? (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <div className="bg-purple-50 rounded-full p-4">
                <Sparkles className="h-8 w-8 text-purple-600" />
              </div>

              <div className="text-center max-w-md">
                <h3 className="text-lg font-medium mb-2">Generar resumen de conversación</h3>
                <p className="text-gray-500 mb-6">
                  Selecciona el período de tiempo para el resumen y haz clic en "Generar" para crear un resumen de la
                  conversación con {clientName}.
                </p>

                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <label htmlFor="time-filter" className="text-sm font-medium text-gray-700">
                      Período de tiempo
                    </label>
                    <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
                      <SelectTrigger id="time-filter" className="w-full">
                        <SelectValue placeholder="Selecciona un período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toda la conversación</SelectItem>
                        <SelectItem value="3months">Últimos 3 meses</SelectItem>
                        <SelectItem value="2months">Últimos 2 meses</SelectItem>
                        <SelectItem value="1month">Último mes</SelectItem>
                        <SelectItem value="2weeks">Últimas 2 semanas</SelectItem>
                        <SelectItem value="1week">Última semana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={generateSummary}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {isGenerating ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generar Resumen
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Estadísticas con cards coloridas */}
              {summaryStats && (
                <div className="mb-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200">
                      <div className="text-blue-600 text-xs sm:text-sm font-medium">Cliente</div>
                      <div
                        className="text-blue-900 font-semibold text-sm sm:text-base truncate"
                        title={summaryStats.clientName}
                      >
                        {summaryStats.clientName}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 sm:p-4 rounded-lg border border-green-200">
                      <div className="text-green-600 text-xs sm:text-sm font-medium">Fecha</div>
                      <div className="text-green-900 font-semibold text-sm sm:text-base">
                        {summaryStats.conversationDate}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 sm:p-4 rounded-lg border border-orange-200">
                      <div className="text-orange-600 text-xs sm:text-sm font-medium">Duración</div>
                      <div className="text-orange-900 font-semibold text-sm sm:text-base">
                        {summaryStats.durationMinutes} min
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 sm:p-4 rounded-lg border border-purple-200">
                      <div className="text-purple-600 text-xs sm:text-sm font-medium">Mensajes</div>
                      <div className="text-purple-900 font-semibold text-sm sm:text-base">
                        {summaryStats.totalMessages}
                      </div>
                    </div>
                  </div>

                  {/* Información del período de tiempo */}
                  {timeFilter !== "all" && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800">
                        <p className="font-medium">Resumen filtrado por tiempo</p>
                        <p>Este resumen incluye solo mensajes de {getTimeFilterLabel(timeFilter).toLowerCase()}.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resumen con diseño mejorado */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-gray-800">Resumen Detallado</h4>
                </div>

                <div className="prose prose-sm max-w-none">
                  <div
                    className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base"
                    style={{
                      lineHeight: "1.6",
                    }}
                  >
                    {
                      conversationSummary
                        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove **bold**
                        .replace(/\*(.*?)\*/g, "$1") // Remove *italic*
                        .replace(/_(.*?)_/g, "$1") // Remove _underline_
                        .replace(/`(.*?)`/g, "$1") // Remove `code`
                    }
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer con botones */}
        <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            {conversationSummary ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCopySummary}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 bg-transparent w-full sm:w-auto"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadSummary}
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 bg-transparent w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 w-full sm:w-auto"
                >
                  Cerrar
                </Button>
              </>
            ) : (
              <Button onClick={onClose} variant="outline" className="w-full sm:w-auto bg-transparent">
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
