import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { STRIPE_PLANS } from "@/lib/stripe-config"

export async function POST(request: NextRequest) {
  try {
    const { customerId, planId, billingPeriod } = await request.json()

    if (!customerId || !planId || !billingPeriod) {
      return NextResponse.json(
        { success: false, error: "Faltan parámetros obligatorios" },
        { status: 400 }
      )
    }

    // Buscar plan por su `id` (ej: "inicial", "avanzado", "premium")
    const plan = Object.values(STRIPE_PLANS).find((p) => p.id === planId)

    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan no válido" },
        { status: 400 }
      )
    }

    // Verificar que el periodo sea válido y obtener el priceId
    const priceConfig = plan.prices[billingPeriod as "monthly" | "yearly"]
    if (!priceConfig) {
      return NextResponse.json(
        { success: false, error: "Periodo de facturación no válido" },
        { status: 400 }
      )
    }

    const { priceId } = priceConfig

    // Crear suscripción con 7 días de prueba
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }], // ✅ ahora usa el string correcto
      trial_period_days: 7, // 🔹 Añadido: 14 días de prueba
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        plan_id: plan.id,
        billing_period: billingPeriod,
        source: "physia_registration",
      },
    })

    const invoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent?: Stripe.PaymentIntent | string | null
    }

    const paymentIntent =
      typeof invoice?.payment_intent === "object"
        ? (invoice.payment_intent as Stripe.PaymentIntent)
        : null

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? null,
      status: subscription.status,
      trialEnd: subscription.trial_end, // 🔹 Devolvemos también cuándo acaba la prueba
    })
  } catch (error: any) {
    console.error("❌ Error creando suscripción:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error creando la suscripción",
      },
      { status: 500 }
    )
  }
}
