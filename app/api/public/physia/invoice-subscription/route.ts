import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get("orgId")

    let organizationId: string | null = null

    if (orgId) {
      organizationId = orgId
    } else {
      // 🔐 Obtener usuario autenticado
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { success: false, error: "No autenticado" },
          { status: 401 }
        )
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (userError || !userData?.organization_id) {
        return NextResponse.json(
          { success: false, error: "Usuario no encontrado" },
          { status: 404 }
        )
      }

      organizationId = userData.organization_id
    }

    // 🔍 Buscar organización en Supabase
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("stripe_customer_id, stripe_subscription_id, subscription_status")
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { success: false, error: "Organización no encontrada" },
        { status: 404 }
      )
    }

    if (!organization.stripe_subscription_id) {
      return NextResponse.json({
        success: true,
        subscription: null,
        message: "No hay suscripción activa",
      })
    }

    // 🟢 Obtener suscripción desde Stripe
    const subscription = await stripe.subscriptions.retrieve(
      organization.stripe_subscription_id,
      {
        expand: [
          "default_payment_method",
          "customer",
          "customer.invoice_settings.default_payment_method",
          "items.data.price.product",
        ],
      }
    )

    const toIso = (ts?: number | null) =>
      ts && ts > 0 ? new Date(ts * 1000).toISOString() : null

    const toHuman = (ts?: number | null) => {
      if (!ts || ts <= 0) return null
      const date = new Date(ts * 1000)
      return date.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }

    // 📅 Determinar expiración real
    const item = subscription.items.data[0]

    const subscriptionExpires =
      toIso(subscription.cancel_at) ||
      toIso(subscription.trial_end) ||
      toIso(
        (subscription as any).current_period_end ||
          item?.current_period_end
      )

    // 💾 Actualizar organización en Supabase
    await supabase
      .from("organizations")
      .update({
        subscription_status: subscription.status,
        subscription_current_period_end: subscriptionExpires,
        subscription_expires: subscriptionExpires, // 👈 tu campo nuevo
        stripe_subscription_id: subscription.id,
      })
      .eq("id", organizationId)

    // 💳 Método de pago
    let paymentMethod = null
    let pm: any = null

    if (subscription.default_payment_method && typeof subscription.default_payment_method === "object") {
      pm = subscription.default_payment_method
    } else if (
      subscription.customer &&
      typeof subscription.customer === "object" &&
      "invoice_settings" in subscription.customer &&
      subscription.customer.invoice_settings?.default_payment_method &&
      typeof subscription.customer.invoice_settings.default_payment_method === "object"
    ) {
      pm = subscription.customer.invoice_settings.default_payment_method
    }

    if (pm) {
      if (pm.type === "card" && pm.card) {
        paymentMethod = {
          id: pm.id,
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        }
      } else {
        paymentMethod = {
          id: pm.id,
          type: pm.type,
        }
      }
    }

    // 📝 Respuesta API
    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trial_start: toHuman(subscription.trial_start),
        trial_end: toHuman(subscription.trial_end),
        current_period_start: toHuman(
          (subscription as any).current_period_start || item?.current_period_start
        ),
        current_period_end: toHuman(
          (subscription as any).current_period_end || item?.current_period_end
        ),
        cancel_at: toHuman(subscription.cancel_at),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: toHuman(subscription.canceled_at),
        ended_at: toHuman(subscription.ended_at),
        access_until: toHuman(
          subscription.cancel_at ||
            subscription.trial_end ||
            (subscription as any).current_period_end ||
            item?.current_period_end
        ),

        plan: item?.price?.nickname || item?.plan?.nickname,
        amount: item?.price?.unit_amount,
        interval: item?.price?.recurring?.interval,

        payment_method: paymentMethod,
        customer: subscription.customer,
      },
    })
  } catch (error: any) {
    console.error("❌ Error en subscription-details:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Error interno del servidor" },
      { status: 500 }
    )
  }
}
