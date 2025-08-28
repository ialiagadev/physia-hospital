import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  try {
    const { amount, notes, orgId } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Cantidad inválida" }, { status: 400 })
    }

    // ⚡ crea sesión de pago en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Recarga de saldo",
              description: notes || "Recarga manual de créditos",
            },
            unit_amount: Math.round(amount * 1.21 * 100), // IVA incluido (21%)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // 👇 solo enviamos session_id
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/balance/recharge/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?recharge=cancelled`,
      // 👇 guardamos datos seguros en metadata
      metadata: {
        orgId: String(orgId),
        baseAmount: String(amount), // neto sin IVA
        vat: "21",
      },
    })

    return NextResponse.json({ success: true, url: session.url })
  } catch (error: any) {
    console.error("❌ Error creando sesión de Stripe:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
