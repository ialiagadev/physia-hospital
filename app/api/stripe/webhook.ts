import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import { headers } from "next/headers"

// Cliente de Supabase con service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text() // ⚠️ hay que leer como texto
  const sig = headers().get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error("❌ Error verificando firma Stripe:", err.message)
    return NextResponse.json({ error: `Webhook signature error: ${err.message}` }, { status: 400 })
  }

  // ✅ Evento cuando un pago por Checkout se completa
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any

    console.log("✅ Pago completado en Stripe:", session.id)

    const orgId = Number(session.metadata?.orgId)
    const baseAmount = Number(session.metadata?.baseAmount) // neto sin IVA
    const amountWithVAT = baseAmount * 1.21

    if (!orgId || !baseAmount) {
      console.error("⚠️ Metadata incompleta en checkout.session")
      return NextResponse.json({ error: "Metadata incompleta" }, { status: 400 })
    }

    // Inserta movimiento de saldo
    const { error } = await supabase.from("balance_movements").insert({
      organization_id: orgId,
      type: "ingreso",
      concept: "recarga_stripe",
      amount: baseAmount, // 👈 neto sin IVA
      reference_id: session.id,
      reference_data: {
        stripe_payment_intent: session.payment_intent,
        amount_with_vat: amountWithVAT,
        vat: 21,
      },
      notes: "Recarga vía Stripe Checkout",
    })

    if (error) {
      console.error("❌ Error insertando movimiento:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("💰 Movimiento insertado correctamente en balance_movements")
  }

  return NextResponse.json({ received: true })
}
