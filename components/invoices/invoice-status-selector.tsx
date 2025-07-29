"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { ChevronDown, Check, FileText, AlertTriangle, Send, CreditCard, HelpCircle } from "lucide-react"

type InvoiceStatus = "draft" | "issued" | "sent" | "paid"

interface InvoiceStatusSelectorProps {
  invoiceId: number
  currentStatus: InvoiceStatus
  onStatusChange?: (newStatus: string) => void
  disabled?: boolean
  size?: "sm" | "default" | "lg"
}

const statusConfig: Record<
  InvoiceStatus,
  {
    label: string
    color: string
    icon: any
    description: string
  }
> = {
  draft: {
    label: "Borrador",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: FileText,
    description: "Factura en borrador, no válida fiscalmente",
  },
  issued: {
    label: "Emitida",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Check,
    description: "Factura validada y emitida",
  },
  sent: {
    label: "Enviada",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Send,
    description: "Factura enviada al cliente",
  },
  paid: {
    label: "Pagada",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CreditCard,
    description: "Factura pagada completamente",
  },
}

// Configuración por defecto para estados no reconocidos
const defaultStatusConfig = {
  label: "Estado desconocido",
  color: "bg-gray-100 text-gray-800 border-gray-200",
  icon: HelpCircle,
  description: "Estado no reconocido",
}

