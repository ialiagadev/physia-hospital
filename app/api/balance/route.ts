import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 })
    }

    // Obtener organización del usuario
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ success: false, error: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener saldo actual de la organización
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("balance, balance_alert_threshold, balance_updated_at")
      .eq("id", userData.organization_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ success: false, error: "Organización no encontrada" }, { status: 404 })
    }

    // Obtener últimos movimientos
    const { data: movements, error: movementsError } = await supabase
      .from("balance_movements")
      .select("*")
      .eq("organization_id", userData.organization_id)
      .order("created_at", { ascending: false })
      .limit(10)

    if (movementsError) {
      console.error("Error obteniendo movimientos:", movementsError)
    }

    // Calcular estadísticas del mes actual
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyStats, error: statsError } = await supabase
      .from("balance_movements")
      .select("type, amount")
      .eq("organization_id", userData.organization_id)
      .gte("created_at", startOfMonth.toISOString())

    let monthlyIncome = 0
    let monthlyExpenses = 0

    if (!statsError && monthlyStats) {
      monthlyStats.forEach((movement) => {
        if (movement.type === "ingreso") {
          monthlyIncome += Number.parseFloat(movement.amount)
        } else if (movement.type === "gasto") {
          monthlyExpenses += Number.parseFloat(movement.amount)
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        balance: Number.parseFloat(organization.balance || "0"),
        alertThreshold: Number.parseFloat(organization.balance_alert_threshold || "5"),
        lastUpdated: organization.balance_updated_at,
        movements: movements || [],
        monthlyStats: {
          income: monthlyIncome,
          expenses: monthlyExpenses,
          net: monthlyIncome - monthlyExpenses,
        },
      },
    })
  } catch (error: any) {
    console.error("Error obteniendo saldo:", error)
    return NextResponse.json({ success: false, error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
