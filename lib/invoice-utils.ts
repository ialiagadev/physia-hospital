import { supabase } from "@/lib/supabase/client"
import type { InvoiceType } from "./invoice-types"

export async function generateUniqueInvoiceNumber(
  organizationId: number,
  invoiceType: InvoiceType = "normal",
): Promise<{ invoiceNumberFormatted: string; newInvoiceNumber: number }> {
  console.log(`🔢 Generando número único para organización ${organizationId}, tipo: ${invoiceType}`)

  try {
    if (!organizationId) {
      throw new Error("ID de organización no válido")
    }

    // Verificar que supabase está disponible
    if (!supabase) {
      throw new Error("Cliente de Supabase no está disponible")
    }

    // Obtener configuración de la organización (solo para prefijo y padding)
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("invoice_prefix, invoice_padding_length")
      .eq("id", organizationId)
      .single()

    if (orgError) {
      console.error("Error al obtener datos de organización:", orgError)
      throw new Error(`No se pudo obtener la configuración de numeración: ${orgError.message}`)
    }

    if (!orgData) {
      console.error("No se encontró la organización con ID:", organizationId)
      throw new Error(`No se encontró la organización con ID: ${organizationId}`)
    }

    // Valores por defecto
    const invoice_prefix = orgData.invoice_prefix || "FACT"
    const invoice_padding_length = orgData.invoice_padding_length || 4

    let invoiceNumberFormatted = ""
    let newInvoiceNumber = 1

    switch (invoiceType) {
      case "rectificativa": {
        // Para rectificativas: buscar la última del año actual
        const currentYear = new Date().getFullYear()
        const { data: lastRectificativa, error: rectError } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("organization_id", organizationId)
          .eq("invoice_type", "rectificativa")
          .like("invoice_number", `REC${currentYear}%`)
          .order("created_at", { ascending: false })
          .limit(1)

        if (rectError) {
          console.error("Error al consultar facturas rectificativas:", rectError)
          throw new Error(`Error al consultar facturas rectificativas: ${rectError.message}`)
        }

        if (lastRectificativa && lastRectificativa.length > 0) {
          // Extraer el número de la última rectificativa (ej: REC20250005 -> 5)
          const lastNumber = lastRectificativa[0].invoice_number
          const match = lastNumber.match(/REC\d{4}(\d+)$/)
          if (match) {
            newInvoiceNumber = parseInt(match[1]) + 1
          }
        }

        const paddedNumber = newInvoiceNumber.toString().padStart(invoice_padding_length, "0")
        invoiceNumberFormatted = `REC${currentYear}${paddedNumber}`
        break
      }

      case "simplificada": {
        // Para simplificadas: buscar la última
        const { data: lastSimplificada, error: simpError } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("organization_id", organizationId)
          .eq("invoice_type", "simplificada")
          .like("invoice_number", "SIMP%")
          .order("created_at", { ascending: false })
          .limit(1)

        if (simpError) {
          console.error("Error al consultar facturas simplificadas:", simpError)
          throw new Error(`Error al consultar facturas simplificadas: ${simpError.message}`)
        }

        if (lastSimplificada && lastSimplificada.length > 0) {
          // Extraer el número de la última simplificada (ej: SIMP0005 -> 5)
          const lastNumber = lastSimplificada[0].invoice_number
          const match = lastNumber.match(/SIMP(\d+)$/)
          if (match) {
            newInvoiceNumber = parseInt(match[1]) + 1
          }
        }

        const paddedNumber = newInvoiceNumber.toString().padStart(invoice_padding_length, "0")
        invoiceNumberFormatted = `SIMP${paddedNumber}`
        break
      }

      case "normal":
      default: {
        // Para normales: buscar la última con el prefijo de la organización
        const { data: lastNormal, error: normalError } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("organization_id", organizationId)
          .eq("invoice_type", "normal")
          .like("invoice_number", `${invoice_prefix}%`)
          .order("created_at", { ascending: false })
          .limit(1)

        if (normalError) {
          console.error("Error al consultar facturas normales:", normalError)
          throw new Error(`Error al consultar facturas normales: ${normalError.message}`)
        }

        if (lastNormal && lastNormal.length > 0) {
          // Extraer el número de la última normal (ej: FACT0010 -> 10)
          const lastNumber = lastNormal[0].invoice_number
          const match = lastNumber.match(new RegExp(`${invoice_prefix}(\\d+)$`))
          if (match) {
            newInvoiceNumber = parseInt(match[1]) + 1
          }
        }

        const paddedNumber = newInvoiceNumber.toString().padStart(invoice_padding_length, "0")
        invoiceNumberFormatted = `${invoice_prefix}${paddedNumber}`
        break
      }
    }

    console.log(`✅ Número generado: ${invoiceNumberFormatted} (siguiente: ${newInvoiceNumber})`)

    return {
      invoiceNumberFormatted,
      newInvoiceNumber,
    }
  } catch (error) {
    console.error("Error en generateUniqueInvoiceNumber:", error)
    throw error
  }
}

/**
 * Sube una imagen al bucket de Supabase Storage
 * @param file Archivo a subir
 * @param path Ruta donde se guardará el archivo (ej: 'logos/empresa-1.png')
 * @returns URL pública de la imagen o null si hay error
 */
export async function uploadImage(file: File, path: string): Promise<string | null> {
  try {
    // Verificar que el archivo es una imagen
    if (!file.type.startsWith("image/")) {
      throw new Error("El archivo debe ser una imagen")
    }

    // Limitar el tamaño a 2MB
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("La imagen no debe superar los 2MB")
    }

    // Subir el archivo a Supabase Storage
    const { data, error } = await supabase.storage.from("logos").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (error) {
      console.error("Error al subir la imagen:", error)
      throw error
    }

    // Obtener la URL pública
    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error("Error en uploadImage:", error)
    return null
  }
}

/**
 * Sube una imagen en formato base64 al bucket de Supabase Storage
 * @param base64Image Imagen en formato base64
 * @param path Ruta donde se guardará el archivo
 * @returns URL pública de la imagen o null si hay error
 */
export async function uploadBase64Image(base64Image: string, path: string): Promise<string | null> {
  try {
    // Convertir base64 a Blob
    const base64Response = await fetch(base64Image)
    const blob = await base64Response.blob()

    // Crear un archivo a partir del blob
    const file = new File([blob], path.split("/").pop() || "image.png", { type: blob.type })

    // Usar la función uploadImage para subir el archivo
    return await uploadImage(file, path)
  } catch (error) {
    console.error("Error en uploadBase64Image:", error)
    return null
  }
}

/**
 * Elimina una imagen del bucket de Supabase Storage
 * @param path Ruta de la imagen a eliminar
 * @returns true si se eliminó correctamente, false si hubo error
 */
export async function deleteImage(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from("logos").remove([path])

    if (error) {
      console.error("Error al eliminar la imagen:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error en deleteImage:", error)
    return false
  }
}