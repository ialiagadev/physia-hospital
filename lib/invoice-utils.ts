import { supabase } from "@/lib/supabase"

/**
 * Genera un número de factura único verificando en todas las organizaciones
 * @param organizationId ID de la organización
 * @param prefix Prefijo para el número de factura
 * @returns Objeto con el número de factura formateado y el nuevo número
 */
export async function generateUniqueInvoiceNumber(
  organizationId: number,
  prefix: string,
): Promise<{ invoiceNumberFormatted: string; newInvoiceNumber: number }> {
  // Obtener la organización actual
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("last_invoice_number")
    .eq("id", organizationId)
    .single()

  if (error || !organization) {
    throw new Error("No se pudo obtener la información de la organización")
  }

  // Iniciar con el último número usado más 1
  let newInvoiceNumber = organization.last_invoice_number + 1
  let invoiceNumberFormatted = `${prefix}${newInvoiceNumber.toString().padStart(4, "0")}`
  let isUnique = false
  let attempts = 0
  const maxAttempts = 1000 // Límite para evitar bucles infinitos

  // Buscar un número único
  while (!isUnique && attempts < maxAttempts) {
    const { data: exists } = await supabase
      .from("invoices")
      .select("id")
      .eq("invoice_number", invoiceNumberFormatted)
      .limit(1)

    if (!exists || exists.length === 0) {
      isUnique = true
    } else {
      newInvoiceNumber++
      invoiceNumberFormatted = `${prefix}${newInvoiceNumber.toString().padStart(4, "0")}`
      attempts++
    }
  }

  if (!isUnique) {
    throw new Error("No se pudo generar un número de factura único")
  }

  // Ya no actualizamos aquí el último número usado en la organización
  // porque lo haremos en el componente que llama a esta función

  return { invoiceNumberFormatted, newInvoiceNumber }
}
