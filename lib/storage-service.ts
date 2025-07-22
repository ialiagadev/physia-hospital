import { supabase } from "@/lib/supabase/client"

export interface UploadResult {
  success: boolean
  path?: string
  url?: string
  error?: string
}

export class StorageService {
  private static readonly BUCKET_NAME = "expense-receipts"
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  private static readonly ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"]

  /**
   * Sube un archivo de recibo/factura para un gasto
   */
  static async uploadExpenseReceipt(file: File, organizationId: number, expenseId?: number): Promise<UploadResult> {
    try {
      // Validar tipo de archivo
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        return {
          success: false,
          error: "Tipo de archivo no permitido. Solo se permiten JPG, PNG y PDF.",
        }
      }

      // Validar tamaño
      if (file.size > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: "El archivo es demasiado grande. Máximo 5MB.",
        }
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const extension = file.name.split(".").pop()
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`

      // Crear ruta: organizationId/expenseId/fileName o organizationId/temp/fileName
      const folder = expenseId ? expenseId.toString() : "temp"
      const filePath = `${organizationId}/${folder}/${fileName}`

      // Subir archivo
      const { data, error } = await supabase.storage.from(this.BUCKET_NAME).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        console.error("Error uploading file:", error)
        return {
          success: false,
          error: "Error al subir el archivo: " + error.message,
        }
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(filePath)

      return {
        success: true,
        path: filePath,
        url: urlData.publicUrl,
      }
    } catch (error) {
      console.error("Error in uploadExpenseReceipt:", error)
      return {
        success: false,
        error: "Error inesperado al subir el archivo",
      }
    }
  }

  /**
   * Elimina un archivo de recibo/factura
   */
  static async deleteExpenseReceipt(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from(this.BUCKET_NAME).remove([filePath])

      if (error) {
        console.error("Error deleting file:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in deleteExpenseReceipt:", error)
      return false
    }
  }

  /**
   * Mueve un archivo de la carpeta temporal a la carpeta del gasto
   */
  static async moveExpenseReceipt(tempPath: string, organizationId: number, expenseId: number): Promise<UploadResult> {
    try {
      // Extraer el nombre del archivo de la ruta temporal
      const fileName = tempPath.split("/").pop()
      if (!fileName) {
        return {
          success: false,
          error: "Ruta de archivo inválida",
        }
      }

      // Nueva ruta
      const newPath = `${organizationId}/${expenseId}/${fileName}`

      // Mover archivo
      const { data, error } = await supabase.storage.from(this.BUCKET_NAME).move(tempPath, newPath)

      if (error) {
        console.error("Error moving file:", error)
        return {
          success: false,
          error: "Error al mover el archivo: " + error.message,
        }
      }

      // Obtener nueva URL
      const { data: urlData } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(newPath)

      return {
        success: true,
        path: newPath,
        url: urlData.publicUrl,
      }
    } catch (error) {
      console.error("Error in moveExpenseReceipt:", error)
      return {
        success: false,
        error: "Error inesperado al mover el archivo",
      }
    }
  }

  /**
   * Obtiene la URL pública de un archivo
   */
  static getPublicUrl(filePath: string): string {
    const { data } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(filePath)
    return data.publicUrl
  }

  /**
   * Obtiene una URL firmada con expiración
   */
  static async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage.from(this.BUCKET_NAME).createSignedUrl(filePath, expiresIn)

      if (error) {
        console.error("Error creating signed URL:", error)
        return null
      }

      return data.signedUrl
    } catch (error) {
      console.error("Error in getSignedUrl:", error)
      return null
    }
  }

  /**
   * Lista archivos en una carpeta específica
   */
  static async listFiles(organizationId: number, expenseId?: number): Promise<string[]> {
    try {
      const folder = expenseId ? `${organizationId}/${expenseId}` : `${organizationId}/temp`

      const { data, error } = await supabase.storage.from(this.BUCKET_NAME).list(folder)

      if (error) {
        console.error("Error listing files:", error)
        return []
      }

      return data?.map((file) => `${folder}/${file.name}`) || []
    } catch (error) {
      console.error("Error in listFiles:", error)
      return []
    }
  }

  /**
   * Limpia archivos temporales antiguos (más de 24 horas)
   */
  static async cleanupTempFiles(organizationId: number): Promise<void> {
    try {
      const tempFolder = `${organizationId}/temp`

      const { data, error } = await supabase.storage.from(this.BUCKET_NAME).list(tempFolder)

      if (error || !data) {
        return
      }

      const now = Date.now()
      const oneDayAgo = now - 24 * 60 * 60 * 1000

      const filesToDelete = data
        .filter((file) => {
          const createdAt = new Date(file.created_at).getTime()
          return createdAt < oneDayAgo
        })
        .map((file) => `${tempFolder}/${file.name}`)

      if (filesToDelete.length > 0) {
        await supabase.storage.from(this.BUCKET_NAME).remove(filesToDelete)
      }
    } catch (error) {
      console.error("Error in cleanupTempFiles:", error)
    }
  }
}
