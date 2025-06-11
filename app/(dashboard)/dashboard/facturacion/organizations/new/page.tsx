"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { uploadImage } from "@/lib/image-utils"
import { Upload, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Función para generar prefijo automático basado en el nombre
const generateInvoicePrefix = (organizationName: string): string => {
  if (!organizationName) return "FACT"

  // Eliminar palabras comunes y caracteres especiales
  const commonWords = [
    "s.l.",
    "sl",
    "s.a.",
    "sa",
    "ltda",
    "ltd",
    "inc",
    "corp",
    "sociedad",
    "limitada",
    "anonima",
    "centro",
    "clinica",
    "hospital",
    "consultorio",
    "y",
    "de",
    "del",
    "la",
    "el",
    "los",
    "las",
  ]

  const cleanName = organizationName
    .toLowerCase()
    .replace(/[^a-záéíóúñü\s]/g, "") // Eliminar caracteres especiales
    .split(" ")
    .filter((word) => word.length > 0 && !commonWords.includes(word))
    .slice(0, 2) // Tomar máximo 2 palabras
    .map((word) => word.substring(0, 2)) // Tomar 2 letras de cada palabra
    .join("")
    .toUpperCase()

  // Si el resultado es muy corto, usar las primeras 4 letras del nombre original
  if (cleanName.length < 3) {
    return (
      organizationName
        .replace(/[^a-záéíóúñü]/gi, "")
        .substring(0, 4)
        .toUpperCase() || "FACT"
    )
  }

  return cleanName.substring(0, 4) // Máximo 4 caracteres
}

export default function NewOrganizationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    tax_id: "",
    address: "",
    postal_code: "",
    city: "",
    province: "",
    country: "España",
    email: "",
    phone: "",
    invoice_prefix: "FACT",
  })

  const { toast } = useToast()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }

      // Si cambió el nombre, generar nuevo prefijo automáticamente
      if (name === "name" && value.trim()) {
        newData.invoice_prefix = generateInvoicePrefix(value)
      }

      return newData
    })
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar que es una imagen
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (JPEG, PNG, etc.)")
      return
    }

    // Verificar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no debe superar los 2MB")
      return
    }

    setLogoFile(file)

    // Crear una URL para previsualizar la imagen
    const previewUrl = URL.createObjectURL(file)
    setLogoPreview(previewUrl)

    // Limpiar cualquier error previo
    setError(null)
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log("Intentando crear organización:", formData)

      // Verificar conexión a Supabase
      try {
        const { data: testData, error: testError } = await supabase.from("organizations").select("id").limit(1)

        if (testError) {
          console.error("Error de conexión a Supabase:", testError)
          throw new Error(`Error de conexión a Supabase: ${testError.message}`)
        }

        console.log("Conexión a Supabase exitosa")
      } catch (connectionError) {
        console.error("Error al verificar la conexión:", connectionError)
        throw new Error(
          `Error al verificar la conexión: ${connectionError instanceof Error ? connectionError.message : String(connectionError)}`,
        )
      }

      // Variable para almacenar la URL del logo
      let logoUrl: string | null = null

      // Si hay un logo, subirlo a Supabase Storage
      if (logoFile) {
        try {
          const timestamp = Date.now()
          const path = `logos/${formData.tax_id.replace(/[^a-zA-Z0-9]/g, "")}_${timestamp}.${logoFile.name.split(".").pop()}`

          logoUrl = await uploadImage(logoFile, path)

          if (!logoUrl) {
            console.warn("No se pudo subir el logo, continuando sin logo")
          } else {
            console.log("Logo subido exitosamente:", logoUrl)
          }
        } catch (logoError) {
          console.error("Error al subir el logo:", logoError)
          // Continuamos sin logo en caso de error
          logoUrl = null
        }
      }

      // Crear la organización
      const orgData = {
        name: formData.name,
        tax_id: formData.tax_id,
        address: formData.address,
        postal_code: formData.postal_code,
        city: formData.city,
        province: formData.province,
        country: formData.country,
        email: formData.email || null,
        phone: formData.phone || null,
        invoice_prefix: formData.invoice_prefix,
        last_invoice_number: 0,
        active: true,
        subscription_tier: "basic",
      }

      // Añadir logo_url solo si existe
      if (logoUrl) {
        // @ts-ignore - Ignoramos el error de TypeScript porque sabemos que la columna existe
        orgData.logo_url = logoUrl
      }

      const { data, error: insertError } = await supabase.from("organizations").insert(orgData).select().single()

      if (insertError) {
        console.error("Error al insertar organización:", insertError)
        throw new Error(insertError.message)
      }

      console.log("Organización creada exitosamente:", data)

      toast({
        title: "Organización creada",
        description: "La organización se ha creado correctamente",
      })

      router.push("/dashboard/organizations")
      router.refresh()
    } catch (err) {
      console.error("Error completo:", err)
      setError(err instanceof Error ? err.message : "Error al crear la organización")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Nueva Organización</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información de la organización</CardTitle>
            <CardDescription>Introduce los datos de tu empresa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre o Razón Social</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_id">CIF/NIF</Label>
              <Input id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo de la empresa</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload size={16} />
                  Subir logo
                </Button>
                <Input
                  id="logo"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <span className="text-sm text-muted-foreground">
                  {logoFile ? logoFile.name : "Ningún archivo seleccionado"}
                </span>
              </div>

              {logoPreview && (
                <div className="mt-4 relative">
                  <div className="relative w-40 h-40 border rounded-md overflow-hidden">
                    <Image
                      src={logoPreview || "/placeholder.svg"}
                      alt="Logo preview"
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0 bg-background rounded-full"
                    onClick={handleRemoveLogo}
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2">
                Formatos aceptados: JPEG, PNG, GIF. Tamaño máximo: 2MB.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Textarea id="address" name="address" value={formData.address} onChange={handleChange} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" name="city" value={formData.city} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input id="province" name="province" value={formData.province} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" name="country" value={formData.country} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Prefijo de Factura</Label>
              <div className="flex gap-2">
                <Input
                  id="invoice_prefix"
                  name="invoice_prefix"
                  value={formData.invoice_prefix}
                  onChange={handleChange}
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      invoice_prefix: generateInvoicePrefix(formData.name),
                    }))
                  }
                  disabled={!formData.name.trim()}
                >
                  Auto
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Este prefijo se utilizará para generar los números de factura (ej: {formData.invoice_prefix}0001)
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/organizations")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Organización"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
