import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { STRIPE_PLANS } from "@/lib/stripe-config"

export async function POST(request: NextRequest) {
  try {
    const { customerId, planId, billingPeriod } = await request.json()
    console.log("📥 Request recibido:", { customerId, planId, billingPeriod })

    if (!customerId || !planId || !billingPeriod) {
      console.warn("⚠️ Faltan parámetros obligatorios")
      return NextResponse.json({ success: false, error: "Faltan parámetros obligatorios" }, { status: 400 })
    }

    // Buscar plan
    const plan = Object.values(STRIPE_PLANS).find((p) => p.id === planId)
    console.log("🔍 Plan encontrado:", plan)

    if (!plan) {
      console.error("❌ Plan no válido:", planId)
      return NextResponse.json({ success: false, error: "Plan no válido" }, { status: 400 })
    }

    // Verificar periodo
    const priceConfig = plan.prices[billingPeriod as "monthly" | "yearly"]
    console.log("📅 Configuración de precio:", priceConfig)

    if (!priceConfig) {
      console.error("❌ Periodo de facturación no válido:", billingPeriod)
      return NextResponse.json({ success: false, error: "Periodo de facturación no válido" }, { status: 400 })
    }

    const { priceId } = priceConfig
    console.log("💰 priceId seleccionado:", priceId)

    // 1️⃣ Crear SetupIntent para guardar tarjeta
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    })

    console.log("✅ SetupIntent creado:", setupIntent.id)

    // 2️⃣ Crear suscripción con 0 días de prueba
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 120,
      payment_behavior: "allow_incomplete", // Cambio clave: permite que la suscripción se active incluso sin método de pago inicial
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"], // Especificar tipos de pago permitidos
      },
      expand: ["latest_invoice", "pending_setup_intent"],
      collection_method: "charge_automatically", // Asegurar cobro automático
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
      clientSecret: setupIntent.client_secret,
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      customerId: subscription.customer,
    })
  } catch (error: any) {
    console.error("❌ Error creando SetupIntent + Suscripción:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error creando la suscripción" },
      { status: 500 },
    )
  }
}
