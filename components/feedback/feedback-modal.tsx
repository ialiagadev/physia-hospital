"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import { uploadFile } from "@/lib/storage-service"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, MessageSquare } from "lucide-react"

const typeLabels = {
  bug: "Bug",
  improvement: "Mejora",
  feature: "Nueva Funcionalidad",
  change: "Cambio",
  other: "Otro",
}

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { userProfile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState<{
    title: string
    description: string
    type: "bug" | "improvement" | "feature" | "change" | "other"
    images: string[]
  }>({
    title: "",
    description: "",
    type: "improvement",
    images: [],
  })

  const [notification, setNotification] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 3000)
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "improvement",
      images: [],
    })
    setNotification(null)
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const uploadedUrls: string[] = []

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          showNotification("error", "Solo se permiten archivos de imagen")
          continue
        }

        if (file.size > 16 * 1024 * 1024) {
          showNotification("error", "El archivo es demasiado grande (máximo 16MB)")
          continue
        }

        const uploadResult = await uploadFile(file)

        if (uploadResult.success && uploadResult.publicUrl) {
          uploadedUrls.push(uploadResult.publicUrl)
        } else {
          throw new Error(uploadResult.error || "Upload failed")
        }
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }))

      if (uploadedUrls.length > 0) {
        showNotification("success", `${uploadedUrls.length} imagen(es) subida(s) correctamente`)
      }
    } catch (err: any) {
      showNotification("error", `Error al subir las imágenes: ${err.message || "Error desconocido"}`)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile?.organization_id) return

    setSubmitting(true)
    try {
      const feedbackData = {
        ...formData,
        organization_id: userProfile.organization_id,
        user_id: userProfile.id,
      }

      const { error } = await supabase.from("feedback").insert([feedbackData])

      if (error) throw error

      showNotification("success", "¡Feedback enviado correctamente! Gracias por tu aportación.")

      setTimeout(() => {
        resetForm()
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error("Error saving feedback:", err)
      showNotification("error", "Error al enviar el feedback")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <DialogTitle className="text-xl font-semibold">Enviar Feedback</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600">
            Comparte tu sugerencia, reporta un bug o propón una mejora. Tu opinión nos ayuda a mejorar.
          </DialogDescription>
        </DialogHeader>

        {notification && (
          <Alert
            className={`${
              notification.type === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
            } shadow-sm`}
          >
            <AlertDescription className={notification.type === "success" ? "text-green-800" : "text-red-800"}>
              {notification.message}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Título
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Describe brevemente el feedback"
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Tipo
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: "bug" | "improvement" | "feature" | "change" | "other") =>
                setFormData((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe detalladamente tu feedback..."
              rows={4}
              className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="images" className="text-sm font-medium">
              Capturas de pantalla (opcional)
            </Label>
            <div className="mt-2">
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploading}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              {uploading && (
                <p className="text-sm text-blue-600 mt-2 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Subiendo imágenes...
                </p>
              )}
            </div>

            {formData.images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url || "/placeholder.svg"}
                      alt={`Captura ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg?height=128&width=200&text=Error+cargando+imagen"
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={uploading || submitting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {submitting ? "Enviando..." : "Enviar Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
