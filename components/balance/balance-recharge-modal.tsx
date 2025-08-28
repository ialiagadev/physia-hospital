"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CreditCard, Wallet } from "lucide-react"
import { useAuth } from "@/app/contexts/auth-context"

interface BalanceRechargeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentBalance: number
}

export function BalanceRechargeModal({ isOpen, onClose, onSuccess, currentBalance }: BalanceRechargeModalProps) {
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { userProfile } = useAuth() // 👈 obtenemos organization_id

  const predefinedAmounts = [10, 25, 50, 100]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = Number.parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      setError("Ingresa una cantidad válida")
      return
    }

    if (numAmount > 1000) {
      setError("La cantidad máxima es 1000€")
      return
    }

    if (!userProfile?.organization_id) {
      setError("No se encontró la organización del usuario")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/balance/recharge/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          notes: notes.trim() || undefined,
          orgId: userProfile.organization_id,
        }),
      })

      const result = await response.json()

      if (result.success && result.url) {
        window.location.href = result.url // 👉 redirige a Stripe Checkout
      } else {
        setError(result.error || "Error creando sesión de pago")
      }
    } catch (err: any) {
      setError("Error de conexión con Stripe")
      console.error("Error creando sesión de Stripe:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      setAmount("")
      setNotes("")
      setError("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Recargar Saldo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Saldo actual */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Saldo actual</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(currentBalance)}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cantidad */}
            <div className="space-y-2">
              <Label htmlFor="amount">Cantidad a recargar</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pr-8"
                  disabled={loading}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">€</span>
              </div>
            </div>

            {/* Cantidades predefinidas */}
            <div className="space-y-2">
              <Label className="text-sm">Cantidades rápidas</Label>
              <div className="grid grid-cols-4 gap-2">
                {predefinedAmounts.map((preAmount) => (
                  <Button
                    key={preAmount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(preAmount.toString())}
                    disabled={loading}
                    className="text-xs"
                  >
                    {preAmount}€
                  </Button>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Motivo de la recarga..."
                rows={2}
                disabled={loading}
              />
            </div>

            {/* Vista previa */}
            {amount && Number.parseFloat(amount) > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Saldo actual:</span>
                    <span>{formatCurrency(currentBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recarga:</span>
                    <span>+{formatCurrency(Number.parseFloat(amount))}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-blue-200 pt-1 mt-1">
                    <span>Nuevo saldo:</span>
                    <span>{formatCurrency(currentBalance + Number.parseFloat(amount))}</span>
                  </div>
                </div>
              </div>
            )}

            {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}

            {/* Botones */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 bg-transparent"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !amount || Number.parseFloat(amount) <= 0} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Recargar
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
