"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { ChevronDown, Check, FileText, AlertTriangle, HelpCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { generateUniqueInvoiceNumber } from "@/lib/invoice-utils"

type InvoiceStatus = "draft" | "issued"

interface InvoiceStatusSelectorProps {
  invoiceId: number
  currentStatus: InvoiceStatus
  organizationId: number
  invoiceType: string
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
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: FileText,
    description: "Factura en borrador, no válida fiscalmente",
  },
  issued: {
    label: "Emitida",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Check,
    description: "Factura emitida",
  },
}

const defaultStatusConfig = {
  label: "Estado desconocido",
  color: "bg-gray-100 text-gray-800 border-gray-200",
  icon: HelpCircle,
  description: "Estado no reconocido",
}

export function InvoiceStatusSelector({
  invoiceId,
  currentStatus,
  organizationId,
  invoiceType,
  onStatusChange,
  disabled = false,
  size = "sm",
}: InvoiceStatusSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<InvoiceStatus | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { toast } = useToast()

  const getStatusConfig = (status: string) => {
    return statusConfig[status as InvoiceStatus] || defaultStatusConfig
  }

  const isValidStatusTransition = (from: InvoiceStatus, to: InvoiceStatus): boolean => {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      draft: ["issued"],
      issued: [], // No hay transiciones desde issued
    }
    return validTransitions[from]?.includes(to) || false
  }

  const getAvailableStatuses = (): InvoiceStatus[] => {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      draft: ["issued"],
      issued: [], // No hay transiciones desde issued
    }
    return validTransitions[currentStatus] || []
  }

  const getStatusExplanation = (status: InvoiceStatus): string => {
    switch (status) {
      case "issued":
        return "Validar y emitir la factura (se asignará número y enviará a VeriFactu)"
      default:
        return "Cambiar estado"
    }
  }

  const handleCancel = () => {
    setShowConfirmDialog(false)
    setPendingStatus(null)
    setIsUpdating(false)
  }

  const updateInvoiceStatus = async (newStatus: InvoiceStatus) => {
    setIsUpdating(true)
    try {
      const isFromDraftToIssued = currentStatus === "draft" && newStatus === "issued"

      if (isFromDraftToIssued) {
        console.log("🔄 Iniciando cambio de draft a issued...")

        // ✅ GENERAR Y ASIGNAR NÚMERO DE FACTURA
        const { invoiceNumberFormatted, newInvoiceNumber } = await generateUniqueInvoiceNumber(
          organizationId,
          invoiceType as any,
        )

        // ✅ ACTUALIZAR CONTADOR EN ORGANIZACIÓN
        const getFieldNameForUpdate = (type: string): string => {
          switch (type) {
            case "rectificativa":
              return "last_rectificative_invoice_number"
            case "simplificada":
              return "last_simplified_invoice_number"
            case "normal":
            default:
              return "last_invoice_number"
          }
        }

        const fieldName = getFieldNameForUpdate(invoiceType)
        const { error: updateOrgError } = await supabase
          .from("organizations")
          .update({ [fieldName]: newInvoiceNumber })
          .eq("id", organizationId)

        if (updateOrgError) {
          console.error("Error updating organization:", updateOrgError)
          throw new Error("Error al reservar el número de factura")
        }

        // ✅ ACTUALIZAR FACTURA CON NÚMERO Y ESTADO
        const { error: dbError } = await supabase
          .from("invoices")
          .update({
            status: newStatus,
            invoice_number: invoiceNumberFormatted, // ✅ ASIGNAR NÚMERO AQUÍ
            validated_at: new Date().toISOString(),
          })
          .eq("id", invoiceId)

        if (dbError) {
          throw new Error(`Error al actualizar el estado: ${dbError.message}`)
        }

        // ✅ ENVIAR A VERIFACTU
        try {
          const res = await fetch(`/api/verifactu/send-invoice?invoice_id=${invoiceId}`)
          const data = await res.json()

          if (!res.ok) {
            throw new Error(data?.error || `Error ${res.status}: ${res.statusText}`)
          }

          toast({
            title: "✅ Factura emitida correctamente",
            description: `La factura ${invoiceNumberFormatted} se ha validado y enviado a VeriFactu exitosamente`,
          })
        } catch (verifactuError) {
          console.error("❌ Error en Verifactu, haciendo rollback...")

          // ✅ ROLLBACK COMPLETO
          await supabase
            .from("invoices")
            .update({
              status: "draft",
              invoice_number: null, // ✅ QUITAR NÚMERO EN ROLLBACK
              validated_at: null,
            })
            .eq("id", invoiceId)

          // ✅ ROLLBACK DEL CONTADOR
          await supabase
            .from("organizations")
            .update({ [fieldName]: newInvoiceNumber - 1 })
            .eq("id", organizationId)

          toast({
            title: "Error en Verifactu",
            description: `${verifactuError instanceof Error ? verifactuError.message : "Error desconocido"}. La factura se mantiene en borrador.`,
            variant: "destructive",
          })
          return
        }
      } else {
        // ✅ OTROS CAMBIOS DE ESTADO (SIN CAMBIAR NÚMERO)
        const { error: dbError } = await supabase.from("invoices").update({ status: newStatus }).eq("id", invoiceId)

        if (dbError) {
          throw new Error(`Error al actualizar el estado: ${dbError.message}`)
        }

        toast({
          title: "Estado actualizado",
          description: `La factura ahora está ${getStatusConfig(newStatus).label.toLowerCase()}`,
        })
      }

      // ✅ NOTIFICAR CAMBIO
      if (onStatusChange) {
        onStatusChange(newStatus)
      }
    } catch (error) {
      console.error("❌ Error al actualizar estado:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el estado",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const confirmStatusChange = async () => {
    if (!pendingStatus) return
    setShowConfirmDialog(false)
    await updateInvoiceStatus(pendingStatus)
    setPendingStatus(null)
  }

  const handleStatusClick = (newStatus: InvoiceStatus) => {
    if (newStatus === currentStatus || disabled || isUpdating) return

    if (!isValidStatusTransition(currentStatus, newStatus)) {
      const fromLabel = getStatusConfig(currentStatus).label
      const toLabel = getStatusConfig(newStatus).label
      toast({
        title: "Transición no válida",
        description: `No se puede cambiar de ${fromLabel} a ${toLabel}`,
        variant: "destructive",
      })
      return
    }

    setDropdownOpen(false)

    if (currentStatus === "draft" && newStatus === "issued") {
      setPendingStatus(newStatus)
      setTimeout(() => {
        setShowConfirmDialog(true)
      }, 100)
    } else {
      updateInvoiceStatus(newStatus)
    }
  }

  const currentStatusConfig = getStatusConfig(currentStatus)
  const CurrentIcon = currentStatusConfig.icon
  const availableStatuses = getAvailableStatuses()

  if (availableStatuses.length === 0 || disabled) {
    return (
      <Badge variant="outline" className={currentStatusConfig.color}>
        <CurrentIcon className="w-3 h-3 mr-1" />
        {currentStatusConfig.label}
      </Badge>
    )
  }

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || isUpdating}
            className="h-auto p-0 hover:bg-transparent"
          >
            <Badge
              variant="outline"
              className={`${currentStatusConfig.color} cursor-pointer hover:opacity-80 transition-opacity`}
            >
              <CurrentIcon className="w-3 h-3 mr-1" />
              {isUpdating ? "Actualizando..." : currentStatusConfig.label}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="px-2 py-1.5 text-sm font-medium text-gray-700 border-b">Cambiar estado de la factura</div>
          {availableStatuses.map((status) => {
            const statusCfg = getStatusConfig(status)
            const StatusIcon = statusCfg.icon
            const isCurrent = status === currentStatus
            return (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusClick(status)}
                disabled={isCurrent || isUpdating}
                className="flex items-start gap-3 py-3 cursor-pointer"
              >
                <StatusIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{statusCfg.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">{getStatusExplanation(status)}</div>
                </div>
                {isCurrent && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
              </DropdownMenuItem>
            )
          })}

          {currentStatus === "draft" && (
            <div className="px-3 py-2 text-xs text-yellow-600 bg-yellow-50 border-t flex items-start gap-2">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">📝 Factura en borrador</div>
                <div className="text-yellow-700 mt-0.5">
                  Al emitir se asignará número, se validará fiscalmente con VeriFactu y no podrá volver a borrador.
                </div>
              </div>
            </div>
          )}
          {currentStatus === "issued" && (
            <div className="px-3 py-2 text-xs text-blue-600 bg-blue-50 border-t">
              <div className="font-medium">✅ Factura validada (VeriFactu)</div>
              <div className="text-blue-700 mt-0.5">Factura emitida y validada fiscalmente.</div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmar emisión de factura
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-800 font-medium mb-2">⚠️ Esta acción es IRREVERSIBLE</p>
                <div className="text-sm text-amber-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-amber-600 rounded-full"></div>
                    <span>Se asignará automáticamente el número de factura</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-amber-600 rounded-full"></div>
                    <span>Se enviará automáticamente a VeriFactu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-amber-600 rounded-full"></div>
                    <span>La factura se validará fiscalmente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-amber-600 rounded-full"></div>
                    <span>No podrá volver a estado borrador</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>📋 Qué sucederá:</strong> La factura se marcará como "Emitida", se generará el código QR de
                  VeriFactu y estará lista para enviar al cliente.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={confirmStatusChange} disabled={isUpdating} className="bg-blue-600 hover:bg-blue-700">
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Emitiendo...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar emisión
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
