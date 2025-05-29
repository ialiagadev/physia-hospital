"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    // Obtener usuario actual
    const getUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error("Error obteniendo usuario:", userError)
          setError("Error de autenticación")
          setLoading(false)
          return
        }

        if (!user) {
          setError("Usuario no autenticado")
          setLoading(false)
          return
        }

        setUser(user)
        
        // Obtener perfil del usuario
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()
        
        if (profileError) {
          console.error("Error obteniendo perfil:", profileError)
          setError("Error al cargar perfil de usuario")
          setLoading(false)
          return
        }
        
        setProfile(profile)
        
        // Obtener organizaciones
        const { data: orgs, error: orgsError } = await supabase
          .from("organizations")
          .select("*")
          .order("created_at", { ascending: false })
        
        if (orgsError) {
          console.error("Error obteniendo organizaciones:", orgsError)
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

  if (loading) {
    return <div>Cargando organizaciones...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizaciones</h1>
          <p className="text-muted-foreground">
            Gestiona tus empresas para la facturación
            {profile && (
              <span className="block text-sm">
                Usuario: {profile.name || user?.email} | Org: {profile.organization_id} | Rol: {profile.role}
              </span>
            )}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/organizations/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Organización
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>CIF/NIF</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {organizations && organizations.length > 0 ? (
              organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.tax_id}</TableCell>
                  <TableCell>{org.city || "-"}</TableCell>
                  <TableCell>{org.email || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={org.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                    >
                      {org.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/organizations/${org.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No hay organizaciones registradas
                  <div className="text-xs text-gray-500 mt-2">
                    Debug: {organizations.length} organizaciones encontradas
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}