import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone, organizationName } = await request.json()

    console.log("[v0] Creating Stripe customer with data:", { email, name, phone, organizationName })

    // Crear cliente en Stripe
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        organization_name: organizationName,
        source: "physia_registration",
      },
    })

    console.log("[v0] Stripe customer created successfully:", customer.id)

    return NextResponse.json({
      success: true,
      customerId: customer.id,
    })
  } catch (error: any) {
    console.error("[v0] Error creating Stripe customer:", error)
    console.error("[v0] Error details:", {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode,
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error creating customer",
      },
      { status: 500 },
    )
  }
}
