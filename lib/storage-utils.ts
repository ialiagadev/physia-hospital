import { supabase } from "@/lib/supabase/client"

/**
 * Guarda una imagen base64 en Supabase Storage con organización por carpetas
 * @param base64Image Imagen en formato base64
 * @param path Ruta donde guardar la imagen (ej: 'firmas/factura-001_123.png')
 * @param organizationId ID de la organización para crear la carpeta
 * @returns URL pública de la imagen o null si hay error
 */
export async function saveBase64ImageToStorage(
  base64Image: string,
  path: string,
  organizationId?: number,
): Promise<string | null> {
  try {
    console.log("📁 STORAGE DEBUG - Iniciando saveBase64ImageToStorage")
    console.log("📁 STORAGE DEBUG - Path original:", path)
    console.log("📁 STORAGE DEBUG - Organization ID:", organizationId)

    // Verificar que la imagen base64 es válida
    if (!base64Image || !base64Image.startsWith("data:image")) {
      console.error("📁 STORAGE DEBUG - La imagen base64 no es válida")
      console.log("📁 STORAGE DEBUG - Tipo recibido:", typeof base64Image)
      console.log("📁 STORAGE DEBUG - Primeros 50 caracteres:", base64Image?.substring(0, 50))
      return null
    }

    console.log("📁 STORAGE DEBUG - Imagen base64 válida, convirtiendo a blob...")

    // Convertir base64 a Blob
    const base64Response = await fetch(base64Image)
    const blob = await base64Response.blob()

    console.log("📁 STORAGE DEBUG - Blob creado, tamaño:", blob.size, "bytes")

    // Verificar que el blob se creó correctamente
    if (!blob || blob.size === 0) {
      console.error("📁 STORAGE DEBUG - No se pudo crear un blob válido desde la imagen base64")
      return null
    }

    // Construir la ruta final con organización
    let finalPath = path
    if (organizationId) {
      // Extraer el nombre del archivo de la ruta original
      const fileName = path.split("/").pop() || "image.png"
      finalPath = `organizacion-${organizationId}/firmas/${fileName}`
    }

    console.log("📁 STORAGE DEBUG - Ruta final:", finalPath)
    console.log("📁 STORAGE DEBUG - Intentando subir a bucket 'invoices'...")

    // Subir el blob a Supabase Storage
    const { data, error } = await supabase.storage.from("invoices").upload(finalPath, blob, {
      contentType: "image/png",
      upsert: true,
    })

    if (error) {
      console.error("📁 STORAGE DEBUG - Error al subir:", error)
      console.error("📁 STORAGE DEBUG - Detalles del error:", JSON.stringify(error, null, 2))
      return null
    }

    console.log("📁 STORAGE DEBUG - Subida exitosa, data:", data)

    // Obtener la URL pública
    const { data: publicUrlData } = supabase.storage.from("invoices").getPublicUrl(finalPath)

    console.log("📁 STORAGE DEBUG - URL pública generada:", publicUrlData)

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("📁 STORAGE DEBUG - No se pudo obtener la URL pública")
      return null
    }

    console.log("📁 STORAGE DEBUG - ✅ Imagen guardada con éxito, URL:", publicUrlData.publicUrl)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error("📁 STORAGE DEBUG - Error general:", error)
    return null
  }
}

/**
 * Guarda un logo en el bucket "logos" de Supabase Storage con organización por carpetas
 * @param logoBlob Blob del logo a guardar
 * @param fileName Nombre del archivo (ej: 'logo-empresa.png')
 * @param organizationId ID de la organización para crear la carpeta
 * @returns URL pública del logo o null si hay error
 */
export async function saveLogoToStorage(
  logoBlob: Blob,
  fileName: string,
  organizationId: number,
): Promise<string | null> {
  try {
    console.log("Guardando logo en Storage:", fileName)

    if (!logoBlob || logoBlob.size === 0) {
      console.error("El blob del logo no es válido")
      return null
    }

    // Asegurarse de que el nombre del archivo tenga una extensión de imagen válida
    const validExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp"]
    const hasValidExtension = validExtensions.some((ext) => fileName.toLowerCase().endsWith(ext))
    const safeName = hasValidExtension ? fileName : `${fileName}.png`

    // Crear la ruta con la carpeta de la organización
    const path = `organizacion-${organizationId}/${safeName}`

    // Subir el blob a Supabase Storage en el bucket logos
    const { data, error } = await supabase.storage.from("logos").upload(path, logoBlob, {
      contentType: logoBlob.type || "image/png",
      upsert: true,
    })

    if (error) {
      console.error("Error al guardar el logo en Storage:", error)
      return null
    }

    // Obtener la URL pública
    const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(path)

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("No se pudo obtener la URL pública del logo")
      return null
    }

    console.log("Logo guardado con éxito, URL:", publicUrlData.publicUrl)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error("Error al guardar el logo:", error)
    return null
  }
}

