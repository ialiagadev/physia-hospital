
console.log("[v0] STRIPE_SECRET_KEY exists:", !!process.env.STRIPE_SECRET_KEY)
console.log("[v0] STRIPE_SECRET_KEY starts with sk_:", process.env.STRIPE_SECRET_KEY?.startsWith("sk_"))
console.log("[v0] STRIPE_SECRET_KEY length:", process.env.STRIPE_SECRET_KEY?.length)

import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set. Please add it to your environment variables.")
}

if (!process.env.STRIPE_SECRET_KEY.startsWith("sk_")) {
  throw new Error("STRIPE_SECRET_KEY must start with 'sk_'")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-07-30.basil",
})

console.log("[v0] Stripe initialized successfully")
