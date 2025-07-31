"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Info } from "lucide-react"

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info"
    message: string
  } | null>(null)
  const [configuringOrg, setConfiguringOrg] = useState<string | null>(null)

  const VERIFACTU_API_URL = "https://app.verifactuapi.es/api"
  const DEFAULT_TAX_ID = "12345678A"
  const DEFAULT_ADDRESS = "Dirección temporal"

  const showNotification = (type: "success" | "error" | "warning" | "info", message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const getAdminToken = async (): Promise<string> => {
    const res = await fetch("/api/verifactu/token", {
      method: "POST",
    })
    const data = await res.json()
    if (!res.ok || !data.token) {
      throw new Error("Error obteniendo token")
    }
    return data.token
  }

  const isDefaultConfiguration = (org: any): boolean => {
    return org.tax_id === DEFAULT_TAX_ID || org.address === DEFAULT_ADDRESS
  }

  const handleConfigureVerifactu = async (org: any) => {
    // Check if organization is already configured
    if (org.verifactu_configured) {
      showNotification("info", `${org.name} ya está configurado para Verifactu`)
      return
    }

    // Check if still has default values
    if (isDefaultConfiguration(org)) {
      showNotification(
        "warning",
        "Debes cambiar el CIF/NIF y la dirección antes de configurar Verifactu. No puedes usar los valores por defecto.",
      )
      return
    }

    setConfiguringOrg(org.id)

    try {
      const token = await getAdminToken()

      const emisorRes = await fetch(`${VERIFACTU_API_URL}/emisor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: org.name,
          nif: org.tax_id,
          cp: org.postal_code,
          correo_electronico: org.email || `facturacion@${org.name}.com`,
        }),
      })

      const emisorData = await emisorRes.json()
      const emisorId = emisorData?.data?.items?.[0]?.id

      if (!emisorRes.ok || !emisorId) {
        console.error("Error al crear emisor:", emisorData)
        throw new Error("No se pudo crear el emisor")
      }

      const credRes = await fetch(`${VERIFACTU_API_URL}/emisor/${emisorId}/api-key`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const credData = await credRes.json()
      if (!credRes.ok || !credData.api_key || !credData.username) {
        console.error("Error al obtener credenciales:", credData)
        throw new Error("No se pudo obtener la API Key del emisor")
      }

      await supabase
        .from("organizations")
        .update({
          verifactu_emisor_id: emisorId,
          verifactu_username: credData.username,
          verifactu_api_key_encrypted: credData.api_key,
          verifactu_configured: true,
        })
        .eq("id", org.id)

      // Update local state
      setOrganizations((prev) =>
        prev.map((o) => (o.id === org.id ? { ...o, verifactu_configured: true, verifactu_emisor_id: emisorId } : o)),
      )

      showNotification("success", `Emisor Verifactu configurado correctamente para ${org.name}`)
    } catch (err) {
      console.error("Error al configurar Verifactu:", err)
      showNotification("error", "Error al configurar Verifactu. Por favor, inténtalo de nuevo.")
    } finally {
      setConfiguringOrg(null)
    }
  }

  const getButtonText = (org: any): string => {
    if (org.verifactu_configured) return "Configurado"
    if (configuringOrg === org.id) return "Configurando..."
    return "Configurar Verifactu"
  }

  const getButtonVariant = (org: any): "default" | "secondary" => {
    return org.verifactu_configured ? "secondary" : "default"
  }

  const isButtonDisabled = (org: any): boolean => {
    return org.verifactu_configured || configuringOrg === org.id
  }

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          setError("Error de autenticación")
          setLoading(false)
          return
        }

        setUser(user)

        const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

        setProfile(profile)

        const { data: orgs, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false })

        if (orgsError) {
          setError("Error al cargar organizaciones")
        } else {
          setOrganizations(orgs || [])
        }

        setLoading(false)
      } catch (err) {
        console.error("Error en getUser:", err)
        setError("Error inesperado")
        setLoading(false)
      }
    }

    getUser()
  }, [])

  if (loading) return <div>Cargando organizaciones...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestiona tus organizaciones</p>
        </div>
      </div>

      {notification && (
        <Alert
          className={`${
            notification.type === "success"
              ? "border-green-500 bg-green-50"
              : notification.type === "error"
                ? "border-red-500 bg-red-50"
                : notification.type === "warning"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-blue-500 bg-blue-50"
          }`}
        >
          {notification.type === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
          {notification.type === "error" && <AlertTriangle className="h-4 w-4 text-red-600" />}
          {notification.type === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
          {notification.type === "info" && <Info className="h-4 w-4 text-blue-600" />}
          <AlertDescription
            className={`${
              notification.type === "success"
                ? "text-green-800"
                : notification.type === "error"
                  ? "text-red-800"
                  : notification.type === "warning"
                    ? "text-yellow-800"
                    : "text-blue-800"
            }`}
          >
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>CIF/NIF</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado Verifactu</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id} className="hover:bg-muted/50">
                <TableCell>{org.name}</TableCell>
                <TableCell>
                  <span className={org.tax_id === DEFAULT_TAX_ID ? "text-orange-600 font-medium" : ""}>
                    {org.tax_id}
                  </span>
                  {org.tax_id === DEFAULT_TAX_ID && (
                    <span className="text-xs text-orange-600 block">⚠ Valor por defecto</span>
                  )}
                </TableCell>
                <TableCell>{org.city || "-"}</TableCell>
                <TableCell>{org.email || "-"}</TableCell>
                <TableCell>
                  {org.verifactu_configured ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Configurado
                    </span>
                  ) : isDefaultConfiguration(org) ? (
                    <span className="inline-flex items-center gap-1 text-orange-600 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Pendiente configuración
                    </span>
                  ) : (
                    <span className="text-gray-600 text-sm">Listo para configurar</span>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Link href={`/dashboard/organizations/${org.id}`}>
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </Link>
                  <Button
                    variant={getButtonVariant(org)}
                    size="sm"
                    onClick={() => handleConfigureVerifactu(org)}
                    disabled={isButtonDisabled(org)}
                  >
                    {getButtonText(org)}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
