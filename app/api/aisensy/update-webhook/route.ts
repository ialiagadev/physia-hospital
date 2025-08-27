// app/api/aisensy/update-webhook/route.ts
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(req: Request) {
  try {
    const { wabaId } = await req.json()

    if (!wabaId) {
      return NextResponse.json({ error: "Falta wabaId" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Recuperar el token_proyecto de la tabla waba
    const { data: wabaRecord, error } = await supabase
      .from("waba")
      .select("token_proyecto")
      .eq("id", wabaId)
      .single()

    if (error || !wabaRecord?.token_proyecto) {
      return NextResponse.json({ error: "No se encontró token_proyecto" }, { status: 404 })
    }

    const token = wabaRecord.token_proyecto

    // ✅ URL fija para AiSensy
    const webhookUrl = "https://api.myphysia.com/aisensy/webhook"

    // Llamada a AiSensy para actualizar el webhook
    const response = await fetch("https://backend.aisensy.com/direct-apis/t1/settings/update-webhook", {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        webhooks: {
          url: "https://api.myphysia.com/aisensy/webhook"
        }
      }),
    });

    const result = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: `Error AiSensy: ${response.status} - ${JSON.stringify(result)}` },
        { status: response.status },
      )
    }

    // ✅ Si AiSensy responde OK, actualizamos el estado en la tabla waba
    const { error: updateError } = await supabase
    .from("waba")
    .update({ 
      estado: 1,
      waba_id: 1   // 👈 siempre pone 1
    })
    .eq("id", wabaId)
  
  if (updateError) {
    console.error("❌ Error actualizando waba:", updateError)
    return NextResponse.json(
      { error: "Webhook actualizado en AiSensy pero fallo al actualizar en BD" },
      { status: 500 },
    )
  }
  

    return NextResponse.json({ success: true, result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 })
  }
}
