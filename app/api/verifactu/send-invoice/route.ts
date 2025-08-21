  import { createClient } from "@supabase/supabase-js"
  import type { NextRequest } from "next/server"

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  export async function GET(req: NextRequest) {
    const invoiceId = req.nextUrl.searchParams.get("invoice_id")

    if (!invoiceId) {
      return Response.json({ error: "Falta invoice_id" }, { status: 400 })
    }

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        *, 
        clients (*), 
        organizations (
          id, 
          tax_id, 
          verifactu_emisor_id, 
          verifactu_username, 
          verifactu_api_key_encrypted
        ), 
        invoice_lines (*)
      `)
      .eq("id", invoiceId)
      .single()

    if (error || !invoice) {
      return Response.json({ error: "Factura no encontrada" }, { status: 404 })
    }

    if (invoice.status !== "issued") {
      return Response.json({ error: "Solo se pueden enviar facturas emitidas" }, { status: 400 })
    }

    // ✅ VERIFICAR QUE TENGA NÚMERO DE FACTURA
    if (!invoice.invoice_number) {
      return Response.json({ error: "La factura no tiene número asignado" }, { status: 400 })
    }

    const { organizations: org, clients: client, invoice_lines } = invoice

    if (!org.verifactu_emisor_id || !org.tax_id) {
      return Response.json({ error: "Falta el NIF o el ID del emisor en la organización." }, { status: 400 })
    }

    if (!invoice_lines || invoice_lines.length === 0) {
      return Response.json({ error: "La factura no tiene líneas de detalle" }, { status: 400 })
    }

    const loginRes = await fetch("https://app.verifactuapi.es/api/loginEmisor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: org.verifactu_username,
        api_key: org.verifactu_api_key_encrypted,
      }),
    })

    const loginData = await loginRes.json()
    if (!loginRes.ok || !loginData.token) {
      return Response.json({ error: "Login fallido del emisor" }, { status: 401 })
    }

    const token = loginData.token
    const numSerieFactura = invoice.invoice_number.replace("-", "/")

    const metodoPagoMap: Record<string, string> = {
      transferencia: "01",
      domiciliacion: "02",
      efectivo: "03",
      tarjeta: "04",
      cheque: "05",
      giro: "06",
      compensacion: "07",
      reembolso: "08",
      debito: "09",
      otros: "10",
    }

    const metodoPagoCodificado = metodoPagoMap[invoice.payment_method?.toLowerCase()] || "10"

    const desgloseMap = new Map<string, any>()
    invoice_lines.forEach((line: any) => {
      const vatRate = Number(line.vat_rate) || 0
      const irpfRate = Number(line.irpf_rate) || 0
      const key = `${vatRate}-${irpfRate}`

      if (!desgloseMap.has(key)) {
        const base: any = {
          Impuesto: 1,
          BaseImponibleOImporteNoSujeto: 0,
          ClaveRegimen: 1,
        }

        if (vatRate === 0) {
          base.OperacionExenta = "E1"
        } else {
          base.CalificacionOperacion = "S1"
          base.TipoImpositivo = vatRate
          base.CuotaRepercutida = 0
        }

        if (irpfRate > 0) {
          base.Retencion = {
            TipoRetencion: irpfRate,
            CuotaRetencion: 0,
          }
        }

        desgloseMap.set(key, base)
      }

      const desglose = desgloseMap.get(key)
      const subtotal = Number(line.quantity) * Number(line.unit_price)
      const discount = (subtotal * (Number(line.discount_percentage) || 0)) / 100
      const baseAmount = subtotal - discount
      const vatAmount = baseAmount * (vatRate / 100)
      const irpfAmount = baseAmount * (irpfRate / 100)

      desglose.BaseImponibleOImporteNoSujeto += baseAmount
      if (vatRate > 0) desglose.CuotaRepercutida += vatAmount
      if (irpfRate > 0) desglose.Retencion.CuotaRetencion += irpfAmount
    })

    const totalRetencion = Array.from(desgloseMap.values()).reduce((sum, item: any) => {
      return sum + (item.Retencion?.CuotaRetencion || 0)
    }, 0)

    const descripcionOperacion =
      `Cliente: ${client.name}, CIF/NIF: ${client.tax_id}, Dirección: ${client.address || ""}\nNotas: Operación exenta de IVA conforme al art. 20.1.3º Ley 37/1992. Servicio sanitario prestado por profesional titulado.`.slice(
        0,
        495,
      )

    const facturaPayload: any = {
      IDEmisorFactura: org.tax_id.trim(),
      NumSerieFactura: numSerieFactura,
      FechaExpedicionFactura: invoice.issue_date,
      RefExterna: `Factura ${invoice.invoice_number}`,
      TipoFactura: invoice.invoice_type === "rectificativa" ? "R1" : "F1",
      ...(invoice.invoice_type === "rectificativa" &&
        invoice.original_invoice_number && {
          FacturasRectificadas: [
            {
              NumSerieFacturaEmisor: invoice.original_invoice_number.replace("-", "/"),
              FechaExpedicionFacturaEmisor: invoice.rectification_date || invoice.issue_date,
            },
          ],
          TipoRectificativa: invoice.rectification_type || "1",
          CausaRectificacion: invoice.rectification_reason || "Rectificación por error en la factura original",
        }),
      DescripcionOperacion: descripcionOperacion,
      EmitidaPorTerceroODestinatario: "1",
      Destinatarios: [
        {
          NombreRazon: client.name,
          NIF: client.tax_id,
        },
      ],
      Desglose: Array.from(desgloseMap.values()),
      CuotaTotal: Number(invoice.vat_amount),
      ImporteTotal: Number(invoice.total_amount) - totalRetencion,
      MetodoPago: metodoPagoCodificado,
      tag: "factura-physia",
    }

    console.log("== VERIFACTU DEBUG ==")
    console.log("Payload:", JSON.stringify(facturaPayload, null, 2))

    const enviarRes = await fetch("https://app.verifactuapi.es/api/alta-registro-facturacion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(facturaPayload),
    })

    const enviarData = await enviarRes.json()

    if (!enviarRes.ok) {
      await supabase
        .from("invoices")
        .update({
          verifactu_status: "error",
          verifactu_error: JSON.stringify(enviarData),
        })
        .eq("id", invoiceId)

      return Response.json({ error: "Error al registrar la factura", detalle: enviarData }, { status: 500 })
    }

    const qrImage = enviarData?.data?.items?.[0]?.qr_image || null

    await supabase
      .from("invoices")
      .update({
        verifactu_status: "sent",
        verifactu_sent_at: new Date().toISOString(),
        verifactu_qr_code: qrImage,
        verifactu_response: enviarData,
      })
      .eq("id", invoiceId)

    return Response.json({ success: true, response: enviarData })
  }
