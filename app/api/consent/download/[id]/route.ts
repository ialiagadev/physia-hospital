import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const consentId = params.id

    if (!consentId) {
      return NextResponse.json({ error: "ID de consentimiento requerido" }, { status: 400 })
    }

    // Buscar el consentimiento firmado con todos los datos
    const { data: consentData, error: consentError } = await supabase
      .from("patient_consents")
      .select(`
        *,
        consent_forms!inner(id, title, category),
        clients(id, name, email, phone),
        consent_tokens!inner(id, token, recipient_info)
      `)
      .eq("id", consentId)
      .single()

    console.log("🔍 DEBUG - Download consent request:", {
      consentId,
      found: !!consentData,
      hasContent: !!consentData?.consent_content,
      hasOrgData: !!consentData?.organization_data,
      error: consentError?.message,
    })

    if (consentError || !consentData) {
      return NextResponse.json({ error: "Consentimiento no encontrado" }, { status: 404 })
    }

    // Usar el contenido procesado guardado en patient_consents
    let finalContent = consentData.consent_content || consentData.consent_forms.content
    let organizationData = consentData.organization_data

    // Si no tenemos contenido procesado en patient_consents, intentar obtenerlo del token
    if (!consentData.consent_content && consentData.consent_tokens?.recipient_info?.processed_content) {
      finalContent = consentData.consent_tokens.recipient_info.processed_content
      organizationData = consentData.consent_tokens.recipient_info.organization_data
      console.log("✅ Using processed content from token")
    }

    console.log("✅ DEBUG - Download consent data:", {
      consentId,
      hasProcessedContent: !!finalContent,
      contentLength: finalContent?.length || 0,
      organizationName: organizationData?.name,
      patientName: consentData.patient_name,
      signedAt: consentData.signed_at,
    })

    // Generar HTML completo para descarga
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Consentimiento Informado - ${consentData.patient_name}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .signature-section { margin-top: 40px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9; }
        .signature-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .signature-image { max-width: 300px; border: 1px solid #ccc; padding: 10px; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    ${finalContent}
    
    <div class="signature-section">
        <h2>Información de la Firma Digital</h2>
        <div class="signature-info">
            <div>
                <p><strong>Nombre completo:</strong> ${consentData.patient_name}</p>
                <p><strong>DNI/CIF:</strong> ${consentData.patient_tax_id}</p>
                <p><strong>Fecha de firma:</strong> ${new Date(consentData.signed_at).toLocaleString("es-ES")}</p>
                <p><strong>IP Address:</strong> ${consentData.ip_address}</p>
            </div>
            <div>
                <p><strong>Consentimientos aceptados:</strong></p>
                <ul>
                    <li>Tratamiento de datos: ${consentData.terms_accepted ? "✓ Sí" : "✗ No"}</li>
                    <li>Comunicaciones IA: ${consentData.document_read_understood ? "✓ Sí" : "✗ No"}</li>
                    <li>Marketing: ${consentData.marketing_notifications_accepted ? "✓ Sí" : "✗ No"}</li>
                </ul>
            </div>
        </div>
        
        ${
          consentData.signature_base64
            ? `
        <div>
            <p><strong>Firma digital:</strong></p>
            <img src="${consentData.signature_base64}" alt="Firma digital" class="signature-image" />
        </div>
        `
            : ""
        }
    </div>
    
    <div class="footer">
        <p>Documento generado el ${new Date().toLocaleString("es-ES")}</p>
        ${organizationData ? `<p>Procesado por: ${organizationData.name} - ${organizationData.tax_id}</p>` : ""}
        <p>Este documento tiene validez legal y contiene información sensible.</p>
    </div>
</body>
</html>
    `

    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="consentimiento-${consentData.patient_name.replace(/\s+/g, "-")}-${consentId}.html"`,
      },
    })
  } catch (error) {
    console.error("❌ Error downloading consent:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