/**
 * Guarda un PDF en el bucket "factura-pdf" de Supabase Storage con organización por carpetas
 * @param pdfBlob Blob del PDF a guardar
 * @param fileName Nombre del archivo (ej: 'factura-001.pdf')
 * @param organizationId ID de la organización para crear la carpeta
 * @returns URL pública del PDF o null si hay error
 */
export async function savePdfToStorage(
  pdfBlob: Blob,
  fileName: string,
  organizationId: number,
): Promise<string | null> {
  try {
    console.log("Guardando PDF en Storage:", fileName)

    if (!pdfBlob || pdfBlob.size === 0) {
      console.error("El blob del PDF no es válido")
      return null
    }

    // Asegurarse de que el nombre del archivo tenga extensión .pdf
    const safeName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`

    // Crear la ruta con la carpeta de la organización
    const path = `public/organizacion-${organizationId}/${safeName}`

    // Subir el blob a Supabase Storage en el bucket factura-pdf
    const { data, error } = await supabase.storage.from("factura-pdf").upload(path, pdfBlob, {
      contentType: "application/pdf",
      upsert: true,
    })

    if (error) {
      console.error("Error al guardar el PDF en Storage:", error)
      return null
    }

    // Obtener la URL pública
    const { data: publicUrlData } = supabase.storage.from("factura-pdf").getPublicUrl(path)

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("No se pudo obtener la URL pública del PDF")
      return null
    }

    console.log("PDF guardado con éxito, URL:", publicUrlData.publicUrl)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error("Error al guardar el PDF:", error)
    return null
  }
}

/**
 * Obtiene una imagen de Supabase Storage como base64
 * @param url URL pública de la imagen
 * @returns Imagen en formato base64 o null si hay error
 */
export async function getImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log("Obteniendo imagen como base64 desde URL:", url)

    if (!url) {
      console.error("URL de imagen no proporcionada")
      return null
    }

    // Añadir un timestamp para evitar problemas de caché
    const urlWithTimestamp = `${url}?t=${Date.now()}`

    const response = await fetch(urlWithTimestamp, {
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })

    if (!response.ok) {
      console.error(`Error al obtener la imagen: ${response.status} ${response.statusText}`)
      return null
    }

    const blob = await response.blob()

    if (!blob || blob.size === 0) {
      console.error("Se obtuvo un blob vacío o inválido")
      return null
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        if (!result) {
          console.error("FileReader no produjo un resultado")
          reject(new Error("FileReader no produjo un resultado"))
          return
        }
        console.log("Imagen convertida a base64 correctamente")
        resolve(result)
      }
      reader.onerror = (error) => {
        console.error("Error al leer el blob:", error)
        reject(error)
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Error al obtener la imagen como base64:", error)
    return null
  }
}

/**
 * Elimina un archivo de Supabase Storage
 * @param bucket Nombre del bucket
 * @param path Ruta del archivo a eliminar
 * @returns true si se eliminó correctamente, false si hubo error
 */
export async function deleteFileFromStorage(bucket: string, path: string): Promise<boolean> {
  try {
    console.log(`Eliminando archivo de ${bucket}:`, path)

    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      console.error("Error al eliminar archivo:", error)
      return false
    }

    console.log("Archivo eliminado correctamente")
    return true
  } catch (error) {
    console.error("Error al eliminar archivo:", error)
    return false
  }
}

/**
 * Lista archivos de una organización específica en un bucket
 * @param bucket Nombre del bucket
 * @param organizationId ID de la organización
 * @param prefix Prefijo adicional para filtrar archivos (opcional)
 * @returns Lista de archivos o array vacío si hay error
 */
export async function listOrganizationFiles(bucket: string, organizationId: number, prefix?: string): Promise<any[]> {
  try {
    const folderPath = `organizacion-${organizationId}`
    const searchPath = prefix ? `${folderPath}/${prefix}` : folderPath

    console.log(`Listando archivos de ${bucket} para organización ${organizationId}:`, searchPath)

    const { data, error } = await supabase.storage.from(bucket).list(searchPath)

    if (error) {
      console.error("Error al listar archivos:", error)
      return []
    }

    console.log(`Se encontraron ${data?.length || 0} archivos`)
    return data || []
  } catch (error) {
    console.error("Error al listar archivos:", error)
    return []
  }
}
