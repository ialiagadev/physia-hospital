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
    // Verificar duplicados en la base de datos por NIF/CIF
    const taxIds = clientsData.map((client) => client.tax_id)
    const { data: existingClientsByTaxId } = await supabase.from("clients").select("tax_id, name").in("tax_id", taxIds)

    const existingTaxIds = new Set(existingClientsByTaxId?.map((c) => c.tax_id) || [])

    // Verificar duplicados por teléfono (solo para teléfonos válidos)
    const validPhones = clientsData.map((client) => client.phone).filter((phone) => phone && phone.length > 6)

    let existingPhones = new Set<string>()
    if (validPhones.length > 0) {
      const { data: existingClientsByPhone } = await supabase
        .from("clients")
        .select("phone, name")
        .in("phone", validPhones)

      existingPhones = new Set(existingClientsByPhone?.map((c) => c.phone).filter(Boolean) || [])
    }

    // Filtrar clientes que no existen
    const newClients = clientsData.filter((client) => {
      // Verificar duplicado por NIF/CIF
      if (existingTaxIds.has(client.tax_id)) {
        duplicates.push(`${client.name} (${client.tax_id}) ya existe en la base de datos`)
        return false
      }

      // Verificar duplicado por teléfono
      if (client.phone && existingPhones.has(client.phone)) {
        duplicates.push(`${client.name} (teléfono: ${client.phone}) ya existe en la base de datos`)
        return false
      }

      return true
    })

    // Verificar duplicados dentro del mismo archivo
    const seenTaxIds = new Set<string>()
    const seenPhones = new Set<string>()
    const uniqueClients = newClients.filter((client) => {
      if (seenTaxIds.has(client.tax_id)) {
        duplicates.push(`${client.name} (${client.tax_id}) está duplicado en el archivo`)
        return false
      }
      seenTaxIds.add(client.tax_id)

      if (client.phone && seenPhones.has(client.phone)) {
        duplicates.push(`${client.name} (teléfono: ${client.phone}) está duplicado en el archivo`)
        return false
      }
      if (client.phone) {
        seenPhones.add(client.phone)
      }

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
        birth_date: client.birth_date || null,
        gender: client.gender || null,
        dir3_codes: null,
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
