import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoiceId = params.id
    const { status } = await request.json()

    // Validar el estado
    const validStatuses = ["draft", "issued", "paid", "rejected"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
    }

    // Actualizar el estado en Supabase
    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from("invoices")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", invoiceId)

    if (error) {
      console.error("Error al actualizar el estado:", error)
      return NextResponse.json({ error: "Error al actualizar el estado" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en la API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
