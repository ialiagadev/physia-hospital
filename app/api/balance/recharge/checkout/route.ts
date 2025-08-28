import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  try {
    const { amount, notes, orgId } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Cantidad inválida" }, { status: 400 })
    }

    // 🔹 Calcular IVA y total
    const baseAmount = Number(amount)
    const amountWithVAT = baseAmount * 1.21

    // ⚡ crea sesión de pago en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Recarga de saldo",
              description: `Recarga de ${baseAmount.toFixed(2)}€ + IVA (21%)`,
            },
            unit_amount: Math.round(amountWithVAT * 100), // Stripe usa céntimos
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/balance/recharge/success?session_id={CHECKOUT_SESSION_ID}&amount=${baseAmount}&orgId=${orgId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?recharge=cancelled`,
    })

    return NextResponse.json({ success: true, url: session.url })
  } catch (error: any) {
    console.error("❌ Error creando sesión de Stripe:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
