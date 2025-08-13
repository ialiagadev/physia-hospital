import { supabase } from "@/lib/supabase/client"

export interface UploadResult {
  success: boolean
  path?: string
  url?: string
  publicUrl?: string
  error?: string
}

export class StorageService {
  private static readonly BUCKET_NAME = "expense-receipts"
  private static readonly CHAT_BUCKET_NAME = "logos"
  private static readonly MAX_FILE_SIZE = 16 * 1024 * 1024 // 16MB para WhatsApp
  private static readonly EXPENSE_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB para gastos
  private static readonly ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/zip",
    "application/x-rar-compressed",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ]
  private static readonly DEFAULT_EXPIRY = 3600 // 1 hora

  /**
   * Verifica si el bucket existe y lo crea si no existe (usando API route)
   */
  private static async ensureBucketExists(bucketName: string, isPublic = true): Promise<boolean> {
    try {
      const response = await fetch("/api/storage/ensure-bucket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketName,
          isPublic,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`❌ Error en API ensure-bucket:`, errorData)
        return false
      }

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error(`💥 Error llamando a API ensure-bucket:`, error)
      return false
    }
  }

  /**
   * Sube un archivo para chat usando el bucket público "logos"
   */
  static async uploadFile(file: File): Promise<UploadResult> {
    try {

      // Validar tipo de archivo
      if (!this.ALLOWED_TYPES.includes(file.type)) {
        return {
          success: false,
          error:
            "Tipo de archivo no permitido. Solo se permiten imágenes, PDFs, documentos de texto, archivos comprimidos, audio y video.",
        }
      }

      // Validar tamaño (16MB para WhatsApp)
      if (file.size > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: "El archivo es demasiado grande. Máximo 16MB.",
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

      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(7)
      const extension = file.name.split(".").pop()
      const fileName = `${timestamp}-${randomString}.${extension}`
      const filePath = `chat-media/${user.id}/${fileName}`


      const { data, error } = await supabase.storage.from(this.CHAT_BUCKET_NAME).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      })

      if (error) {
        console.error("❌ Error uploading file:", error)
        return {
          success: false,
          error: "Error al subir el archivo: " + error.message,
        }
      }


      const { data: publicUrlData } = supabase.storage.from(this.CHAT_BUCKET_NAME).getPublicUrl(filePath)


      return {
        success: true,
        path: filePath,
        publicUrl: publicUrlData.publicUrl,
        url: publicUrlData.publicUrl, // Para compatibilidad
      }
    } catch (error) {
      console.error("💥 Error in uploadFile:", error)
      return {
        success: false,
        error: "Error inesperado al subir el archivo",
      }
    }
  }

  /**
   * Sube un archivo de recibo/factura para un gasto
   */
  static async uploadExpenseReceipt(file: File, organizationId: number, expenseId?: number): Promise<UploadResult> {
    try {
      // Validar tipo de archivo (más restrictivo para gastos)
      const allowedExpenseTypes = ["image/jpeg", "image/png", "application/pdf"]
      if (!allowedExpenseTypes.includes(file.type)) {
        return {
          success: false,
          error: "Tipo de archivo no permitido. Solo se permiten JPG, PNG y PDF.",
        }
      }

      // Validar tamaño
      if (file.size > this.EXPENSE_MAX_FILE_SIZE) {
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
   * Elimina un archivo de chat
   */
  static async deleteFile(filePath: string, bucketName: string = this.CHAT_BUCKET_NAME): Promise<boolean> {
    try {
      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.error("Usuario no autenticado")
        return false
      }

      const { error } = await supabase.storage.from(bucketName).remove([filePath])

      if (error) {
        console.error("Error deleting file:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error in deleteFile:", error)
      return false
    }
  }

  /**
   * Elimina un archivo de recibo/factura
   */
  static async deleteExpenseReceipt(filePath: string): Promise<boolean> {
    return this.deleteFile(filePath, this.BUCKET_NAME)
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
   * Obtiene una URL pública para archivos de chat
   */
  static getPublicUrl(filePath: string, bucketName: string = this.CHAT_BUCKET_NAME): string {
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath)
    return data.publicUrl
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
  static async fileExists(filePath: string, bucketName: string = this.CHAT_BUCKET_NAME): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
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
   * Lista archivos de chat de un usuario
   */
  static async listChatFiles(userId: string, folder = "chat-media"): Promise<string[]> {
    try {
      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return []
      }

      const userFolder = `${folder}/${userId}`

      const { data, error } = await supabase.storage.from(this.CHAT_BUCKET_NAME).list(userFolder)

      if (error) {
        console.error("Error listing chat files:", error)
        return []
      }

      return data?.map((file) => `${userFolder}/${file.name}`) || []
    } catch (error) {
      console.error("Error in listChatFiles:", error)
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
   * Limpia archivos de chat antiguos (más de 30 días)
   */
  static async cleanupOldChatFiles(userId: string, folder = "chat-media"): Promise<void> {
    try {
      // Verificar autenticación
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || user.id !== userId) {
        return
      }

      const userFolder = `${folder}/${userId}`

      const { data, error } = await supabase.storage.from(this.CHAT_BUCKET_NAME).list(userFolder)

      if (error || !data) {
        return
      }

      const now = Date.now()
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

      const filesToDelete = data
        .filter((file) => {
          const createdAt = new Date(file.created_at).getTime()
          return createdAt < thirtyDaysAgo
        })
        .map((file) => `${userFolder}/${file.name}`)

      if (filesToDelete.length > 0) {
        await supabase.storage.from(this.CHAT_BUCKET_NAME).remove(filesToDelete)
      }
    } catch (error) {
      console.error("Error in cleanupOldChatFiles:", error)
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
   * Valida que el usuario tenga acceso a un archivo de chat
   */
  static async validateChatFileAccess(filePath: string, userId: string): Promise<boolean> {
    try {
      // Verificar que la ruta del archivo corresponde al usuario
      const pathParts = filePath.split("/")
      if (pathParts.length < 2) return false

      const fileUserId = pathParts[1] // chat-media/userId/filename
      return fileUserId === userId
    } catch (error) {
      console.error("Error validating chat file access:", error)
      return false
    }
  }

  /**
   * Regenera una URL firmada si ha expirado
   */
  static async refreshSignedUrl(filePath: string): Promise<string | null> {
    return this.getSignedUrl(filePath)
  }

  /**
   * Obtiene información de un archivo
   */
  static async getFileInfo(filePath: string, bucketName: string = this.CHAT_BUCKET_NAME) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(filePath.substring(0, filePath.lastIndexOf("/")), {
          search: filePath.split("/").pop(),
        })

      if (error || !data || data.length === 0) {
        return null
      }

      return data[0]
    } catch (error) {
      console.error("Error getting file info:", error)
      return null
    }
  }
}

// Exportar función directa para compatibilidad
export const uploadFile = StorageService.uploadFile.bind(StorageService)
export const deleteFile = StorageService.deleteFile.bind(StorageService)
export const getPublicUrl = StorageService.getPublicUrl.bind(StorageService)
export const fileExists = StorageService.fileExists.bind(StorageService)
