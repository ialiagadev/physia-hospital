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

    // 🔍 Buscar organización
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

    // 🟢 Obtener detalles de Stripe con expand
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

    console.log("🔍 Stripe subscription raw:", JSON.stringify(subscription, null, 2))

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

    const item = subscription.items.data[0]
    const plan = item?.price?.nickname || item?.plan?.nickname
    const amount = item?.price?.unit_amount
    const interval = item?.price?.recurring?.interval

    const accessUntil =
      toHuman((subscription as any).trial_end) ||
      toHuman((subscription as any).current_period_end) ||
      toHuman(item?.current_period_end)

    // 💳 Buscar método de pago
    let paymentMethod = null
    let pm: any = null

    if (subscription.default_payment_method && typeof subscription.default_payment_method === "object") {
      pm = subscription.default_payment_method
    } else if (
      subscription.customer &&
      typeof subscription.customer === "object" &&
      "invoice_settings" in subscription.customer && // 👈 evita DeletedCustomer
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

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trial_start: toHuman((subscription as any).trial_start),
        trial_end: toHuman((subscription as any).trial_end),
        current_period_start: toHuman(
          (subscription as any).current_period_start || item?.current_period_start
        ),
        current_period_end: toHuman(
          (subscription as any).current_period_end || item?.current_period_end
        ),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: toHuman((subscription as any).canceled_at),
        ended_at: toHuman((subscription as any).ended_at),
        access_until: accessUntil,

        plan,
        amount,
        interval,

        // 💳 Ahora siempre devuelve el método de pago
        payment_method: paymentMethod,

        // 🧑 Datos básicos del customer
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
