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
      case "reactivate":
        if (!planId || !billingPeriod) {
          return NextResponse.json({ success: false, error: "Plan ID and billing period required" }, { status: 400 })
        }

        const plan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS]
        if (!plan) {
          return NextResponse.json({ success: false, error: "Plan not found" }, { status: 400 })
        }

        const priceId = billingPeriod === "yearly" ? plan.prices.yearly.priceId : plan.prices.monthly.priceId

        // Create new subscription
        const newSubscription = await stripe.subscriptions.create({
          customer: customerId || organization.stripe_customer_id,
          items: [{ price: priceId }],
          payment_behavior: "default_incomplete",
          payment_settings: { save_default_payment_method: "on_subscription" },
          expand: ["latest_invoice.payment_intent"],
        })

        // Update organization with new subscription
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
          requiresPayment: paymentIntent?.status === "requires_payment_method",
          clientSecret: paymentIntent?.client_secret,
        })

      case "update":
        if (!subscriptionId || !planId || !billingPeriod) {
          return NextResponse.json(
            { success: false, error: "Subscription ID, plan ID and billing period required" },
            { status: 400 },
          )
        }

        const updatePlan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS]
        if (!updatePlan) {
          return NextResponse.json({ success: false, error: "Plan not found" }, { status: 400 })
        }

        const updatePriceId =
          billingPeriod === "yearly" ? updatePlan.prices.yearly.priceId : updatePlan.prices.monthly.priceId

        // Get current subscription
        const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId)
        const currentPriceId = (currentSubscription as any).items.data[0].price.id

        if (currentPriceId === updatePriceId) {
          return NextResponse.json({ success: false, error: "Ya tienes este plan activo" }, { status: 400 })
        }

        // Calculate if it's an upgrade or downgrade
        const currentPrice = (currentSubscription as any).items.data[0].price.unit_amount || 0
        const newPrice = (await stripe.prices.retrieve(updatePriceId)).unit_amount || 0
        const isUpgrade = newPrice > currentPrice

        // Update subscription
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          items: [
            {
              id: (currentSubscription as any).items.data[0].id,
              price: updatePriceId,
            },
          ],
          proration_behavior: isUpgrade ? "create_prorations" : "none",
        })

        // Update organization status
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
          requiresPayment: false,
        })

      case "preview":
        if (!subscriptionId || !planId || !billingPeriod) {
          return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 })
        }

        const previewPlan = STRIPE_PLANS[planId as keyof typeof STRIPE_PLANS]
        if (!previewPlan) {
          return NextResponse.json({ success: false, error: "Plan not found" }, { status: 400 })
        }

        const previewPriceId =
          billingPeriod === "yearly" ? previewPlan.prices.yearly.priceId : previewPlan.prices.monthly.priceId

        // Get current subscription for preview
        const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as any

        const upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
          customer: subscription.customer as string,
          subscription: subscriptionId,
          subscription_items: [
            {
              id: subscription.items.data[0].id,
              price: previewPriceId,
            },
          ],
          subscription_proration_behavior: "create_prorations",
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
                ? `Upgrade to ${previewPlan.name} - You'll be charged the prorated difference immediately`
                : `Downgrade to ${previewPlan.name} - Change will take effect at the end of your current billing period`,
          },
        })

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("❌ Error en subscription-management:", error)
    return NextResponse.json({ success: false, error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
