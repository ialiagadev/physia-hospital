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
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
    "image/x-icon", // .ico
    "image/vnd.microsoft.icon", // .ico alternative

    // Documents - PDF
    "application/pdf",

    // Documents - Microsoft Office (Legacy)
    "application/msword", // .doc
    "application/vnd.ms-excel", // .xls
    "application/vnd.ms-powerpoint", // .ppt
    "application/vnd.ms-access", // .mdb
    "application/vnd.ms-project", // .mpp

    // Documents - Microsoft Office (Modern)
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "application/vnd.openxmlformats-officedocument.wordprocessingml.template", // .dotx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.template", // .xltx
    "application/vnd.openxmlformats-officedocument.presentationml.template", // .potx

    // Documents - Text formats
    "text/plain", // .txt
    "text/rtf", // .rtf
    "text/csv", // .csv
    "application/csv", // .csv alternative
    "text/tab-separated-values", // .tsv
    "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
    "application/vnd.ms-excel.template.macroEnabled.12", // .xltm

    // Documents - OpenDocument formats
    "application/vnd.oasis.opendocument.text", // .odt
    "application/vnd.oasis.opendocument.spreadsheet", // .ods
    "application/vnd.oasis.opendocument.presentation", // .odp
    "application/vnd.oasis.opendocument.graphics", // .odg
    "application/vnd.oasis.opendocument.chart", // .odc
    "application/vnd.oasis.opendocument.formula", // .odf
    "application/vnd.oasis.opendocument.database", // .odb
    "application/vnd.oasis.opendocument.image", // .odi

    // Documents - Other formats
    "application/vnd.google-earth.kml+xml", // .kml
    "application/vnd.google-earth.kmz", // .kmz
    "application/x-iwork-pages-sffpages", // .pages
    "application/x-iwork-numbers-sffnumbers", // .numbers
    "application/x-iwork-keynote-sffkey", // .key

    // Archives and Compressed files
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed", // .7z
    "application/x-tar", // .tar
    "application/gzip", // .gz
    "application/x-bzip2", // .bz2
    "application/x-xz", // .xz
    "application/x-compress", // .Z
    "application/x-lzh-compressed", // .lzh
    "application/x-ace-compressed", // .ace
    "application/x-arj", // .arj
    "application/x-cab", // .cab
    "application/vnd.ms-cab-compressed", // .cab alternative

    // Data and Configuration files
    "application/json",
    "application/xml",
    "text/xml",
    "application/yaml", // .yaml
    "text/yaml", // .yml
    "application/x-yaml", // .yaml alternative
    "text/x-yaml", // .yml alternative
    "application/toml", // .toml
    "text/x-ini", // .ini
    "application/x-wine-extension-ini", // .ini alternative

    // Programming and Markup
    "text/html", // .html
    "text/css", // .css
    "text/javascript", // .js
    "application/javascript", // .js alternative
    "application/x-javascript", // .js alternative
    "text/x-python", // .py
    "text/x-java-source", // .java
    "text/x-c", // .c
    "text/x-c++", // .cpp
    "text/x-csharp", // .cs
    "text/x-php", // .php
    "application/x-php", // .php alternative
    "text/x-sql", // .sql
    "application/sql", // .sql alternative

    // Audio formats (WhatsApp compatible prioritized)
    "audio/ogg", // .ogg (puede contener Opus o Vorbis) - PRIORITARIO para WhatsApp
    "audio/mpeg", // .mp3 - COMPATIBLE con WhatsApp
    "audio/aac", // .aac - COMPATIBLE con WhatsApp
    "audio/amr", // .amr - COMPATIBLE con WhatsApp
    "audio/wav", // .wav
    "audio/opus", // .opus (WhatsApp voice notes)
    "audio/mp4", // .m4a
    "audio/x-m4a", // .m4a alternativo
    "audio/webm", // .webm audio
    "audio/flac", // .flac
    "audio/x-flac", // .flac alternative
    "audio/x-wav", // .wav alternative
    "audio/vnd.wave", // .wav alternative

    // Video formats
    "video/mp4",
    "video/webm",
    "video/quicktime", // .mov
    "video/avi",
    "video/x-msvideo", // .avi alternative
    "video/3gpp", // .3gp
    "video/x-ms-wmv", // .wmv
    "video/mkv", // .mkv
    "video/x-matroska", // .mkv alternative
    "video/x-flv", // .flv
    "video/mp2t", // .ts
    "video/x-m4v", // .m4v

    // eBook formats
    "application/epub+zip", // .epub
    "application/x-mobipocket-ebook", // .mobi
    "application/vnd.amazon.ebook", // .azw
    "application/x-fictionbook+xml", // .fb2

    // CAD and Design files
    "application/acad", // .dwg
    "image/vnd.dwg", // .dwg alternative
    "application/dxf", // .dxf
    "image/vnd.dxf", // .dxf alternative
    "application/postscript", // .ps
    "application/illustrator", // .ai
    "image/x-photoshop", // .psd
    "application/x-photoshop", // .psd alternative

    // Font files
    "font/ttf", // .ttf
    "font/otf", // .otf
    "font/woff", // .woff
    "font/woff2", // .woff2
    "application/font-woff", // .woff alternative
    "application/font-woff2", // .woff2 alternative
    "application/vnd.ms-fontobject", // .eot
  ]

  private static readonly DEFAULT_EXPIRY = 3600 // 1 hora

  /**
   * Verifica si un tipo MIME es permitido, manejando códecs especificados
   */
  private static isFileTypeAllowed(mimeType: string): boolean {
    const baseType = mimeType.split(";")[0].trim()
    return this.ALLOWED_TYPES.includes(baseType)
  }

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
      console.log(`✅ Bucket '${bucketName}' verificado/creado exitosamente`)
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
      console.log("📤 Iniciando subida de archivo:", file.name, "Tamaño:", file.size, "Tipo:", file.type)

      if (!this.isFileTypeAllowed(file.type)) {
        return {
          success: false,
          error:
            "Tipo de archivo no permitido. Se permiten imágenes, documentos de Office, PDF, CSV, Excel, PowerPoint, archivos comprimidos, audio, video, eBooks, fuentes y muchos otros formatos comunes.",
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

      console.log("📁 Ruta del archivo:", filePath)

      const uploadOptions: any = {
        cacheControl: "3600",
        upsert: false,
      }

      if (file.type.startsWith("audio/")) {
        const baseType = file.type.split(";")[0].trim()
        if (baseType === "audio/ogg") {
          uploadOptions.contentType = "audio/ogg; codecs=opus" // WhatsApp voice notes format
        } else if (baseType === "audio/mpeg") {
          uploadOptions.contentType = "audio/mpeg" // MP3
        } else if (baseType === "audio/aac") {
          uploadOptions.contentType = "audio/aac" // AAC
        } else if (baseType === "audio/amr") {
          uploadOptions.contentType = "audio/amr" // AMR
        } else {
          uploadOptions.contentType = file.type
        }
      } else if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        // Para imágenes y videos especificar el contentType
        uploadOptions.contentType = file.type
      } else {
        // Para documentos dejar que Supabase detecte automáticamente
        uploadOptions.contentType = undefined
      }

      const { data, error } = await supabase.storage.from(this.CHAT_BUCKET_NAME).upload(filePath, file, uploadOptions)

      if (error) {
        console.error("❌ Error uploading file:", error)
        return {
          success: false,
          error: "Error al subir el archivo: " + error.message,
        }
      }

      console.log("✅ Archivo subido exitosamente:", data.path)

      const { data: publicUrlData } = supabase.storage.from(this.CHAT_BUCKET_NAME).getPublicUrl(filePath)

      console.log("🔗 URL pública generada:", publicUrlData.publicUrl)

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
        console.log(`🧹 Limpiados ${filesToDelete.length} archivos antiguos de chat`)
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
