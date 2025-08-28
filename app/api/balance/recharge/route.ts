import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚡ necesitas service role para leer datos protegidos
)

export async function POST(req: Request) {
  try {
    const { amount, notes, orgId } = await req.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Cantidad inválida" }, { status: 400 })
    }

    // 1️⃣ Obtener datos de la organización
    const { data: org, error } = await supabase
      .from("organizations")
      .select("province")
      .eq("id", orgId)
      .single()

    if (error || !org) {
      return NextResponse.json({ success: false, error: "Organización no encontrada" }, { status: 400 })
    }

    // 2️⃣ Provincias exentas de IVA
    const provincesNoVAT = [
      "santa cruz de tenerife",
      "las palmas",
      "ceuta",
      "melilla",
    ]

    const provinceNormalized = (org.province || "").toString().trim().toLowerCase()
    const isExempt = provincesNoVAT.some(p => provinceNormalized.includes(p))

    // 3️⃣ Calcular importes
    const baseAmount = amount
    const vat = isExempt ? 0 : 21
    const multiplier = isExempt ? 1 : 1 + vat / 100
    const amountToCharge = baseAmount * multiplier

    // 4️⃣ Crear sesión de pago en Stripe
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
            unit_amount: Math.round(amountToCharge * 100), // Stripe usa céntimos
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/balance/recharge/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?recharge=cancelled`,
      metadata: {
        orgId: String(orgId),
        baseAmount: String(baseAmount),
        vat: String(vat),
        finalAmount: String(amountToCharge),
      },
    })

    // 5️⃣ Devolver respuesta con debug (temporal)
    return NextResponse.json({
      success: true,
      url: session.url,
      debug: {
        province: org.province,
        normalized: provinceNormalized,
        isExempt,
        baseAmount,
        vat,
        amountToCharge,
      },
    })
  } catch (error: any) {
    console.error("❌ Error creando sesión de Stripe:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
