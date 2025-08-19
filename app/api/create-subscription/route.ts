import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { STRIPE_PLANS } from "@/lib/stripe-config"

export async function POST(request: NextRequest) {
  try {
    const { customerId, planId, billingPeriod } = await request.json()
    console.log("📥 Request recibido:", { customerId, planId, billingPeriod })

    if (!customerId || !planId || !billingPeriod) {
      console.warn("⚠️ Faltan parámetros obligatorios")
      return NextResponse.json(
        { success: false, error: "Faltan parámetros obligatorios" },
        { status: 400 }
      )
    }

    // Buscar plan
    const plan = Object.values(STRIPE_PLANS).find((p) => p.id === planId)
    console.log("🔍 Plan encontrado:", plan)

    if (!plan) {
      console.error("❌ Plan no válido:", planId)
      return NextResponse.json(
        { success: false, error: "Plan no válido" },
        { status: 400 }
      )
    }

    // Verificar periodo
    const priceConfig = plan.prices[billingPeriod as "monthly" | "yearly"]
    console.log("📅 Configuración de precio:", priceConfig)

    if (!priceConfig) {
      console.error("❌ Periodo de facturación no válido:", billingPeriod)
      return NextResponse.json(
        { success: false, error: "Periodo de facturación no válido" },
        { status: 400 }
      )
    }

    const { priceId } = priceConfig
    console.log("💰 priceId seleccionado:", priceId)

    // 1️⃣ Crear SetupIntent para guardar tarjeta
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    })

    console.log("✅ SetupIntent creado:", setupIntent.id)

    // 2️⃣ Crear suscripción con 7 días de prueba
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 7,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice"],
      metadata: {
        plan_id: plan.id,
        billing_period: billingPeriod,
        source: "physia_registration",
      },
    })

    console.log("✅ Suscripción creada:", subscription.id, "estado:", subscription.status)
    console.log("📦 Suscripción completa:", JSON.stringify(subscription, null, 2))

    // 👇 Verificar valores críticos
    console.log("📊 Datos clave:", {
      subscriptionId: subscription.id,
      trial_end_raw: subscription.trial_end,
      trial_end_iso: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      customerId: subscription.customer,
      latestInvoice: subscription.latest_invoice,
    })

    // 👇 en esta fase NO actualizamos la tabla organizations
    // Guardamos la info en user_metadata al hacer signUp

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: setupIntent.client_secret,
      status: subscription.status,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      customerId: subscription.customer,
    })
  } catch (error: any) {
    console.error("❌ Error creando SetupIntent + Suscripción:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error creando la suscripción" },
      { status: 500 }
    )
  }
}
