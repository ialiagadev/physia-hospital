import Link from "next/link"
import { cookies } from "next/headers"
import { createServerSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function OrganizationsPage() {
  const cookieStore = cookies()
  const supabase = createServerSupabaseClient()

  // Obtener organizaciones
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizaciones</h1>
          <p className="text-muted-foreground">Gestiona tus empresas para la facturación</p>
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
                  <TableCell>{org.city}</TableCell>
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
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
