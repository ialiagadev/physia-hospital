import { supabase } from "@/lib/supabase/client"

export interface OrganizationData {
  id: number
  name: string
  tax_id: string
  address?: string
  city: string
  province?: string
  postal_code?: string
  email?: string
  phone?: string
  website?: string
  logo_url?: string
}

export class OrganizationDataService {
  // ✅ CAMBIO: Mantener el método pero ya no se usa en el flujo principal
  static async getOrganizationById(organizationId: number): Promise<OrganizationData | null> {
    try {
      console.log("🔍 OrganizationDataService - Fetching organization:", organizationId)

      const { data, error } = await supabase.from("organizations").select("*").eq("id", organizationId).single()

      if (error) {
        console.error("❌ OrganizationDataService - Error fetching organization:", error)
        return null
      }

      console.log("✅ OrganizationDataService - Organization fetched:", {
        id: data.id,
        name: data.name,
        tax_id: data.tax_id,
      })

      return data
    } catch (error) {
      console.error("❌ OrganizationDataService - Error in getOrganizationById:", error)
      return null
    }
  }

  static replaceOrganizationPlaceholders(content: string, organizationData: OrganizationData): string {
    if (!content || !organizationData) {
      console.log("❌ OrganizationDataService - Missing content or organization data")
      return content
    }

    console.log("🔍 OrganizationDataService - Replacing placeholders for:", {
      organizationName: organizationData.name,
      contentLength: content.length,
    })

    let processedContent = content

    // ✅ PLACEHOLDERS EN MAYÚSCULAS (como están en tu contenido)
    const placeholders = {
      "{{ORGANIZATION_NAME}}": organizationData.name || "",
      "{{ORGANIZATION_TAX_ID}}": organizationData.tax_id || "",
      "{{ORGANIZATION_ADDRESS}}": organizationData.address || "",
      "{{ORGANIZATION_CITY}}": organizationData.city || "",
      "{{ORGANIZATION_PROVINCE}}": organizationData.province || "",
      "{{ORGANIZATION_POSTAL_CODE}}": organizationData.postal_code || "",
      "{{ORGANIZATION_EMAIL}}": organizationData.email || "",
      "{{ORGANIZATION_PHONE}}": organizationData.phone || "",
      "{{ORGANIZATION_WEBSITE}}": organizationData.website || "",
      "{{ORGANIZATION_COUNTRY}}": "España", // Valor por defecto

      // Placeholders alternativos (minúsculas por compatibilidad)
      "{{organization_name}}": organizationData.name || "",
      "{{organization_tax_id}}": organizationData.tax_id || "",
      "{{organization_address}}": organizationData.address || "",
      "{{organization_city}}": organizationData.city || "",
      "{{organization_province}}": organizationData.province || "",
      "{{organization_postal_code}}": organizationData.postal_code || "",
      "{{organization_email}}": organizationData.email || "",
      "{{organization_phone}}": organizationData.phone || "",
      "{{organization_website}}": organizationData.website || "",
      "{{organization_country}}": "España",

      // Placeholders en español
      "{{nombre_organizacion}}": organizationData.name || "",
      "{{cif_organizacion}}": organizationData.tax_id || "",
      "{{direccion_organizacion}}": organizationData.address || "",
      "{{ciudad_organizacion}}": organizationData.city || "",
      "{{email_organizacion}}": organizationData.email || "",
      "{{telefono_organizacion}}": organizationData.phone || "",
    }

    // Contar placeholders encontrados para logging
    let replacedCount = 0
    const foundPlaceholders: string[] = []

    // Reemplazar todos los placeholders
    Object.entries(placeholders).forEach(([placeholder, value]) => {
      // Usar expresión regular global para reemplazar todas las ocurrencias
      const regex = new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "gi")
      const matches = processedContent.match(regex)
      if (matches) {
        replacedCount += matches.length
        foundPlaceholders.push(`${placeholder} (${matches.length}x)`)
        processedContent = processedContent.replace(regex, value)
      }
    })

    // Placeholder especial para dirección completa
    const fullAddress = [
      organizationData.address,
      organizationData.city,
      organizationData.province,
      organizationData.postal_code,
    ]
      .filter(Boolean)
      .join(", ")

    const fullAddressPlaceholders = [
      "{{ORGANIZATION_FULL_ADDRESS}}",
      "{{organization_full_address}}",
      "{{direccion_completa}}",
    ]

    fullAddressPlaceholders.forEach((placeholder) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "gi")
      const matches = processedContent.match(regex)
      if (matches) {
        replacedCount += matches.length
        foundPlaceholders.push(`${placeholder} (${matches.length}x)`)
        processedContent = processedContent.replace(regex, fullAddress)
      }
    })

    console.log("✅ OrganizationDataService - Placeholders replacement completed:", {
      totalReplacements: replacedCount,
      contentChanged: processedContent !== content,
      organizationName: organizationData.name,
      foundPlaceholders: foundPlaceholders,
      originalLength: content.length,
      processedLength: processedContent.length,
    })

    return processedContent
  }

  static getAvailablePlaceholders(): string[] {
    return [
      "{{ORGANIZATION_NAME}} / {{organization_name}} / {{nombre_organizacion}}",
      "{{ORGANIZATION_TAX_ID}} / {{organization_tax_id}} / {{cif_organizacion}}",
      "{{ORGANIZATION_ADDRESS}} / {{organization_address}} / {{direccion_organizacion}}",
      "{{ORGANIZATION_CITY}} / {{organization_city}} / {{ciudad_organizacion}}",
      "{{ORGANIZATION_PROVINCE}} / {{organization_province}}",
      "{{ORGANIZATION_POSTAL_CODE}} / {{organization_postal_code}}",
      "{{ORGANIZATION_EMAIL}} / {{organization_email}} / {{email_organizacion}}",
      "{{ORGANIZATION_PHONE}} / {{organization_phone}} / {{telefono_organizacion}}",
      "{{ORGANIZATION_WEBSITE}} / {{organization_website}}",
      "{{ORGANIZATION_COUNTRY}} / {{organization_country}}",
      "{{ORGANIZATION_FULL_ADDRESS}} / {{organization_full_address}} / {{direccion_completa}}",
    ]
  }
}
