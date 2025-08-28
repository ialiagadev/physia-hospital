"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, Plus, TrendingUp, TrendingDown, History, AlertTriangle } from "lucide-react"
import { BalanceRechargeModal } from "./balance-recharge-modal"
import { BalanceHistoryModal } from "./balance-history-modal"

interface BalanceData {
  balance: number
  alertThreshold: number
  lastUpdated: string
  movements: Array<{
    id: number
    type: "ingreso" | "gasto"
    concept: string
    amount: string
    created_at: string
    notes?: string
  }>
  monthlyStats: {
    income: number
    expenses: number
    net: number
  }
}

export function BalanceCard() {
  const [data, setData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const fetchBalance = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/balance")
      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setError("")
      } else {
        setError(result.error || "Error cargando saldo")
      }
    } catch (err: any) {
      setError("Error de conexión")
      console.error("Error fetching balance:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [])

  const handleRechargeSuccess = () => {
    setShowRechargeModal(false)
    fetchBalance() // Recargar datos
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const isLowBalance = data && data.balance <= data.alertThreshold

  if (loading) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Disponible</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Disponible</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">{error}</div>
          <Button variant="outline" size="sm" onClick={fetchBalance} className="mt-2 bg-transparent">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <>
      <Card className={`border-l-4 ${isLowBalance ? "border-l-red-500" : "border-l-green-500"}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Saldo Disponible
            {isLowBalance && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Bajo
              </Badge>
            )}
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Saldo principal */}
            <div>
              <div className={`text-2xl font-bold ${isLowBalance ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(data.balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Actualizado: {new Date(data.lastUpdated).toLocaleString("es-ES")}
              </p>
            </div>

            {/* Estadísticas del mes */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-xs text-muted-foreground">Ingresos</span>
                </div>
                <div className="font-medium">{formatCurrency(data.monthlyStats.income)}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-red-600">
                  <TrendingDown className="w-3 h-3" />
                  <span className="text-xs text-muted-foreground">Gastos</span>
                </div>
                <div className="font-medium">{formatCurrency(data.monthlyStats.expenses)}</div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setShowRechargeModal(true)} className="flex-1">
                <Plus className="w-4 h-4 mr-1" />
                Recargar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowHistoryModal(true)} className="flex-1">
                <History className="w-4 h-4 mr-1" />
                Historial
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BalanceRechargeModal
        isOpen={showRechargeModal}
        onClose={() => setShowRechargeModal(false)}
        onSuccess={handleRechargeSuccess}
        currentBalance={data.balance}
      />

      <BalanceHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        movements={data.movements}
      />
    </>
  )
}
