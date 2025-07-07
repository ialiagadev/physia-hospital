"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Upload, Search, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { OrganizationSelector } from "@/components/organization-selector"
import { ImportClientsDialog } from "@/components/import-clients-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/contexts/auth-context"
import { Loader2 } from "lucide-react"

interface Client {
  id: string
  name: string
  tax_id: string
  phone?: string // Añadir este campo
  client_type: "public" | "private"
  city: string
  email?: string
  organization_id: string
  organizations?: {
    name: string
  }
  created_at: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 20,
  })
  const { toast } = useToast()
  const { user, userProfile, isLoading: authLoading } = useAuth()

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset página cuando cambia la búsqueda
  useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }))
  }, [debouncedSearchTerm, selectedOrgId])

  // Función para resaltar texto en búsquedas
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

  // Cargar clientes con paginación y búsqueda del servidor
  const loadClients = useCallback(
    async (page = 1) => {
      if (authLoading) return

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
        // Construir la consulta base
        let query = supabase.from("clients").select(
          `
          *,
          organizations (name)
        `,
          { count: "exact" },
        )

        // Aplicar filtros de organización
        if (!userProfile?.is_physia_admin) {
          if (userProfile?.organization_id) {
            query = query.eq("organization_id", userProfile.organization_id)
          }
        } else if (selectedOrgId !== "all") {
          const orgIdNumber = Number.parseInt(selectedOrgId)
          if (!isNaN(orgIdNumber)) {
            query = query.eq("organization_id", orgIdNumber)
          }
        }

        // Aplicar búsqueda del servidor
        if (debouncedSearchTerm.trim()) {
          const searchLower = debouncedSearchTerm.toLowerCase().trim()
          query = query.or(
            `name.ilike.%${searchLower}%,tax_id.ilike.%${searchLower}%,phone.ilike.%${searchLower}%,email.ilike.%${searchLower}%,city.ilike.%${searchLower}%`,
          )
        }

        // Aplicar paginación
        const from = (page - 1) * pagination.pageSize
        const to = from + pagination.pageSize - 1

        query = query.order("created_at", { ascending: false }).range(from, to)

        const { data, error, count } = await query

        if (error) {
          console.error("Error al cargar clientes:", error)
          throw error
        }

        const clientsData = data || []
        const totalCount = count || 0
        const totalPages = Math.ceil(totalCount / pagination.pageSize)

        console.log(`✅ Clientes cargados: ${clientsData.length} de ${totalCount}`)

        setClients(clientsData)
        setPagination((prev) => ({
          ...prev,
          currentPage: page,
          totalPages,
          totalCount,
        }))
      } catch (error) {
        console.error("Error al cargar clientes:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los clientes",
          variant: "destructive",
        })
        setClients([])
        setPagination((prev) => ({ ...prev, totalCount: 0, totalPages: 1 }))
      } finally {
        setLoading(false)
      }
    },
    [selectedOrgId, debouncedSearchTerm, user, userProfile, authLoading, pagination.pageSize, toast],
  )

  // Efecto para cargar clientes
  useEffect(() => {
    if (!authLoading && user) {
      loadClients(pagination.currentPage)
    }
  }, [selectedOrgId, debouncedSearchTerm, user, userProfile, authLoading])

  // Funciones de paginación
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadClients(page)
    }
  }

  const goToPreviousPage = () => {
    if (pagination.currentPage > 1) {
      goToPage(pagination.currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      goToPage(pagination.currentPage + 1)
    }
  }

  const handleImportComplete = () => {
    loadClients(1) // Recargar desde la primera página
    setImportDialogOpen(false)
  }

  const clearSearch = () => {
    setSearchTerm("")
  }

  const handleRowClick = (clientId: string) => {
    window.location.href = `/dashboard/clients/${clientId}`
  }

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

  // Obtener organization_id para la importación
  const getOrganizationIdForImport = (): number => {
    if (userProfile?.is_physia_admin && selectedOrgId !== "all") {
      const orgId = Number.parseInt(selectedOrgId)
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

  const organizationIdForImport = getOrganizationIdForImport()

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
        <div className="flex gap-2">
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
      </div>

      {/* Solo mostrar selector si es admin de Physia */}
      {userProfile?.is_physia_admin && (
        <OrganizationSelector selectedOrgId={selectedOrgId} onSelectOrganization={setSelectedOrgId} className="mb-6" />
      )}

      {/* Barra de búsqueda */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, teléfono, NIF, email o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          {loading
            ? "Buscando..."
            : `${pagination.totalCount} cliente${pagination.totalCount !== 1 ? "s" : ""} encontrado${pagination.totalCount !== 1 ? "s" : ""}`}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>CIF/NIF</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Email</TableHead>
              {userProfile?.is_physia_admin && <TableHead>Organización</TableHead>}
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
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(client.id)}
                >
                  <TableCell className="font-medium">
                    {debouncedSearchTerm ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(client.name, debouncedSearchTerm),
                        }}
                      />
                    ) : (
                      client.name || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {debouncedSearchTerm ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(client.phone, debouncedSearchTerm),
                        }}
                      />
                    ) : (
                      client.phone || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {debouncedSearchTerm ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(client.tax_id, debouncedSearchTerm),
                        }}
                      />
                    ) : (
                      client.tax_id || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {debouncedSearchTerm ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(client.city, debouncedSearchTerm),
                        }}
                      />
                    ) : (
                      client.city || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {debouncedSearchTerm && client.email ? (
                      <span
                        dangerouslySetInnerHTML={{
                          __html: highlightText(client.email, debouncedSearchTerm),
                        }}
                      />
                    ) : (
                      client.email || "-"
                    )}
                  </TableCell>
                  {userProfile?.is_physia_admin && <TableCell>{client.organizations?.name || "-"}</TableCell>}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                      <Link href={`/dashboard/clients/${client.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : debouncedSearchTerm ? (
              <TableRow>
                <TableCell colSpan={userProfile?.is_physia_admin ? 7 : 6} className="h-24 text-center">
                  <div className="text-center">
                    <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-muted-foreground mb-2">
                      No se encontraron clientes que coincidan con "{debouncedSearchTerm}"
                    </p>
                    <Button variant="outline" onClick={clearSearch} size="sm">
                      Limpiar búsqueda
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={userProfile?.is_physia_admin ? 7 : 6} className="h-24 text-center">
                  <div className="text-center">
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
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Componente de paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {(pagination.currentPage - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} de {pagination.totalCount}{" "}
            clientes
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={pagination.currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="flex items-center space-x-1">
              {/* Mostrar páginas */}
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNumber: number

                if (pagination.totalPages <= 5) {
                  pageNumber = i + 1
                } else if (pagination.currentPage <= 3) {
                  pageNumber = i + 1
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNumber = pagination.totalPages - 4 + i
                } else {
                  pageNumber = pagination.currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNumber}
                    variant={pagination.currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pagination.currentPage >= pagination.totalPages}
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
        organizationId={organizationIdForImport}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
