"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrganizationSelector } from "@/components/organization-selector"
import { useToast } from "@/hooks/use-toast"

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const { toast } = useToast()

  // Cargar clientes basados en la organización seleccionada
  useEffect(() => {
    async function loadClients() {
      setLoading(true)

      try {
        let query = supabase
          .from("clients")
          .select(`
            *,
            organizations (name)
          `)
          .order("created_at", { ascending: false })

        // Filtrar por organización si se ha seleccionado una específica
        if (selectedOrgId !== "all") {
          query = query.eq("organization_id", selectedOrgId)
        }

        const { data, error } = await query

        if (error) throw error

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
  }, [selectedOrgId, toast])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestiona tus clientes para la facturación</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      {/* Selector de organización (visible para todos) */}
      <OrganizationSelector selectedOrgId={selectedOrgId} onSelectOrganization={setSelectedOrgId} className="mb-6" />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>CIF/NIF</TableHead>
              <TableHead>Organización</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Cargando clientes...
                </TableCell>
              </TableRow>
            ) : clients.length > 0 ? (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.tax_id}</TableCell>
                  <TableCell>{client.organizations?.name || "-"}</TableCell>
                  <TableCell>{client.client_type === "public" ? "Público" : "Privado"}</TableCell>
                  <TableCell>{client.city}</TableCell>
                  <TableCell>{client.email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/clients/${client.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No hay clientes registrados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
