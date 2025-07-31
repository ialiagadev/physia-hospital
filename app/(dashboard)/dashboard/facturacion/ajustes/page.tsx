"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
import { Settings, Save, RotateCcw, ExternalLink } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { InvoiceNumberConfigModal } from "@/components/invoices/invoice-number-config-modal"

interface OrganizationSettings {
  id: number
  name: string
  tax_id?: string
  address?: string
  postal_code?: string
  city?: string
  province?: string
  country?: string
  email?: string
  phone?: string
  invoice_prefix?: string
  last_invoice_number?: number
  logo_url?: string
  logo_path?: string
  verifactu_configured?: boolean
}

const SPANISH_PROVINCES = [
  "Álava",
  "Albacete",
  "Alicante",
  "Almería",
  "Asturias",
  "Ávila",
  "Badajoz",
  "Barcelona",
  "Burgos",
  "Cáceres",
  "Cádiz",
  "Cantabria",
  "Castellón",
  "Ciudad Real",
  "Córdoba",
  "Cuenca",
  "Girona",
  "Granada",
  "Guadalajara",
  "Guipúzcoa",
  "Huelva",
  "Huesca",
  "Islas Baleares",
  "Jaén",
  "La Coruña",
  "La Rioja",
  "Las Palmas",
  "León",
  "Lleida",
  "Lugo",
  "Madrid",
  "Málaga",
  "Murcia",
  "Navarra",
  "Ourense",
  "Palencia",
  "Pontevedra",
  "Salamanca",
  "Santa Cruz de Tenerife",
  "Segovia",
  "Sevilla",
  "Soria",
  "Tarragona",
  "Teruel",
  "Toledo",
  "Valencia",
  "Valladolid",
  "Vizcaya",
  "Zamora",
  "Zaragoza",
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showNumberingModal, setShowNumberingModal] = useState(false)
  const [selectedInvoiceType, setSelectedInvoiceType] = useState<"normal" | "rectificativa">("normal")
  const { toast } = useToast()
  const { userProfile } = useAuth()

  // Cargar configuración actual
  const loadSettings = async () => {
    if (!userProfile?.organization_id) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", userProfile.organization_id)
        .single()

      if (error) throw error

      setSettings(data)
      setHasChanges(false)
    } catch (error) {
      console.error("Error loading settings:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los ajustes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile?.organization_id) {
      loadSettings()
    }
  }, [userProfile?.organization_id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Manejar cambios en los campos
  const handleFieldChange = (field: keyof OrganizationSettings, value: any) => {
    if (!settings) return

    setSettings((prev) => ({
      ...prev!,
      [field]: value,
    }))
    setHasChanges(true)
  }

  // Guardar cambios
  const handleSave = async () => {
    if (!settings || !userProfile?.organization_id) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: settings.name,
          tax_id: settings.tax_id,
          address: settings.address,
          postal_code: settings.postal_code,
          city: settings.city,
          province: settings.province,
          country: settings.country || "España",
          email: settings.email,
          phone: settings.phone,
          invoice_prefix: settings.invoice_prefix,
        })
        .eq("id", userProfile.organization_id)

      if (error) throw error

      setHasChanges(false)
      toast({
        title: "Ajustes guardados",
        description: "Los cambios se han guardado correctamente",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Descartar cambios
  const handleDiscard = () => {
    loadSettings()
  }

  const handleNumberingConfigSaved = () => {
    // Recargar los ajustes para mostrar los cambios
    loadSettings()
    toast({
      title: "Configuración actualizada",
      description: "La configuración de numeración se ha actualizado correctamente",
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">Ajustes de Facturación</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando ajustes...</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold tracking-tight">Ajustes de Facturación</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No se pudieron cargar los ajustes</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ajustes de Facturación</h1>
            <p className="text-muted-foreground">Configura los parámetros de facturación de tu organización</p>
          </div>
        </div>

        {hasChanges && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDiscard} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Descartar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Información de la Organización */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Organización</CardTitle>
            <CardDescription>Datos básicos que aparecerán en tus facturas</CardDescription>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <span className="font-medium">💡 Información importante:</span> Los cambios que realices aquí se
                actualizarán automáticamente en la información de tu negocio y aparecerán en todas las facturas futuras.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la organización *</Label>
                <Input
                  id="name"
                  value={settings.name || ""}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  placeholder="Nombre de tu empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_id">CIF/NIF</Label>
                <Input
                  id="tax_id"
                  value={settings.tax_id || ""}
                  onChange={(e) => handleFieldChange("tax_id", e.target.value)}
                  placeholder="12345678A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={settings.address || ""}
                onChange={(e) => handleFieldChange("address", e.target.value)}
                placeholder="Calle, número, piso..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  value={settings.postal_code || ""}
                  onChange={(e) => handleFieldChange("postal_code", e.target.value)}
                  placeholder="28001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={settings.city || ""}
                  onChange={(e) => handleFieldChange("city", e.target.value)}
                  placeholder="Madrid"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Select value={settings.province || ""} onValueChange={(value) => handleFieldChange("province", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar provincia" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPANISH_PROVINCES.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  placeholder="contacto@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={settings.phone || ""}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  placeholder="+34 123 456 789"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Numeración */}
        <Card>
          <CardHeader>
            <CardTitle>Numeración de Facturas</CardTitle>
            <CardDescription>Configura cómo se numeran tus facturas por tipo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_prefix">Prefijo de factura</Label>
                <Input
                  id="invoice_prefix"
                  value={settings.invoice_prefix || ""}
                  onChange={(e) => handleFieldChange("invoice_prefix", e.target.value)}
                  placeholder="FAC"
                />
                <p className="text-xs text-muted-foreground">Ejemplo: FAC-2024-001</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_invoice_number">Último número de factura</Label>
                <Input
                  id="last_invoice_number"
                  type="number"
                  value={settings.last_invoice_number || 0}
                  onChange={(e) => handleFieldChange("last_invoice_number", Number.parseInt(e.target.value) || 0)}
                  min="0"
                />
                <p className="text-xs text-muted-foreground">
                  La próxima factura será: {(settings.last_invoice_number || 0) + 1}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Configuración Avanzada por Tipo de Factura</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedInvoiceType("normal")
                    setShowNumberingModal(true)
                  }}
                  className="justify-start h-auto p-4"
                >
                  <div className="text-left">
                    <div className="font-medium">Facturas Normales</div>
                    <div className="text-xs text-muted-foreground">Configurar numeración estándar</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedInvoiceType("rectificativa")
                    setShowNumberingModal(true)
                  }}
                  className="justify-start h-auto p-4"
                >
                  <div className="text-left">
                    <div className="font-medium">Facturas Rectificativas</div>
                    <div className="text-xs text-muted-foreground">Configurar numeración REC</div>
                  </div>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estado VeriFactu */}
        <Card>
          <CardHeader>
            <CardTitle>Estado VeriFactu</CardTitle>
            <CardDescription>Estado actual de la integración con VeriFactu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch id="verifactu_status" checked={settings.verifactu_configured || false} disabled />
                <Label htmlFor="verifactu_status">VeriFactu</Label>
              </div>
              <div className="flex items-center gap-2">
                {settings.verifactu_configured ? (
                  <span className="text-sm text-green-600 font-medium">✅ Configurado</span>
                ) : (
                  <>
                    <span className="text-sm text-amber-600 font-medium">⚠️ No configurado</span>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/dashboard/organizations">
                        Configurar en Mi Negocio
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.verifactu_configured
                ? "VeriFactu está correctamente configurado para tu organización."
                : "Para habilitar VeriFactu, ve a la sección 'Mi Negocio' y completa la configuración."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botón de guardado fijo en la parte inferior */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex gap-2 bg-background border rounded-lg p-2 shadow-lg">
            <Button variant="outline" onClick={handleDiscard} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Descartar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      )}

      {/* Modal de configuración de numeración */}
      {settings && (
        <InvoiceNumberConfigModal
          open={showNumberingModal}
          onOpenChange={setShowNumberingModal}
          organizationId={settings.id}
          invoiceType={selectedInvoiceType}
          onConfigSaved={handleNumberingConfigSaved}
        />
      )}
    </div>
  )
}
