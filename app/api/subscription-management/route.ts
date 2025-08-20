import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { stripe } from "@/lib/stripe"
import { STRIPE_PLANS } from "@/lib/stripe-config"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { action, customerId, planId, billingPeriod, subscriptionId } = await request.json()

    if (!action) {
      return NextResponse.json({ success: false, error: "Action is required" }, { status: 400 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 })
    }

    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", userData.organization_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ success: false, error: "Organización no encontrada" }, { status: 404 })
    }

    switch (action) {
      // 🔄 Reactivar suscripción
      case "reactivate": {
        if (!planId || !billingPeriod) {
          return NextResponse.json({ success: false, error: "Plan ID and billing period required" }, { status: 400 })
        }

        const plan = STRIPE_PLANS[planId.toUpperCase() as keyof typeof STRIPE_PLANS]
        if (!plan) {
          return NextResponse.json({ success: false, error: "Plan not found" }, { status: 400 })
        }

        const priceId = billingPeriod === "yearly" ? plan.prices.yearly.priceId : plan.prices.monthly.priceId

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)

          if (sub.cancel_at_period_end && sub.status === "active") {
            const resumed = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false })

            await supabase
              .from("organizations")
              .update({
                subscription_status: resumed.status,
              })
              .eq("id", organization.id)

            return NextResponse.json({
              success: true,
              subscriptionId: resumed.id,
              status: resumed.status,
              requiresPayment: false,
            })
          }
        }

        const newSubscription = await stripe.subscriptions.create({
          customer: customerId || organization.stripe_customer_id,
          items: [{ price: priceId }],
          payment_behavior: "default_incomplete",
          payment_settings: { save_default_payment_method: "on_subscription" },
          expand: ["latest_invoice.payment_intent"],
        })

        await supabase
          .from("organizations")
          .update({
            stripe_subscription_id: newSubscription.id,
            subscription_status: newSubscription.status,
          })
          .eq("id", organization.id)

        const paymentIntent = (newSubscription.latest_invoice as any)?.payment_intent

        return NextResponse.json({
          success: true,
          subscriptionId: newSubscription.id,
          status: newSubscription.status,
          requiresPayment:
            paymentIntent?.status === "requires_action" || paymentIntent?.status === "requires_payment_method",
          clientSecret: paymentIntent?.client_secret ?? null,
        })
      }

      // 🔧 Update (cambio de plan)
      case "update": {
        if (!subscriptionId || !planId || !billingPeriod) {
          return NextResponse.json(
            { success: false, error: "Subscription ID, plan ID and billing period required" },
            { status: 400 },
          )
        }

        const updatePlan = STRIPE_PLANS[planId.toUpperCase() as keyof typeof STRIPE_PLANS]
        if (!updatePlan) {
          return NextResponse.json({ success: false, error: "Plan not found" }, { status: 400 })
        }

        const updatePriceId =
          billingPeriod === "yearly" ? updatePlan.prices.yearly.priceId : updatePlan.prices.monthly.priceId

        const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId)
        const currentPriceId = (currentSubscription as any).items.data[0].price.id

        if (currentPriceId === updatePriceId) {
          if ((currentSubscription as any).cancel_at_period_end) {
            const resumed = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false })

            await supabase
              .from("organizations")
              .update({
                subscription_status: resumed.status,
              })
              .eq("id", organization.id)

            return NextResponse.json({
              success: true,
              subscriptionId: resumed.id,
              status: resumed.status,
              requiresPayment: false,
            })
          }

          return NextResponse.json({ success: false, error: "Ya tienes este plan activo" }, { status: 400 })
        }

        const currentPrice = (currentSubscription as any).items.data[0].price.unit_amount || 0
        const newPrice = (await stripe.prices.retrieve(updatePriceId)).unit_amount || 0
        const isUpgrade = newPrice > currentPrice

        // 🔹 Actualizamos suscripción
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          items: [
            {
              id: (currentSubscription as any).items.data[0].id,
              price: updatePriceId,
            },
          ],
          proration_behavior: isUpgrade ? "create_prorations" : "none",
          billing_cycle_anchor: "now",
          expand: ["latest_invoice.payment_intent"],
        })

        // 🔹 Si es upgrade → generar y cobrar factura inmediata
        let latestInvoice = updatedSubscription.latest_invoice as any
        let paymentIntent = latestInvoice?.payment_intent as any

        if (isUpgrade) {
            const invoice = await stripe.invoices.create({
              customer: updatedSubscription.customer as string,
              subscription: updatedSubscription.id,
              auto_advance: true,
            })
          
            // 🔹 forzar TS a saber que existe
            const paidInvoice = await stripe.invoices.pay(invoice.id!)
          
            latestInvoice = paidInvoice
            paymentIntent = (paidInvoice as any).payment_intent
          }
          

        await supabase
          .from("organizations")
          .update({
            subscription_status: updatedSubscription.status,
          })
          .eq("id", organization.id)

        return NextResponse.json({
          success: true,
          subscriptionId: updatedSubscription.id,
          status: updatedSubscription.status,
          requiresPayment:
            paymentIntent?.status === "requires_action" || paymentIntent?.status === "requires_payment_method",
          clientSecret: paymentIntent?.client_secret ?? null,
        })
      }

      // 🔍 Preview del cambio
      case "preview": {
        if (!subscriptionId || !planId || !billingPeriod) {
          return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
        }

        const previewPlan = STRIPE_PLANS[planId.toUpperCase() as keyof typeof STRIPE_PLANS]
        if (!previewPlan) {
          return NextResponse.json({ success: false, error: "Plan not found" }, { status: 400 })
        }

        const previewPriceId =
          billingPeriod === "yearly" ? previewPlan.prices.yearly.priceId : previewPlan.prices.monthly.priceId

        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any
        const currentPrice = subscription.items.data[0].price.unit_amount || 0
        const newPrice = (await stripe.prices.retrieve(previewPriceId)).unit_amount || 0
        const isUpgrade = newPrice > currentPrice

        const upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
          customer: subscription.customer as string,
          subscription: subscriptionId,
          subscription_items: [
            {
              id: subscription.items.data[0].id,
              price: previewPriceId,
            },
          ],
          subscription_proration_behavior: isUpgrade ? "create_prorations" : "none",
        })

        const immediateCharge = upcomingInvoice.amount_due / 100
        const nextBillingDate = new Date(subscription.current_period_end * 1000)

        return NextResponse.json({
          success: true,
          preview: {
            immediateCharge,
            nextBillingAmount: ((await stripe.prices.retrieve(previewPriceId)).unit_amount || 0) / 100,
            nextBillingDate: nextBillingDate.toISOString(),
            description:
              immediateCharge > 0
                ? `Upgrade a ${previewPlan.name} - Se cobrará la diferencia prorrateada ahora`
                : `Downgrade a ${previewPlan.name} - El cambio se aplicará al final del periodo actual`,
          },
        })
      }

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("❌ Error en subscription-management:", error)
    return NextResponse.json({ success: false, error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