export function InvoiceStatusSelector({
  invoiceId,
  currentStatus,
  onStatusChange,
  disabled = false,
  size = "sm",
}: InvoiceStatusSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const { toast } = useToast()

  // Función para obtener la configuración del estado de forma segura
  const getStatusConfig = (status: string) => {
    return statusConfig[status as InvoiceStatus] || defaultStatusConfig
  }

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (newStatus === currentStatus || disabled) return

    // Validaciones de transición de estado
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      toast({
        title: "Transición no válida",
        description: getTransitionErrorMessage(currentStatus, newStatus),
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)

    try {
      const updateData: any = {
        status: newStatus,
      }

      // Si se está validando un borrador (draft -> issued), añadir timestamp de validación
      if (currentStatus === "draft" && newStatus === "issued") {
        updateData.validated_at = new Date().toISOString()
      }

      const { error } = await supabase.from("invoices").update(updateData).eq("id", invoiceId)

      if (error) {
        throw new Error(`Error al actualizar el estado: ${error.message}`)
      }

      toast({
        title: "Estado actualizado",
        description: `La factura ahora está ${getStatusConfig(newStatus).label.toLowerCase()}`,
      })

      // Llamar al callback si se proporciona
      if (onStatusChange) {
        onStatusChange(newStatus)
      }
    } catch (error) {
      console.error("Error al actualizar estado:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el estado",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const isValidStatusTransition = (from: InvoiceStatus, to: InvoiceStatus): boolean => {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      // BORRADOR: Solo puede validarse (pasar a emitida)
      draft: ["issued"],

      // EMITIDA: Una vez emitida, NO puede volver a borrador (VeriFactu)
      // Puede pasar a enviada o directamente a pagada
      issued: ["sent", "paid"],

      // ENVIADA: Puede pasar a pagada
      sent: ["paid"],

      // PAGADA: Estado final, no puede cambiar
      paid: [],
    }

    return validTransitions[from]?.includes(to) || false
  }

  const getTransitionErrorMessage = (from: InvoiceStatus, to: InvoiceStatus): string => {
    const fromLabel = getStatusConfig(from).label
    const toLabel = getStatusConfig(to).label

    switch (from) {
      case "draft":
        if (to !== "issued") {
          return "Un borrador solo puede validarse (pasar a emitida). No puede pasar directamente a otros estados."
        }
        break

      case "issued":
        if (to === "draft") {
          return "Una factura emitida no puede volver a borrador. Una vez validada, tiene validez fiscal según VeriFactu."
        }
        if (to !== "sent" && to !== "paid") {
          return "Una factura emitida solo puede enviarse al cliente o marcarse como pagada."
        }
        break

      case "sent":
        if (to !== "paid") {
          return "Una factura enviada solo puede marcarse como pagada."
        }
        break

      case "paid":
        return "Una factura pagada no puede cambiar de estado. Es un estado final."

      default:
        return `No se puede cambiar de ${fromLabel} a ${toLabel}. Esta transición no está permitida.`
    }

    return `No se puede cambiar de ${fromLabel} a ${toLabel}. Esta transición no está permitida.`
  }

  const getAvailableStatuses = (): InvoiceStatus[] => {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      draft: ["issued"],
      issued: ["sent", "paid"],
      sent: ["paid"],
      paid: [],
    }

    return validTransitions[currentStatus] || []
  }

  const getStatusExplanation = (status: InvoiceStatus): string => {
    switch (status) {
      case "issued":
        return currentStatus === "draft" ? "Validar y emitir la factura (irreversible)" : "Marcar como emitida"
      case "sent":
        return "Marcar como enviada al cliente"
      case "paid":
        return "Marcar como pagada (estado final)"
      default:
        return "Cambiar estado"
    }
  }

  const currentStatusConfig = getStatusConfig(currentStatus)
  const CurrentIcon = currentStatusConfig.icon
  const availableStatuses = getAvailableStatuses()

  // Si no hay transiciones disponibles, mostrar solo el estado actual sin dropdown
  if (availableStatuses.length === 0 || disabled) {
    return (
      <Badge variant="outline" className={currentStatusConfig.color}>
        <CurrentIcon className="w-3 h-3 mr-1" />
        {currentStatusConfig.label}
        {currentStatus === "paid" && <span className="ml-1 text-xs">(Final)</span>}
      </Badge>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled || isUpdating} className="h-auto p-0 hover:bg-transparent">
          <Badge
            variant="outline"
            className={`${currentStatusConfig.color} cursor-pointer hover:opacity-80 transition-opacity`}
          >
            <CurrentIcon className="w-3 h-3 mr-1" />
            {currentStatusConfig.label}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5 text-sm font-medium text-gray-700 border-b">Cambiar estado de la factura</div>

        {availableStatuses.map((status) => {
          const statusConfig = getStatusConfig(status)
          const StatusIcon = statusConfig.icon
          const isCurrentStatus = status === currentStatus

          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              disabled={isCurrentStatus || isUpdating}
              className="flex items-start gap-3 py-3 cursor-pointer"
            >
              <StatusIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{statusConfig.label}</div>
                <div className="text-xs text-gray-500 mt-0.5 leading-tight">{getStatusExplanation(status)}</div>
              </div>
              {isCurrentStatus && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
            </DropdownMenuItem>
          )
        })}

        {/* Información contextual según el estado actual */}
        {currentStatus === "draft" && (
          <div className="px-3 py-2 text-xs text-amber-600 bg-amber-50 border-t flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">⚠️ Validación irreversible</div>
              <div className="text-amber-700 mt-0.5">
                Una vez emitida, la factura no podrá volver a borrador por cumplimiento de VeriFactu.
              </div>
            </div>
          </div>
        )}

        {currentStatus === "issued" && (
          <div className="px-3 py-2 text-xs text-blue-600 bg-blue-50 border-t">
            <div className="font-medium">✅ Factura validada (VeriFactu)</div>
            <div className="text-blue-700 mt-0.5">
              Esta factura tiene validez fiscal. Puede enviarse al cliente o marcarse directamente como pagada.
            </div>
          </div>
        )}

        {currentStatus === "sent" && (
          <div className="px-3 py-2 text-xs text-indigo-600 bg-indigo-50 border-t">
            <div className="font-medium">📤 Factura enviada</div>
            <div className="text-indigo-700 mt-0.5">
              La factura ha sido enviada al cliente. Solo puede marcarse como pagada.
            </div>
          </div>
        )}

        {currentStatus === "paid" && (
          <div className="px-3 py-2 text-xs text-green-600 bg-green-50 border-t">
            <div className="font-medium">💰 Estado final</div>
            <div className="text-green-700 mt-0.5">
              Esta factura está completamente pagada. No puede cambiar de estado.
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
