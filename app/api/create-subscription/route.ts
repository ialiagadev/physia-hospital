import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { STRIPE_PLANS } from "@/lib/stripe-config"
import type Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    const { customerId, planId, billingPeriod } = await request.json()

    if (!customerId || !planId || !billingPeriod) {
      return NextResponse.json(
        { success: false, error: "Faltan parámetros obligatorios" },
        { status: 400 }
      )
    }

    // Buscar plan
    const plan = Object.values(STRIPE_PLANS).find((p) => p.id === planId)
    if (!plan) {
      return NextResponse.json(
        { success: false, error: "Plan no válido" },
        { status: 400 }
      )
    }

    // Verificar periodo
    const priceConfig = plan.prices[billingPeriod as "monthly" | "yearly"]
    if (!priceConfig) {
      return NextResponse.json(
        { success: false, error: "Periodo de facturación no válido" },
        { status: 400 }
      )
    }

    const { priceId } = priceConfig

    // 1️⃣ Crear SetupIntent para que el cliente añada la tarjeta
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    })

    console.log("✅ SetupIntent creado:", setupIntent.id)

    // 2️⃣ Crear suscripción con 7 días de prueba
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 7, // 👈 todos los planes con 7 días de prueba
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice"],
      metadata: {
        plan_id: plan.id,
        billing_period: billingPeriod,
        source: "physia_registration",
      },
    })

    console.log("✅ Suscripción creada:", subscription.id, "estado:", subscription.status)

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: setupIntent.client_secret, // se confirma en el frontend con confirmCardSetup
      status: subscription.status,
    })
  } catch (error: any) {
    console.error("❌ Error creando SetupIntent + Suscripción:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error creando la suscripción",
      },
      { status: 500 }
    )
  }
}
