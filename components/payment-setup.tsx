"use client"

import type React from "react"
import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  clientSecret: string
  subscriptionId: string
  onSuccess: () => void
  onError: (error: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

function PaymentForm({ clientSecret, subscriptionId, onSuccess, onError, isLoading, setIsLoading }: PaymentFormProps) {
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

    if (!clientSecret) {
      console.error("❌ No se recibió clientSecret en el frontend")
      onError("No se pudo generar el clientSecret de Stripe")
      setIsLoading(false)
      return
    }

    console.log("🔑 ClientSecret recibido en el frontend:", clientSecret)

    try {
      // 1️⃣ Confirmar el SetupIntent
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (error) {
        console.error("❌ Setup error:", error)
        onError(error.message || "Error guardando método de pago")
        return
      }

      if (setupIntent && setupIntent.status === "succeeded") {
        console.log("✅ Método de pago guardado:", setupIntent.payment_method)

        // 2️⃣ Actualizar la suscripción con el método de pago
        const updateResponse = await fetch("/api/update-subscription-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscriptionId: subscriptionId,
            paymentMethodId: setupIntent.payment_method,
          }),
        })

        const updateResult = await updateResponse.json()

        if (updateResult.success) {
          console.log("✅ Suscripción actualizada correctamente:", updateResult.subscription)
          if (updateResult.subscription.status === "trialing") {
            console.log("🎯 Suscripción configurada para cobro automático al finalizar el trial")
          }
          onSuccess()
        } else {
          console.error("❌ Error actualizando suscripción:", updateResult.error)
          onError(updateResult.error || "Error actualizando la suscripción")
        }
      } else {
        console.warn("⚠️ Estado inesperado del SetupIntent:", setupIntent?.status)
        onError("Estado inesperado del método de pago")
      }
    } catch (err: any) {
      console.error("❌ Setup confirmation error:", err)
      onError("Error inesperado al guardar el método de pago")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <CreditCard className="w-4 h-4" />
          Información de la tarjeta
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
            Guardando método de pago...
          </div>
        ) : (
          "Añadir método de pago"
        )}
      </Button>
    </form>
  )
}

interface PaymentSetupProps {
  clientSecret: string
  subscriptionId: string
  onSuccess: () => void
  onError: (error: string) => void
  planName: string
  planPrice: string
}

export function PaymentSetup({
  clientSecret,
  subscriptionId,
  onSuccess,
  onError,
  planName,
  planPrice,
}: PaymentSetupProps) {
  const [isLoading, setIsLoading] = useState(false)

  console.log("📦 PaymentSetup recibió:", { clientSecret, subscriptionId })

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-gray-900">Configurar método de pago</h3>
        
      </div>

      <Elements stripe={stripePromise}>
        <PaymentForm
          clientSecret={clientSecret}
          subscriptionId={subscriptionId}
          onSuccess={onSuccess}
          onError={onError}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </Elements>

      <div className="text-xs text-gray-500 text-center">
        Tu información de pago está protegida por Stripe. No se realizará ningún cargo hasta la primera factura.
      </div>
    </div>
  )
}
