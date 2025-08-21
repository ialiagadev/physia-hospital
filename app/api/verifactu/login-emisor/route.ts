import { createClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const getZonaTBAI = (provincia: string): number => {
  const zonaMap: Record<string, number> = {
    álava: 1,
    araba: 1,
    vizcaya: 2,
    bizkaia: 2,
    guipúzcoa: 3,
    gipuzkoa: 3,
  }

  const provinciaLower = provincia.toLowerCase()
  for (const [key, zona] of Object.entries(zonaMap)) {
    if (provinciaLower.includes(key)) {
      return zona
    }
  }
  return 1 // Default a Álava
}

const checkTBAIEmisor = async (taxId: string, token: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://app.verifactuapi.es/api/emisor/${taxId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      return data.type === "tbai"
    }
    return false
  } catch (error) {
    console.error("[TBAI] Error verificando emisor:", error)
    return false
  }
}

const createTBAIEmisor = async (org: any, token: string): Promise<boolean> => {
  try {
    const zonaTBAI = getZonaTBAI(org.province)

    const emisorPayload = {
      nif: org.tax_id.trim(),
      nombre: org.name || "Organización",
      type: "tbai",
      id_zona_tbai: zonaTBAI,
    }

    console.log(`[TBAI] Creando emisor TBAI para ${org.tax_id} en zona ${zonaTBAI}`)
    console.log(`[TBAI] Payload emisor:`, JSON.stringify(emisorPayload, null, 2))
    console.log(`[TBAI] Token length: ${token?.length || 0}, starts with: ${token?.substring(0, 10)}...`)

    const response = await fetch("https://app.verifactuapi.es/api/emisor", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emisorPayload),
    })

    const responseData = await response.json()
    console.log(`[TBAI] Response status: ${response.status}`)
    console.log(`[TBAI] Response headers:`, Object.fromEntries(response.headers.entries()))
    console.log(`[TBAI] Response data:`, JSON.stringify(responseData, null, 2))

    if (response.ok) {
      console.log(`[TBAI] Emisor TBAI creado exitosamente para ${org.tax_id}`)
      return true
    } else {
      console.error("[TBAI] Error creando emisor:", {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      })

      if (response.status === 403) {
        console.error("[TBAI] Error 403: Las credenciales no tienen permisos para crear emisores TBAI")
        console.error("[TBAI] Verifica que la cuenta tenga permisos de administrador o TBAI habilitado")
      }

      // Si el error es que ya existe, intentar verificar si es de tipo TBAI
      if (responseData.message?.includes("ya existe") || responseData.code === 409) {
        console.log("[TBAI] El emisor ya existe, verificando si es tipo TBAI...")
        return await checkTBAIEmisor(org.tax_id, token)
      }

      return false
    }
  } catch (error) {
    console.error("[TBAI] Error creando emisor TBAI:", error)
    return false
  }
}

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
        name,
        verifactu_emisor_id, 
        verifactu_username, 
        verifactu_api_key_encrypted,
        province
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

  const isBasqueProvince = (provincia: string): boolean => {
    if (!provincia) return false
    const basqueProvinces = ["Álava", "Vizcaya", "Guipúzcoa", "Araba", "Bizkaia", "Gipuzkoa"]
    return basqueProvinces.some((bp) => provincia.toLowerCase().includes(bp.toLowerCase()))
  }

  const shouldUseTBAI = isBasqueProvince(org.province)

  console.log(
    `[VERIFACTU] Organización: ${org.tax_id}, Provincia: ${org.province}, Usando ${shouldUseTBAI ? "TBAI" : "VeriFactu"}`,
  )

  console.log(`[VERIFACTU] Intentando login con username: ${org.verifactu_username}`)

  const loginRes = await fetch("https://app.verifactuapi.es/api/loginEmisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: org.verifactu_username,
      api_key: org.verifactu_api_key_encrypted,
    }),
  })

  const loginData = await loginRes.json()
  console.log(`[VERIFACTU] Login response status: ${loginRes.status}`)
  console.log(`[VERIFACTU] Login response:`, JSON.stringify(loginData, null, 2))

  if (!loginRes.ok || !loginData.token) {
    return Response.json({ error: "Login fallido del emisor" }, { status: 401 })
  }

  const token = loginData.token

  if (shouldUseTBAI) {
    console.log("[TBAI] Verificando si existe emisor TBAI...")
    const hasTBAIEmisor = await checkTBAIEmisor(org.tax_id, token)

    if (!hasTBAIEmisor) {
      console.log("[TBAI] No existe emisor TBAI, creando automáticamente...")
      const created = await createTBAIEmisor(org, token)

      if (!created) {
        return Response.json(
          {
            error: "No se pudo crear el emisor TBAI automáticamente",
            detalle:
              "Verifica que las credenciales de VeriFactu tengan permisos para crear emisores TBAI, o crea manualmente el emisor TBAI en el panel de VeriFactu",
            tax_id: org.tax_id,
            province: org.province,
          },
          { status: 500 },
        )
      }
    } else {
      console.log("[TBAI] Emisor TBAI ya existe, continuando...")
    }
  }

  const apiEndpoint = shouldUseTBAI
    ? "https://app.verifactuapi.es/api/alta-registro-tbai"
    : "https://app.verifactuapi.es/api/alta-registro-facturacion"

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

  let facturaPayload: any

  try {
    if (shouldUseTBAI) {
      console.log("[v0] Construyendo payload TBAI...")
      console.log("[v0] numSerieFactura:", numSerieFactura)

      let numSerie: string
      let numFactura: string

      if (numSerieFactura.includes("/")) {
        // Si tiene formato "SERIE/NUMERO"
        ;[numSerie, numFactura] = numSerieFactura.split("/")
      } else {
        // Si no tiene "/", extraer parte alfabética como serie y numérica como número
        const match = numSerieFactura.match(/^([A-Za-z]+)(\d+)$/)
        if (match) {
          numSerie = match[1] // Parte alfabética (ej: "MARIO")
          numFactura = match[2] // Parte numérica (ej: "0066")
        } else {
          // Fallback: usar serie por defecto
          numSerie = "AX"
          numFactura = numSerieFactura
        }
      }

      console.log("[v0] numSerie:", numSerie, "numFactura:", numFactura)

      const currentTime = new Date().toLocaleTimeString("es-ES", { hour12: false })
      console.log("[v0] currentTime:", currentTime)

      facturaPayload = {
        IDEmisorFactura: org.tax_id.trim(),
        NumSerie: numSerie,
        NumFactura: numFactura,
        FechaExpedicionFactura: invoice.issue_date,
        HoraExpedicionFactura: currentTime,
        DescripcionFactura: `Servicios sanitarios - ${client.name}`,
        Destinatarios: [
          {
            NombreRazon: client.name,
            NIF: client.tax_id,
          },
        ],
        DetallesFactura: invoice_lines.map((line: any) => {
          const subtotal = Number(line.quantity) * Number(line.unit_price)
          const discount = (subtotal * (Number(line.discount_percentage) || 0)) / 100
          const baseAmount = subtotal - discount
          const vatRate = Number(line.vat_rate) || 0
          const vatAmount = baseAmount * (vatRate / 100)

          return {
            Descripcion: line.description || "Servicio sanitario",
            Unidades: Number(line.quantity),
            PrecioPorUnidad: Number(line.unit_price),
            SubTotal: baseAmount,
            ImporteTotal: baseAmount + vatAmount,
            Descuento: discount > 0 ? discount : undefined,
          }
        }),
        Desglose: Array.from(desgloseMap.values()).map((item: any) => ({
          TipoNoExenta: item.CalificacionOperacion === "S1" ? 1 : undefined,
          BaseImponibleOImporteNoSujeto: item.BaseImponibleOImporteNoSujeto,
          TipoImpositivo: item.TipoImpositivo || undefined,
          CuotaRepercutida: item.CuotaRepercutida || undefined,
          TipoRecargoEquivalencia: undefined,
          CuotaRecargoEquivalencia: undefined,
        })),
        ImporteTotal: Number(invoice.total_amount),
        RetencionSoportada: totalRetencion > 0 ? totalRetencion : undefined,
        Claves: [1], // Clave 1 = Régimen general
        tag: "factura-physia-tbai",
      }
      console.log("[v0] Payload TBAI construido exitosamente")
    } else {
      console.log("[v0] Construyendo payload VeriFactu...")

      // VeriFactu payload structure (existing)
      facturaPayload = {
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
      console.log("[v0] Payload VeriFactu construido exitosamente")
    }
  } catch (error) {
    console.error("[v0] Error construyendo payload:", error)
  }

  console.log("== VERIFACTU/TBAI DEBUG ==")
  console.log(`Endpoint: ${apiEndpoint}`)
  console.log("Payload:", JSON.stringify(facturaPayload, null, 2))

  const enviarRes = await fetch(apiEndpoint, {
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
      // Agregar metadata sobre el sistema usado
      verifactu_system: shouldUseTBAI ? "TBAI" : "VeriFactu",
    })
    .eq("id", invoiceId)

  return Response.json({
    success: true,
    response: enviarData,
    system_used: shouldUseTBAI ? "TBAI" : "VeriFactu",
    province: org.province,
  })
}
