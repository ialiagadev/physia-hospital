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

    // Obtener configuración de la organización
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("last_invoice_number, invoice_prefix, invoice_padding_length")
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
    const last_invoice_number = orgData.last_invoice_number || 0

    let newInvoiceNumber = 1
    let invoiceNumberFormatted = ""

    switch (invoiceType) {
      case "rectificativa": {
        // Para rectificativas: buscar el último número con formato REC + año
        const currentYear = new Date().getFullYear()
        const rectPrefix = `REC${currentYear}`

        const { data: lastRectInvoice, error: rectError } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("organization_id", organizationId)
          .eq("invoice_type", "rectificativa")
          .like("invoice_number", `${rectPrefix}%`)
          .order("invoice_number", { ascending: false })
          .limit(1)

        if (rectError) {
          console.error("Error al buscar facturas rectificativas:", rectError)
        }

        if (lastRectInvoice && lastRectInvoice.length > 0) {
          // Extraer el número de la última factura rectificativa
          const lastNumber = lastRectInvoice[0].invoice_number.replace(rectPrefix, "")
          newInvoiceNumber = Number.parseInt(lastNumber) + 1
        } else {
          // Si no hay facturas rectificativas, empezar desde 1
          newInvoiceNumber = 1
        }

        const paddedNumber = newInvoiceNumber.toString().padStart(invoice_padding_length, "0")
        invoiceNumberFormatted = `${rectPrefix}${paddedNumber}`
        break
      }

      case "simplificada": {
        // Para simplificadas: buscar el último número con formato SIMP
        const simpPrefix = "SIMP"

        const { data: lastSimpInvoice, error: simpError } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("organization_id", organizationId)
          .eq("invoice_type", "simplificada")
          .like("invoice_number", `${simpPrefix}%`)
          .order("invoice_number", { ascending: false })
          .limit(1)

        if (simpError) {
          console.error("Error al buscar facturas simplificadas:", simpError)
        }

        if (lastSimpInvoice && lastSimpInvoice.length > 0) {
          // Extraer el número de la última factura simplificada
          const lastNumber = lastSimpInvoice[0].invoice_number.replace(simpPrefix, "")
          newInvoiceNumber = Number.parseInt(lastNumber) + 1
        } else {
          // Si no hay facturas simplificadas, empezar desde 1
          newInvoiceNumber = 1
        }

        const paddedNumber = newInvoiceNumber.toString().padStart(invoice_padding_length, "0")
        invoiceNumberFormatted = `${simpPrefix}${paddedNumber}`
        break
      }

      case "normal":
      default: {
        // Para normales: buscar el último número con el prefijo de la organización
        const { data: lastNormalInvoice, error: normalError } = await supabase
          .from("invoices")
          .select("invoice_number")
          .eq("organization_id", organizationId)
          .eq("invoice_type", "normal")
          .like("invoice_number", `${invoice_prefix}%`)
          .order("invoice_number", { ascending: false })
          .limit(1)

        if (normalError) {
          console.error("Error al buscar facturas normales:", normalError)
        }

        if (lastNormalInvoice && lastNormalInvoice.length > 0) {
          // Extraer el número de la última factura normal
          const lastNumber = lastNormalInvoice[0].invoice_number.replace(invoice_prefix, "")
          const extractedNumber = Number.parseInt(lastNumber)
          newInvoiceNumber = extractedNumber + 1
        } else {
          // Si no hay facturas normales, usar el número inicial de la organización + 1
          newInvoiceNumber = last_invoice_number + 1
        }

        const paddedNumber = newInvoiceNumber.toString().padStart(invoice_padding_length, "0")
        invoiceNumberFormatted = `${invoice_prefix}${paddedNumber}`
        break
      }
    }

    console.log(`✅ Número generado: ${invoiceNumberFormatted}`)

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
