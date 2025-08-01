"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { uploadImage, deleteImage } from "@/lib/image-utils"
import { Loader2, Upload, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Save, AlertTriangle, CheckCircle } from "lucide-react"

interface Organization {
  id: number
  name: string
  tax_id: string
  address: string
  postal_code: string
  city: string
  province: string
  country: string
  email: string | null
  phone: string | null
  logo_url: string | null
  invoice_prefix: string
  invoice_format: string
  invoice_padding_length: number
  invoice_number_format: string
}

interface Center {
  id: number
  name: string
  address: string | null
  phone: string | null
  email: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export default function EditOrganizationPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados para centros
  const [centers, setCenters] = useState<Center[]>([])
  const [loadingCenters, setLoadingCenters] = useState(false)
  const [centerDialogOpen, setCenterDialogOpen] = useState(false)
  const [editingCenter, setEditingCenter] = useState<Center | null>(null)
  const [centerForm, setCenterForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    active: true,
  })
  const [centersLoaded, setCentersLoaded] = useState(false)

  // Estados para diálogos
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [centerToDelete, setCenterToDelete] = useState<number | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        // Cargar organización y centros en paralelo
        const [orgResult, centersResult] = await Promise.all([
          supabase.from("organizations").select("*").eq("id", params.id).single(),
          supabase
            .from("centers")
            .select("*")
            .eq("organization_id", params.id)
            .order("created_at", { ascending: false }),
        ])

        if (orgResult.error) {
          throw orgResult.error
        }

        setOrganization(orgResult.data)
        if (orgResult.data.logo_url) {
          setLogoPreview(orgResult.data.logo_url)
        }

        // Cargar centros sin mostrar error si falla
        if (!centersResult.error) {
          setCenters(centersResult.data || [])
          setCentersLoaded(true)
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Error al cargar la organización: ${error.message}`,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [params.id, toast])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "El archivo debe ser una imagen (JPG, PNG, SVG)",
        variant: "destructive",
      })
      return
    }

    // Validar tamaño (2MB máximo)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar los 2MB",
        variant: "destructive",
      })
      return
    }

    setLogoFile(file)
    setRemoveLogo(false)

    // Crear URL para previsualización
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const updatedOrg: any = {
        name: formData.get("name"),
        tax_id: formData.get("tax_id"),
        address: formData.get("address"),
        postal_code: formData.get("postal_code"),
        city: formData.get("city"),
        province: formData.get("province"),
        country: formData.get("country"),
        email: formData.get("email") || null,
        phone: formData.get("phone") || null,
        invoice_prefix: formData.get("invoice_prefix"),
      }

      // Manejar el logo
      let logoUrl = organization?.logo_url || null

      // Si hay un nuevo logo, subirlo
      if (logoFile) {
        const timestamp = Date.now()
        const logoPath = `org-${params.id}/logo-${timestamp}.${logoFile.name.split(".").pop()}`
        logoUrl = await uploadImage(logoFile, logoPath)

        if (!logoUrl) {
          throw new Error("Error al subir el logo")
        }
      }

      // Si se ha marcado para eliminar el logo
      if (removeLogo) {
        // Si había un logo anterior, eliminarlo del storage
        if (organization?.logo_url) {
          // Extraer el path del logo de la URL
          const logoPath = organization.logo_url.split("/").slice(-2).join("/")
          await deleteImage(logoPath)
        }
        logoUrl = null
      }

      // Actualizar la organización con la nueva URL del logo
      updatedOrg.logo_url = logoUrl

      const { error } = await supabase.from("organizations").update(updatedOrg).eq("id", params.id)

      if (error) throw error

      // Mostrar diálogo de éxito en lugar del toast
      setSuccessDialogOpen(true)

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error al guardar los cambios: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const loadCenters = async () => {
    try {
      setLoadingCenters(true)
      const { data, error } = await supabase
        .from("centers")
        .select("*")
        .eq("organization_id", params.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setCenters(data || [])
      setCentersLoaded(true)
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error al cargar los centros: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoadingCenters(false)
    }
  }

  const openCenterDialog = (center?: Center) => {
    if (center) {
      setEditingCenter(center)
      setCenterForm({
        name: center.name,
        address: center.address || "",
        phone: center.phone || "",
        email: center.email || "",
        active: center.active,
      })
    } else {
      setEditingCenter(null)
      setCenterForm({
        name: "",
        address: "",
        phone: "",
        email: "",
        active: true,
      })
    }
    setCenterDialogOpen(true)
  }

  const handleCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const centerData = {
        organization_id: Number.parseInt(params.id),
        name: centerForm.name,
        address: centerForm.address || null,
        phone: centerForm.phone || null,
        email: centerForm.email || null,
        active: centerForm.active,
        updated_at: new Date().toISOString(),
      }

      if (editingCenter) {
        const { error } = await supabase.from("centers").update(centerData).eq("id", editingCenter.id)

        if (error) throw error

        toast({
          title: "Centro actualizado",
          description: "El centro se ha actualizado correctamente",
        })
      } else {
        const { error } = await supabase.from("centers").insert(centerData)

        if (error) throw error

        toast({
          title: "Centro creado",
          description: "El centro se ha creado correctamente",
        })
      }

      setCenterDialogOpen(false)
      setCentersLoaded(false)
      loadCenters()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error al guardar el centro: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCenter = (centerId: number) => {
    setCenterToDelete(centerId)
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteCenter = async () => {
    if (!centerToDelete) return

    try {
      const { error } = await supabase.from("centers").delete().eq("id", centerToDelete)

      if (error) throw error

      toast({
        title: "Centro eliminado",
        description: "El centro se ha eliminado correctamente",
      })

      setCentersLoaded(false)
      loadCenters()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error al eliminar el centro: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setDeleteConfirmOpen(false)
      setCenterToDelete(null)
    }
  }

  const toggleCenterStatus = async (center: Center) => {
    try {
      const { error } = await supabase
        .from("centers")
        .update({ active: !center.active, updated_at: new Date().toISOString() })
        .eq("id", center.id)

      if (error) throw error

      toast({
        title: center.active ? "Centro desactivado" : "Centro activado",
        description: `El centro se ha ${center.active ? "desactivado" : "activado"} correctamente`,
      })

      setCentersLoaded(false)
      loadCenters()
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error al cambiar el estado del centro: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Organizaciones", href: "/dashboard/organizations" },
            { label: "Editar", href: "#" },
          ]}
        />
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Organizaciones", href: "/dashboard/organizations" },
            { label: "Editar", href: "#" },
          ]}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground">No se encontró la organización</p>
            <Button onClick={() => router.push("/dashboard/organizations")} className="mt-4">
              Volver
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Organizaciones", href: "/dashboard/organizations" },
          { label: organization?.name || "Editar", href: "#" },
        ]}
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Información General</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Editar Organización</CardTitle>
                <CardDescription>Actualiza los datos de tu organización</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre o Razón Social</Label>
                    <Input id="name" name="name" defaultValue={organization?.name} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_id">CIF/NIF</Label>
                    <Input id="tax_id" name="tax_id" defaultValue={organization?.tax_id} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Textarea id="address" name="address" defaultValue={organization?.address} required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Código Postal</Label>
                    <Input id="postal_code" name="postal_code" defaultValue={organization?.postal_code} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" name="city" defaultValue={organization?.city} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province">Provincia</Label>
                    <Input id="province" name="province" defaultValue={organization?.province} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <Input id="country" name="country" defaultValue={organization?.country || "España"} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={organization?.email || ""} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" defaultValue={organization?.phone || ""} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_prefix">Prefijo de Factura</Label>
                  <Input
                    id="invoice_prefix"
                    name="invoice_prefix"
                    defaultValue={organization?.invoice_prefix}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Este prefijo se utilizará para generar los números de factura (ej: FACT0001)
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Logo de la organización</Label>
                  <p className="text-sm text-muted-foreground">
                    Este logo aparecerá en tus facturas y documentos. Formatos aceptados: JPG, PNG, SVG. Tamaño máximo:
                    2MB.
                  </p>

                  <div className="flex flex-col space-y-4">
                    {logoPreview && (
                      <div className="relative w-64 h-32 border rounded-md overflow-hidden">
                        <Image
                          src={logoPreview || "/placeholder.svg"}
                          alt="Logo preview"
                          fill
                          style={{ objectFit: "contain" }}
                        />
                        <Button
                          type="button"
                          onClick={handleRemoveLogo}
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          aria-label="Eliminar logo"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    )}

                    {!logoPreview && (
                      <div className="flex items-center space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2"
                        >
                          <Upload size={16} />
                          <span>Seleccionar logo</span>
                        </Button>
                        <Input
                          id="logo"
                          ref={fileInputRef}
                          name="logo"
                          type="file"
                          accept="image/jpeg,image/png,image/svg+xml"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                        <span className="text-sm text-muted-foreground">
                          {logoFile ? logoFile.name : "Ningún archivo seleccionado"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/organizations")}
                  disabled={saving}
                >
                  Volver
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="centers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Centros</CardTitle>
                  <CardDescription>Gestiona los centros de tu organización</CardDescription>
                </div>
                <Button onClick={() => openCenterDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Centro
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {centers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay centros registrados</p>
                  <Button className="mt-4" onClick={() => openCenterDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Crear primer centro
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centers.map((center) => (
                      <TableRow key={center.id}>
                        <TableCell className="font-medium">{center.name}</TableCell>
                        <TableCell>{center.address || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {center.phone && <div className="text-sm">{center.phone}</div>}
                            {center.email && <div className="text-sm text-gray-500">{center.email}</div>}
                            {!center.phone && !center.email && "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={center.active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => toggleCenterStatus(center)}
                          >
                            {center.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openCenterDialog(center)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteCenter(center.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de éxito después de guardar */}
      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center">¡Cambios guardados correctamente!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Los datos de la organización se han actualizado exitosamente. Todos los cambios han sido aplicados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center">
            <AlertDialogAction onClick={() => setSuccessDialogOpen(false)} className="bg-green-600 hover:bg-green-700">
              Perfecto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para eliminar centro */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Eliminar centro
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar este centro? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCenter} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="mr-2 h-4 w-4" />
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para crear/editar centro */}
      <Dialog open={centerDialogOpen} onOpenChange={setCenterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCenter ? "Editar Centro" : "Nuevo Centro"}</DialogTitle>
            <DialogDescription>
              {editingCenter ? "Modifica los datos del centro" : "Introduce los datos del nuevo centro"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCenterSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="center-name">Nombre del centro</Label>
                <Input
                  id="center-name"
                  value={centerForm.name}
                  onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="center-address">Dirección</Label>
                <Input
                  id="center-address"
                  value={centerForm.address}
                  onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="center-phone">Teléfono</Label>
                  <Input
                    id="center-phone"
                    value={centerForm.phone}
                    onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="center-email">Email</Label>
                  <Input
                    id="center-email"
                    type="email"
                    value={centerForm.email}
                    onChange={(e) => setCenterForm({ ...centerForm, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setCenterDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCenter ? "Actualizar" : "Crear"} Centro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
