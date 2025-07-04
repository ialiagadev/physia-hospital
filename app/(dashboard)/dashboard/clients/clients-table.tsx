"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Upload, Search, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrganizationSelector } from "@/components/organization-selector"
import { ImportClientsDialog } from "@/components/import-clients-dialog"
import { useToast } from "@/hooks/use-toast"

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

interface ClientsTableProps {
  initialData: {
    clients: Client[]
    totalCount: number
    userProfile: any
    currentPage: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
  searchParams: {
    page?: string
    search?: string
    org?: string
  }
}

export function ClientsTable({ initialData, searchParams }: ClientsTableProps) {
  const router = useRouter()
  const urlSearchParams = useSearchParams()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const { clients, totalCount, userProfile, currentPage, totalPages, hasNextPage, hasPrevPage } = initialData

  // Función para actualizar URL con nuevos parámetros
  const updateURL = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(urlSearchParams.toString())

    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== "") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    // Resetear página cuando se cambia la búsqueda
    if (newParams.search !== undefined) {
      params.delete("page")
    }

    router.push(`/dashboard/clients?${params.toString()}`)
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    // Debounce la búsqueda
    const timeoutId = setTimeout(() => {
      updateURL({ search: value })
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handlePageChange = (page: number) => {
    updateURL({ page: page.toString() })
  }

  const handleOrgChange = (orgId: string) => {
    updateURL({ org: orgId === "all" ? undefined : orgId })
  }

  const clearSearch = () => {
    setSearchTerm("")
    updateURL({ search: undefined })
  }

  const highlightText = (text: string | null | undefined, search: string): string => {
    if (!text || !search.trim()) {
      return text || ""
    }
    try {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(`(${escapedSearch})`, "gi")
      return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
    } catch (error) {
      console.error("Error al resaltar texto:", error)
      return text
    }
  }

  const getOrganizationIdForImport = (): number => {
    if (userProfile?.is_physia_admin && searchParams.org !== "all" && searchParams.org) {
      const orgId = Number.parseInt(searchParams.org)
      return isNaN(orgId) ? 0 : orgId
    }
    if (userProfile?.organization_id) {
      const orgId =
        typeof userProfile.organization_id === "string"
          ? Number.parseInt(userProfile.organization_id)
          : userProfile.organization_id
      return isNaN(orgId) ? 0 : orgId
    }
    return 0
  }

  return (
    <>
      {/* Controles superiores */}
      <div className="flex gap-2 mb-4">
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Importar Clientes
        </Button>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Link>
        </Button>
      </div>

      {/* Selector de organización para admins */}
      {userProfile?.is_physia_admin && (
        <OrganizationSelector
          selectedOrgId={searchParams.org || "all"}
          onSelectOrganization={handleOrgChange}
          className="mb-6"
        />
      )}

      {/* Barra de búsqueda */}
      <div className="flex items-center justify-between space-x-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, NIF, email o ciudad..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Información de resultados */}
        <div className="text-sm text-muted-foreground">
          {totalCount > 0 && (
            <>
              Mostrando {(currentPage - 1) * 50 + 1}-{Math.min(currentPage * 50, totalCount)} de {totalCount} clientes
            </>
          )}
        </div>
      </div>

      {/* Tabla */}
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
            {clients.length > 0 ? (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {searchParams.search ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(client.name, searchParams.search),
                        }}
                      />
                    ) : (
                      client.name || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {searchParams.search ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(client.tax_id, searchParams.search),
                        }}
                      />
                    ) : (
                      client.tax_id || "-"
                    )}
                  </TableCell>
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
                  <TableCell>
                    {searchParams.search ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(client.city, searchParams.search),
                        }}
                      />
                    ) : (
                      client.city || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {searchParams.search && client.email ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(client.email, searchParams.search),
                        }}
                      />
                    ) : (
                      client.email || "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/clients/${client.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={userProfile?.is_physia_admin ? 7 : 6} className="h-24 text-center">
                  <div className="text-center">
                    {searchParams.search ? (
                      <>
                        <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-muted-foreground mb-2">
                          No se encontraron clientes que coincidan con "{searchParams.search}"
                        </p>
                        <Button variant="outline" onClick={clearSearch} size="sm">
                          Limpiar búsqueda
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground mb-4">No hay clientes registrados</p>
                        <div className="flex justify-center gap-2">
                          <Button asChild variant="outline">
                            <Link href="/dashboard/clients/new">
                              <Plus className="mr-2 h-4 w-4" />
                              Crear primer cliente
                            </Link>
                          </Button>
                          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Importar desde archivo
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNextPage}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ImportClientsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        organizationId={getOrganizationIdForImport()}
        onImportComplete={() => {
          setImportDialogOpen(false)
          router.refresh() // Recargar datos del servidor
        }}
      />
    </>
  )
}
