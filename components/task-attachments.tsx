"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Paperclip, Download, Trash2, File, ImageIcon, FileText } from "lucide-react"
import { toast } from "sonner"

export type Adjunto = {
  id: number
  nombre: string
  tipo: string
  tamaño: number
  url: string
  fechaSubida: Date
  subidoPor: string
}

interface TaskAttachmentsProps {
  adjuntos: Adjunto[]
  onAddAttachment: (archivo: File) => void
  onDeleteAttachment: (id: number) => void
}

export function TaskAttachments({ adjuntos, onAddAttachment, onDeleteAttachment }: TaskAttachmentsProps) {
  const [arrastrando, setArrastrando] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const archivo = files[0]
      if (archivo.size > 10 * 1024 * 1024) {
        // 10MB límite
        toast.error("El archivo es demasiado grande (máximo 10MB)")
        return
      }
      onAddAttachment(archivo)
      event.target.value = "" // Limpiar input
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setArrastrando(false)

    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      const archivo = files[0]
      if (archivo.size > 10 * 1024 * 1024) {
        toast.error("El archivo es demasiado grande (máximo 10MB)")
        return
      }
      onAddAttachment(archivo)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setArrastrando(true)
  }

  const handleDragLeave = () => {
    setArrastrando(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (tipo: string) => {
    if (tipo.startsWith("image/")) return ImageIcon
    if (tipo.includes("pdf") || tipo.includes("document")) return FileText
    return File
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        <h4 className="font-medium">Archivos Adjuntos</h4>
        <Badge variant="secondary">{adjuntos.length}</Badge>
      </div>

      {/* Zona de subida */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          arrastrando ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">Arrastra archivos aquí o haz clic para seleccionar</p>
        <Input
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xlsx,.xls"
        />
        <Button variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>
          Seleccionar Archivo
        </Button>
        <p className="text-xs text-gray-500 mt-1">Máximo 10MB - PDF, DOC, IMG, TXT, XLS</p>
      </div>

      {/* Lista de archivos */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {adjuntos.map((adjunto) => {
          const IconoArchivo = getFileIcon(adjunto.tipo)

          return (
            <Card key={adjunto.id} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center gap-3">
                  <IconoArchivo className="h-8 w-8 text-gray-500 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{adjunto.nombre}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatFileSize(adjunto.tamaño)}</span>
                      <span>•</span>
                      <span>{adjunto.fechaSubida.toLocaleDateString("es-ES")}</span>
                      <span>•</span>
                      <span>{adjunto.subidoPor}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        // Simular descarga
                        const link = document.createElement("a")
                        link.href = adjunto.url
                        link.download = adjunto.nombre
                        link.click()
                        toast.success("Descargando archivo...")
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={() => onDeleteAttachment(adjunto.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {adjuntos.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">No hay archivos adjuntos</div>
        )}
      </div>
    </div>
  )
}
