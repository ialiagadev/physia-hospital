import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚡ usa service role para insertar
)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const session_id = searchParams.get("session_id")
    const amount = Number(searchParams.get("amount"))
    const orgId = Number(searchParams.get("orgId"))

    if (!session_id || !amount || !orgId) {
      return NextResponse.json({ success: false, error: "Datos incompletos" }, { status: 400 })
    }

    // 1️⃣ Verificar que el pago en Stripe esté completado
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== "paid") {
      return NextResponse.json({ success: false, error: "Pago no completado" }, { status: 400 })
    }

    // 2️⃣ Insertar movimiento en balance_movements
    const { error } = await supabase.from("balance_movements").insert({
      organization_id: orgId,
      type: "ingreso",
      concept: "recarga_stripe",
      amount,
      reference_id: session_id,
      reference_data: {
        stripe_payment_intent: session.payment_intent,
      },
      notes: "Recarga vía Stripe Checkout",
    })

    if (error) throw error

    // 3️⃣ Redirigir al dashboard
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?recharge=success`)
  } catch (error: any) {
    console.error("❌ Error en success Stripe:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
