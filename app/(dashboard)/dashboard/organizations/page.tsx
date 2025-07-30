"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const VERIFACTU_API_URL = "https://app.verifactuapi.es/api"

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

  const handleConfigureVerifactu = async (org: any) => {
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

      alert(`Emisor Verifactu configurado para ${org.name}`)
    } catch (err) {
      console.error("Error al configurar Verifactu:", err)
      alert("Error al configurar Verifactu")
    }
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>CIF/NIF</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations.map((org) => (
              <TableRow key={org.id} className="hover:bg-muted/50">
                <TableCell>{org.name}</TableCell>
                <TableCell>{org.tax_id}</TableCell>
                <TableCell>{org.city || "-"}</TableCell>
                <TableCell>{org.email || "-"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Link href={`/dashboard/organizations/${org.id}`}>
                    <Button variant="ghost" size="sm">Ver</Button>
                  </Link>
                  <Button variant="default" size="sm" onClick={() => handleConfigureVerifactu(org)}>
                    Configurar Verifactu
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
