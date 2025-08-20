"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, AlertCircle, Calendar, CreditCard, Loader2 } from "lucide-react"
import { STRIPE_PLANS } from "@/lib/stripe-config"

interface PlanChangePreviewProps {
  subscriptionId: string
  newPlanId: string
  billingPeriod: "monthly" | "yearly"
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

interface PreviewData {
  immediateCharge: number
  nextBillingAmount: number
  nextBillingDate: string
  description: string
}

export function PlanChangePreview({
  subscriptionId,
  newPlanId,
  billingPeriod,
  onConfirm,
  onCancel,
  loading = false,
}: PlanChangePreviewProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const newPlan = STRIPE_PLANS[newPlanId as keyof typeof STRIPE_PLANS]
  const isUpgrade = previewData ? previewData.immediateCharge > 0 : false

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || typeof dateString !== "string") {
      return "No disponible"
    }

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return "No disponible"
      }
      return date.toLocaleDateString("es-ES")
    } catch (error) {
      return "No disponible"
    }
  }

  const formatAmount = (amount: number | null | undefined) => {
    if (typeof amount !== "number" || isNaN(amount)) {
      return "0.00"
    }
    return amount.toFixed(2)
  }

  useEffect(() => {
    const fetchPreview = async () => {
      if (!subscriptionId || !newPlanId) return

      setLoadingPreview(true)
      setError(null)

      try {
        const response = await fetch("/api/subscription-management", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "preview",
            subscriptionId,
            planId: newPlanId,
            billingPeriod,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Error loading preview")
        }

        setPreviewData(data.preview)
      } catch (err: any) {
        console.error("Error fetching preview:", err)
        setError(err.message || "Error loading preview")
      } finally {
        setLoadingPreview(false)
      }
    }

    fetchPreview()
  }, [subscriptionId, newPlanId, billingPeriod])

  if (loadingPreview) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Calculando cambios...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <Button variant="outline" onClick={onCancel}>
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!previewData || !newPlan) {
    return null
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isUpgrade ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-orange-500" />
          )}
          Preview del Cambio de Plan
        </CardTitle>
        <CardDescription>Revisa los detalles antes de confirmar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Nuevo Plan:</span>
          <Badge variant={isUpgrade ? "default" : "secondary"}>{newPlan?.name || "Plan desconocido"}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Período:</span>
          <Badge variant="outline">{billingPeriod === "monthly" ? "Mensual" : "Anual"}</Badge>
        </div>

        <Separator />

        {previewData.immediateCharge > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Cargo Inmediato:</span>
            </div>
            <span className="font-semibold text-green-600">€{formatAmount(previewData.immediateCharge)}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Próxima Facturación:</span>
          </div>
          <div className="text-right">
            <div className="font-semibold">€{formatAmount(previewData.nextBillingAmount)}</div>
            <div className="text-xs text-muted-foreground">{formatDate(previewData.nextBillingDate)}</div>
          </div>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">{previewData.description || "Sin descripción disponible"}</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={loading} className="flex-1 bg-transparent">
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Procesando...
              </>
            ) : (
              "Confirmar Cambio"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
