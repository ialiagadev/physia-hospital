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

    // Recuperar token_proyecto
    const { data: wabaRecord, error } = await supabase
      .from("waba")
      .select("token_proyecto")
      .eq("id", wabaId)
      .single()

    if (error || !wabaRecord?.token_proyecto) {
      return NextResponse.json({ error: "No se encontró token_proyecto" }, { status: 404 })
    }

    const token = wabaRecord.token_proyecto

    // ✅ 1. Actualizar webhook en AiSensy
    const response = await fetch("https://backend.aisensy.com/direct-apis/t1/settings/update-webhook", {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        webhooks: { url: "https://api.myphysia.com/aisensy/webhook" },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        { error: `Error AiSensy Webhook: ${response.status} - ${JSON.stringify(result)}` },
        { status: response.status },
      )
    }

    // ✅ 2. Crear plantilla "recordatorios_cita"
    const recordatorioTemplate = {
      name: "recordatorios_cita",
      category: "UTILITY",
      language: "es",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, te recordamos tu cita en {{2}} el día {{3}} a las {{4}}. Respondiendo a este mensaje podrás resolver cualquier duda o cancelar la cita.",
          example: {
            body_text: [["Juan", "Clínica Physia", "10 de Septiembre", "16:00"]],
          },
        },
      ],
    }

    const recRes = await fetch("https://backend.aisensy.com/direct-apis/t1/wa_template", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(recordatorioTemplate),
    })
    const recResult = await recRes.json()
    if (!recRes.ok) {
      return NextResponse.json(
        { error: `Error creando plantilla recordatorios_cita: ${recRes.status} - ${JSON.stringify(recResult)}` },
        { status: recRes.status },
      )
    }

    // ✅ 3. Crear plantilla "seguimiento_cita"
    const seguimientoTemplate = {
      name: "seguimiento_cita",
      category: "UTILITY",
      language: "es",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, ¿cómo te has sentido después de tu cita? Si tienes alguna molestia o duda, respóndenos por aquí y te ayudaremos.",
          example: {
            body_text: [["Juan"]],
          },
        },
      ],
    }

    const segRes = await fetch("https://backend.aisensy.com/direct-apis/t1/wa_template", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(seguimientoTemplate),
    })
    const segResult = await segRes.json()
    if (!segRes.ok) {
      return NextResponse.json(
        { error: `Error creando plantilla seguimiento_cita: ${segRes.status} - ${JSON.stringify(segResult)}` },
        { status: segRes.status },
      )
    }

    // ✅ 4. Actualizar tabla waba
    const { error: updateError } = await supabase
      .from("waba")
      .update({
        estado: 1,
        waba_id: 1, // ⚠️ aquí sigues guardando "1" fijo, revisa si quieres guardar el ID real de AiSensy
      })
      .eq("id", wabaId)

    if (updateError) {
      console.error("❌ Error actualizando waba:", updateError)
      return NextResponse.json(
        { error: "Webhook/plantillas creados pero fallo al actualizar en BD" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, result, recResult, segResult })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 })
  }
}
