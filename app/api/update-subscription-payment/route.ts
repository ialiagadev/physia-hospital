import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import type Stripe from "stripe"

interface ExpandedInvoice extends Stripe.Invoice {
  payment_intent?: Stripe.PaymentIntent
}

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, paymentMethodId } = await request.json()
    console.log("📥 Actualizando suscripción:", { subscriptionId, paymentMethodId })

    if (!subscriptionId || !paymentMethodId) {
      console.warn("⚠️ Faltan parámetros obligatorios")
      return NextResponse.json({ success: false, error: "Faltan parámetros obligatorios" }, { status: 400 })
    }

    // 1️⃣ Obtener la suscripción actual
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    console.log("📋 Suscripción actual:", subscription.status)

    // 2️⃣ Actualizar la suscripción con el método de pago
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    })

    // 3️⃣ También actualizar el customer para futuras suscripciones
    await stripe.customers.update(subscription.customer as string, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    // 4️⃣ Si la suscripción está incompleta, intentar activarla
    let finalSubscription = updatedSubscription
    if (updatedSubscription.status === "incomplete") {
      console.log("🔄 Intentando activar suscripción incompleta...")

      const latestInvoice = (await stripe.invoices.retrieve(updatedSubscription.latest_invoice as string, {
        expand: ["payment_intent"],
      })) as ExpandedInvoice

      if (latestInvoice.payment_intent) {
        const paymentIntent = latestInvoice.payment_intent

        if (paymentIntent.status === "requires_payment_method") {
          // Confirmar el payment intent con el método de pago
          await stripe.paymentIntents.confirm(paymentIntent.id, {
            payment_method: paymentMethodId,
          })
        }
      }

      // Obtener la suscripción actualizada
      finalSubscription = await stripe.subscriptions.retrieve(subscriptionId)
    }

    console.log("✅ Suscripción actualizada:", {
      id: finalSubscription.id,
      status: finalSubscription.status,
      default_payment_method: finalSubscription.default_payment_method,
    })

    return NextResponse.json({
      success: true,
      subscription: {
        id: finalSubscription.id,
        status: finalSubscription.status,
        default_payment_method: finalSubscription.default_payment_method,
      },
    })
  } catch (error: any) {
    console.error("❌ Error actualizando suscripción:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error actualizando la suscripción" },
      { status: 500 },
    )
  }
}
