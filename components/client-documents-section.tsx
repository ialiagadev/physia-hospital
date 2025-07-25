"use client"

import type React from "react"
import type { FileObject } from "@supabase/storage-js"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Upload,
  File,
  Download,
  Trash2,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  FileSpreadsheet,
  Presentation,
  Plus,
  Loader2,
  AlertCircle,
  FolderOpen,
  Eye,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ClientDocumentsSectionProps {
  clientId: string
  clientName: string
  organizationId: string
  organizationName: string
}

interface DocumentWithUrl extends FileObject {
  signedUrl?: string | null
}

export function ClientDocumentsSection({
  clientId,
  clientName,
  organizationId,
  organizationName,
}: ClientDocumentsSectionProps) {
  const { toast } = useToast()
  const [documents, setDocuments] = useState<DocumentWithUrl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [bucketName] = useState("client-documents")
  const [dragActive, setDragActive] = useState(false)

  // Generar la ruta de la carpeta para los documentos
  const getFolderPath = useCallback(() => {
    return `${organizationId}/${clientId}`
  }, [organizationId, clientId])

  // Generar URL firmada para un archivo
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 3600) // URL válida por 1 hora

      if (error) {
        console.error("Error creating signed URL:", error)
        return null
      }

      return data.signedUrl
    } catch (error) {
      console.error("Error generating signed URL:", error)
      return null
    }
  }

  // Cargar documentos con URLs firmadas
  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const folderPath = getFolderPath()

      // Listar archivos en la carpeta
      const { data, error } = await supabase.storage.from(bucketName).list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      })

      if (error) {
        if (
          error.message.includes("Not found") ||
          error.message.includes("does not exist") ||
          error.message.includes("Bucket not found")
        ) {
          setDocuments([])
        } else {
          console.error("Error loading documents:", error)
          toast({
            title: "Error",
            description:
              "No se pudieron cargar los documentos. Asegúrate de que el bucket 'client-documents' existe en Supabase.",
            variant: "destructive",
          })
        }
        setIsLoading(false)
        return
      }

      // Generar URLs firmadas para cada archivo
      const documentsWithUrls: DocumentWithUrl[] = await Promise.all(
        (data || []).map(async (doc) => {
          const filePath = `${folderPath}/${doc.name}`
          const signedUrl = await getSignedUrl(filePath)
          return {
            ...doc,
            signedUrl,
          } as DocumentWithUrl
        }),
      )

      setDocuments(documentsWithUrls)
    } catch (error) {
      console.error("Error in loadDocuments:", error)
      toast({
        title: "Error",
        description: "Error al cargar los documentos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [clientId, organizationId])

  // Obtener icono según tipo de archivo
  const getFileIcon = (filename: string, mimetype?: string) => {
    const extension = filename.split(".").pop()?.toLowerCase()
    const mime = mimetype?.toLowerCase()

    if (mime?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension || "")) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />
    }
    if (mime?.startsWith("video/") || ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(extension || "")) {
      return <Video className="w-5 h-5 text-purple-500" />
    }
    if (mime?.startsWith("audio/") || ["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extension || "")) {
      return <Music className="w-5 h-5 text-green-500" />
    }
    if (mime?.includes("pdf") || extension === "pdf") {
      return <FileText className="w-5 h-5 text-red-500" />
    }
    if (mime?.includes("spreadsheet") || mime?.includes("excel") || ["xls", "xlsx", "csv"].includes(extension || "")) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />
    }
    if (mime?.includes("presentation") || mime?.includes("powerpoint") || ["ppt", "pptx"].includes(extension || "")) {
      return <Presentation className="w-5 h-5 text-orange-500" />
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(extension || "")) {
      return <Archive className="w-5 h-5 text-yellow-600" />
    }
    return <File className="w-5 h-5 text-gray-500" />
  }

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Subir archivo
  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
      const folderPath = getFolderPath()
      const filePath = `${folderPath}/${fileName}`

      const { error } = await supabase.storage.from(bucketName).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        console.error("Upload error:", error)
        if (error.message.includes("Bucket not found")) {
          toast({
            title: "Error de configuración",
            description: "El bucket 'client-documents' no existe. Contacta al administrador del sistema.",
            variant: "destructive",
          })
        } else {
          throw error
        }
        return
      }

      toast({
        title: "Éxito",
        description: `Archivo "${file.name}" subido correctamente`,
      })

      await loadDocuments()
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Error",
        description: `Error al subir el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Descargar archivo usando URL firmada
  const downloadFile = async (fileName: string) => {
    try {
      const folderPath = getFolderPath()
      const filePath = `${folderPath}/${fileName}`

      const { data, error } = await supabase.storage.from(bucketName).download(filePath)

      if (error) {
        throw error
      }

      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Éxito",
        description: `Archivo "${fileName}" descargado`,
      })
    } catch (error) {
      console.error("Error downloading file:", error)
      toast({
        title: "Error",
        description: "Error al descargar el archivo",
        variant: "destructive",
      })
    }
  }

  // Ver archivo en nueva pestaña usando URL firmada
  const viewFile = async (fileName: string, signedUrl?: string | null) => {
    try {
      if (signedUrl) {
        window.open(signedUrl, "_blank")
      } else {
        // Generar nueva URL firmada si no existe
        const folderPath = getFolderPath()
        const filePath = `${folderPath}/${fileName}`
        const newSignedUrl = await getSignedUrl(filePath)

        if (newSignedUrl) {
          window.open(newSignedUrl, "_blank")
        } else {
          throw new Error("No se pudo generar la URL de visualización")
        }
      }
    } catch (error) {
      console.error("Error viewing file:", error)
      toast({
        title: "Error",
        description: "Error al abrir el archivo",
        variant: "destructive",
      })
    }
  }

  // Eliminar archivo
  const deleteFile = async (fileName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`)) {
      return
    }

    try {
      const folderPath = getFolderPath()
      const filePath = `${folderPath}/${fileName}`

      const { error } = await supabase.storage.from(bucketName).remove([filePath])

      if (error) {
        throw error
      }

      toast({
        title: "Éxito",
        description: `Archivo "${fileName}" eliminado`,
      })

      await loadDocuments()
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        title: "Error",
        description: "Error al eliminar el archivo",
        variant: "destructive",
      })
    }
  }

  // Manejar drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files)
      files.forEach((file) => uploadFile(file))
    }
  }

  // Manejar selección de archivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      files.forEach((file) => uploadFile(file))
    }
  }

  return (
    <div className="space-y-6">
      {/* Zona de subida */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-500" />
            Subir Documentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                <p className="text-gray-600">Subiendo archivo...</p>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium text-gray-700">
                    Arrastra archivos aquí o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Se aceptan todos los tipos de archivo médico</p>
                </div>
                <input type="file" multiple onChange={handleFileSelect} className="hidden" id="file-upload" />
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />
                    Seleccionar Archivos
                  </label>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-orange-500" />
            Documentos de {clientName}
            <span className="ml-auto text-sm font-normal text-gray-500">
              ({documents.length} {documents.length === 1 ? "documento" : "documentos"})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No hay documentos subidos</p>
              <p className="text-sm text-gray-400 mt-1">Sube el primer documento usando el área de arriba</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(doc.name, doc.metadata?.mimetype)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{formatFileSize(doc.metadata?.size || 0)}</span>
                        <span>{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                        {doc.metadata?.mimetype && (
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{doc.metadata.mimetype}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewFile(doc.name, doc.signedUrl)}
                      title="Ver archivo"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(doc.name)}
                      title="Descargar archivo"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteFile(doc.name)}
                      className="text-red-600 hover:text-red-700"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Los documentos se almacenan de forma segura y privada, organizados por cliente. Se aceptan todos los tipos de
          archivo médico comunes (PDF, imágenes, Word, Excel, etc.). Tamaño máximo: 50MB por archivo.
        </AlertDescription>
      </Alert>
    </div>
  )
}
