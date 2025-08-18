import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { STRIPE_PLANS } from "@/lib/stripe-config"
import type Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ ojo, SERVICE ROLE, no el anon
)

export async function POST(request: NextRequest) {
  try {
    const { customerId, planId, billingPeriod, organizationId } = await request.json()

    if (!customerId || !planId || !billingPeriod || !organizationId) {
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

    // 3️⃣ Guardar en la tabla organizations
    const { error: dbError } = await supabase
      .from("organizations")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_tier: plan.id, // puedes mapearlo a "basic", "pro", etc.
        subscription_status: subscription.status, // trialing, active, incomplete...
        subscription_expires: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      })
      .eq("id", organizationId)

    if (dbError) {
      console.error("❌ Error actualizando organizations:", dbError)
      return NextResponse.json(
        { success: false, error: "Error guardando datos en la base de datos" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: setupIntent.client_secret,
      status: subscription.status,
    })
  } catch (error: any) {
    console.error("❌ Error creando SetupIntent + Suscripción:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error creando la suscripción" },
      { status: 500 }
    )
  }
}
