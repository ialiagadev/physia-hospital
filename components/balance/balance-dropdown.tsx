"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { BalanceRechargeModal } from "./balance-recharge-modal"
import { BalanceHistoryModal } from "./balance-history-modal"
import type { BalanceMovement } from "@/types/balance"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/app/contexts/auth-context"

interface BalanceData {
  balance: number
  alertThreshold: number
  lastUpdated: string
  movements: BalanceMovement[]
  monthlyStats: {
    income: number
    expenses: number
    net: number
  }
}

export function BalanceDropdown() {
  const [data, setData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [openMenu, setOpenMenu] = useState(false)
  const { userProfile } = useAuth()

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

  // 🔥 Realtime para actualizar el balance sin recargar
  useEffect(() => {
    if (!userProfile?.organization_id) return

    const channel = supabase
      .channel("org-balance-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "organizations",
          filter: `id=eq.${userProfile.organization_id}`,
        },
        (payload) => {
          console.log("🔄 Balance actualizado:", payload.new.balance)
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  balance: payload.new.balance,
                  lastUpdated: new Date().toISOString(),
                }
              : prev,
          )
          // 👇 Si quieres refrescar TODO (movements, stats, etc.)
          // fetchBalance()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile?.organization_id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleRechargeSuccess = () => {
    setShowRechargeModal(false)
    fetchBalance()
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
          <span className="text-sm text-gray-500">Cargando...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-xs">!</span>
          </div>
          <span className="text-sm text-red-600">{error}</span>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <>
      <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm hover:bg-gray-50 h-auto p-0"
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-semibold">€</span>
              </div>
              <span className="font-medium text-gray-900">{formatCurrency(data.balance)}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-gray-900 mb-3">Balance de Créditos</h3>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Balance actual</span>
                  <span className="text-lg font-semibold text-gray-900">{formatCurrency(data.balance)}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setOpenMenu(false)
                  setShowRechargeModal(true)
                }}
              >
                Recargar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpenMenu(false)
                  setShowHistoryModal(true)
                }}
              >
                Historial
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

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
