"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, FileText, Users, CreditCard, BarChart2 } from "lucide-react"
import { OrganizationSelector } from "@/components/organization-selector"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Componente para mostrar las estadísticas de ingresos
import { RevenueStats } from "@/components/dashboard/revenue-stats"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    organizations: 0,
    clients: 0,
    invoices: 0,
    totalRevenue: 0,
    averageTicket: 0,
  })
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [recentClients, setRecentClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState("all")
  const [timePeriod, setTimePeriod] = useState("month")
  const { toast } = useToast()

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      try {
        console.log("Loading dashboard data for organization:", selectedOrgId)

        // Obtener estadísticas básicas
        const { data: organizations } = await supabase.from("organizations").select("*", { count: "exact" })

        // Consulta de clientes con filtro opcional por organización
        let clientsQuery = supabase.from("clients").select("*", { count: "exact" })
        if (selectedOrgId !== "all") {
          clientsQuery = clientsQuery.eq("organization_id", selectedOrgId)
        }
        const { data: clients } = await clientsQuery

        // Consulta de facturas con filtro opcional por organización
        let invoicesQuery = supabase.from("invoices").select("*", { count: "exact" })
        if (selectedOrgId !== "all") {
          invoicesQuery = invoicesQuery.eq("organization_id", selectedOrgId)
        }
        const { data: invoices, error: invoicesError } = await invoicesQuery

        if (invoicesError) {
          console.error("Error fetching invoices:", invoicesError)
          toast({
            title: "Error",
            description: "No se pudieron cargar las facturas",
            variant: "destructive",
          })
          return
        }

        console.log("Invoices data:", invoices)

        // Calcular ingresos totales - NO filtramos por estado
        const totalRevenue = invoices ? invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0) : 0

        // Calcular ticket medio (ingresos totales / número de clientes)
        const averageTicket = clients && clients.length > 0 ? totalRevenue / clients.length : 0

        // Actualizar estadísticas
        setStats({
          organizations: organizations?.length || 0,
          clients: clients?.length || 0,
          invoices: invoices?.length || 0,
          totalRevenue,
          averageTicket,
        })

        // Obtener facturas recientes
        let recentInvoicesQuery = supabase
          .from("invoices")
          .select(`
            *,
            clients (name)
          `)
          .order("created_at", { ascending: false })
          .limit(5)

        if (selectedOrgId !== "all") {
          recentInvoicesQuery = recentInvoicesQuery.eq("organization_id", selectedOrgId)
        }

        const { data: recentInvoicesData } = await recentInvoicesQuery
        setRecentInvoices(recentInvoicesData || [])

        // Obtener clientes recientes
        let recentClientsQuery = supabase.from("clients").select("*").order("created_at", { ascending: false }).limit(5)

        if (selectedOrgId !== "all") {
          recentClientsQuery = recentClientsQuery.eq("organization_id", selectedOrgId)
        }

        const { data: recentClientsData } = await recentClientsQuery
        setRecentClients(recentClientsData || [])
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del dashboard",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [selectedOrgId, toast])

  const statsItems = [
    {
      title: "Organizaciones",
      value: stats.organizations,
      icon: Building2,
      description: "Total de organizaciones",
    },
    {
      title: "Clientes",
      value: stats.clients,
      icon: Users,
      description: selectedOrgId === "all" ? "Total de clientes" : "Clientes de esta organización",
    },
    {
      title: "Facturas",
      value: stats.invoices,
      icon: FileText,
      description: selectedOrgId === "all" ? "Total de facturas" : "Facturas de esta organización",
    },
  ]

  // Formatear número como moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido al sistema de facturación</p>
        </div>
        <Button asChild className="mt-4 md:mt-0">
          <Link href="/dashboard/statistics">
            <BarChart2 className="mr-2 h-4 w-4" />
            Ver estadísticas detalladas
          </Link>
        </Button>
      </div>

      {/* Selector de organización */}
      <OrganizationSelector selectedOrgId={selectedOrgId} onSelectOrganization={setSelectedOrgId} className="mb-6" />

      {loading ? (
        <div className="text-center py-10">Cargando datos...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statsItems.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Ingresos</CardTitle>
                  <Select value={timePeriod} onValueChange={setTimePeriod}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleccionar período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Diario</SelectItem>
                      <SelectItem value="week">Semanal</SelectItem>
                      <SelectItem value="month">Mensual</SelectItem>
                      <SelectItem value="quarter">Trimestral</SelectItem>
                      <SelectItem value="semester">Semestral</SelectItem>
                      <SelectItem value="year">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CardDescription>Ingresos totales en el período seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueStats organizationId={selectedOrgId} period={timePeriod} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Medio</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.averageTicket)}</div>
                <p className="text-xs text-muted-foreground">Promedio de facturación por cliente</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Facturas recientes</CardTitle>
                <CardDescription>Últimas facturas generadas</CardDescription>
              </CardHeader>
              <CardContent>
                {recentInvoices && recentInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {recentInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(invoice.issue_date).toLocaleDateString()} -{" "}
                            {invoice.clients?.name || "Cliente desconocido"}
                          </p>
                        </div>
                        <div className="font-medium">{formatCurrency(invoice.total_amount)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No hay facturas recientes</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clientes recientes</CardTitle>
                <CardDescription>Últimos clientes añadidos</CardDescription>
              </CardHeader>
              <CardContent>
                {recentClients && recentClients.length > 0 ? (
                  <div className="space-y-2">
                    {recentClients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-muted-foreground">{client.tax_id}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {client.client_type === "public" ? "Público" : "Privado"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No hay clientes recientes</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
