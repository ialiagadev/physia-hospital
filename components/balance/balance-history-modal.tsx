"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, History, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import type { BalanceMovement } from "@/types/balance"

interface BalanceHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  movements?: BalanceMovement[] // Made movements optional to handle undefined
}

export function BalanceHistoryModal({ isOpen, onClose, movements = [] }: BalanceHistoryModalProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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

  const totalPages = Math.ceil(movements.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMovements = movements.slice(startIndex, endIndex)

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      setCurrentPage(1)
    }
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToPrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const goToNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const start = Math.max(1, currentPage - 2)
      const end = Math.min(totalPages, start + maxVisiblePages - 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }

    return pages
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Movimientos
            <Badge variant="secondary" className="ml-2">
              {movements.length} movimientos
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay movimientos registrados</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {currentMovements.map((movement) => (
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
                            <Badge
                              variant={movement.type === "ingreso" ? "default" : "destructive"}
                              className="text-xs"
                            >
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Mostrando {startIndex + 1}-{Math.min(endIndex, movements.length)} de {movements.length} movimientos
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToPrevious} disabled={currentPage === 1}>
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>

                    <Button variant="outline" size="sm" onClick={goToNext} disabled={currentPage === totalPages}>
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
