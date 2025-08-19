import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { STRIPE_PLANS } from "@/lib/stripe-config"

// ⚡ Cliente con service_role → bypass RLS
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 👈 clave secreta del backend
  {
    auth: { persistSession: false },
  }
)

export async function POST(req: Request) {
  try {
    const { organizationId } = await req.json()

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId requerido" }, { status: 400 })
    }

    // 1. Cargar la organización cliente
    const { data: org, error: orgError } = await supabaseServer
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    // 2. Localizar el plan
    const tier = (org.subscription_tier || "INICIAL").toUpperCase() as keyof typeof STRIPE_PLANS
    const plan = STRIPE_PLANS[tier]

    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 })
    }

    // 3. Determinar el periodo
    let period: "monthly" | "yearly" = "monthly"
    if (org.subscription_status === "active") {
      period = "monthly" // 👈 aquí más adelante puedes distinguir anual
    }

    const priceInfo = plan.prices[period]

    // 4. Verificar si ya existe un cliente asociado a esta organización
    const { data: existingClient } = await supabaseServer
      .from("clients")
      .select("id")
      .eq("organization_id", org.id)
      .single()

    let clientId = existingClient?.id

    // Si no existe, crear el cliente a partir de los datos de la organización (sin dirección)
    if (!clientId) {
      const { data: newClient, error: newClientError } = await supabaseServer
        .from("clients")
        .insert({
          organization_id: org.id,
          name: org.name,
          tax_id: org.tax_id,
          email: org.email,
          phone: org.phone,
        })
        .select("id")
        .single()

      if (newClientError) {
        return NextResponse.json({ error: newClientError.message }, { status: 500 })
      }

      clientId = newClient.id
    }

    // 5. Insertar factura en borrador
    const { data: invoice, error: invoiceError } = await supabaseServer
      .from("invoices")
      .insert({
        organization_id: 61, // 👈 tu organización (proveedor del servicio)
        client_id: clientId, // cliente creado desde la organización
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        base_amount: priceInfo.amount / 100,
        vat_amount: (priceInfo.amount / 100) * 0.21,
        total_amount: (priceInfo.amount / 100) * 1.21,
        notes: `${plan.name} (${priceInfo.amount / 100}€) - ${
          period === "monthly" ? "Mensual" : "Anual"
        }`,
      })
      .select()
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: invoiceError?.message || "No se pudo crear la factura" },
        { status: 500 }
      )
    }

    // 6. Insertar línea de factura asociada con IVA 21%
    const { error: lineError } = await supabaseServer
      .from("invoice_lines")
      .insert({
        invoice_id: invoice.id,
        description: `${plan.name} - ${period === "monthly" ? "Mensual" : "Anual"}`,
        quantity: 1,
        unit_price: priceInfo.amount / 100,
        discount_percentage: 0,
        vat_rate: 21,
        irpf_rate: 0,
        retention_rate: 0,
        line_amount: priceInfo.amount / 100,
      })

    if (lineError) {
      return NextResponse.json({ error: lineError.message }, { status: 500 })
    }

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
