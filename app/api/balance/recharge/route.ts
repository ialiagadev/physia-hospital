import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { amount, notes } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Cantidad inválida" }, { status: 400 })
    }

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

    // Llamar a la función SQL para procesar el movimiento
    const { data: result, error: functionError } = await supabase.rpc("process_balance_movement", {
      org_id: userData.organization_id,
      movement_type: "ingreso",
      movement_concept: "manual_recharge",
      movement_amount: amount,
      ref_id: null,
      ref_data: null,
      user_id: user.id,
      movement_notes: notes || "Recarga manual de saldo",
    })

    if (functionError) {
      console.error("Error procesando recarga:", functionError)
      return NextResponse.json({ success: false, error: "Error procesando la recarga" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      movementId: result,
      message: `Saldo recargado con ${amount}€ correctamente`,
    })
  } catch (error: any) {
    console.error("Error en recarga de saldo:", error)
    return NextResponse.json({ success: false, error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
