import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    const period = searchParams.get("period") || "30"

    console.log("🔍 API called with:", { organizationId, period })

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    // Calcular fecha de inicio basada en el período
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - Number.parseInt(period))

    const startDateString = startDate.toISOString().split("T")[0]
    const endDateString = endDate.toISOString().split("T")[0]

    console.log("📅 Date filter:", {
      startDateString,
      endDateString,
      periodDays: period,
    })

    // Consultar datos agrupados por método de pago
    const { data: invoicesData, error } = await supabase
      .from("invoices")
      .select("payment_method, total_amount, id, issue_date, status, organization_id, invoice_number")
      .eq("organization_id", Number.parseInt(organizationId))
      .gte("issue_date", startDateString)
      .lte("issue_date", endDateString)
      .in("status", ["sent", "paid", "pagada"]) // Incluir status en español

    console.log("📊 Supabase query result:", {
      data: invoicesData?.slice(0, 3), // Solo mostrar primeras 3 para no saturar logs
      error,
      totalCount: invoicesData?.length || 0,
      organizationIdUsed: Number.parseInt(organizationId),
    })

    if (error) {
      console.error("❌ Error fetching invoices:", error)
      return NextResponse.json({ error: "Failed to fetch data", details: error.message }, { status: 500 })
    }

    if (!invoicesData || invoicesData.length === 0) {
      console.log("⚠️ No invoices found with current filters")

      // Debug: hacer una consulta sin filtros para ver qué hay en la base de datos
      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("organization_id, issue_date, status")
        .eq("organization_id", Number.parseInt(organizationId))
        .limit(5)

      console.log("🔍 Debug - Sample invoices for this org:", allInvoices)

      return NextResponse.json([])
    }

    // Agrupar y calcular estadísticas por método de pago
    const paymentMethodStats = invoicesData.reduce((acc: any, invoice) => {
      const method = invoice.payment_method || "no_especificado"

      if (!acc[method]) {
        acc[method] = {
          method,
          amount: 0,
          count: 0,
          color: getPaymentMethodColor(method),
        }
      }

      acc[method].amount += Number.parseFloat(invoice.total_amount)
      acc[method].count += 1

      return acc
    }, {})

    // Convertir a array y calcular porcentajes
    const totalAmount = Object.values(paymentMethodStats).reduce((sum: number, item: any) => sum + item.amount, 0)

    const result = Object.values(paymentMethodStats).map((item: any) => ({
      ...item,
      amount: Math.round(item.amount * 100) / 100,
      percentage: totalAmount > 0 ? Math.round((item.amount / totalAmount) * 100 * 10) / 10 : 0,
    }))

    // Ordenar por cantidad descendente
    result.sort((a: any, b: any) => b.amount - a.amount)

    console.log("✅ Final result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("💥 Error in revenue-by-payment-method API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getPaymentMethodColor(method: string): string {
  const colors: { [key: string]: string } = {
    tarjeta: "hsl(var(--chart-1))",
    efectivo: "hsl(var(--chart-2))",
    transferencia: "hsl(var(--chart-3))",
    bizum: "hsl(var(--chart-4))",
    cheque: "hsl(var(--chart-5))",
    no_especificado: "hsl(var(--muted))",
  }
  return colors[method] || "hsl(var(--muted))"
}
