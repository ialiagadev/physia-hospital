"use client"

import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"
import { STRIPE_PLANS } from "@/lib/stripe-config"

interface PlanSelectorProps {
  selectedPlan: string | null
  onPlanSelect: (planId: string) => void
  disabled?: boolean
}

export function PlanSelector({ selectedPlan, onPlanSelect, disabled }: PlanSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Elige tu plan</h3>
        <p className="text-sm text-gray-600">Puedes cambiar tu plan en cualquier momento</p>
      </div>

      <Card
        className={`p-6 cursor-pointer transition-all duration-200 border-2 ${
          selectedPlan === STRIPE_PLANS.BASIC.id
            ? "border-purple-500 bg-purple-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onClick={() => !disabled && onPlanSelect(STRIPE_PLANS.BASIC.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h4 className="text-lg font-semibold text-gray-900">{STRIPE_PLANS.BASIC.name}</h4>
              <span className="text-2xl font-bold text-purple-600">{STRIPE_PLANS.BASIC.price}</span>
            </div>

            <p className="text-gray-600 mb-4">{STRIPE_PLANS.BASIC.description}</p>

            <ul className="space-y-2">
              {STRIPE_PLANS.BASIC.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              selectedPlan === STRIPE_PLANS.BASIC.id ? "border-purple-500 bg-purple-500" : "border-gray-300"
            }`}
          >
            {selectedPlan === STRIPE_PLANS.BASIC.id && <Check className="w-4 h-4 text-white" />}
          </div>
        </div>
      </Card>
    </div>
  )
}
