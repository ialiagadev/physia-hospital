"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrganizationSelector } from "@/components/organization-selector"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
import { Loader2 } from "lucide-react"

interface Client {
  id: string
  name: string
  tax_id: string
  client_type: "public" | "private"
  city: string
  email?: string
  organization_id: string
  organizations?: {
    name: string
  }
  created_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const { toast } = useToast()
  const { user, userProfile, isLoading: authLoading } = useAuth()

  // Cargar clientes basados en la organización seleccionada
  useEffect(() => {
    async function loadClients() {
      // Esperar a que termine la autenticación
      if (authLoading) return

      // Verificar autenticación
      if (!user) {
        console.warn("⚠️ No estás autenticado")
        toast({
          title: "No autenticado",
          description: "Debes iniciar sesión para ver los clientes.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        let query = supabase
          .from("clients")
          .select(`
            *,
            organizations (name)
          `)
          .order("created_at", { ascending: false })

        // Si el usuario no es admin de Physia, filtrar por su organización
        if (!userProfile?.is_physia_admin) {
          query = query.eq("organization_id", userProfile?.organization_id)
        } else if (selectedOrgId !== "all") {
          // Si es admin y seleccionó una organización específica
          query = query.eq("organization_id", selectedOrgId)
        }

        const { data, error } = await query

        if (error) {
          console.error("Error al cargar clientes:", error)
          throw error
        }

        setClients(data || [])
      } catch (error) {
        console.error("Error al cargar clientes:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [selectedOrgId, user, userProfile, authLoading, toast])

  // Mostrar loading mientras se autentica
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Redirigir si no está autenticado
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acceso denegado</h2>
          <p className="text-muted-foreground mb-4">Debes iniciar sesión para acceder a esta página.</p>
          <Button asChild>
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona tus clientes para la facturación
            {userProfile?.is_physia_admin ? " (Vista de administrador)" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      {/* Solo mostrar selector si es admin de Physia */}
      {userProfile?.is_physia_admin && (
        <OrganizationSelector selectedOrgId={selectedOrgId} onSelectOrganization={setSelectedOrgId} className="mb-6" />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>CIF/NIF</TableHead>
              {userProfile?.is_physia_admin && <TableHead>Organización</TableHead>}
              <TableHead>Tipo</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={userProfile?.is_physia_admin ? 7 : 6} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Cargando clientes...
                  </div>
                </TableCell>
              </TableRow>
            ) : clients.length > 0 ? (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.tax_id}</TableCell>
                  {userProfile?.is_physia_admin && <TableCell>{client.organizations?.name || "-"}</TableCell>}
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.client_type === "public" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                      }`}
                    >
                      {client.client_type === "public" ? "Público" : "Privado"}
                    </span>
                  </TableCell>
                  <TableCell>{client.city}</TableCell>
                  <TableCell>{client.email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/clients/${client.id}`}>Ver</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/clients/${client.id}/edit`}>Editar</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={userProfile?.is_physia_admin ? 7 : 6} className="h-24 text-center">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No hay clientes registrados</p>
                    <Button asChild variant="outline">
                      <Link href="/dashboard/clients/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Crear primer cliente
                      </Link>
                    </Button>
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
