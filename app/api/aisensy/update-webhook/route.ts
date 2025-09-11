// app/api/aisensy/update-webhook/route.ts
import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

async function createTemplate(token: string, template: any) {
  const res = await fetch("https://backend.aisensy.com/direct-apis/t1/wa_template", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(template),
  })

  const result = await res.json()

  if (!res.ok) {
    throw new Error(`Error creando plantilla ${template.name}: ${JSON.stringify(result)}`)
  }

  return { created: true, result }
}

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

    // ✅ 2. Plantilla recordatorio_1 (sustituye a aviso_cita)
    const recordatorioTemplate = {
      name: "recordatorio_1",
      category: "UTILITY",
      language: "es",
      components: [
        {
          type: "BODY",
          text: `Hola {{1}},

Te recordamos que tienes una cita en {{2}}:

- Día: {{3}} 
- Hora: {{4}}.  

Por favor, confirma tu cita cuando puedas.
Para cambios o cancelaciones aplica la política del centro.

Gracias!`,
          example: {
            body_text: [["Juan", "Clínica Physia", "15 de Octubre", "11:00"]],
          },
        },
      ],
    }
    const recordatorioResult = await createTemplate(token, recordatorioTemplate)

    // ✅ 3. Plantilla revision_cita (se mantiene igual)
    const revisionTemplate = {
      name: "revision_cita",
      category: "UTILITY",
      language: "es",
      components: [
        {
          type: "BODY",
          text: "Hola {{1}}, queríamos saber cómo te encuentras después de tu cita. Si necesitas hacer alguna consulta, puedes responder directamente a este mensaje.",
          example: {
            body_text: [["Juan"]],
          },
        },
      ],
    }
    const revisionResult = await createTemplate(token, revisionTemplate)

    // ✅ 4. Actualizar tabla waba
    const { error: updateError } = await supabase
      .from("waba")
      .update({
        estado: 1,
        waba_id: 1, // ⚠️ sigue fijo, cámbialo si quieres guardar un ID real
      })
      .eq("id", wabaId)

    if (updateError) {
      console.error("❌ Error actualizando waba:", updateError)
      return NextResponse.json(
        { error: "Webhook/plantillas creados pero fallo al actualizar en BD" },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, result, recordatorioResult, revisionResult })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 })
  }
}
