"use server"

import { supabase } from "@/lib/supabase/client"
import type { ClientImportData } from "@/utils/file-parser"

export interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  duplicates: string[]
}

export async function importClients(clientsData: ClientImportData[], organizationId: number): Promise<ImportResult> {
  const errors: string[] = []
  const duplicates: string[] = []
  let imported = 0

  try {
    // Verificar duplicados en la base de datos
    const taxIds = clientsData.map((client) => client.tax_id)
    const { data: existingClients } = await supabase.from("clients").select("tax_id, name").in("tax_id", taxIds)

    const existingTaxIds = new Set(existingClients?.map((c) => c.tax_id) || [])

    // Filtrar clientes que no existen
    const newClients = clientsData.filter((client) => {
      if (existingTaxIds.has(client.tax_id)) {
        duplicates.push(`${client.name} (${client.tax_id}) ya existe en la base de datos`)
        return false
      }
      return true
    })

    // Verificar duplicados dentro del mismo archivo
    const seenTaxIds = new Set<string>()
    const uniqueClients = newClients.filter((client) => {
      if (seenTaxIds.has(client.tax_id)) {
        duplicates.push(`${client.name} (${client.tax_id}) está duplicado en el archivo`)
        return false
      }
      seenTaxIds.add(client.tax_id)
      return true
    })

    // Procesar en lotes de 50
    const batchSize = 50
    for (let i = 0; i < uniqueClients.length; i += batchSize) {
      const batch = uniqueClients.slice(i, i + batchSize)

      const clientsToInsert = batch.map((client) => ({
        organization_id: organizationId,
        name: client.name,
        tax_id: client.tax_id,
        address: client.address || null,
        postal_code: client.postal_code || null,
        city: client.city || null,
        province: client.province || null,
        country: client.country || "España",
        email: client.email || null,
        phone: client.phone || null,
        client_type: client.client_type || "private",
        dir3_codes: null, // Los códigos DIR3 se pueden añadir después manualmente si es necesario
      }))

      const { data, error } = await supabase.from("clients").insert(clientsToInsert).select("id")

      if (error) {
        errors.push(`Error en lote ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      } else {
        imported += data?.length || 0
      }
    }
  } catch (error) {
    errors.push(`Error general: ${error instanceof Error ? error.message : "Error desconocido"}`)
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
    duplicates,
  }
}
