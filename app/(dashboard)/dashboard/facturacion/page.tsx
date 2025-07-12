"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, CreditCard } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendIndicator } from "@/components/ui/trend-indicator"
import { useCountAnimation } from "@/hooks/use-count-animation"
import { useAuth } from "@/app/contexts/auth-context"

interface DashboardStats {
  clients: number
  invoices: number
  totalRevenue: number
  averageTicket: number
}

interface PeriodStats {
  revenue: number
  invoices: number
  clients: number
}

interface TrendData {
  clients: number
  invoices: number
  totalRevenue: number
  averageTicket: number
  periodRevenue: number
}

interface RecentInvoice {
  id: string
  invoice_number: string
  issue_date: string
  total_amount: number
  status: string
  clients: { name: string }[] | null
}

interface RecentClient {
  id: string
  name: string
  tax_id: string
  client_type: string
  created_at: string
}

interface InvoiceData {
  total_amount: number | null
  client_id: string | null
}

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    clients: 0,
    invoices: 0,
    totalRevenue: 0,
    averageTicket: 0,
  })
  const [periodRevenue, setPeriodRevenue] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState("month")
  const [trends, setTrends] = useState<TrendData>({
    clients: 0,
    invoices: 0,
    totalRevenue: 0,
    averageTicket: 0,
    periodRevenue: 0,
  })
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Determinar si debemos mostrar animaciones (solo en la primera carga del día)
  const [showAnimations, setShowAnimations] = useState(false)

  useEffect(() => {
    // Comprobar si ya hemos mostrado animaciones hoy
    const today = new Date().toDateString()
    const lastAnimationDate = localStorage.getItem("lastDashboardAnimationDate")
    const shouldShowAnimations = lastAnimationDate !== today
    setShowAnimations(shouldShowAnimations)

    // Si mostramos animaciones, actualizar la fecha en localStorage
    if (shouldShowAnimations) {
      localStorage.setItem("lastDashboardAnimationDate", today)
    }
  }, [])

  // Formatear número como moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
  }

  // Llamar a los hooks de animación en el nivel superior (regla de hooks)
  const animatedClientsValue = useCountAnimation(stats.clients, 600, 0, Math.round)
  const animatedInvoicesValue = useCountAnimation(stats.invoices, 600, 100, Math.round)
  const animatedRevenueValue = useCountAnimation(stats.totalRevenue, 800, 200, formatCurrency)
  const animatedPeriodRevenueValue = useCountAnimation(periodRevenue, 800, 300, formatCurrency)
  const animatedTicketValue = useCountAnimation(stats.averageTicket, 800, 400, formatCurrency)

  // Decidir si usar valores animados o estáticos
  const clientsValue = showAnimations ? animatedClientsValue : stats.clients
  const invoicesValue = showAnimations ? animatedInvoicesValue : stats.invoices
  const revenueValue = showAnimations ? animatedRevenueValue : formatCurrency(stats.totalRevenue)
  const periodRevenueValue = showAnimations ? animatedPeriodRevenueValue : formatCurrency(periodRevenue)
  const ticketValue = showAnimations ? animatedTicketValue : formatCurrency(stats.averageTicket)

  // Función para calcular el rango de fechas según el período seleccionado
  const getDateRange = (period: string) => {
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case "day":
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        const day = startDate.getDay() || 7
        if (day !== 1) startDate.setHours(-24 * (day - 1))
        startDate.setHours(0, 0, 0, 0)
        break
      case "month":
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        break
      case "year":
        startDate.setMonth(0, 1)
        startDate.setHours(0, 0, 0, 0)
        break
      default:
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
    }

    return { startDate, endDate }
  }

  // Función para obtener el rango del período anterior
  const getPreviousDateRange = (period: string) => {
    const { startDate, endDate } = getDateRange(period)
    const previousStartDate = new Date(startDate)
    const previousEndDate = new Date(endDate)

    switch (period) {
      case "day":
        previousStartDate.setDate(previousStartDate.getDate() - 1)
        previousEndDate.setDate(previousEndDate.getDate() - 1)
        break
      case "week":
        previousStartDate.setDate(previousStartDate.getDate() - 7)
        previousEndDate.setDate(previousEndDate.getDate() - 7)
        break
      case "month":
        previousStartDate.setMonth(previousStartDate.getMonth() - 1)
        previousEndDate.setMonth(previousEndDate.getMonth() - 1)
        break
      case "year":
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1)
        previousEndDate.setFullYear(previousEndDate.getFullYear() - 1)
        break
    }

    return { startDate: previousStartDate, endDate: previousEndDate }
  }

  // Función para calcular tendencias reales
  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  // Función para obtener estadísticas de un período específico
  const getPeriodStats = async (startDate: Date, endDate: Date): Promise<PeriodStats> => {
    try {
      // Construir query base para facturas
      let invoicesQuery = supabase
        .from("invoices")
        .select("total_amount, client_id")
        .gte("issue_date", startDate.toISOString().split("T")[0])
        .lte("issue_date", endDate.toISOString().split("T")[0])
        .in("status", ["sent", "paid"]) // Solo facturas válidas

      // Filtrar por organización del usuario
      if (userProfile?.organization_id) {
        invoicesQuery = invoicesQuery.eq("organization_id", userProfile.organization_id)
      }

      const { data: invoices, error: invoicesError } = await invoicesQuery

      if (invoicesError) {
        console.error("Error fetching period invoices:", invoicesError)
        return { revenue: 0, invoices: 0, clients: 0 }
      }

      const revenue = invoices?.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0) || 0
      const invoiceCount = invoices?.length || 0
      const uniqueClients = new Set(invoices?.map((inv) => inv.client_id).filter(Boolean)).size

      return {
        revenue,
        invoices: invoiceCount,
        clients: uniqueClients,
      }
    } catch (error) {
      console.error("Error in getPeriodStats:", error)
      return { revenue: 0, invoices: 0, clients: 0 }
    }
  }

  // Cargar ingresos del período seleccionado y calcular tendencias
  useEffect(() => {
    async function loadPeriodRevenue() {
      try {
        const { startDate, endDate } = getDateRange(selectedPeriod)
        const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousDateRange(selectedPeriod)

        // Obtener estadísticas del período actual y anterior
        const [currentStats, previousStats] = await Promise.all([
          getPeriodStats(startDate, endDate),
          getPeriodStats(prevStartDate, prevEndDate),
        ])

        setPeriodRevenue(currentStats.revenue)

        // Calcular tendencias reales
        setTrends((prev) => ({
          ...prev,
          periodRevenue: calculateTrend(currentStats.revenue, previousStats.revenue),
        }))
      } catch (error) {
        console.error("Error loading period revenue:", error)
      }
    }

    if (!loading) {
      loadPeriodRevenue()
    }
  }, [selectedPeriod, loading, userProfile])

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      try {
        // OPTIMIZACIÓN: Crear funciones que devuelven Promises reales
        const getClientsCount = async () => {
          let clientsQuery = supabase.from("clients").select("id", { count: "exact", head: true })
          if (userProfile?.organization_id) {
            clientsQuery = clientsQuery.eq("organization_id", userProfile.organization_id)
          }
          return await clientsQuery
        }

        const getInvoicesData = async () => {
          let invoicesQuery = supabase.from("invoices").select("total_amount, client_id").in("status", ["sent", "paid"])
          if (userProfile?.organization_id) {
            invoicesQuery = invoicesQuery.eq("organization_id", userProfile.organization_id)
          }
          return await invoicesQuery
        }

        const getRecentInvoices = async () => {
          let recentInvoicesQuery = supabase
            .from("invoices")
            .select(`
            id,
            invoice_number,
            issue_date,
            total_amount,
            status,
            clients (name)
          `)
            .order("created_at", { ascending: false })
            .limit(5)

          if (userProfile?.organization_id) {
            recentInvoicesQuery = recentInvoicesQuery.eq("organization_id", userProfile.organization_id)
          }
          return await recentInvoicesQuery
        }

        const getRecentClients = async () => {
          let recentClientsQuery = supabase
            .from("clients")
            .select("id, name, tax_id, client_type, created_at")
            .order("created_at", { ascending: false })
            .limit(5)

          if (userProfile?.organization_id) {
            recentClientsQuery = recentClientsQuery.eq("organization_id", userProfile.organization_id)
          }
          return await recentClientsQuery
        }

        // Calcular fechas para estadísticas
        const currentMonth = new Date()
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const currentMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

        const previousMonth = new Date()
        previousMonth.setMonth(previousMonth.getMonth() - 1)
        const previousMonthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1)
        const previousMonthEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)

        // EJECUTAR TODAS LAS CONSULTAS EN PARALELO
        const [
          clientsResult,
          invoicesResult,
          currentMonthStats,
          previousMonthStats,
          recentInvoicesResult,
          recentClientsResult,
        ] = await Promise.all([
          getClientsCount(),
          getInvoicesData(),
          getPeriodStats(currentMonthStart, currentMonthEnd),
          getPeriodStats(previousMonthStart, previousMonthEnd),
          getRecentInvoices(),
          getRecentClients(),
        ])

        // Procesar resultados
        const clientsCount = clientsResult?.count || 0
        const invoicesData = (invoicesResult?.data as InvoiceData[]) || []
        const recentInvoicesData = (recentInvoicesResult?.data || []) as unknown as RecentInvoice[]
        const recentClientsData = (recentClientsResult?.data as RecentClient[]) || []

        // Calcular métricas de facturas
        const totalRevenue = invoicesData.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0)
        const invoicesCount = invoicesData.length
        const averageTicket = invoicesCount > 0 ? totalRevenue / invoicesCount : 0

        // Actualizar estadísticas
        setStats({
          clients: clientsCount,
          invoices: invoicesCount,
          totalRevenue,
          averageTicket,
        })

        // Calcular tendencias reales usando los datos ya obtenidos
        setTrends({
          clients: calculateTrend(currentMonthStats.clients, previousMonthStats.clients),
          invoices: calculateTrend(currentMonthStats.invoices, previousMonthStats.invoices),
          totalRevenue: calculateTrend(totalRevenue, previousMonthStats.revenue),
          averageTicket: calculateTrend(
            currentMonthStats.invoices > 0 ? currentMonthStats.revenue / currentMonthStats.invoices : 0,
            previousMonthStats.invoices > 0 ? previousMonthStats.revenue / previousMonthStats.invoices : 0,
          ),
          periodRevenue: 0, // Se calculará en el otro useEffect
        })

        // Actualizar datos recientes
        setRecentInvoices(recentInvoicesData)
        setRecentClients(recentClientsData)

        setLoading(false)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del dashboard",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    if (userProfile) {
      loadDashboardData()
    }
  }, [userProfile, toast])

  // Obtener el título y descripción del período para mostrar
  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case "day":
        return "Ingresos Diarios"
      case "week":
        return "Ingresos Semanales"
      case "month":
        return "Ingresos Mensuales"
      case "year":
        return "Ingresos Anuales"
      default:
        return "Ingresos Mensuales"
    }
  }

  const getPeriodDescription = () => {
    switch (selectedPeriod) {
      case "day":
        return "ingresos del día actual"
      case "week":
        return "ingresos de la semana actual"
      case "month":
        return "ingresos del mes actual"
      case "year":
        return "ingresos del año actual"
      default:
        return "ingresos del mes actual"
    }
  }

  // Helper function to get client name from invoice
  const getClientName = (invoice: RecentInvoice): string => {
    if (invoice.clients && Array.isArray(invoice.clients) && invoice.clients.length > 0) {
      return invoice.clients[0].name
    }
    return "Cliente desconocido"
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Bienvenido al sistema de facturación</p>
          </div>
        </div>
        <div className="h-12 mb-6"></div>
        <div className="rounded-md border">
          <div className="h-24 flex items-center justify-center">
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenido al sistema de facturación</p>
        </div>
      </div>

      {/* Primera fila: Clientes, Facturas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{clientsValue}</div>
              <TrendIndicator value={trends.clients} />
            </div>
            <p className="text-xs text-muted-foreground">Total de clientes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas</CardTitle>
            <FileText className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{invoicesValue}</div>
              <TrendIndicator value={trends.invoices} />
            </div>
            <p className="text-xs text-muted-foreground">Total de facturas</p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda fila: Ingresos Totales, Ingresos del Período, Ticket Medio */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-1 lg:col-span-1 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-3xl font-bold text-blue-600">{revenueValue}</div>
              <TrendIndicator value={trends.totalRevenue} />
            </div>
            <p className="text-xs text-muted-foreground">Ingresos totales acumulados</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 lg:col-span-1 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getPeriodTitle()}</CardTitle>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue placeholder="Seleccionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Diarios</SelectItem>
                <SelectItem value="week">Semanales</SelectItem>
                <SelectItem value="month">Mensuales</SelectItem>
                <SelectItem value="year">Anuales</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-3xl font-bold text-green-600">{periodRevenueValue}</div>
              <TrendIndicator value={trends.periodRevenue} />
            </div>
            <p className="text-xs text-muted-foreground">Total de {getPeriodDescription()}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-1 lg:col-span-1 border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Medio</CardTitle>
            <CreditCard className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">{ticketValue}</div>
              <TrendIndicator value={trends.averageTicket} />
            </div>
            <p className="text-xs text-muted-foreground">Promedio por factura</p>
          </CardContent>
        </Card>
      </div>

      {/* Tercera fila: Facturas recientes, Clientes recientes */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-t-4 border-t-emerald-500">
          <CardHeader>
            <CardTitle>Facturas recientes</CardTitle>
            <CardDescription>Últimas facturas generadas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentInvoices && recentInvoices.length > 0 ? (
              <div className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.issue_date).toLocaleDateString()} - {getClientName(invoice)}
                      </p>
                    </div>
                    <div className="font-medium">{formatCurrency(invoice.total_amount || 0)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No hay facturas recientes</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-indigo-500">
          <CardHeader>
            <CardTitle>Clientes recientes</CardTitle>
            <CardDescription>Últimos clientes añadidos</CardDescription>
          </CardHeader>
          <CardContent>
            {recentClients && recentClients.length > 0 ? (
              <div className="space-y-2">
                {recentClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
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
    </div>
  )
}
