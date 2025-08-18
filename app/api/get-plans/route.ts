import { NextResponse } from "next/server"
import { STRIPE_PLANS } from "@/lib/stripe-config"

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      plans: STRIPE_PLANS,
    })
  } catch (error: any) {
    console.error("Error fetching plans:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error fetching plans",
      },
      { status: 500 },
    )
  }
}
