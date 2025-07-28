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
  private static readonly DEFAULT_EXPIRY = 3600 // 1 hora

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

      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          error: "Usuario no autenticado",
        }
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const extension = file.name.split(".").pop()
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`

      // Crear ruta: organizationId/expenseId/fileName o organizationId/temp/fileName
      const folder = expenseId ? expenseId.toString() : "temp"
      const filePath = `${organizationId}/${folder}/${fileName}`

      // Subir archivo con autenticación
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

      // Generar URL firmada para acceso inmediato
      const signedUrl = await this.getSignedUrl(filePath)

      return {
        success: true,
        path: filePath,
        url: signedUrl || undefined,
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
      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.error("Usuario no autenticado")
        return false
      }

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
      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return {
          success: false,
          error: "Usuario no autenticado",
        }
      }

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

      // Generar nueva URL firmada
      const signedUrl = await this.getSignedUrl(newPath)

      return {
        success: true,
        path: newPath,
        url: signedUrl || undefined,
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
   * Obtiene una URL firmada con expiración para bucket privado
   */
  static async getSignedUrl(filePath: string, expiresIn = this.DEFAULT_EXPIRY): Promise<string | null> {
    try {
      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.error("Usuario no autenticado")
        return null
      }

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
   * Obtiene una URL firmada para descarga
   */
  static async getDownloadUrl(filePath: string): Promise<string | null> {
    return this.getSignedUrl(filePath, 300) // 5 minutos para descarga
  }

  /**
   * Verifica si un archivo existe
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(filePath.substring(0, filePath.lastIndexOf("/")), {
          search: filePath.split("/").pop(),
        })

      return !error && data && data.length > 0
    } catch (error) {
      console.error("Error checking file existence:", error)
      return false
    }
  }

  /**
   * Lista archivos en una carpeta específica
   */
  static async listFiles(organizationId: number, expenseId?: number): Promise<string[]> {
    try {
      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return []
      }

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
      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return
      }

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

  /**
   * Valida que el usuario tenga acceso a un archivo específico
   */
  static async validateUserAccess(filePath: string, organizationId: number): Promise<boolean> {
    try {
      // Verificar que la ruta del archivo corresponde a la organización del usuario
      const pathParts = filePath.split("/")
      const fileOrgId = Number.parseInt(pathParts[0])

      return fileOrgId === organizationId
    } catch (error) {
      console.error("Error validating user access:", error)
      return false
    }
  }

  /**
   * Regenera una URL firmada si ha expirado
   */
  static async refreshSignedUrl(filePath: string): Promise<string | null> {
    return this.getSignedUrl(filePath)
  }
}
