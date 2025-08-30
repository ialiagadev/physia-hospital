"use client"

import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"
import { STRIPE_PLANS } from "@/lib/stripe-config"
import Link from "next/link"

interface PlanSelectorProps {
  selectedPlan: string | null
  onPlanSelect: (planId: string) => void
  billingPeriod: "monthly" | "yearly"
  onBillingPeriodChange: (period: "monthly" | "yearly") => void
  disabled?: boolean
}

export function PlanSelector({
  selectedPlan,
  onPlanSelect,
  billingPeriod,
  onBillingPeriodChange,
  disabled,
}: PlanSelectorProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100)
  }

  return (
    <div className="space-y-8">
      {/* Toggle mensual/anual */}
      <div className="flex justify-center">
        <div className="relative bg-gradient-to-r from-slate-100 to-slate-200 p-1 rounded-2xl shadow-lg backdrop-blur-sm border border-white/20">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onBillingPeriodChange("monthly")}
              className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                billingPeriod === "monthly"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105"
                  : "text-slate-600 hover:text-slate-800"
              }`}
              disabled={disabled}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => onBillingPeriodChange("yearly")}
              className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                billingPeriod === "yearly"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105"
                  : "text-slate-600 hover:text-slate-800"
              }`}
              disabled={disabled}
            >
              Anual
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
        {Object.values(STRIPE_PLANS).map((plan, index) => {
          const priceConfig = plan.prices[billingPeriod]
          const isPopular = index === 1 // destacar el plan del medio
          const isSelected = selectedPlan === plan.id

          return (
            <Card
              key={plan.id}
              className={`relative p-6 cursor-pointer transition-all duration-300 border-2 text-center ${
                isSelected
                  ? "border-purple-600 bg-gradient-to-br from-purple-100 to-blue-100 shadow-xl scale-105"
                  : "border-slate-200 hover:border-purple-300 hover:shadow-md bg-white"
              } ${isPopular ? "ring-2 ring-purple-400 ring-opacity-30" : ""}`}
              onClick={() => !disabled && onPlanSelect(plan.id)}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    Más Popular
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Nombre */}
                <h4
                  className={`text-lg font-semibold ${
                    isSelected ? "text-purple-700" : "text-slate-700"
                  }`}
                >
                  {plan.name}
                </h4>

                {/* Precio */}
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center gap-1">
                    <span
                      className={`text-2xl font-bold ${
                        isSelected
                          ? "bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
                          : "text-slate-800"
                      }`}
                    >
                      {priceConfig
                        ? billingPeriod === "yearly"
                          ? formatPrice(priceConfig.amount / 12) // mostrar prorrateado
                          : formatPrice(priceConfig.amount)
                        : "—"}
                    </span>
                    {priceConfig && (
                      <span className="text-slate-500 text-sm font-medium">/mes</span>
                    )}
                  </div>
                </div>

                {/* Check de selección */}
                <div className="flex justify-center">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      isSelected
                        ? "border-purple-500 bg-purple-500"
                        : "border-slate-300"
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Info adicional */}
      <div className="text-center text-sm text-slate-600 space-y-1">
        <p>🎉 <span className="font-semibold">7 días de prueba gratis</span></p>
        <p>
          <Link
            href="https://physia.healthmate.tech/precios"
            target="_blank"
            className="text-purple-600 hover:underline font-medium"
          >
            VER PLANES
          </Link>
        </p>
      </div>
    </div>
  )
}
