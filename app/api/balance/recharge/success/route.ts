import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚡ service role para insertar
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const session_id = searchParams.get("session_id")

    if (!session_id) {
      return NextResponse.json({ success: false, error: "Falta session_id" }, { status: 400 })
    }

    // 1️⃣ Verificar sesión en Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ success: false, error: "Pago no completado" }, { status: 400 })
    }

    // 2️⃣ Recuperar metadata
    const orgId = Number(session.metadata?.orgId)
    const baseAmount = Number(session.metadata?.baseAmount) // neto sin IVA
    const amountWithVAT = Number(session.amount_total) / 100 // total pagado en Stripe

    if (!orgId || !baseAmount) {
      return NextResponse.json({ success: false, error: "Metadata incompleta" }, { status: 400 })
    }

    // 3️⃣ Insertar movimiento en balance_movements con neto
    const { error } = await supabase.from("balance_movements").insert({
      organization_id: orgId,
      type: "ingreso",
      concept: "recarga_stripe",
      amount: baseAmount, // 👈 recargamos solo neto
      reference_id: session.id,
      reference_data: {
        stripe_payment_intent: session.payment_intent,
        amount_with_vat: amountWithVAT,
        vat: 21,
      },
      notes: "Recarga vía Stripe Checkout",
    })

    if (error) throw error

    // 4️⃣ Redirigir al dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?recharge=success`)
  } catch (error: any) {
    console.error("❌ Error en success Stripe:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
