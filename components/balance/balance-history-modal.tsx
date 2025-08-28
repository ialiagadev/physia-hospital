"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TrendingUp, TrendingDown, History } from "lucide-react"
import type { BalanceMovement } from "@/types/balance" // ⚡ usa el tipo compartido

interface BalanceHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  movements: BalanceMovement[]
}

export function BalanceHistoryModal({ isOpen, onClose, movements }: BalanceHistoryModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getConceptLabel = (concept: string) => {
    const labels: Record<string, string> = {
      manual_recharge: "Recarga manual",
      whatsapp_template: "Plantilla WhatsApp",
      subscription_bonus: "Bonus suscripción",
      refund: "Reembolso",
    }
    return labels[concept] || concept
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Movimientos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay movimientos registrados</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          movement.type === "ingreso" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        }`}
                      >
                        {movement.type === "ingreso" ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getConceptLabel(movement.concept)}</span>
                          <Badge variant={movement.type === "ingreso" ? "default" : "destructive"} className="text-xs">
                            {movement.type === "ingreso" ? "Ingreso" : "Gasto"}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">{formatDate(movement.created_at)}</div>
                        {movement.notes && <div className="text-xs text-gray-400 mt-1">{movement.notes}</div>}
                      </div>
                    </div>

                    <div
                      className={`text-lg font-semibold ${
                        movement.type === "ingreso" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {movement.type === "ingreso" ? "+" : "-"}
                      {formatCurrency(movement.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
