import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { email, name, phone, organizationName, taxId, address } = await request.json()

    console.log("[v0] Creating Stripe customer with data:", {
      email,
      name,
      phone,
      organizationName,
      taxId,
      address,
    })

    // Crear cliente en Stripe con billing address + tax_id
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      address: {
        line1: address?.line1 || undefined,
        line2: address?.line2 || undefined,
        city: address?.city || undefined,
        state: address?.state || undefined,
        postal_code: address?.postal_code || undefined,
        country: address?.country || "ES", // por defecto España
      },
      tax_id_data: taxId
        ? [
            {
              // 👇 Ojo: si es un NIF/CIF español, usa "es_cif" o "es_nif"
              type: "es_cif",
              value: taxId,
            },
          ]
        : undefined,
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
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error creating customer",
      },
      { status: 500 },
    )
  }
}
