// lib/image-utils.ts
import { supabase } from "@/lib/supabase"

export async function uploadImage(file: File, path: string): Promise<string | null> {
  try {
    if (!file.type.startsWith("image/")) {
      throw new Error("El archivo debe ser una imagen")
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new Error("La imagen no debe superar los 2MB")
    }

    const { data, error } = await supabase.storage.from("logos").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    })

    if (error) {
      console.error("Error al subir la imagen:", error)
      throw error
    }

    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(data.path)
    return urlData.publicUrl
  } catch (error) {
    console.error("Error en uploadImage:", error)
    return null
  }
}

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