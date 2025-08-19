import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type Stripe from "stripe"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Usuario no autenticado" }, { status: 401 })
    }

    // Obtener la organización del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 })
    }

    const organizationId = userData.organization_id

    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("stripe_subscription_id, subscription_status")
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ success: false, error: "Organización no encontrada" }, { status: 404 })
    }

    if (!organization.stripe_subscription_id) {
      return NextResponse.json({ success: false, error: "No hay suscripción activa" }, { status: 400 })
    }

    // Recuperar suscripción en Stripe
    const subscription = (await stripe.subscriptions.retrieve(
      organization.stripe_subscription_id
    )) as Stripe.Subscription

    if (subscription.cancel_at_period_end) {
      return NextResponse.json(
        { success: false, error: "La suscripción ya está programada para cancelarse" },
        { status: 400 }
      )
    }

    // Programar cancelación al final del periodo
    const canceledSubscription = (await stripe.subscriptions.update(
      organization.stripe_subscription_id,
      { cancel_at_period_end: true }
    )) as Stripe.Subscription

    // ⚡ Fix: acceder con `as any` porque TS no reconoce el campo
    const rawSub = canceledSubscription as any
    const accessUntil = rawSub.current_period_end
      ? new Date(rawSub.current_period_end * 1000).toISOString()
      : rawSub.trial_end
      ? new Date(rawSub.trial_end * 1000).toISOString()
      : null

    // 👇 Ya no actualizamos nada en Supabase

    return NextResponse.json({
      success: true,
      subscriptionId: canceledSubscription.id,
      status: canceledSubscription.status,
      cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
      accessUntil,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error cancelando la suscripción" },
      { status: 500 }
    )
  }
}
