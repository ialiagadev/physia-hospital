"use client"

import type React from "react"
import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, CreditCard, X } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface UpdatePaymentFormProps {
  organizationId: string
  onSuccess: () => void
  onError: (error: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

function UpdatePaymentForm({ organizationId, onSuccess, onError, isLoading, setIsLoading }: UpdatePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      console.error("❌ Stripe o Elements no están listos todavía")
      return
    }

    setIsLoading(true)
    onError("")

    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      onError("Error al cargar el formulario de pago")
      setIsLoading(false)
      return
    }

    try {
      // Crear método de pago
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
      })

      if (paymentMethodError) {
        console.error("❌ Error creando método de pago:", paymentMethodError)
        onError(paymentMethodError.message || "Error procesando la tarjeta")
        setIsLoading(false)
        return
      }

      // Actualizar método de pago en el servidor
      const response = await fetch("/api/update-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          paymentMethodId: paymentMethod.id,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ API error:", errorText)
        throw new Error(`Error del servidor (${response.status})`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Error actualizando método de pago")
      }

      console.log("✅ Método de pago actualizado correctamente")
      onSuccess()
    } catch (err: any) {
      console.error("❌ Update payment error:", err)
      onError("Error inesperado al actualizar el método de pago")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <CreditCard className="w-4 h-4" />
          Nueva información de la tarjeta
        </div>

        <div className="p-4 border border-gray-200 rounded-xl bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#374151",
                  fontFamily: "system-ui, sans-serif",
                  "::placeholder": {
                    color: "#9CA3AF",
                  },
                },
                invalid: {
                  color: "#EF4444",
                },
              },
              hidePostalCode: false,
            }}
          />
        </div>
      </div>

      <Button type="submit" disabled={!stripe || isLoading} className="w-full">
        {isLoading ? (
          <div className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Actualizando método de pago...
          </div>
        ) : (
          "Actualizar método de pago"
        )}
      </Button>
    </form>
  )
}

interface UpdatePaymentModalProps {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  organizationName: string
  onSuccess: () => void
}

export function UpdatePaymentModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  onSuccess,
}: UpdatePaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSuccess = () => {
    onSuccess()
    onClose()
    setError("")
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setError("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Actualizar método de pago</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Actualizar el método de pago para: <span className="font-medium">{organizationName}</span>
          </p>

          <Elements stripe={stripePromise}>
            <UpdatePaymentForm
              organizationId={organizationId}
              onSuccess={handleSuccess}
              onError={setError}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </Elements>

          {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}

          <div className="text-xs text-gray-500 text-center">
            Tu información de pago está protegida por Stripe. El nuevo método se aplicará a futuras facturas.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
