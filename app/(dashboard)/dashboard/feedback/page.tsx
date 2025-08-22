"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/contexts/auth-context"
import { supabase } from "@/lib/supabase/client"
import { uploadFile } from "@/lib/storage-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Bug, Lightbulb, Settings, Edit, Trash2, X, Heart, MessageSquare, Camera } from "lucide-react"

interface Feedback {
  id: string
  title: string
  description: string
  type: "bug" | "improvement" | "feature" | "change" | "other"
  images: string[]
  created_at: string
  updated_at: string
  user_id: string
}

const typeIcons = {
  bug: Bug,
  improvement: Lightbulb,
  feature: Plus,
  change: Settings,
  other: Edit,
}

const typeLabels = {
  bug: "Bug",
  improvement: "Mejora",
  feature: "Nueva Funcionalidad",
  change: "Cambio",
  other: "Otro",
}

const typeColors = {
  bug: "bg-red-100 text-red-800 border-red-200",
  improvement: "bg-blue-100 text-blue-800 border-blue-200",
  feature: "bg-green-100 text-green-800 border-green-200",
  change: "bg-purple-100 text-purple-800 border-purple-200",
  other: "bg-gray-100 text-gray-800 border-gray-200",
}

export default function FeedbackPage() {
  const { userProfile, isLoading: authLoading } = useAuth()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null)
  const [uploading, setUploading] = useState(false)

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
    setTimeout(() => setNotification(null), 5000)
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "improvement",
      images: [],
    })
    setEditingFeedback(null)
  }

  const loadFeedbacks = async () => {
    if (!userProfile?.organization_id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("organization_id", userProfile.organization_id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setFeedbacks(data || [])
    } catch (err: any) {
      console.error("Error loading feedback:", err)
      setError("Error al cargar el feedback")
    } finally {
      setLoading(false)
    }
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

    try {
      const feedbackData = {
        ...formData,
        organization_id: userProfile.organization_id,
        user_id: userProfile.id,
      }

      if (editingFeedback) {
        const { error } = await supabase.from("feedback").update(feedbackData).eq("id", editingFeedback.id)

        if (error) throw error
        showNotification("success", "Feedback actualizado correctamente")
      } else {
        const { error } = await supabase.from("feedback").insert([feedbackData])

        if (error) throw error
        showNotification("success", "Feedback creado correctamente")
      }

      setIsDialogOpen(false)
      resetForm()
      loadFeedbacks()
    } catch (err: any) {
      console.error("Error saving feedback:", err)
      showNotification("error", "Error al guardar el feedback")
    }
  }

  const handleEdit = (feedback: Feedback) => {
    setEditingFeedback(feedback)
    setFormData({
      title: feedback.title,
      description: feedback.description,
      type: feedback.type,
      images: feedback.images || [],
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este feedback?")) return

    try {
      const { error } = await supabase.from("feedback").delete().eq("id", id)

      if (error) throw error
      showNotification("success", "Feedback eliminado correctamente")
      loadFeedbacks()
    } catch (err: any) {
      console.error("Error deleting feedback:", err)
      showNotification("error", "Error al eliminar el feedback")
    }
  }

  useEffect(() => {
    if (!authLoading && userProfile) {
      loadFeedbacks()
    }
  }, [userProfile, authLoading])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-500 bg-red-50">
        <Bug className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-6 py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Centro de Feedback
          </h1>
          <div className="max-w-3xl mx-auto space-y-4">
            <p className="text-xl text-gray-600 leading-relaxed">
              En <span className="font-semibold text-blue-600">HealthMate</span>, siempre buscamos mejorar y adaptarnos
              a las necesidades de nuestros clientes. Tu opinión es fundamental para crear la mejor experiencia posible.
            </p>
            <p className="text-lg text-gray-500">
              Comparte tus ideas, reporta problemas o sugiere mejoras. Cada comentario nos ayuda a construir una
              plataforma más robusta y útil para ti y tu organización.
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 pt-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Feedback seguro</span>
              </div>
              <div className="flex items-center space-x-2">
                <Camera className="h-4 w-4" />
                <span>Con capturas</span>
              </div>
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4" />
                <span>Siempre escuchamos</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border p-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Tus Comentarios</h2>
            <p className="text-gray-600 mt-1">Gestiona y revisa todo tu feedback en un solo lugar</p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {editingFeedback ? "Editar Feedback" : "Nuevo Feedback"}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Describe tu sugerencia, bug o mejora con el mayor detalle posible. Incluye capturas si es necesario.
                </DialogDescription>
              </DialogHeader>
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
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={uploading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {editingFeedback ? "Actualizar" : "Crear"} Feedback
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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

        <div className="grid gap-6">
          {feedbacks.length === 0 ? (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                  <Lightbulb className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">¡Comparte tu primera idea!</h3>
                <p className="text-gray-600 text-center mb-6 max-w-md">
                  Tu feedback es valioso para nosotros. Sé el primero en compartir una sugerencia, reportar un bug o
                  proponer una mejora.
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer feedback
                </Button>
              </CardContent>
            </Card>
          ) : (
            feedbacks.map((feedback) => {
              const TypeIcon = typeIcons[feedback.type]

              return (
                <Card
                  key={feedback.id}
                  className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                          <TypeIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-xl font-semibold text-gray-900 mb-2">{feedback.title}</CardTitle>
                          <CardDescription className="text-gray-500">
                            {new Date(feedback.created_at).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(feedback)}
                          className="hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(feedback.id)}
                          className="hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center mt-3">
                      <Badge className={`${typeColors[feedback.type]} font-medium`}>{typeLabels[feedback.type]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-6 leading-relaxed">{feedback.description}</p>

                    {feedback.images && feedback.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {feedback.images.map((url, index) => (
                          <div key={index} className="group cursor-pointer">
                            <img
                              src={url || "/placeholder.svg"}
                              alt={`Captura ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-300 group-hover:shadow-md transition-all duration-300"
                              onClick={() => window.open(url, "_blank")}
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg?height=128&width=200&text=Error+cargando+imagen"
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
