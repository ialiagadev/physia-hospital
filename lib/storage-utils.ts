import { supabase } from "@/lib/supabase"

/**
 * Guarda una imagen base64 en Supabase Storage
 * @param base64Image Imagen en formato base64
 * @param path Ruta donde guardar la imagen (ej: 'signatures/123.png')
 * @returns URL pública de la imagen o null si hay error
 */
export async function saveBase64ImageToStorage(base64Image: string, path: string): Promise<string | null> {
  try {
    console.log("Guardando imagen base64 en Storage:", path)

    // Verificar que la imagen base64 es válida
    if (!base64Image || !base64Image.startsWith("data:image")) {
      console.error("La imagen base64 no es válida")
      return null
    }

    // Convertir base64 a Blob
    const base64Response = await fetch(base64Image)
    const blob = await base64Response.blob()

    // Verificar que el blob se creó correctamente
    if (!blob || blob.size === 0) {
      console.error("No se pudo crear un blob válido desde la imagen base64")
      return null
    }

    // Asegurarse de que la ruta comienza con 'signatures/'
    const safePath = path.startsWith("signatures/") ? path : `signatures/${path}`

    // Eliminar la verificación del bucket que está causando problemas
    // y simplemente intentar subir el archivo directamente

    // Subir el blob a Supabase Storage
    const { data, error } = await supabase.storage.from("invoices").upload(safePath, blob, {
      contentType: "image/png",
      upsert: true,
    })

    if (error) {
      console.error("Error al guardar la imagen en Storage:", error)
      return null
    }

    // Obtener la URL pública
    const { data: publicUrlData } = supabase.storage.from("invoices").getPublicUrl(safePath)

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error("No se pudo obtener la URL pública")
      return null
    }

    console.log("Imagen guardada con éxito, URL:", publicUrlData.publicUrl)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error("Error al procesar la imagen:", error)
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
 * Guarda un PDF en el bucket "factura-pdf" de Supabase Storage
 * @param pdfBlob Blob del PDF a guardar
 * @param fileName Nombre del archivo (ej: 'factura-001.pdf')
 * @returns URL pública del PDF o null si hay error
 */
export async function savePdfToStorage(pdfBlob: Blob, fileName: string): Promise<string | null> {
  try {
    console.log("Guardando PDF en Storage:", fileName)

    if (!pdfBlob || pdfBlob.size === 0) {
      console.error("El blob del PDF no es válido")
      return null
    }

    // Asegurarse de que el nombre del archivo tenga extensión .pdf
    const safeName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`

    // Ruta en el bucket factura-pdf
    const path = `public/${safeName}`

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
