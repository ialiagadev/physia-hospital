import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoiceId = params.id
    const { status } = await request.json()

    // Validar que se proporcione el estado
    if (!status) {
      return NextResponse.json({ error: "El estado es requerido" }, { status: 400 })
    }

    // Validar el estado
    const validStatuses = ["draft", "issued", "paid", "rejected"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
    }

    // Validar que se proporcione el ID
    if (!invoiceId) {
      return NextResponse.json({ error: "ID de factura requerido" }, { status: 400 })
    }

    // Actualizar el estado en Supabase usando el mismo cliente que invoices-page
    const { data, error } = await supabase.from("invoices").update({ status }).eq("id", invoiceId).select().single()

    if (error) {
      console.error("Error al actualizar el estado:", error)
      return NextResponse.json(
        {
          error: "Error al actualizar el estado",
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (!data) {
      return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      invoice: data,
    })
  } catch (error) {
    console.error("Error en la API:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
