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
  onSuccess: () => void
  onError: (error: string) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

function PaymentForm({ clientSecret, onSuccess, onError, isLoading, setIsLoading }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
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
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (error) {
        console.error("Payment error:", error)
        onError(error.message || "Error procesando el pago")
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        console.log("Payment succeeded:", paymentIntent.id)
        onSuccess()
      }
    } catch (err: any) {
      console.error("Payment confirmation error:", err)
      onError("Error inesperado al procesar el pago")
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
            Procesando pago...
          </div>
        ) : (
          "Confirmar suscripción"
        )}
      </Button>
    </form>
  )
}

interface PaymentSetupProps {
  clientSecret: string
  onSuccess: () => void
  onError: (error: string) => void
  planName: string
  planPrice: string
}

export function PaymentSetup({ clientSecret, onSuccess, onError, planName, planPrice }: PaymentSetupProps) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-gray-900">Configurar método de pago</h3>
        <p className="text-gray-600">
          Plan seleccionado: <span className="font-medium">{planName}</span> - {planPrice}
        </p>
      </div>

      <Elements stripe={stripePromise}>
        <PaymentForm
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </Elements>

      <div className="text-xs text-gray-500 text-center">
        Tu información de pago está protegida por Stripe. No se realizará ningún cargo hasta que confirmes la
        suscripción.
      </div>
    </div>
  )
}
