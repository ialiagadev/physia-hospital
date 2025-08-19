import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { paymentMethodId } = await request.json()

    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, error: "Falta paymentMethodId" },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient({ cookies })
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

    // Obtener organización del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", userData.organization_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { success: false, error: "Organización no encontrada" },
        { status: 404 }
      )
    }

    if (!organization.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: "No hay cliente de Stripe configurado" },
        { status: 400 }
      )
    }

    // Verificar cliente en Stripe
    const customer = await stripe.customers.retrieve(
      organization.stripe_customer_id
    )

    if ((customer as any).deleted) {
      return NextResponse.json(
        { success: false, error: "Cliente no válido" },
        { status: 400 }
      )
    }

    // Adjuntar método de pago
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: organization.stripe_customer_id,
    })

    // Actualizar cliente
    await stripe.customers.update(organization.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    // Actualizar suscripción si existe
    if (organization.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(
        organization.stripe_subscription_id
      )
      if (subscription.status !== "canceled") {
        await stripe.subscriptions.update(organization.stripe_subscription_id, {
          default_payment_method: paymentMethodId,
        })
      }
    }

    // Recuperar detalles del método de pago
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    // Guardar metadata en organizations
    await supabase
      .from("organizations")
      .update({
        stripe_payment_method_id: paymentMethod.id,
        card_brand: paymentMethod.card?.brand || null,
        card_last4: paymentMethod.card?.last4 || null,
        card_exp_month: paymentMethod.card?.exp_month || null,
        card_exp_year: paymentMethod.card?.exp_year || null,
      })
      .eq("id", userData.organization_id)

    return NextResponse.json({
      success: true,
      message: "Método de pago actualizado correctamente",
      paymentMethod: {
        id: paymentMethod.id,
        brand: paymentMethod.card?.brand,
        last4: paymentMethod.card?.last4,
        exp_month: paymentMethod.card?.exp_month,
        exp_year: paymentMethod.card?.exp_year,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error actualizando método de pago" },
      { status: 500 }
    )
  }
}
